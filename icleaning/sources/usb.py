"""The iPhone over cable: read the photo library over AFC (pymobiledevice3) and delete over PTP.

AFC gives access to «/var/mobile/Media» on the iPhone (DCIM, PhotoData…). Here AFC is READ ONLY:
this module has no write to the device at all (no rm, push, makedirs or rename).
Deleting is `ptp.delete`'s business, which uses the PTP protocol of the Photos app.

The pymobiledevice3 API is asynchronous (in the version used, `list_devices` and
`create_using_usbmux` are coroutines and the `AfcService` methods return coroutines even though
some carry decorators that mislead `inspect.iscoroutinefunction`). To avoid infecting the
interface with async, everything goes through a loop of its own in a separate thread (`_Loop`)
and a synchronous API is exposed outwards.

Read-only diagnostic:

    python -m icleaning.sources.usb
"""
from __future__ import annotations

import contextlib
import os
import posixpath
import shutil
import sqlite3
import tempfile
import threading
from pathlib import Path

from ..model import Item

# Messages for the user. The code is what the interface looks at to decide what to offer.
MESSAGES = {
    "usb.noDevice": "No iPhone connected by cable.",
    "usb.noDriver": "Cannot talk to usbmuxd (the service that sees Apple devices).",
    "usb.trust": "Accept «Trust this computer» on the iPhone and type the code when it asks.",
    "usb.locked": "The iPhone is locked: unlock it and try again.",
    "usb.disconnected": "The iPhone has been disconnected or has dropped the connection.",
    "usb.other": "Unexpected failure talking to the iPhone.",
}

CHUNK = 1 << 20                 # 1 MB per read, as in the other sources
PAIR_TIMEOUT = 60.0             # seconds to wait for «Trust» to be accepted
MAX_ORIGINAL_THUMBNAIL = 8 << 20

DB_FILES = ("Photos.sqlite", "Photos.sqlite-wal", "Photos.sqlite-shm")


class USBError(Exception):
    """Failure talking to the iPhone over cable. `code` says what is wrong (keys of MESSAGES)."""

    def __init__(self, code="usb.other", detail=""):
        self.code = code if code in MESSAGES else "usb.other"
        self.detail = detail
        super().__init__(MESSAGES[self.code] + (f" ({detail})" if detail else ""))


# ------------------------------------------------------------------ event loop of its own

class _Loop:
    """An asyncio loop in its thread, to call pymobiledevice3 from synchronous code."""

    def __init__(self):
        self.loop = None
        self._ready = threading.Event()
        self.thread = threading.Thread(target=self._run, name="usb-asyncio", daemon=True)
        self.thread.start()

    def _run(self):
        import asyncio

        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        self._ready.set()
        self.loop.run_forever()

    def run(self, coro):
        import asyncio

        self._ready.wait()      # nothing can be queued before the loop exists
        return asyncio.run_coroutine_threadsafe(coro, self.loop).result()


_current_loop = None
_loop_lock = threading.Lock()


def _get_loop() -> _Loop:
    global _current_loop
    with _loop_lock:
        if _current_loop is None:
            _current_loop = _Loop()
        return _current_loop


def _call(coro, optional=False):
    """Runs a coroutine in the loop of our own and translates its exceptions to USBError."""
    try:
        return _get_loop().run(coro)
    except Exception as ex:  # noqa: BLE001 - translated here so that outside there is only USBError
        if optional and _is_missing(ex):
            return None
        raise _map_error(ex) from ex


def _is_missing(ex: BaseException) -> bool:
    """Does the exception only say that file or folder is not on the iPhone?"""
    try:
        from pymobiledevice3 import exceptions as pex
    except ImportError:
        return False
    return isinstance(ex, pex.AfcException)


def _map_error(ex: BaseException) -> USBError:
    """Translates the pymobiledevice3 exceptions to the USBError codes."""
    if isinstance(ex, USBError):
        return ex
    try:
        from pymobiledevice3 import exceptions as pex
    except ImportError:
        return USBError("usb.other", str(ex))
    table = (
        # «locked» before «trust»: PasswordRequiredError is a subclass of PairingError.
        ("usb.locked", ("PasscodeRequiredError", "PasswordRequiredError", "MCProtectedError")),
        ("usb.trust", ("PairingDialogResponsePendingError", "UserDeniedPairingError", "NotTrustedError",
                       "FatalPairingError", "NotPairedError", "InvalidHostIDError", "PairingError")),
        ("usb.noDriver", ("ConnectionFailedToUsbmuxdError",)),
        ("usb.noDevice", ("NoDeviceConnectedError", "DeviceNotFoundError", "BadDevError")),
        ("usb.disconnected", ("ConnectionTerminatedError", "ConnectionFailedError", "InvalidConnectionError",
                              "StreamClosedError")),
    )
    for code, names in table:
        for name in names:
            cls = getattr(pex, name, None)
            if cls is not None and isinstance(ex, cls):
                return USBError(code, str(ex))
    if isinstance(ex, (ConnectionResetError, BrokenPipeError)):
        return USBError("usb.disconnected", str(ex))
    return USBError("usb.other", str(ex))


# ------------------------------------------------------------------ lockdown and devices

async def _iphones() -> list[dict]:
    """Connected iPhones, paired or not (it does not pair: it only reads the lockdown values)."""
    from pymobiledevice3 import exceptions as pex
    from pymobiledevice3 import usbmux
    from pymobiledevice3.lockdown import create_using_usbmux

    out = []
    for device in await usbmux.list_devices():
        try:
            lockdown = await create_using_usbmux(serial=device.serial, autopair=False)
        except pex.ConnectionFailedToUsbmuxdError:
            raise
        except (pex.PyMobileDevice3Exception, OSError):
            continue          # a device that does not answer does not prevent listing the rest
        try:
            values = lockdown.all_values or {}
            if values.get("DeviceClass") != "iPhone":
                continue
            out.append({"udid": device.serial,
                        "name": values.get("DeviceName") or "",
                        "model": values.get("ProductType") or "",
                        "ios": values.get("ProductVersion") or ""})
        finally:
            with contextlib.suppress(Exception):
                await lockdown.close()
    return out


def list_devices() -> list[dict]:
    """[{udid, name, model, ios}] of the connected iPhones. [] if there is none."""
    return _call(_iphones())


async def _open_afc(udid: str | None = None):
    """Opens lockdown + AFC. If there is no pair, pymobiledevice3 asks to pair («Trust» shows up)."""
    from pymobiledevice3.lockdown import create_using_usbmux
    from pymobiledevice3.services.afc import AfcService

    if not udid:
        iphones = await _iphones()
        if not iphones:
            raise USBError("usb.noDevice")
        udid = iphones[0]["udid"]
    lockdown = await create_using_usbmux(serial=udid, autopair=True, pair_timeout=PAIR_TIMEOUT)
    try:
        afc = await AfcService(lockdown).__aenter__()
    except BaseException:
        with contextlib.suppress(Exception):
            await lockdown.close()
        raise
    return lockdown, afc


async def _close_afc(lockdown, afc):
    with contextlib.suppress(Exception):
        await afc.aclose()
    with contextlib.suppress(Exception):
        await lockdown.close()


async def _copy_file(afc, path, dest: Path, chunk_cb=None) -> int:
    """Reads a file from the iPhone in 1 MB chunks and writes it to `dest`. Returns the bytes."""
    handle = await afc.fopen(path)
    if not handle:
        raise IOError(f"cannot open on the iPhone: {path}")
    total = 0
    try:
        with open(dest, "wb") as f:
            while True:
                chunk = await afc.fread(handle, CHUNK)
                if not chunk:
                    break
                f.write(chunk)
                total += len(chunk)
                if chunk_cb is not None:
                    chunk_cb(len(chunk))
    finally:
        with contextlib.suppress(Exception):
            await afc.fclose(handle)
    return total


class _Afc:
    """An open lockdown+AFC connection, with synchronous methods (the async part stays inside)."""

    def __init__(self, lockdown, afc):
        self.lockdown, self.afc = lockdown, afc

    @classmethod
    def open(cls, udid=None) -> "_Afc":
        return cls(*_call(_open_afc(udid)))

    def listdir(self, path: str) -> list[str] | None:
        return _call(self.afc.listdir(path), optional=True)

    def stat(self, path: str) -> dict | None:
        return _call(self.afc.stat(path), optional=True)

    def size(self, path: str) -> int | None:
        st = self.stat(path)
        return int(st["st_size"]) if st else None

    def open_file(self, path: str) -> int | None:
        return _call(self.afc.fopen(path), optional=True)

    def read(self, handle: int, n: int) -> bytes:
        return _call(self.afc.fread(handle, n))

    def seek(self, handle: int, offset: int) -> None:
        _call(self.afc.fseek(handle, offset))

    def close_file(self, handle: int) -> None:
        _call(self.afc.fclose(handle))

    def read_all(self, path: str) -> bytes | None:
        return _call(self.afc.get_file_contents(path), optional=True)

    def copy(self, path: str, dest: Path, chunk_cb=None) -> int:
        return _call(_copy_file(self.afc, path, dest, chunk_cb))

    def close(self) -> None:
        _call(_close_afc(self.lockdown, self.afc))


@contextlib.contextmanager
def connection(udid: str | None = None):
    """AFC connection to use and close (to copy the database, for instance)."""
    afc = _Afc.open(udid)
    try:
        yield afc
    finally:
        afc.close()


# ------------------------------------------------------------------ database

def copy_photos_db(udid: str | None, dest_dir: Path, progress=None) -> Path:
    """Copies /PhotoData/Photos.sqlite (+wal/shm) and psi.sqlite if it exists to `dest_dir`.

    It is downloaded to a temporary subfolder and checked that it opens read-only before
    replacing the destination, so that a half-done copy is never left behind. Returns the DB path.
    """
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    progress = progress or (lambda done, total: None)
    tmp = Path(tempfile.mkdtemp(prefix=".photos-", dir=dest_dir))
    try:
        with connection(udid) as afc:
            sizes = {name: afc.size(f"/PhotoData/{name}") for name in DB_FILES}
            if not sizes["Photos.sqlite"]:
                raise USBError("usb.other", "the iPhone has no /PhotoData/Photos.sqlite")
            total = sum(t for t in sizes.values() if t)
            done = 0

            def cb(n):
                nonlocal done
                done += n
                progress(done, total)

            copied = set()
            for name in DB_FILES:
                if sizes[name] is None:
                    continue
                afc.copy(f"/PhotoData/{name}", tmp / name, cb)
                copied.add(name)
            _check_sqlite(tmp / "Photos.sqlite")

            for name in DB_FILES:
                if name in copied:
                    os.replace(tmp / name, dest_dir / name)
                elif name != "Photos.sqlite":
                    # A -wal or -shm from an earlier copy does not go with the new DB: it is left over.
                    (dest_dir / name).unlink(missing_ok=True)

            # Optional: the search cache (people, places). If it fails, it is ignored.
            try:
                if afc.size("/PhotoData/Caches/search/psi.sqlite"):
                    afc.copy("/PhotoData/Caches/search/psi.sqlite", tmp / "psi.sqlite")
                    os.replace(tmp / "psi.sqlite", dest_dir / "psi.sqlite")
            except Exception:  # noqa: BLE001 - it is an extra, not worth breaking the copy for
                pass
        return dest_dir / "Photos.sqlite"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def _check_sqlite(path: Path) -> None:
    """Checks that the copy is an SQLite database that opens read-only."""
    try:
        con = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
        try:
            con.execute("SELECT count(*) FROM sqlite_master").fetchone()
        finally:
            con.close()
    except sqlite3.Error as ex:
        raise USBError("usb.other", f"the Photos.sqlite copy cannot be opened ({ex})") from ex


# ------------------------------------------------------------------ video response

class _Response:
    """Minimal requests-like response for `open_video`: reads the file over AFC with ranges."""

    def __init__(self, afc: _Afc, lock: threading.Lock, path: str, size: int, range_header: str | None):
        self.afc, self.lock, self.path, self.size = afc, lock, path, size
        self._handle = None
        self._start = 0
        self._remaining = size
        self.status_code = 200
        self.headers = {"Accept-Ranges": "bytes"}
        if range_header:
            try:
                self._start, end = _parse_range(range_header, size)
            except ValueError:
                self.status_code = 416
                self._remaining = 0
                self.headers.update({"Content-Range": f"bytes */{size}", "Content-Length": "0"})
            else:
                self.status_code = 206
                self._remaining = end - self._start + 1
                self.headers.update({"Content-Length": str(self._remaining),
                                     "Content-Range": f"bytes {self._start}-{end}/{size}"})
        else:
            self.headers["Content-Length"] = str(size)

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    def iter_content(self, n: int = CHUNK):
        if self.status_code == 416:
            return
        try:
            while self._remaining > 0:
                with self.lock:
                    if self._handle is None:
                        handle = self.afc.open_file(self.path)
                        if handle is None:
                            raise IOError(f"cannot open on the iPhone: {self.path}")
                        self._handle = handle
                        if self._start:
                            self.afc.seek(handle, self._start)
                    chunk = self.afc.read(self._handle, min(n, self._remaining))
                if not chunk:
                    break
                self._remaining -= len(chunk)
                yield chunk
        finally:
            self.close()

    def close(self):
        if self._handle is None:
            return
        handle, self._handle = self._handle, None
        with contextlib.suppress(Exception):
            with self.lock:
                self.afc.close_file(handle)


def _parse_range(range_header: str, size: int) -> tuple[int, int]:
    """«bytes=a-b» / «bytes=a-» / «bytes=-n» -> (start, end) already clamped. ValueError if invalid."""
    unit, _, values = range_header.partition("=")
    if unit.strip().lower() != "bytes" or not values:
        raise ValueError(range_header)
    first, _, last = values.strip().partition("-")
    try:
        if not first:                        # «bytes=-n»: the last n
            n = int(last)
            if n <= 0 or size <= 0:
                raise ValueError(range_header)
            return max(0, size - n), size - 1
        start = int(first)
        end = int(last) if last else size - 1
    except ValueError as ex:
        raise ValueError(range_header) from ex
    if start < 0 or end < start or start >= size:
        raise ValueError(range_header)
    return start, min(end, size - 1)


# ------------------------------------------------------------------ the source

class USBSource:
    """The iPhone's photo library over cable. Reads over AFC; deletes in batches over PTP."""

    name = "usb"
    permanent_delete = True
    download_threads = 1

    def __init__(self, udid: str | None, classification, cache_dir: Path):
        self.udid = udid
        self._classification = classification
        self.cache_dir = Path(cache_dir) if cache_dir is not None else None
        self.lock = threading.Lock()
        self._afc = None
        self.only_in_cloud = 0     # how many items in the DB are not on the iPhone (iCloud only)

    # --- connection

    def _connection(self) -> _Afc:
        """Already open AFC connection (it is reused). `self.lock` must be held."""
        if self._afc is None:
            self._afc = _Afc.open(self.udid)
        return self._afc

    def close(self):
        with self.lock:
            if self._afc is not None:
                afc, self._afc = self._afc, None
                afc.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()

    # --- source contract

    def classification(self):
        return self._classification

    def list_items(self, progress=None):
        """Items that are really on the iPhone, with their parts (original + live)."""
        progress = progress or (lambda done, total: None)
        rows = [f for f in getattr(self._classification, "rows", []) or [] if not f.get("hidden")]
        self.only_in_cloud = 0
        folders = sorted({f.get("dir") for f in rows if f.get("dir")})
        with self.lock:
            afc = self._connection()
            listings = {}
            for i, d in enumerate(folders):
                listings[d] = afc.listdir("/" + d)
                progress(i + 1, len(folders))
            items = []
            for f in rows:
                if not f.get("uuid"):
                    continue
                d = f.get("dir")
                names = listings.get(d) if d else None
                if names is None:
                    self.only_in_cloud += 1        # folder missing: nothing from it is on the cable
                    continue
                actual_names = {n.lower(): n for n in names}
                actual = actual_names.get((f.get("file") or "").lower())
                if not actual:
                    self.only_in_cloud += 1        # «Optimise storage»: the original is in iCloud
                    continue
                info = f.get("info") or {}
                size = int(f.get("size") or 0)
                if not size:
                    size = int((afc.stat(f"/{d}/{actual}") or {}).get("st_size") or 0)
                parts = [(actual, size, "original")]
                if info.get("k") != "video":
                    mov = actual_names.get((os.path.splitext(actual)[0] + ".MOV").lower())
                    if mov:
                        tm = int((afc.stat(f"/{d}/{mov}") or {}).get("st_size") or 0)
                        parts.append((mov, tm, "live"))
                e = Item(f["uuid"], f.get("name") or actual, sum(p[1] for p in parts),
                         f.get("date") or 0, info.get("k") or "photo", parts, f"{d}/{actual}")
                e.cats = list(info.get("c") or [])
                e.dur = info.get("dur") or 0
                e.extra = {k: v for k, v in info.items() if k not in ("c", "dur", "k")}
                items.append(e)
        progress(len(folders), len(folders))
        return items

    def image(self, item, large=False):
        """Thumbnail from PhotoData/Thumbnails/V2, with the small original as fallback."""
        keys = ("5005.JPG", "5003.JPG") if large else ("5003.JPG", "5005.JPG")
        base = f"/PhotoData/Thumbnails/V2/{item.ref}"
        with self.lock:
            afc = self._connection()
            for key in keys:
                data = afc.read_all(f"{base}/{key}")
                if data:
                    return data, "image/jpeg"
            name = item.parts[0][0] if item.parts else ""
            ext = os.path.splitext(name)[1].lower()
            if ext in (".jpg", ".jpeg", ".png"):
                path = "/" + item.ref
                size = item.size or afc.size(path) or 0
                if size < MAX_ORIGINAL_THUMBNAIL:
                    data = afc.read_all(path)
                    if data:
                        return data, "image/png" if ext == ".png" else "image/jpeg"
        return None, None

    def open_video(self, item, range_header=None):
        """Video from the iPhone with Range support. A photo with a «live» part plays its .MOV."""
        if item.kind == "video":
            path = "/" + item.ref
        else:
            live = next((name for name, _, key in item.parts if key == "live"), None)
            if not live:
                return None
            path = f"{posixpath.dirname('/' + item.ref)}/{live}"
        with self.lock:
            afc = self._connection()
            size = afc.size(path)
        if not size:
            return None
        return _Response(afc, self.lock, path, size, range_header)

    @staticmethod
    def _part_path(item, key) -> str:
        if key == "original":
            return "/" + item.ref
        for name, _, c in item.parts:
            if c == key:
                return f"{posixpath.dirname('/' + item.ref)}/{name}"
        raise IOError(f"the item has no «{key}» version")

    def download(self, item, key, dest, chunk_cb):
        path = self._part_path(item, key)
        with self.lock:
            return self._connection().copy(path, Path(dest), chunk_cb)

    def delete_many(self, items):
        """Deletes in batches over PTP. Returns [(Item, exception or None)]."""
        from . import ptp

        items = list(items)
        if not items:
            return iter(())
        by_path = {}
        for e in items:
            by_path.setdefault(e.ref, e)
        failure = None
        try:
            results = list(ptp.delete(self.udid, [e.ref for e in items]))
        except Exception as ex:  # noqa: BLE001 - whole-batch failure: blamed on every item
            results, failure = None, ex
        if results is None:
            pairs = [(e, failure) for e in items]
        else:
            pairs = []
            seen = set()
            for path, exc in results:
                e = by_path.get(path)
                if e is not None and e.id not in seen:
                    seen.add(e.id)
                    pairs.append((e, exc))
            for e in items:               # paths ptp did not return: unknown, counted as an error
                if e.id not in seen:
                    pairs.append((e, IOError("the iPhone did not confirm the deletion")))
        return iter(pairs)


# ------------------------------------------------------------------ diagnostic

if __name__ == "__main__":
    import sys

    print("iCleaning · cable diagnostic (read-only)\n")
    try:
        iphones = list_devices()
    except USBError as ex:
        print(f"✗ {ex}")
        if ex.code == "usb.noDriver":
            print("  · Windows/macOS: install «Apple Devices» (or iTunes) and plug the cable in.")
            print("  · Linux: install and start usbmuxd (usbmuxd package, usbmuxd service).")
        elif ex.code == "usb.trust":
            print("  · Unlock the iPhone and tap «Trust» when it asks.")
        sys.exit(1)
    if not iphones:
        print("No iPhone connected.")
    else:
        for d in iphones:
            print(f"  · {d['name'] or '(no name)'} · {d['model'] or '?'} · iOS {d['ios'] or '?'} · {d['udid']}")
