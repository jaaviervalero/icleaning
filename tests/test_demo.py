"""Tests of the demo source (made-up data, no iCloud and no real photos)."""
from __future__ import annotations

import pytest

from icleaning.sources.demo import CAMERAS, PLACES, PEOPLE, DemoSource

MOMENTS = [["Escapada a Lisboa", "Lisboa"], ["Cumpleaños", "Zaragoza"]]


def test_items_with_cats_and_extra():
    f = DemoSource()
    assert f.name == "demo"
    assert len(f.items) == 3000
    for e in f.items:
        assert e.kind in ("photo", "video")
        assert isinstance(e.cats, list) and e.cats
        assert isinstance(e.extra, dict)
        assert 0 <= e.extra["cam"] < len(CAMERAS)
        assert 5 <= e.extra["q"] <= 70
        assert e.parts and e.parts[0][0] == e.name


def test_classification_people_and_face_in_ids():
    f = DemoSource()
    classification = f.classification()
    ids = {e.id for e in f.items}
    assert len(classification.people) == len(PEOPLE)
    for p in classification.people:
        assert p["kind"] in ("person", "dog", "cat")
        assert set(p["face"]) == {"a", "x", "y", "s"}
        assert p["face"]["a"] in ids
        # the face comes from an item in which that person appears
        assert any(p["id"] in e.extra.get("p", []) for e in f.items if e.id == p["face"]["a"])
    assert classification.places == PLACES
    assert classification.cameras == CAMERAS
    assert classification.moments == MOMENTS


def test_there_are_similar_series():
    f = DemoSource()
    similar = [e for e in f.items if "similar" in e.cats]
    best = [e for e in f.items if e.extra.get("best")]
    assert similar and best
    for e in f.items:
        if "similar" in e.cats:
            assert "g" in e.extra and not e.extra.get("best")


def test_list_items_reports_progress():
    f = DemoSource()
    seen = []
    items = f.list_items(lambda done, total: seen.append((done, total)))
    assert items is f.items
    assert seen == [(len(f.items), len(f.items))]


def test_image_is_svg():
    f = DemoSource()
    data, mime = f.image(f.items[0])
    assert mime == "image/svg+xml"
    assert data.startswith(b"<svg")
    assert b"<svg" in f.image(f.items[0], large=True)[0]


def test_download_writes_and_notifies(tmp_path):
    f = DemoSource()
    e = f.items[0]
    dest = tmp_path / "download.bin"
    chunks = []
    assert f.download(e, "original", dest, chunks.append) == e.size
    assert dest.exists()
    assert chunks == [e.size]


def test_delete_and_open_video():
    f = DemoSource()
    assert f.open_video(f.items[0]) is None
    assert f.delete(f.items[0]) is None


def test_demo_with_few_items():
    DemoSource(n=10)
