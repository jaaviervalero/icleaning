"""Tests of the USB source with a fake in-memory AFC (no iPhone and no real usbmuxd)."""
from __future__ import annotations

import sqlite3
import sys
import types

import pytest

from icleaning import sources
from icleaning.photosdb import Classification
from icleaning.sources import usb


class FakeAfc:
    """Fake AFC: {path: bytes}; stat and sizes come from len(); handles are indexes."""

    def __init__(self, files: dict[str, bytes]):
        self.files = dict(files)
        self.handles = {}
        self.pos = {}
        self._next = 1
        self.closed = False
        self.stats = []

    def listdir(self, path):
        prefix = path.rstrip("/") + "/"
        return sorted({p[len(prefix):].split("/")[0] for p in self.files if p.startswith(prefix)}) or None

    def stat(self, path):
        self.stats.append(path)
        data = self.files.get(path)
        return {"st_size": len(data), "st_ifmt": "S_IFREG"} if data is not None else None

    def size(self, path):
        data = self.files.get(path)
        return None if data is None else len(data)

    def open_file(self, path):
        if path not in self.files:
            return None
        h = self._next
        self._next += 1
        self.handles[h], self.pos[h] = self.files[path], 0
        return h

    def read(self, h, n):
        data, pos = self.handles[h], self.pos[h]
        chunk = data[pos:pos + n]
        self.pos[h] = pos + len(chunk)
        return chunk

    def seek(self, h, offset):
        self.pos[h] = offset

    def close_file(self, h):
        self.handles.pop(h, None)
        self.pos.pop(h, None)

    def read_all(self, path):
        return self.files.get(path)

    def copy(self, path, dest, chunk_cb=None):
        data = self.files.get(path)
        if data is None:
            raise IOError(f"{path} does not exist")
        dest.write_bytes(data)
        if chunk_cb is not None:
            chunk_cb(len(data))
        return len(data)

    def close(self):
        self.closed = True


def row(uuid, dir_, file, size, k="photo", c=("camera",), dur=0.0, hidden=False, **extra):
    info = {"c": list(c), "dur": dur, "k": k}
    info.update(extra)
    return {"pk": 1, "uuid": uuid, "dir": dir_, "file": file, "name": file, "size": size,
            "date": 1700000000.0, "info": info, "cloud_state": 0, "hidden": hidden, "discarded_burst": False}


FILES = {
    "/DCIM/100APPLE/IMG_0001.HEIC": b"h" * 1000,
    "/DCIM/100APPLE/IMG_0001.MOV": b"m" * 4000,
    "/DCIM/100APPLE/IMG_0002.HEIC": b"b" * 2000,
    "/DCIM/100APPLE/IMG_0003.HEIC": b"c" * 300,
    "/DCIM/101APPLE/VID_0004.MOV": b"v" * 100,
    "/DCIM/101APPLE/IMG_0005.PNG": b"png",
    "/PhotoData/Thumbnails/V2/DCIM/100APPLE/IMG_0001.HEIC/5003.JPG": b"mini1",
    "/PhotoData/Thumbnails/V2/DCIM/100APPLE/IMG_0002.HEIC/5003.JPG": b"small2",
    "/PhotoData/Thumbnails/V2/DCIM/100APPLE/IMG_0002.HEIC/5005.JPG": b"large2",
}


def rows():
    return [
        row("U-0001", "DCIM/100APPLE", "IMG_0001.HEIC", 0, c=("camera", "live"), q=42, cam=0),
        row("U-0002", "DCIM/100APPLE", "IMG_0002.HEIC", 2000),
        row("U-0003", "DCIM/100APPLE", "IMG_0003.HEIC", 300, hidden=True),
        row("U-0004", "DCIM/100APPLE", "IMG_0004.HEIC", 500),          # not on the iPhone
        row("U-0005", "DCIM/101APPLE", "VID_0004.MOV", 0, k="video", dur=5.2),
        row("U-0006", "DCIM/101APPLE", "IMG_0005.PNG", 0),
        row("U-0007", "DCIM/101APPLE", "IMG_0007.HEIC", 700),          # not there either
    ]


def source(monkeypatch, files=None, classification=None):
    afc = FakeAfc(FILES if files is None else files)
    monkeypatch.setattr(usb._Afc, "open", classmethod(lambda cls, udid=None: afc))
    classification = classification if classification is not None else Classification(rows=rows())
    return usb.USBSource("UDID-FAKE", classification, None), afc


def test_list_items_presence_live_and_hidden(monkeypatch):
    f, afc = source(monkeypatch)
    progress = []
    items = f.list_items(lambda done, total: progress.append((done, total)))

    ids = [e.id for e in items]
    assert ids == ["U-0001", "U-0002", "U-0005", "U-0006"]     # hidden out; U-0004 and U-0007 are not there
    assert f.only_in_cloud == 2

    e1 = items[0]
    assert e1.name == "IMG_0001.HEIC"
    assert e1.kind == "photo"
    assert e1.parts == [("IMG_0001.HEIC", 1000, "original"), ("IMG_0001.MOV", 4000, "live")]
    assert e1.size == 5000                                     # size taken from stat (the DB said 0)
    assert e1.ref == "DCIM/100APPLE/IMG_0001.HEIC"
    assert e1.cats == ["camera", "live"]
    assert e1.extra == {"q": 42, "cam": 0}
    assert e1.dur == 0

    e2 = items[1]
    assert e2.size == 2000                                     # from the DB, without stat
    assert e2.parts == [("IMG_0002.HEIC", 2000, "original")]
    assert all(not s.endswith("IMG_0002.HEIC") for s in afc.stats)

    video = items[2]
    assert video.kind == "video" and video.dur == 5.2
    assert video.size == 100                                   # from stat because the DB said 0
    assert video.parts == [("VID_0004.MOV", 100, "original")]   # a video does not carry a live part

    assert progress[-1] == (2, 2)


def test_classification_is_returned(monkeypatch):
    classification = Classification(rows=rows())
    f, _ = source(monkeypatch, classification=classification)
    assert f.classification() is classification


def test_image_thumbnail_and_fallback(monkeypatch):
    f, _ = source(monkeypatch)
    e1, e2, _, png = f.list_items(None)
    assert f.image(e1, False) == (b"mini1", "image/jpeg")
    assert f.image(e1, True) == (b"mini1", "image/jpeg")       # there is no 5005: it uses the 5003
    assert f.image(e2, False) == (b"small2", "image/jpeg")
    assert f.image(e2, True) == (b"large2", "image/jpeg")
    assert f.image(png, False) == (b"png", "image/png")        # no thumbnail: the small original

    heic = usb.Item("X", "NO.HEIC", 100, 0.0, "photo", [("NO.HEIC", 100, "original")],
                    "DCIM/100APPLE/NO.HEIC")
    assert f.image(heic, False) == (None, None)


def test_open_video_with_ranges(monkeypatch):
    f, afc = source(monkeypatch)
    video = f.list_items(None)[2]
    data = FILES["/DCIM/101APPLE/VID_0004.MOV"]

    r = f.open_video(video, None)
    assert r.status_code == 200
    assert r.headers == {"Accept-Ranges": "bytes", "Content-Length": "100"}
    with r:
        assert b"".join(r.iter_content(30)) == data
    assert not afc.handles                                     # the handle is closed at the end

    r = f.open_video(video, "bytes=10-19")
    assert r.status_code == 206
    assert r.headers["Content-Range"] == "bytes 10-19/100"
    assert r.headers["Content-Length"] == "10"
    with r:
        assert b"".join(r.iter_content(4)) == data[10:20]

    r = f.open_video(video, "bytes=90-")
    assert r.status_code == 206
    with r:
        assert b"".join(r.iter_content(64)) == data[90:]
    assert not afc.handles

    r = f.open_video(video, "bytes=200-300")
    assert r.status_code == 416
    assert r.headers["Content-Range"] == "bytes */100"
    assert r.headers["Content-Length"] == "0"
    with r:
        assert b"".join(r.iter_content(16)) == b""

    photo_with_live = f.list_items(None)[0]
    r = f.open_video(photo_with_live, None)
    assert r is not None
    with r:
        assert b"".join(r.iter_content(1024)) == FILES["/DCIM/100APPLE/IMG_0001.MOV"]

    photo_without_live = f.list_items(None)[1]
    assert f.open_video(photo_without_live, None) is None


def test_download(monkeypatch, tmp_path):
    f, _ = source(monkeypatch)
    e1 = f.list_items(None)[0]
    chunks = []
    dest = tmp_path / "IMG_0001.HEIC"
    n = f.download(e1, "original", dest, chunks.append)
    assert n == 1000
    assert dest.read_bytes() == FILES["/DCIM/100APPLE/IMG_0001.HEIC"]
    assert sum(chunks) == 1000

    live = tmp_path / "IMG_0001.MOV"
    assert f.download(e1, "live", live, lambda n: None) == 4000
    assert live.read_bytes() == FILES["/DCIM/100APPLE/IMG_0001.MOV"]

    with pytest.raises(IOError):
        f.download(e1, "original-old", tmp_path / "nothing.bin", lambda n: None)


def _ptp(monkeypatch, delete):
    module = types.SimpleNamespace(delete=delete)
    monkeypatch.setitem(sys.modules, "icleaning.sources.ptp", module)
    monkeypatch.setattr(sources, "ptp", module, raising=False)
    return module


def test_delete_many_matches_paths(monkeypatch):
    f, _ = source(monkeypatch)
    els = f.list_items(None)

    def delete(udid, paths):
        assert udid == "UDID-FAKE"
        assert paths == [e.ref for e in els]
        yield paths[0], None
        yield paths[1], ValueError("could not")

    _ptp(monkeypatch, delete)
    result = list(f.delete_many(els))
    assert [e for e, _ in result] == els
    assert result[0][1] is None
    assert isinstance(result[1][1], ValueError)


def test_delete_many_batch_failure(monkeypatch):
    f, _ = source(monkeypatch)
    els = f.list_items(None)

    def delete(udid, paths):
        raise RuntimeError("the iPhone does not answer")

    _ptp(monkeypatch, delete)
    result = list(f.delete_many(els))
    assert [e for e, _ in result] == els
    assert all(isinstance(ex, RuntimeError) for _, ex in result)


def test_delete_many_empty_does_not_call_ptp(monkeypatch):
    f, _ = source(monkeypatch)

    def delete(udid, paths):  # pragma: no cover - it must not be called
        raise AssertionError("it should not be called")

    _ptp(monkeypatch, delete)
    assert list(f.delete_many([])) == []


def test_copy_photos_db(monkeypatch, tmp_path):
    original = tmp_path / "orig.sqlite"
    con = sqlite3.connect(original)
    con.execute("CREATE TABLE ZASSET (Z_PK INTEGER)")
    con.execute("INSERT INTO ZASSET VALUES (7)")
    con.commit()
    con.close()

    files = {
        "/PhotoData/Photos.sqlite": original.read_bytes(),
        "/PhotoData/Photos.sqlite-wal": b"wal",
        "/PhotoData/Caches/search/psi.sqlite": b"psi",
    }
    afc = FakeAfc(files)
    monkeypatch.setattr(usb._Afc, "open", classmethod(lambda cls, udid=None: afc))

    dest = tmp_path / "cache"
    dest.mkdir()
    (dest / "Photos.sqlite-shm").write_bytes(b"old")           # leftover from an earlier copy
    progress = []
    path = usb.copy_photos_db("UDID-FAKE", dest, lambda h, t: progress.append((h, t)))

    assert path == dest / "Photos.sqlite"
    # The old -shm was left over. It is checked before opening the DB: opening it creates a new one because of the -wal.
    assert not (dest / "Photos.sqlite-shm").exists()
    con = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    assert con.execute("SELECT Z_PK FROM ZASSET").fetchone() == (7,)
    con.close()
    assert (dest / "Photos.sqlite-wal").read_bytes() == b"wal"
    assert (dest / "psi.sqlite").read_bytes() == b"psi"
    assert progress and progress[-1] == (progress[-1][0], progress[-1][1])
    assert progress[-1][0] == progress[-1][1] == len(files["/PhotoData/Photos.sqlite"]) + 3
    assert afc.closed


def test_usb_error_codes():
    assert usb.USBError("usb.trust").code == "usb.trust"
    assert "Trust" in str(usb.USBError("usb.trust"))
    assert usb.USBError("made-up").code == "usb.other"


def test_map_real_exceptions():
    pex = pytest.importorskip("pymobiledevice3.exceptions")
    assert usb._map_error(pex.ConnectionFailedToUsbmuxdError()).code == "usb.noDriver"
    assert usb._map_error(pex.NoDeviceConnectedError()).code == "usb.noDevice"
    assert usb._map_error(pex.PairingDialogResponsePendingError()).code == "usb.trust"
    assert usb._map_error(pex.UserDeniedPairingError()).code == "usb.trust"
    assert usb._map_error(pex.PasswordRequiredError()).code == "usb.locked"
    assert usb._map_error(pex.PasscodeRequiredError("locked", None, "18.0")).code == "usb.locked"
    assert usb._map_error(pex.ConnectionTerminatedError()).code == "usb.disconnected"
    assert usb._map_error(ValueError("x")).code == "usb.other"
