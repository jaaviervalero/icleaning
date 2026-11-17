"""PTP backend for Windows: comtypes + Windows Portable Devices (WPD).

It is the same route Windows Explorer / Photos uses to delete from the iPhone. The WPD
devices are enumerated, the Apple/iPhone one is chosen, the tree is walked from "DEVICE" and
the deletion goes through IPortableDeviceContent.Delete.

NOT VERIFIED: this machine (Linux) has no Windows and no iPhone; the code follows the WPD API
but has never been run. The most fragile points are commented. comtypes is only imported
inside the functions so that the module can be imported on Linux.
"""
from __future__ import annotations

import logging
from ctypes import ArgumentError, byref, c_ulong, c_wchar, c_wchar_p

from .ptp import PTPError

log = logging.getLogger(__name__)

# Constants from PortableDevice.h. The ones from the comtypes-generated module are preferred;
# these values are the fallback in case that version of the typelib does not export them.
_FMTID_OBJECT = "{EF6B490D-5CD8-437A-AFFC-DA8B60EE4A3C}"
_FMTID_CLIENT = "{204D9F0C-2292-4080-9F42-40664E70F859}"
_FOLDER_GUID = "27e2e392-a111-48e0-ab0c-e17705a05f85"   # WPD_CONTENT_TYPE_FOLDER
_KEYS = {
    # name                       fmtid           pid
    "WPD_OBJECT_ID":             (_FMTID_OBJECT, 2),
    "WPD_OBJECT_PARENT_ID":      (_FMTID_OBJECT, 3),
    "WPD_OBJECT_NAME":           (_FMTID_OBJECT, 4),
    "WPD_OBJECT_CONTENT_TYPE":   (_FMTID_OBJECT, 7),
    "WPD_OBJECT_ORIGINAL_FILE_NAME": (_FMTID_OBJECT, 12),
    "WPD_CLIENT_NAME":           (_FMTID_CLIENT, 2),
    "WPD_CLIENT_MAJOR_VERSION":  (_FMTID_CLIENT, 3),
    "WPD_CLIENT_MINOR_VERSION":  (_FMTID_CLIENT, 4),
    "WPD_CLIENT_REVISION":       (_FMTID_CLIENT, 5),
}


def _load():
    """Imports comtypes and generates the WPD modules."""
    try:
        import comtypes
        import comtypes.client
        api = comtypes.client.GetModule("portabledeviceapi.dll")
        types = comtypes.client.GetModule("portabledevicetypes.dll")
    except Exception as ex:  # noqa: BLE001 - on Linux/macOS comtypes does not even exist
        raise PTPError("ptp.notSupported",
                       f"comtypes/Windows Portable Devices is missing ({type(ex).__name__}: {ex})")
    return comtypes, api, types


def supported() -> tuple[bool, str]:
    try:
        _load()
    except PTPError as ex:
        return False, ex.message
    return True, ""


def _propkey(comtypes, api, types, name: str):
    """PROPERTYKEY of a WPD property (typelib constant or built by hand)."""
    for module in (api, types):
        value = getattr(module, name, None)
        if value is not None:
            return value
    fmtid, pid = _KEYS[name]
    structure = getattr(types, "PROPERTYKEY", None) or getattr(types, "tagPROPERTYKEY", None)
    if structure is None:
        raise PTPError("ptp.notSupported", "the WPD typelib does not expose PROPERTYKEY")
    key = structure()
    key.fmtid = comtypes.GUID(fmtid)
    key.pid = pid
    return key


def _add(collection, value) -> None:
    """Add() of the WPD collections: some versions take the value and others a pointer."""
    try:
        collection.Add(value)
    except (TypeError, ValueError, ArgumentError):
        collection.Add(byref(value))


def _device_text(manager, pnp_id, which: str) -> str:
    """GetDeviceFriendlyName/GetDeviceDescription in two steps (size and text)."""
    method = getattr(manager, which)
    size = c_ulong(0)
    try:
        method(pnp_id, None, byref(size))
    except Exception:  # noqa: BLE001
        return ""
    if size.value <= 0:
        return ""
    buffer = (c_wchar * size.value)()
    try:
        method(pnp_id, buffer, byref(size))
    except Exception:  # noqa: BLE001
        return ""
    return buffer.value or ""


def _children(content, object_id: str) -> list[str]:
    """Identifiers of the child objects of a WPD one."""
    enum = content.EnumObjects(0, object_id, None)   # 0 = no filter
    if enum is None:
        return []
    out = []
    while True:
        identifiers = (c_wchar_p * 1)()
        taken = c_ulong(0)
        enum.Next(1, identifiers, byref(taken))
        if taken.value == 0:
            break
        out.append(identifiers[0])
    return out


def _read_text(values, key, c_wchar_p, byref) -> str:
    try:
        value = values.GetStringValue(key)
    except (TypeError, ArgumentError):
        # Some comtypes versions ask for an explicit output buffer.
        buffer = c_wchar_p()
        values.GetStringValue(key, byref(buffer))
        value = buffer.value
    if isinstance(value, tuple):
        value = value[0]
    return str(value) if value else ""


def _read_guid(values, key) -> str:
    try:
        value = values.GetGuidValue(key)
    except Exception:  # noqa: BLE001
        return ""
    if isinstance(value, tuple):
        value = value[0]
    return str(value).strip("{}").lower()


def _object_data(comtypes, api, types, content, object_id: str):
    """(visible name, original name, is it a folder?) of a WPD object."""
    keys = comtypes.client.CreateObject(
        types.PortableDeviceKeyCollection, interface=types.IPortableDeviceKeyCollection)
    _add(keys, _propkey(comtypes, api, types, "WPD_OBJECT_NAME"))
    _add(keys, _propkey(comtypes, api, types, "WPD_OBJECT_ORIGINAL_FILE_NAME"))
    _add(keys, _propkey(comtypes, api, types, "WPD_OBJECT_CONTENT_TYPE"))
    try:
        values = content.Properties().GetValues(object_id, keys)
    except Exception as ex:  # noqa: BLE001
        log.debug("No properties for %s: %s", object_id, ex)
        return "", "", False

    name = _read_text(values, _propkey(comtypes, api, types, "WPD_OBJECT_NAME"),
                      c_wchar_p, byref)
    original = _read_text(values, _propkey(comtypes, api, types, "WPD_OBJECT_ORIGINAL_FILE_NAME"),
                          c_wchar_p, byref)
    content_type = _read_guid(values, _propkey(comtypes, api, types, "WPD_OBJECT_CONTENT_TYPE"))
    folder = (content_type == _FOLDER_GUID) or (not original and bool(name))
    return name, original, folder


def find_iphone():
    """Enumerates WPD devices and opens the Apple/iPhone one."""
    comtypes, api, types = _load()
    comtypes.CoInitialize()
    try:
        manager = comtypes.client.CreateObject(
            api.PortableDeviceManager, interface=api.IPortableDeviceManager)
        count = c_ulong(0)
        manager.GetDevices(None, byref(count))
        pnp_ids = (c_wchar_p * count.value)() if count.value else []
        if count.value:
            manager.GetDevices(pnp_ids, byref(count))

        chosen = None
        seen = []
        for pnp_id in pnp_ids:
            names = " ".join(_device_text(manager, pnp_id, method) for method in
                             ("GetDeviceFriendlyName", "GetDeviceDescription")).lower()
            seen.append(names or pnp_id)
            # VID_05AC is Apple. The name is usually «... iPhone»; both are accepted.
            if "iphone" in names or "apple" in names or "vid_05ac" in pnp_id.lower():
                chosen = pnp_id
                break
        if chosen is None:
            if not seen:
                raise PTPError("ptp.noDevice",
                               "no iPhone connected over USB (or it is locked)")
            raise PTPError("ptp.noDevice",
                           f"no iPhone found among the WPD devices ({', '.join(seen)})")

        device = comtypes.client.CreateObject(api.PortableDevice, interface=api.IPortableDevice)
        client_info = comtypes.client.CreateObject(
            types.PortableDeviceValues, interface=types.IPortableDeviceValues)
        client_info.SetStringValue(_propkey(comtypes, api, types, "WPD_CLIENT_NAME"), "iCleaning")
        for name, value in (("WPD_CLIENT_MAJOR_VERSION", 1),
                            ("WPD_CLIENT_MINOR_VERSION", 0),
                            ("WPD_CLIENT_REVISION", 0)):
            try:
                client_info.SetUnsignedIntegerValue(_propkey(comtypes, api, types, name), value)
            except Exception:  # noqa: BLE001 - it is not essential
                pass
        device.Open(chosen, client_info)
        content = device.Content()
    except PTPError:
        comtypes.CoUninitialize()
        raise
    except Exception as ex:  # noqa: BLE001
        comtypes.CoUninitialize()
        raise _translate_com(ex)
    return {"comtypes": comtypes, "api": api, "types": types, "device": device,
            "content": content, "pnp_id": chosen, "initialized": True}


def list_objects(device) -> list[tuple[str, str, object]]:
    """Walks the WPD tree from DEVICE and returns the files that are under DCIM."""
    comtypes = device["comtypes"]
    api = device["api"]
    types = device["types"]
    content = device["content"]

    objects: list[tuple[str, str, object]] = []
    pending: list[tuple[str, tuple[str, ...]]] = [("DEVICE", ())]
    seen: set[str] = set()
    while pending:
        object_id, path = pending.pop(0)
        if object_id in seen:
            continue
        seen.add(object_id)
        try:
            children = _children(content, object_id)
        except Exception as ex:  # noqa: BLE001
            raise _translate_com(ex)
        for child in children:
            name, original, is_folder = _object_data(comtypes, api, types, content, child)
            visible = original or name
            if not visible:
                continue
            if is_folder:
                pending.append((child, path + (visible,)))
            elif any(part.upper() == "DCIM" for part in path):
                # The parent folder is the last component of the path (e.g. 100APPLE).
                objects.append((path[-1] if path else "", visible, child))
    return objects


def _translate_com(ex) -> PTPError:
    """WPD COMError -> PTPError. By the text, and by known HRESULT."""
    hresult = getattr(ex, "hresult", None)
    if hresult is None and getattr(ex, "args", None):
        hresult = ex.args[0]
    try:
        hresult = int(hresult)
    except (TypeError, ValueError):
        hresult = None
    text = str(ex).lower()
    # E_ACCESSDENIED / STG_E_ACCESSDENIED: the iPhone refuses the deletion.
    if hresult in (0x80070005, 0x80030005) or any(
            p in text for p in ("access", "denied", "protected", "read-only", "readonly")):
        return PTPError("ptp.icloudEnabled",
                        "the iPhone has denied the deletion. Turn off «iCloud Photos» "
                        "in Settings > your name > iCloud > Photos and try again.")
    # sharing violation / device busy
    if hresult == 0x80070020 or "busy" in text or "in use" in text or "sharing" in text:
        return PTPError("ptp.busy", "the iPhone is busy with another program")
    if "not found" in text or "no such" in text:
        return PTPError("ptp.notFound", "the file is no longer on the iPhone")
    return PTPError("ptp.other", f"Windows Portable Devices: {ex}")


def delete(device, object_id: str) -> None:
    """Deletes a WPD object (no recursion) by its identifier."""
    comtypes = device["comtypes"]
    api = device["api"]
    types = device["types"]
    content = device["content"]
    try:
        collection = comtypes.client.CreateObject(
            types.PortableDevicePropVariantCollection,
            interface=types.IPortableDevicePropVariantCollection)
        variant = types.PROPVARIANT()
        variant.vt = 31                 # VT_LPWSTR
        variant.pwszVal = object_id
        _add(collection, variant)
        options = getattr(api, "PORTABLE_DEVICE_DELETE_NO_RECURSION", 1)
        content.Delete(options, collection)
    except Exception as ex:  # noqa: BLE001
        raise _translate_com(ex)


def close(device) -> None:
    if device.get("device") is not None:
        try:
            device["device"].Close()
        except Exception:  # noqa: BLE001
            pass
    if device.get("initialized"):
        try:
            device["comtypes"].CoUninitialize()
        except Exception:  # noqa: BLE001
            pass
