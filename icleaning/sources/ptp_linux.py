"""PTP backend for Linux: python-gphoto2 (libgphoto2).

The `gphoto2` wheel brings libgphoto2 along, so nothing else has to be installed. The iPhone
has to be unlocked and «Trust this computer» accepted; if the file manager (gvfs) has it
open, libgphoto2 will not be able to claim the USB: that is "ptp.busy".

Not verified against a real iPhone on this machine (there is none connected). It is checked,
though, that the library imports and that the module loads without errors.
"""
from __future__ import annotations

import logging

from .ptp import PTPError

log = logging.getLogger(__name__)


def supported() -> tuple[bool, str]:
    """Is python-gphoto2 available?"""
    try:
        import gphoto2  # noqa: F401
    except Exception as ex:  # noqa: BLE001 - the .so import can fail, not just ImportError
        return False, f"python-gphoto2/libgphoto2 is missing ({type(ex).__name__}: {ex})"
    return True, ""


def _gp():
    try:
        import gphoto2
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.notSupported", f"python-gphoto2/libgphoto2 is missing ({type(ex).__name__}: {ex})")
    return gphoto2


def _translate(ex, gp) -> PTPError:
    """Turns a GPhoto2Error into a PTPError with a stable code."""
    code = getattr(ex, "code", None)
    text = str(ex).lower()

    if code in (gp.GP_ERROR_IO_USB_CLAIM, gp.GP_ERROR_CAMERA_BUSY):
        return PTPError("ptp.busy",
                        "libgphoto2 cannot open the iPhone: another program has it open "
                        "(the file manager, for instance). Close it and try again.")
    if code == gp.GP_ERROR_FILE_NOT_FOUND:
        return PTPError("ptp.notFound", "the file is no longer on the iPhone")
    if "locked" in text or "bloquead" in text:
        return PTPError("ptp.locked", "unlock the iPhone and try again")
    if code in (gp.GP_ERROR_NOT_SUPPORTED, gp.GP_ERROR_CAMERA_ERROR,
                gp.GP_ERROR_OS_FAILURE) or any(
            word in text for word in ("denied", "protected", "read-only", "readonly",
                                      "not permitted", "not authorized")):
        return PTPError("ptp.icloudEnabled",
                        "the iPhone has denied the deletion. Turn off «iCloud Photos» "
                        "in Settings > your name > iCloud > Photos and try again.")
    return PTPError("ptp.other", f"libgphoto2: {ex}")


def find_iphone():
    """Detects the iPhone by autodetection and opens the PTP camera."""
    gp = _gp()
    try:
        camera = gp.Camera()
        listing = camera.autodetect()
        entries = list(listing.items())
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.noDevice", f"could not look for the iPhone: {ex}")

    if not entries:
        raise PTPError("ptp.noDevice",
                       "no iPhone connected over USB (or it is locked/not trusted)")

    chosen = None
    for model, port in entries:
        text = f"{model} {port}".lower()
        if "iphone" in text or "apple" in text:
            chosen = (model, port)
            break
    if chosen is None:
        models = ", ".join(str(m) for m, _ in entries)
        raise PTPError("ptp.noDevice", f"no iPhone found over USB (seen: {models})")

    try:
        camera = gp.Camera()
        ports = gp.PortInfoList()
        ports.load()
        index = ports.lookup_path(chosen[1])
        if index < 0:
            raise PTPError("ptp.noDevice", f"port {chosen[1]} is no longer available")
        camera.set_port_info(ports[index])
        camera.init()
    except PTPError:
        raise
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.other", f"could not open the iPhone: {ex}")

    return {"camera": camera, "model": chosen[0]}


def _folders(camera, path: str, gp) -> list[str]:
    try:
        return [name for name, _ in camera.folder_list_folders(path).items()]
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)


def _files(camera, path: str, gp) -> list[tuple[str, str, tuple[str, str]]]:
    """Files of a PTP folder: (last component, name, handle for file_delete)."""
    try:
        names = [name for name, _ in camera.folder_list_files(path).items()]
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)
    folder = path.rstrip("/").rsplit("/", 1)[-1]
    return [(folder, name, (path, name)) for name in names]


def list_objects(device) -> list[tuple[str, str, object]]:
    """Walks /store_*/DCIM/* and returns the files PTP sees."""
    gp = _gp()
    camera = device["camera"]
    objects: list[tuple[str, str, object]] = []
    try:
        for store in _folders(camera, "/", gp):
            root = "/" + store
            for folder in _folders(camera, root, gp):
                if folder.lower() != "dcim":
                    continue
                dcim = root + "/" + folder
                objects.extend(_files(camera, dcim, gp))
                for sub in _folders(camera, dcim, gp):
                    objects.extend(_files(camera, dcim + "/" + sub, gp))
    except PTPError:
        raise
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.other", f"could not read the iPhone: {ex}")
    return objects


def delete(device, handle) -> None:
    """Deletes a file. `handle` is (PTP folder, name)."""
    gp = _gp()
    folder, name = handle
    try:
        device["camera"].file_delete(folder, name)
    except gp.GPhoto2Error as ex:
        raise _translate(ex, gp)
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.other", f"could not delete {name}: {ex}")


def close(device) -> None:
    try:
        device["camera"].exit()
    except Exception:  # noqa: BLE001
        pass
