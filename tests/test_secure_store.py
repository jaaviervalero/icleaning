"""Tests for `icleaning.secure_store` with a fake keychain (never the system one)."""
from __future__ import annotations

import json
import os
from types import SimpleNamespace

import keyring
import keyring.backend
import pytest

from icleaning import secure_store
from icleaning.secure_store import SERVICE, EncryptedSession, import_plaintext_files


class MemoryKeychain(keyring.backend.KeyringBackend):
    """Fake in-memory keychain (like the system one, but without touching the real one)."""
    priority = 1

    def __init__(self):
        super().__init__()
        self.data = {}

    def get_password(self, service, username):
        return self.data.get((service, username))

    def set_password(self, service, username, password):
        self.data[(service, username)] = password

    def delete_password(self, service, username):
        if (service, username) not in self.data:
            raise keyring.errors.PasswordDeleteError("not there")
        del self.data[(service, username)]


class BrokenKeychain(keyring.backend.KeyringBackend):
    """Simulates a system without Secret Service/keychain available."""
    priority = 1

    def get_password(self, service, username):
        raise RuntimeError("no keychain")

    def set_password(self, service, username, password):
        raise RuntimeError("no keychain")

    def delete_password(self, service, username):
        raise RuntimeError("no keychain")


@pytest.fixture
def memory_keychain():
    original = keyring.get_keyring()
    backend = MemoryKeychain()
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(original)


@pytest.fixture
def broken_keychain():
    original = keyring.get_keyring()
    backend = BrokenKeychain()
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(original)


@pytest.fixture
def clean_registry():
    """Leaves `_STORES` as it was when done (the pyicloud patch is global)."""
    before = dict(secure_store._STORES)
    yield secure_store
    secure_store._STORES.clear()
    secure_store._STORES.update(before)


def test_encrypted_round_trip(memory_keychain, tmp_path):
    a = EncryptedSession(tmp_path, "a@b.c")
    data = {"cookies": "#LWP-Cookies-2.0\n", "data": {"key": "value", "n": 3}}
    a.write(data)
    assert (tmp_path / "session.enc").exists()
    assert b"value" not in (tmp_path / "session.enc").read_bytes()   # nothing left in the clear
    assert a.in_keychain is True
    assert (SERVICE, "session-a@b.c") in memory_keychain.data

    b = EncryptedSession(tmp_path, "a@b.c")
    assert b.read() == data


def test_read_without_file(memory_keychain, tmp_path):
    assert EncryptedSession(tmp_path, "a@b.c").read() is None


def test_corrupt_file_returns_none(memory_keychain, tmp_path):
    a = EncryptedSession(tmp_path, "a@b.c")
    (tmp_path / "session.enc").write_bytes(b"this is not a Fernet token")
    assert a.read() is None


def test_without_keychain_uses_private_file(broken_keychain, tmp_path):
    a = EncryptedSession(tmp_path, "a@b.c")
    a.write({"x": 1})
    assert a.in_keychain is False
    key = tmp_path / "session.key"
    assert key.exists()
    if os.name != "nt":
        assert key.stat().st_mode & 0o777 == 0o600
    assert (tmp_path / "session.enc").exists()

    b = EncryptedSession(tmp_path, "a@b.c")
    assert b.read() == {"x": 1}
    assert b.in_keychain is False

    b.delete()
    assert not key.exists() and not (tmp_path / "session.enc").exists()


def test_delete_removes_file_and_keychain(memory_keychain, tmp_path):
    a = EncryptedSession(tmp_path, "a@b.c")
    a.write({"x": 1})
    assert (tmp_path / "session.enc").exists()
    a.delete()
    assert not (tmp_path / "session.enc").exists()
    assert (SERVICE, "session-a@b.c") not in memory_keychain.data
    assert a._cache is None


def test_import_plaintext_files(memory_keychain, tmp_path):
    old = tmp_path / "old"
    old.mkdir()
    (old / "a@b.c.session").write_text(json.dumps({"session_token": "abc"}), encoding="utf-8")
    (old / "a@b.c.cookiejar").write_text("#LWP-Cookies-2.0\n", encoding="utf-8")
    store = EncryptedSession(tmp_path / "new", "a@b.c")

    assert import_plaintext_files(old, store) is True
    d = store.read()
    assert d["data"] == {"session_token": "abc"}
    assert d["cookies"].startswith("#LWP-Cookies-2.0")


def test_import_plaintext_files_without_session(memory_keychain, tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    store = EncryptedSession(tmp_path / "new", "a@b.c")
    assert import_plaintext_files(empty, store) is False
    assert store.read() is None


def test_pyicloud_saves_encrypted_and_recovers(memory_keychain, clean_registry, tmp_path):
    from pyicloud.session import PyiCloudSession

    secure_store = clean_registry
    secure_store.install_patch()
    store = EncryptedSession(tmp_path, "a@b.c")
    secure_store.register(str(tmp_path), store)
    service = SimpleNamespace(account_name="a@b.c")

    ses = PyiCloudSession(service=service, client_id="x", cookie_directory=str(tmp_path))
    ses.cookies.set("testcookie", "1", domain="example.com", path="/")
    ses.data["key"] = "value"
    ses.data["mid"] = "not-stored"
    ses._save_session_data()

    # nothing from pyicloud is left in the clear in the directory: only session.enc
    assert not list(tmp_path.glob("*.session"))
    assert not list(tmp_path.glob("*.cookiejar"))
    assert (tmp_path / "session.enc").exists()
    assert b"value" not in (tmp_path / "session.enc").read_bytes()

    other = PyiCloudSession(service=service, client_id="x", cookie_directory=str(tmp_path))
    assert other.data["key"] == "value"
    assert "mid" not in other.data
    assert any(c.name == "testcookie" for c in other.cookies)

    other.clear_persistence(True)
    assert not (tmp_path / "session.enc").exists()
    assert not list(tmp_path.glob("*.session"))


def test_pyicloud_unregistered_directory_still_uses_files(memory_keychain, clean_registry,
                                                          tmp_path):
    from pyicloud.session import PyiCloudSession

    secure_store = clean_registry
    secure_store.install_patch()
    other_dir = tmp_path / "other"
    other_dir.mkdir()
    service = SimpleNamespace(account_name="a@b.c")

    ses = PyiCloudSession(service=service, client_id="x", cookie_directory=str(other_dir))
    ses.data["key"] = "value"
    ses._save_session_data()

    # original pyicloud behaviour: plain text files
    assert (other_dir / "abc.session").exists()
    assert (other_dir / "abc.cookiejar").exists()
    assert not (other_dir / "session.enc").exists()
