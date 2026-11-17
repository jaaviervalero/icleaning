"""Tests for `icleaning.paths`: account identifier, settings and folders."""
from __future__ import annotations

from pathlib import Path

from icleaning import paths


def test_account_id_stable_and_case_insensitive():
    a = paths.account_id("Javier@Example.COM")
    assert a == paths.account_id("  javier@example.com  ")
    assert a == paths.account_id("javier@example.com")
    assert a != paths.account_id("other@example.com")
    assert len(a) == 16
    assert all(c in "0123456789abcdef" for c in a)


def test_settings_saves_and_reads_back(tmp_path):
    a = paths.Settings(tmp_path)
    assert a.get("archive") == ""
    a.set(archive=str(tmp_path / "photos"), last_account="x@y.z", accounts={"x@y.z": "abc"})

    b = paths.Settings(tmp_path)
    assert b.get("archive") == str(tmp_path / "photos")
    assert b.get("last_account") == "x@y.z"
    assert b.get("accounts") == {"x@y.z": "abc"}
    assert b.archive_dir == tmp_path / "photos"
    assert (tmp_path / "settings.json").exists()


def test_settings_expands_tilde(tmp_path):
    a = paths.Settings(tmp_path)
    a.set(archive="~/Test photos")
    assert a.archive_dir == Path.home() / "Test photos"


def test_default_archive_dir(tmp_path):
    a = paths.Settings(tmp_path)
    assert a.archive_dir == paths.default_archive_dir()
    assert a.archive_dir.name == "iCleaning"


def test_data_dir_override_creates_the_folder(tmp_path):
    dest = tmp_path / "data" / "app"
    d = paths.data_dir(dest)
    assert d == dest
    assert d.is_dir()
    # calling it again does not fail
    assert paths.data_dir(dest) == dest


def test_settings_corrupt_file_does_not_blow_up(tmp_path):
    (tmp_path / "settings.json").write_text("{ this is not json", encoding="utf-8")
    a = paths.Settings(tmp_path)
    assert a.get("archive") == ""
