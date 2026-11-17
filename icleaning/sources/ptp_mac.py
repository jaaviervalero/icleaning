"""PTP backend for macOS: pyobjc-framework-ImageCaptureCore.

ImageCaptureCore is what Image Capture uses. A session is opened with the iPhone, it waits
for the whole catalogue to arrive and the deletion goes through requestDeleteFiles.

NOT VERIFIED: this machine (Linux) has no macOS and no iPhone, so this backend is written
following the documentation but has never been run. The most fragile points are commented.
All pyobjc imports are lazy so that the module can be imported on Linux without pyobjc
installed.
"""
from __future__ import annotations

import logging
import time

from .ptp import PTPError

log = logging.getLogger(__name__)

_Delegate = None


def _load():
    """Imports Foundation/ImageCaptureCore. Raises PTPError if they are not available."""
    try:
        import objc
        from Foundation import NSDate, NSDefaultRunLoopMode, NSObject, NSRunLoop
        import ImageCaptureCore as ic
    except Exception as ex:  # noqa: BLE001 - the framework import can fail, not just ImportError
        raise PTPError("ptp.notSupported",
                       f"pyobjc-framework-ImageCaptureCore is missing ({type(ex).__name__}: {ex})")
    return objc, ic, NSObject, NSRunLoop, NSDefaultRunLoopMode, NSDate


def supported() -> tuple[bool, str]:
    try:
        _load()
    except PTPError as ex:
        return False, ex.message
    return True, ""


def _spin(condition, seconds: float, NSRunLoop, NSDate, NSDefaultRunLoopMode) -> bool:
    """Spins the run loop until the condition holds or the time limit passes."""
    end = time.monotonic() + seconds
    loop = NSRunLoop.currentRunLoop()
    while not condition() and time.monotonic() < end:
        loop.runMode_beforeDate_(NSDefaultRunLoopMode, NSDate.dateWithTimeIntervalSinceNow_(0.05))
    return condition()


def _create_delegate(NSObject, objc, ic):
    """Delegate class for ICDeviceBrowser/ICCameraDevice (it is created only once)."""
    global _Delegate
    if _Delegate is not None:
        return _Delegate

    class Delegate(NSObject):
        def init(self):
            self = objc.super(Delegate, self).init()
            if self is None:
                return None
            self.devices = []
            self.catalog = False
            self.error = None
            return self

        # ICDeviceBrowserDelegate
        def deviceBrowser_didAddDevice_moreComing_(self, browser, device, more_coming):
            try:
                text = " ".join(str(x or "") for x in (
                    getattr(device, "name", lambda: "")(),
                    getattr(device, "model", lambda: "")(),
                    getattr(device, "productKind", lambda: "")(),
                )).lower()
            except Exception:  # noqa: BLE001
                text = ""
            # An iPhone shows up as an ICCameraDevice; on top of that the text has to mention
            # Apple/iPhone so as not to take another camera that may be connected.
            if "iphone" in text or "apple" in text:
                self.devices.append(device)

        def deviceBrowser_didRemoveDevice_(self, browser, device):
            try:
                self.devices.remove(device)
            except ValueError:
                pass

        # ICDeviceDelegate
        def device_didEncounterError_(self, device, error):
            self.error = error

        # ICCameraDeviceDelegate
        def cameraDeviceDidBecomeReadyWithCompleteContentCatalog_(self, device):
            self.catalog = True

        def cameraDevice_didCloseSessionWithError_(self, device, error):
            if error is not None:
                self.error = error

    _Delegate = Delegate
    return Delegate


def _translate_error(error) -> PTPError:
    """NSError from ImageCaptureCore -> PTPError. The text is the most reliable clue."""
    text = ""
    try:
        text = str(error.localizedDescription() or "")
    except Exception:  # noqa: BLE001
        pass
    try:
        text = f"{text} {error.userInfo()}"
    except Exception:  # noqa: BLE001
        pass
    low = text.lower()
    if any(p in low for p in ("denied", "access", "protected", "read-only", "readonly",
                              "not permitted", "not authorized", "permission")):
        return PTPError("ptp.icloudEnabled",
                        "the iPhone has denied the deletion. Turn off «iCloud Photos» "
                        "in Settings > your name > iCloud > Photos and try again.")
    if "locked" in low or "bloquead" in low:
        return PTPError("ptp.locked", "unlock the iPhone and try again")
    if "busy" in low or "in use" in low:
        return PTPError("ptp.busy", "the iPhone is busy with another program or session")
    if "not found" in low or "no such" in low:
        return PTPError("ptp.notFound", "the file is no longer on the iPhone")
    return PTPError("ptp.other", f"ImageCaptureCore: {text or error}")


def find_iphone():
    """Looks for the iPhone with ICDeviceBrowser. It does not open the session yet (listing does)."""
    objc, ic, NSObject, NSRunLoop, NSDefaultRunLoopMode, NSDate = _load()
    Delegate = _create_delegate(NSObject, objc, ic)

    delegate = Delegate.alloc().init()
    browser = ic.ICDeviceBrowser.alloc().init()
    browser.setDelegate_(delegate)
    try:
        # Local cameras (USB). The mask names exist in every version; if they changed, it carries
        # on without the mask and the delegate filters by Apple/iPhone.
        mask = ic.ICDeviceTypeMaskCamera
        for name in ("ICDeviceLocationTypeMaskLocal", "ICDeviceLocationTypeMaskDirect"):
            value = getattr(ic, name, None)
            if value is not None:
                mask |= value
        browser.setBrowsedDeviceTypeMask_(mask)
    except Exception:  # noqa: BLE001
        log.debug("Could not set the device mask", exc_info=True)
    browser.start()

    found = _spin(lambda: bool(delegate.devices), 15.0, NSRunLoop, NSDate, NSDefaultRunLoopMode)
    if not found:
        try:
            browser.stop()
        except Exception:  # noqa: BLE001
            pass
        raise PTPError("ptp.noDevice",
                       "no iPhone connected over USB was found "
                       "(unlock it and accept «Trust this computer»)")
    # The browser is not stopped: some systems stop delivering device events if the browser is
    # stopped. It is stopped in close().
    return {"device": delegate.devices[0], "browser": browser, "delegate": delegate,
            "session": False}


def _open_session(device) -> None:
    if device.get("session"):
        return
    _, ic, _, NSRunLoop, NSDefaultRunLoopMode, NSDate = _load()
    delegate = device["delegate"]
    dev = device["device"]
    delegate.catalog = False
    delegate.error = None
    try:
        dev.setDelegate_(delegate)
        opened = bool(dev.requestOpenSession())
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.busy", f"could not open the session with the iPhone: {ex}")
    if not opened:
        raise PTPError("ptp.busy",
                       "the iPhone did not open the PTP session: close it in Image Capture "
                       "or in Photos and try again")
    ready = _spin(lambda: delegate.catalog or delegate.error is not None,
                  30.0, NSRunLoop, NSDate, NSDefaultRunLoopMode)
    if not ready or not delegate.catalog:
        if delegate.error is not None:
            raise _translate_error(delegate.error)
        raise PTPError("ptp.busy",
                       "the iPhone has not finished sending the catalogue (it may be busy)")
    device["session"] = True


def list_objects(device) -> list[tuple[str, str, object]]:
    """iPhone catalogue: (parent folder name, name, ICCameraFile)."""
    _open_session(device)
    dev = device["device"]
    try:
        allowed = bool(dev.canDeleteOneOrMoreFiles())
    except Exception:  # noqa: BLE001 - property not available in old versions
        allowed = True
    if not allowed:
        raise PTPError("ptp.icloudEnabled",
                       "the iPhone does not allow deleting: turn off «iCloud Photos» in "
                       "Settings > your name > iCloud > Photos and try again")
    objects = []
    for file_asset in dev.mediaFiles() or []:
        try:
            name = str(file_asset.name() or "")
            parent = file_asset.parentFolder()
            folder = str(parent.name() or "") if parent is not None else ""
        except Exception:  # noqa: BLE001
            continue
        if name:
            objects.append((folder, name, file_asset))
    return objects


def delete(device, file_asset) -> None:
    """Deletes an ICCameraFile. On macOS 10.15+ the completion is awaited; before, there is no notice."""
    _, ic, _, NSRunLoop, NSDefaultRunLoopMode, NSDate = _load()
    dev = device["device"]
    state = {"done": False, "error": None}

    def completion(error):
        state["error"] = error
        state["done"] = True

    try:
        if hasattr(dev, "requestDeleteFiles_completion_"):
            dev.requestDeleteFiles_completion_([file_asset], completion)
        else:
            # macOS before 10.15: there is no completion. It is assumed done, without confirmation.
            dev.requestDeleteFiles_([file_asset])
            state["done"] = True
    except Exception as ex:  # noqa: BLE001
        raise PTPError("ptp.other", f"could not request the deletion: {ex}")

    if not state["done"]:
        _spin(lambda: state["done"], 30.0, NSRunLoop, NSDate, NSDefaultRunLoopMode)
    if not state["done"]:
        raise PTPError("ptp.busy", "the iPhone has not answered the deletion")
    if state["error"] is not None:
        raise _translate_error(state["error"])


def close(device) -> None:
    dev = device.get("device")
    if device.get("session") and dev is not None:
        try:
            dev.requestCloseSession()
        except Exception:  # noqa: BLE001
            pass
    try:
        if device.get("browser") is not None:
            device["browser"].stop()
    except Exception:  # noqa: BLE001
        pass
