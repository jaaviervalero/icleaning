"""Shared test configuration: import paths and the synthetic Photos.sqlite factory."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
for _p in (str(HERE), str(ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from photosdb_factory import PhotosDBFactory  # noqa: E402


@pytest.fixture
def factory(tmp_path):
    """Synthetic Photos.sqlite from a recent iOS version."""
    f = PhotosDBFactory(tmp_path / "Photos.sqlite")
    yield f
    f.close()


@pytest.fixture
def old_factory(tmp_path):
    """Synthetic Photos.sqlite from an old version (no optional columns/tables)."""
    f = PhotosDBFactory(tmp_path / "Photos.sqlite", old=True)
    yield f
    f.close()
