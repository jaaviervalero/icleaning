"""iCloud session encrypted on disk, with the key in the system keychain.

pyicloud stores the session cookies and tokens in plain text files by default. That
persistence is replaced here: they are stored encrypted (Fernet/AES) in `session.enc` and the
key lives in the Keychain (macOS), the Credential Manager (Windows) or the Secret Service
(Linux). If the system has no keychain, the key is stored in a file readable only by the user
and the page warns about it.

The Apple ID password is never stored anywhere.
"""
from __future__ import annotations

import io
import json
import logging
import os
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger(__name__)
SERVICE = "iCleaning"
_STORES: dict[str, "EncryptedSession"] = {}


def _write_private(path: Path, data: bytes):
    tmp = path.with_name(path.name + ".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


class EncryptedSession:
    def __init__(self, dir: Path, account: str):
        self.dir = dir
        self.account = account
        self.path = dir / "session.enc"
        self.key_path = dir / "session.key"   # only if there is no keychain
        self.in_keychain = True
        self._cache = None

    # -------------------------------------------------------------- key
    def _fernet(self) -> Fernet:
        if self._cache:
            return self._cache
        key = None
        try:
            import keyring
            key = keyring.get_password(SERVICE, f"session-{self.account}")
            if not key:
                if self.key_path.exists():            # it came without a keychain and now there is one: move
                    key = self.key_path.read_text().strip()
                else:
                    key = Fernet.generate_key().decode()
                keyring.set_password(SERVICE, f"session-{self.account}", key)
                self.key_path.unlink(missing_ok=True)
        except Exception as ex:  # noqa: BLE001 - no keychain (Linux without Secret Service, etc.)
            log.warning("System keychain not available (%s); key in a private file", type(ex).__name__)
            self.in_keychain = False
            if self.key_path.exists():
                key = self.key_path.read_text().strip()
            else:
                key = Fernet.generate_key().decode()
                _write_private(self.key_path, key.encode())
        self._cache = Fernet(key.encode())
        return self._cache

    # -------------------------------------------------------------- data
    def read(self) -> dict | None:
        try:
            blob = self.path.read_bytes()
        except FileNotFoundError:
            return None
        try:
            return json.loads(self._fernet().decrypt(blob))
        except (InvalidToken, ValueError):
            log.warning("Could not decrypt the saved session; starting from scratch")
            return None

    def write(self, d: dict):
        self.dir.mkdir(parents=True, exist_ok=True)
        _write_private(self.path, self._fernet().encrypt(json.dumps(d).encode()))

    def delete(self):
        self.path.unlink(missing_ok=True)
        self.key_path.unlink(missing_ok=True)
        try:
            import keyring
            keyring.delete_password(SERVICE, f"session-{self.account}")
        except Exception:  # noqa: BLE001 - it was not there, or there is no keychain
            pass
        self._cache = None


# ------------------------------------------------------------------ pyicloud hookup

def _cookies_to_text(jar) -> str:
    from http.cookiejar import LWPCookieJar
    copy = LWPCookieJar()
    for c in list(jar):
        copy.set_cookie(c)
    return "#LWP-Cookies-2.0\n" + copy.as_lwp_str(ignore_discard=True, ignore_expires=False)


def _text_to_cookies(jar, text: str):
    jar.clear()
    if text:
        jar._really_load(io.StringIO(text), "<session>", ignore_discard=True, ignore_expires=False)  # noqa: SLF001


def register(cookie_directory: str, store: EncryptedSession):
    """Make the pyicloud session with that cookie_directory be saved in `store`."""
    _STORES[os.path.normpath(cookie_directory)] = store


def import_plaintext_files(old_dir: Path, store: EncryptedSession) -> bool:
    """Move an old plain-text pyicloud session (*.session + *.cookiejar) into the encrypted store."""
    ses = next(iter(sorted(old_dir.glob("*.session"))), None)
    jar = next(iter(sorted(old_dir.glob("*.cookiejar"))), None)
    if not ses or not jar:
        return False
    store.write({"data": json.loads(ses.read_text(encoding="utf-8")),
                 "cookies": jar.read_text(encoding="utf-8")})
    return True


def install_patch():
    from pyicloud import session as ps

    if getattr(ps.PyiCloudSession, "_icleaning", False):
        return
    orig_load = ps.PyiCloudSession._load_session_data
    orig_save = ps.PyiCloudSession._save_session_data
    orig_clear = ps.PyiCloudSession.clear_persistence
    no_persist = getattr(ps, "NON_PERSISTED_SESSION_KEYS", frozenset())

    def store_of(self):
        return _STORES.get(os.path.normpath(self._cookie_directory or ""))

    def _load(self):
        s = store_of(self)
        if s is None:
            return orig_load(self)
        d = s.read() or {}
        self._data = d.get("data") if isinstance(d.get("data"), dict) else {}
        try:
            _text_to_cookies(self.cookies, d.get("cookies", ""))
        except Exception:  # noqa: BLE001
            self.cookies.clear()

    def _save(self):
        s = store_of(self)
        if s is None:
            return orig_save(self)
        try:
            s.write({"data": {k: v for k, v in dict(self._data).items() if k not in no_persist},
                     "cookies": _cookies_to_text(self.cookies)})
        except RuntimeError:
            pass  # the jar changed while it was being copied; it will be saved on the next request

    def _clear(self, remove_files: bool = True):
        s = store_of(self)
        if s is None:
            return orig_clear(self, remove_files)
        self.cookies.clear()
        self._data = {}
        if remove_files:
            s.delete()
        else:
            _save(self)

    ps.PyiCloudSession._load_session_data = _load
    ps.PyiCloudSession._save_session_data = _save
    ps.PyiCloudSession.clear_persistence = _clear
    ps.PyiCloudSession._icleaning = True
