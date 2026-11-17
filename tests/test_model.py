"""Tests for `icleaning.model`: on-disk state and save/delete jobs."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

from icleaning.model import Item, Jobs, State

DATE = 1600000000.0   # 2020-09-13 (the month does not change in any time zone)


class FakeSource:
    name = "fake"
    permanent_delete = False
    download_threads = 3

    def __init__(self, bytes_written=None, fail_on_delete=()):
        self.bytes_written = bytes_written
        self.fail_on_delete = set(fail_on_delete)
        self.deleted = []
        self.downloads = []

    def download(self, e, key, dest: Path, chunk_cb):
        self.downloads.append((e.id, key, str(dest)))
        n = self.bytes_written if self.bytes_written is not None else e.size
        dest.write_bytes(b"x" * n)
        chunk_cb(n)
        return n

    def delete(self, e):
        if e.id in self.fail_on_delete:
            raise IOError("could not delete")
        self.deleted.append(e.id)


class BulkSource(FakeSource):
    """Source with bulk deletion (like cable mode)."""

    def delete_many(self, items):
        for e in items:
            yield e, (IOError("bulk failure") if e.id == "B2" else None)


class FakeApp:
    def __init__(self, source, items, state_path):
        self.source = source
        self.state = State(state_path)
        self.by_id = {e.id: e for e in items}


def make_item(id_, name="photo.jpg", size=10, date=DATE):
    return Item(id_, name, size, date, "photo", [(name, size, "original")])


def wait(jobs: Jobs, timeout=10.0) -> dict:
    """Polls `snapshot` with a deadline, accumulating the changes already consumed."""
    end = time.monotonic() + timeout
    changes = []
    while True:
        s = jobs.snapshot()
        changes.extend(s["changes"])
        if s["jobs"] and all(j["state"] == "finished" for j in s["jobs"]):
            s["changes"] = changes
            return s
        if time.monotonic() > end:
            raise AssertionError("the job did not finish in time")
        time.sleep(0.005)


# ------------------------------------------------------------------ State

def test_state_persistent(tmp_path):
    photo = tmp_path / "photo.jpg"
    photo.write_bytes(b"12345")
    path = tmp_path / "state.json"
    st = State(path)
    assert st.d == {"saved": {}, "deleted": {}}
    assert not st.is_saved("A")

    st.mark_saved("A", [str(photo)], 5)
    assert st.is_saved("A")
    other = State(path)
    assert other.is_saved("A")
    assert other.d["saved"]["A"]["bytes"] == 5

    photo.unlink()
    assert not other.is_saved("A")      # the paths must still exist

    other.mark_deleted("A")
    assert other.is_deleted("A")
    assert State(path).is_deleted("A")


def test_state_reads_legacy_keys(tmp_path):
    path = tmp_path / "state.json"
    path.write_text(json.dumps({"guardados": {"A": {"rutas": [str(tmp_path / "a.jpg")], "bytes": 3, "fecha": 1}},
                                "borrados": {"B": 2}}), encoding="utf-8")
    st = State(path)
    assert st.d["saved"]["A"] == {"paths": [str(tmp_path / "a.jpg")], "bytes": 3, "date": 1}
    assert st.d["deleted"] == {"B": 2}
    assert st.is_deleted("B")


def test_state_saved_with_missing_path(tmp_path):
    st = State(tmp_path / "state.json")
    st.mark_saved("A", [str(tmp_path / "does-not-exist.jpg")], 0)
    assert not st.is_saved("A")


# ------------------------------------------------------------------ save

def test_save_renames_part_and_sets_date(tmp_path):
    e = make_item("AAAABBBB-1")
    app = FakeApp(FakeSource(), [e], tmp_path / "state.json")
    jobs = Jobs(app)
    dest = tmp_path / "archive"

    jobs.new("save", [e.id], dest=str(dest))
    s = wait(jobs)

    path = dest / "2020" / "09" / "photo.jpg"
    assert path.read_bytes() == b"x" * 10
    assert int(os.path.getmtime(path)) == int(DATE)
    assert not list(dest.rglob("*.part"))
    assert app.state.is_saved(e.id)
    assert s["jobs"][0]["state"] == "finished"
    assert s["jobs"][0]["done"] == 1
    assert s["jobs"][0]["bytes"] == 10
    assert s["changes"] == [{"id": e.id, "saved": True}]
    # snapshot empties the pending changes
    assert jobs.snapshot()["changes"] == []


def test_save_duplicate_name_adds_id_suffix(tmp_path):
    dest = tmp_path / "archive"
    folder = dest / "2020" / "09"
    folder.mkdir(parents=True)
    (folder / "photo.jpg").write_bytes(b"old")

    e = make_item("ABCDEFGH-2", size=5)
    app = FakeApp(FakeSource(), [e], tmp_path / "state.json")
    jobs = Jobs(app)
    jobs.new("save", [e.id], dest=str(dest))
    wait(jobs)

    assert (folder / "photo.jpg").read_bytes() == b"old"      # not overwritten
    assert (folder / "photo_ABCDEFGH.jpg").read_bytes() == b"x" * 5


def test_save_error_when_size_mismatch(tmp_path):
    e = make_item("ERR1", size=10)
    app = FakeApp(FakeSource(bytes_written=4), [e], tmp_path / "state.json")
    jobs = Jobs(app)
    dest = tmp_path / "archive"

    jobs.new("save", [e.id], dest=str(dest))
    s = wait(jobs)

    j = s["jobs"][0]
    assert j["errors"] == 1
    assert "size mismatch" in j["lastError"]
    assert not (dest / "2020" / "09" / "photo.jpg").exists()
    assert not list(dest.rglob("*.part"))
    assert not app.state.is_saved(e.id)


def test_save_name_with_paths_stays_inside_destination(tmp_path):
    e = Item("ID1", "../../evil.jpg", 3, DATE, "photo", [("../../evil.jpg", 3, "original")])
    app = FakeApp(FakeSource(), [e], tmp_path / "state.json")
    jobs = Jobs(app)
    dest = tmp_path / "archive"

    jobs.new("save", [e.id], dest=str(dest))
    wait(jobs)

    assert (dest / "2020" / "09" / "evil.jpg").exists()
    assert not (tmp_path / "evil.jpg").exists()


def test_save_skips_already_saved(tmp_path):
    e = make_item("YA1", size=4)
    app = FakeApp(FakeSource(), [e], tmp_path / "state.json")
    path = tmp_path / "archive" / "2020" / "09" / "photo.jpg"
    path.parent.mkdir(parents=True)
    path.write_bytes(b"abcd")
    app.state.mark_saved(e.id, [str(path)], 4)

    jobs = Jobs(app)
    jobs.new("save", [e.id], dest=str(tmp_path / "archive"))
    s = wait(jobs)
    assert s["jobs"][0]["done"] == 1
    assert app.source.downloads == []       # it is not downloaded again


# ------------------------------------------------------------------ delete

def test_delete_one_by_one(tmp_path):
    source = FakeSource()
    e1, e2 = make_item("B1", size=3), make_item("B2", size=4)
    app = FakeApp(source, [e1, e2], tmp_path / "state.json")
    jobs = Jobs(app)

    jobs.new("delete", [e1.id, e2.id])
    s = wait(jobs)

    assert source.deleted == [e1.id, e2.id]
    assert app.state.is_deleted(e1.id) and app.state.is_deleted(e2.id)
    assert s["jobs"][0]["done"] == 2
    assert s["jobs"][0]["bytes"] == 7
    assert s["changes"] == [{"id": "B1", "deleted": True}, {"id": "B2", "deleted": True}]


def test_delete_with_error(tmp_path):
    source = FakeSource(fail_on_delete={"B2"})
    e1, e2 = make_item("B1"), make_item("B2")
    app = FakeApp(source, [e1, e2], tmp_path / "state.json")
    jobs = Jobs(app)

    jobs.new("delete", [e1.id, e2.id])
    s = wait(jobs)

    assert app.state.is_deleted(e1.id)
    assert not app.state.is_deleted(e2.id)
    assert s["jobs"][0]["errors"] == 1
    assert "could not delete" in s["jobs"][0]["lastError"]


def test_bulk_delete_with_delete_many(tmp_path):
    source = BulkSource()
    e1, e2 = make_item("B1"), make_item("B2")
    app = FakeApp(source, [e1, e2], tmp_path / "state.json")
    jobs = Jobs(app)

    jobs.new("delete", [e1.id, e2.id])
    s = wait(jobs)

    assert source.deleted == []            # delete_many takes precedence
    assert app.state.is_deleted(e1.id)
    assert not app.state.is_deleted(e2.id)
    assert s["jobs"][0]["done"] == 1
    assert s["jobs"][0]["errors"] == 1


def test_jobs_with_unknown_id(tmp_path):
    source = FakeSource()
    app = FakeApp(source, [], tmp_path / "state.json")
    jobs = Jobs(app)
    jobs.new("delete", ["DOES-NOT-EXIST"])
    s = wait(jobs)
    assert s["jobs"][0]["state"] == "finished"
    assert s["jobs"][0]["done"] == 0
