"""Deleting photos from the iPhone over PTP (the official route of Image Capture and Windows Photos).

Reading the photo library over AFC is safe, but deleting over AFC would corrupt the iPhone: to
delete you have to speak PTP. The iPhone only allows deleting over PTP if «iCloud Photos» is
off; if it is on it refuses the deletion (access denied). Deleting over PTP is permanent: it
does not go through «Recently Deleted».

This module is the common face; each system has its backend:

- Linux   `ptp_linux`   python-gphoto2 (libgphoto2).
- macOS   `ptp_mac`     pyobjc / ImageCaptureCore.
- Windows `ptp_windows` comtypes / Windows Portable Devices.

The backends are imported inside the functions so that the module can be imported on any
system without their libraries installed.
"""
from __future__ import annotations

import os
import sys
from typing import Iterator

# Error codes the interface understands. They are stable even if the text changes.
CODES = {
    "ptp.notSupported",
    "ptp.noDevice",
    "ptp.icloudEnabled",
    "ptp.locked",
    "ptp.busy",
    "ptp.notFound",
    "ptp.other",
}

# With «Transfer to Mac or PC: Automatic» the iPhone presents HEICs as JPG.
# If we look for a HEIC and the device offers JPG/JPEG, it is the same file.
COMPATIBLE = {
    "heic": ("jpg", "jpeg"),
    "mov": ("mp4", "mov"),
}

# Backend injectable from the tests (or from anyone who wants another transport).
_forced_backend = None


class PTPError(Exception):
    """PTP error with a stable code in `code`, plus the message for the user."""

    def __init__(self, code: str, message: str | None = None):
        self.code = code if code in CODES else "ptp.other"
        self.message = message or code
        super().__init__(self.message)

    def __str__(self) -> str:
        return self.message


def _backend():
    """Returns the backend module of the current system (lazy import)."""
    if _forced_backend is not None:
        return _forced_backend
    if sys.platform.startswith("linux"):
        from . import ptp_linux as backend
    elif sys.platform == "darwin":
        from . import ptp_mac as backend
    elif sys.platform in ("win32", "cygwin"):
        from . import ptp_windows as backend
    else:
        raise PTPError("ptp.notSupported", f"PTP is not supported on this platform ({sys.platform})")
    return backend


def supported() -> tuple[bool, str]:
    """Can PTP be used on this system? Returns (yes/no, reason if no)."""
    try:
        backend = _backend()
    except PTPError as ex:
        return False, ex.message
    except Exception as ex:  # noqa: BLE001 - a broken library must not take the app down
        return False, f"could not load the PTP backend: {type(ex).__name__}: {ex}"
    try:
        return backend.supported()
    except Exception as ex:  # noqa: BLE001
        return False, f"{type(ex).__name__}: {ex}"


def _split_path(path: str) -> tuple[str, str]:
    """'DCIM/100APPLE/IMG_0001.HEIC' -> ('100APPLE', 'IMG_0001.HEIC')."""
    parts = [p for p in path.replace("\\", "/").strip("/").split("/") if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return "", parts[0]
    return parts[-2], parts[-1]


def _folder(folder: str) -> str:
    """Normalises a folder to its last component and lower case."""
    return folder.replace("\\", "/").strip("/").rsplit("/", 1)[-1].lower()


def _extension(name: str) -> str:
    return os.path.splitext(name)[1].lstrip(".").lower()


def _base(name: str) -> str:
    return os.path.splitext(name)[0].lower()


def _key(folder: str, name: str) -> tuple[str, str]:
    return (_folder(folder), name.lower())


def match(paths, objects) -> dict[str, object | PTPError]:
    """Matches paths from the database with objects seen over PTP.

    `objects` are tuples (folder, name, handle), with the folder as the last component
    (for instance "100APPLE"). Two rules are tried, in order:

    1. same folder and same name, case-insensitive;
    2. same folder and same base name with a compatible extension (HEIC -> JPG/JPEG,
       MOV -> MP4/MOV), because the iPhone may present the HEIC as JPG.

    If a rule does not leave exactly one candidate, the path stays as a PTPError
    ("ptp.notFound"). «The closest one» is never chosen: when in doubt, nothing is deleted.
    """
    by_folder: dict[str, list[tuple[str, str, object]]] = {}
    for folder, name, handle in objects:
        by_folder.setdefault(_folder(folder), []).append((folder, name, handle))

    result: dict[str, object | PTPError] = {}
    for path in paths:
        folder, name = _split_path(path)
        candidates = by_folder.get(_folder(folder), [])

        exact = [o for o in candidates if o[1].lower() == name.lower()]
        if len(exact) == 1:
            result[path] = exact[0][2]
            continue
        if len(exact) > 1:
            result[path] = PTPError("ptp.notFound", f"there are several files matching {path}")
            continue

        ext = _extension(name)
        compatible = COMPATIBLE.get(ext, ())
        similar = []
        if compatible:
            base = _base(name)
            similar = [o for o in candidates
                       if _base(o[1]) == base and _extension(o[1]) in compatible]
        if len(similar) == 1:
            result[path] = similar[0][2]
        elif len(similar) > 1:
            result[path] = PTPError("ptp.notFound", f"there are several files matching {path}")
        else:
            result[path] = PTPError("ptp.notFound", f"{path} was not found on the iPhone")
    return result


def _object_for(objects, handle):
    """Tuple (folder, name, handle) corresponding to a handle (identity)."""
    for obj in objects:
        if obj[2] is handle:
            return obj
    return None


def _find_object(objects, folder: str, name: str):
    c = _folder(folder)
    n = name.lower()
    for obj in objects:
        if _folder(obj[0]) == c and obj[1].lower() == n:
            return obj
    return None


def _close(backend, device) -> None:
    if backend is None or device is None:
        return
    close = getattr(backend, "close", None)
    if close is not None:
        try:
            close(device)
        except Exception:  # noqa: BLE001
            pass


def _delete_one(backend, device, handle) -> PTPError | None:
    try:
        backend.delete(device, handle)
        return None
    except PTPError as ex:
        return ex
    except Exception as ex:  # noqa: BLE001
        return PTPError("ptp.other", f"{type(ex).__name__}: {ex}")


def delete(udid: str, paths: list[str], dry_run: bool = False) -> Iterator[tuple[str, Exception | None]]:
    """Deletes the given paths over PTP, one by one.

    Yields (path, None) on deletion (or on dry run) and (path, PTPError) if it fails. After deleting
    IMG_X.HEIC, IMG_X.MOV from the same folder (the Live Photo's video) is deleted too, if it
    still exists. An access/write-protection failure on the first deletion is read as «iCloud
    Photos» on: that one and all the others return the same error, without trying any further.

    `udid` is accepted for the common API, but PTP does not need it: there is only one PTP iPhone
    at a time. With `dry_run=True` the whole matching is done but nothing is deleted.
    """
    paths = list(paths)
    backend = None
    device = None
    try:
        backend = _backend()
        device = backend.find_iphone()
        objects = backend.list_objects(device)
    except PTPError as ex:
        _close(backend, device)
        for path in paths:
            yield path, ex
        return
    except Exception as ex:  # noqa: BLE001
        _close(backend, device)
        error = PTPError("ptp.other", f"{type(ex).__name__}: {ex}")
        for path in paths:
            yield path, error
        return

    try:
        pairs = match(paths, objects)

        if dry_run:
            for path in paths:
                value = pairs.get(path)
                yield path, value if isinstance(value, PTPError) else None
            return

        cut: PTPError | None = None
        deleted: set[tuple[str, str]] = set()
        for path in paths:
            if cut is not None:
                yield path, cut
                continue

            value = pairs.get(path)
            if isinstance(value, PTPError):
                yield path, value
                continue

            obj = _object_for(objects, value)
            folder, name = (obj[0], obj[1]) if obj else _split_path(path)
            key = _key(folder, name)
            if key in deleted:
                yield path, None          # already deleted as the video of a Live Photo
                continue

            error = _delete_one(backend, device, value)
            if error is not None:
                if error.code == "ptp.icloudEnabled":
                    cut = error
                yield path, error
                continue

            deleted.add(key)
            yield path, None

            # Live Photo: the paired video shares the base name and is in the same folder.
            base = os.path.splitext(name)[0]
            companion = _find_object(objects, folder, base + ".MOV")
            if companion is None or companion[2] is value:
                continue
            companion_key = _key(companion[0], companion[1])
            if companion_key in deleted:
                continue
            error = _delete_one(backend, device, companion[2])
            if error is None:
                deleted.add(companion_key)
            elif error.code == "ptp.icloudEnabled":
                cut = error
            # If the companion no longer exists (ptp.notFound) it is not an error: the user may have
            # deleted it, or the Live Photo itself when the photo disappeared.
    finally:
        _close(backend, device)
