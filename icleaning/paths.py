"""Where the application keeps its things, on the three systems.

- App data (encrypted session, thumbnails, lists, copy of the Photos database):
  Linux ~/.local/share/iCleaning · macOS ~/Library/Application Support/iCleaning ·
  Windows %LOCALAPPDATA%\\iCleaning. Folders only for your user.
- Saved photos: the folder you choose (Pictures/iCleaning by default).
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import threading
from pathlib import Path

import platformdirs

APP = "iCleaning"


def private_dir(p: Path) -> Path:
    """Create the folder (if needed) with permissions for the user only."""
    p.mkdir(parents=True, exist_ok=True)
    if os.name != "nt":
        os.chmod(p, 0o700)   # on Windows, %LOCALAPPDATA% is already user-only
    return p


def data_dir(override: Path | None = None) -> Path:
    return private_dir(Path(override) if override else platformdirs.user_data_path(APP, appauthor=False, roaming=False))


def default_archive_dir() -> Path:
    try:
        base = platformdirs.user_pictures_path()
    except Exception:  # noqa: BLE001
        base = Path.home() / "Pictures"
    return base / "iCleaning"


def account_id(apple_id: str) -> str:
    """Stable, anonymous identifier for an account (the email is not kept in the folder name)."""
    return hashlib.sha256(apple_id.strip().lower().encode()).hexdigest()[:16]


def resource(rel: str) -> Path:
    """Path to a bundled file (works from the source tree and from the PyInstaller executable)."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent))
    p = base / "icleaning" / rel
    return p if p.exists() else Path(__file__).resolve().parent / rel


class Settings:
    """settings.json: destination folder, last account, emails of the accounts used."""

    def __init__(self, base: Path):
        self.path = base / "settings.json"
        self.lock = threading.Lock()
        self.data = {"archive": "", "last_account": "", "accounts": {}}
        try:
            self.data.update(json.loads(self.path.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            pass

    def get(self, k, default=None):
        return self.data.get(k, default)

    def set(self, **kw):
        with self.lock:
            self.data.update(kw)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1), encoding="utf-8")
            tmp.replace(self.path)

    @property
    def archive_dir(self) -> Path:
        return Path(self.data["archive"]).expanduser() if self.data.get("archive") else default_archive_dir()
