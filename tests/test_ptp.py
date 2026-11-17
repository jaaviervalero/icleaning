"""PTP tests: pure matching, deletion with a fake backend and availability per system.

No iPhone is touched: `delete` is tested with an injected backend that only records what it
is asked to delete.
"""
from __future__ import annotations

import builtins
import importlib

import pytest

from icleaning.sources import ptp
from icleaning.sources.ptp import PTPError, match


# --------------------------------------------------------------------------- match

def test_match_exact():
    objects = [("100APPLE", "IMG_0001.HEIC", "h1")]
    assert match(["DCIM/100APPLE/IMG_0001.HEIC"], objects) == {
        "DCIM/100APPLE/IMG_0001.HEIC": "h1"}


def test_match_case_insensitive():
    objects = [("100APPLE", "IMG_0001.HEIC", "h1")]
    assert match(["dcim/100apple/img_0001.heic"], objects) == {
        "dcim/100apple/img_0001.heic": "h1"}


@pytest.mark.parametrize("extension", ["JPG", "jpg", "JPEG", "jpeg"])
def test_match_heic_with_jpg(extension):
    objects = [("100APPLE", f"IMG_0001.{extension}", "h1")]
    assert match(["DCIM/100APPLE/IMG_0001.HEIC"], objects) == {
        "DCIM/100APPLE/IMG_0001.HEIC": "h1"}


@pytest.mark.parametrize("extension", ["MP4", "mp4"])
def test_match_mov_with_mp4(extension):
    objects = [("100APPLE", f"IMG_0002.{extension}", "h2")]
    assert match(["DCIM/100APPLE/IMG_0002.MOV"], objects) == {
        "DCIM/100APPLE/IMG_0002.MOV": "h2"}


def test_match_ambiguous_does_not_choose():
    objects = [("100APPLE", "IMG_0001.JPG", "h1"),
               ("100APPLE", "IMG_0001.JPEG", "h2")]
    result = match(["DCIM/100APPLE/IMG_0001.HEIC"], objects)
    error = result["DCIM/100APPLE/IMG_0001.HEIC"]
    assert isinstance(error, PTPError)
    assert error.code == "ptp.notFound"


def test_match_missing():
    objects = [("100APPLE", "IMG_0002.HEIC", "h2")]
    result = match(["DCIM/100APPLE/IMG_0001.HEIC"], objects)
    assert result["DCIM/100APPLE/IMG_0001.HEIC"].code == "ptp.notFound"


def test_match_different_folder():
    objects = [("101APPLE", "IMG_0001.HEIC", "h1")]
    result = match(["DCIM/100APPLE/IMG_0001.HEIC"], objects)
    assert result["DCIM/100APPLE/IMG_0001.HEIC"].code == "ptp.notFound"


def test_match_incompatible_extension():
    objects = [("100APPLE", "IMG_0001.PNG", "h1")]
    result = match(["DCIM/100APPLE/IMG_0001.HEIC"], objects)
    assert result["DCIM/100APPLE/IMG_0001.HEIC"].code == "ptp.notFound"


def test_match_different_base_name():
    objects = [("100APPLE", "IMG_0002.JPG", "h1")]
    result = match(["DCIM/100APPLE/IMG_0001.HEIC"], objects)
    assert result["DCIM/100APPLE/IMG_0001.HEIC"].code == "ptp.notFound"


# --------------------------------------------------------------------------- fake backend

class FakeBackend:
    def __init__(self, objects=(), errors=None, no_device=False):
        self.objects = list(objects)
        self.errors = errors or {}
        self.no_device = no_device
        self.deleted = []
        self.attempts = []
        self.closed = False
        self.listings = 0

    def find_iphone(self):
        if self.no_device:
            raise PTPError("ptp.noDevice", "there is no iPhone")
        return "fake-device"

    def list_objects(self, device):
        self.listings += 1
        return list(self.objects)

    def delete(self, device, handle):
        self.attempts.append(handle)
        error = self.errors.get(handle)
        if error is not None:
            raise error
        self.deleted.append(handle)

    def close(self, device):
        self.closed = True


@pytest.fixture
def backend(monkeypatch):
    def install(fake):
        monkeypatch.setattr(ptp, "_forced_backend", fake)
        return fake
    return install


def test_delete_dry_run_does_not_delete(backend):
    fake = backend(FakeBackend([("100APPLE", "IMG_0001.HEIC", "h1")]))
    results = list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"], dry_run=True))
    assert results == [("DCIM/100APPLE/IMG_0001.HEIC", None)]
    assert fake.deleted == []
    assert fake.closed is True


def test_delete_dry_run_missing_gives_error(backend):
    backend(FakeBackend([("100APPLE", "IMG_0002.HEIC", "h2")]))
    results = list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"], dry_run=True))
    path, error = results[0]
    assert path == "DCIM/100APPLE/IMG_0001.HEIC"
    assert isinstance(error, PTPError) and error.code == "ptp.notFound"


def test_delete_live_photo_deletes_the_mov(backend):
    fake = backend(FakeBackend([
        ("100APPLE", "IMG_0001.HEIC", "h1"),
        ("100APPLE", "IMG_0001.MOV", "h2"),
    ]))
    results = list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"]))
    assert results == [("DCIM/100APPLE/IMG_0001.HEIC", None)]
    assert fake.deleted == ["h1", "h2"]


def test_delete_live_photo_heic_presented_as_jpg(backend):
    fake = backend(FakeBackend([
        ("100APPLE", "IMG_0001.JPG", "hj"),
        ("100APPLE", "IMG_0001.MOV", "hm"),
    ]))
    results = list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"]))
    assert results == [("DCIM/100APPLE/IMG_0001.HEIC", None)]
    assert fake.deleted == ["hj", "hm"]


def test_delete_live_photo_without_mov_is_not_an_error(backend):
    fake = backend(FakeBackend([("100APPLE", "IMG_0001.HEIC", "h1")]))
    results = list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"]))
    assert results == [("DCIM/100APPLE/IMG_0001.HEIC", None)]
    assert fake.deleted == ["h1"]


def test_delete_live_photo_and_mov_path_at_once(backend):
    fake = backend(FakeBackend([
        ("100APPLE", "IMG_0001.HEIC", "h1"),
        ("100APPLE", "IMG_0001.MOV", "h2"),
    ]))
    paths = ["DCIM/100APPLE/IMG_0001.HEIC", "DCIM/100APPLE/IMG_0001.MOV"]
    results = list(ptp.delete("udid", paths))
    assert results == [(paths[0], None), (paths[1], None)]
    assert fake.deleted == ["h1", "h2"]   # each one only once


def test_delete_icloud_enabled_cuts_the_rest(backend):
    fake = backend(FakeBackend(
        [("100APPLE", "IMG_0001.HEIC", "h1"),
         ("100APPLE", "IMG_0002.HEIC", "h2")],
        errors={"h1": PTPError("ptp.icloudEnabled", "iCloud on")},
    ))
    paths = ["DCIM/100APPLE/IMG_0001.HEIC", "DCIM/100APPLE/IMG_0002.HEIC"]
    results = list(ptp.delete("udid", paths))
    assert [r for r, _ in results] == paths
    assert all(isinstance(e, PTPError) and e.code == "ptp.icloudEnabled"
               for _, e in results)
    assert fake.attempts == ["h1"]          # the second one is not attempted
    assert fake.deleted == []


def test_delete_busy_goes_on_with_the_others(backend):
    fake = backend(FakeBackend(
        [("100APPLE", "IMG_0001.HEIC", "h1"),
         ("100APPLE", "IMG_0002.HEIC", "h2")],
        errors={"h1": PTPError("ptp.busy", "busy")},
    ))
    paths = ["DCIM/100APPLE/IMG_0001.HEIC", "DCIM/100APPLE/IMG_0002.HEIC"]
    results = list(ptp.delete("udid", paths))
    assert results[0][1].code == "ptp.busy"
    assert results[1] == (paths[1], None)
    assert fake.deleted == ["h2"]


def test_delete_without_device(backend):
    fake = backend(FakeBackend(no_device=True))
    paths = ["DCIM/100APPLE/IMG_0001.HEIC", "DCIM/100APPLE/IMG_0002.HEIC"]
    results = list(ptp.delete("udid", paths))
    assert [r for r, _ in results] == paths
    assert all(isinstance(e, PTPError) and e.code == "ptp.noDevice"
               for _, e in results)
    assert fake.deleted == []


def test_delete_closes_the_backend_even_if_it_fails(backend):
    fake = backend(FakeBackend(
        [("100APPLE", "IMG_0001.HEIC", "h1")],
        errors={"h1": PTPError("ptp.other", "oops")},
    ))
    list(ptp.delete("udid", ["DCIM/100APPLE/IMG_0001.HEIC"]))
    assert fake.closed is True


# --------------------------------------------------------------------------- availability

def test_supported_without_library(monkeypatch):
    import icleaning.sources.ptp_linux  # noqa: F401  (it is imported on any Linux)
    real_import = builtins.__import__

    def fake_import(name, *args, **kwargs):
        if name == "gphoto2":
            raise ImportError("gphoto2 is not installed")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", fake_import)
    monkeypatch.setattr(ptp, "_forced_backend", None)
    monkeypatch.setattr(ptp.sys, "platform", "linux")
    available, reason = ptp.supported()
    assert available is False
    assert "gphoto2" in reason


def test_supported_unknown_platform(monkeypatch):
    monkeypatch.setattr(ptp, "_forced_backend", None)
    monkeypatch.setattr(ptp.sys, "platform", "plan9")
    available, reason = ptp.supported()
    assert available is False
    assert "platform" in reason


def test_mac_and_windows_modules_import_on_linux():
    # They must not import pyobjc/comtypes at module level.
    importlib.import_module("icleaning.sources.ptp_mac")
    importlib.import_module("icleaning.sources.ptp_windows")
