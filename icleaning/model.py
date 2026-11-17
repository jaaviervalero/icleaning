"""Photo library items, persistent state (what is saved/deleted) and background jobs."""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)


class Item:
    """An item of the photo library. `parts` = [(file_name, size, version_key)] to download.
    `extra` holds the Photos.sqlite classification (people, place, camera, caption…)."""
    __slots__ = ("id", "name", "size", "date", "kind", "cats", "dur", "parts", "ref", "extra")

    def __init__(self, id_, name, size, date, kind, parts, ref=None):
        self.id, self.name, self.size, self.date, self.kind = id_, name, size, date, kind
        self.parts, self.ref = parts, ref
        self.cats, self.dur, self.extra = [], 0.0, {}


class State:
    """state.json of an account: what has been saved to the PC (and where) and what has been deleted."""

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.d = {"saved": {}, "deleted": {}}
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            saved = data.get("saved", data.get("guardados", {}))
            deleted = data.get("deleted", data.get("borrados", {}))
        except (OSError, ValueError, AttributeError):
            return
        # Older versions wrote {"guardados": {id: {"rutas", "bytes", "fecha"}}, "borrados": {id: ts}}
        self.d["saved"] = {id_: {"paths": v.get("paths", v.get("rutas", [])),
                                 "bytes": v.get("bytes", 0),
                                 "date": v.get("date", v.get("fecha", 0))}
                           for id_, v in saved.items()}
        self.d["deleted"] = dict(deleted)

    def _write(self):
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.d, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.path)

    def mark_saved(self, id_, paths, nbytes):
        with self.lock:
            self.d["saved"][id_] = {"paths": paths, "bytes": nbytes, "date": int(time.time())}
            self._write()

    def mark_deleted(self, id_):
        with self.lock:
            self.d["deleted"][id_] = int(time.time())
            self._write()

    def is_saved(self, id_) -> bool:
        g = self.d["saved"].get(id_)
        return bool(g) and all(Path(r).exists() for r in g["paths"])

    def is_deleted(self, id_) -> bool:
        return id_ in self.d["deleted"]


class Jobs:
    """Job queue (save / delete). Saving runs in parallel; deleting, one at a time."""

    def __init__(self, app):
        self.app = app
        self.lock = threading.Lock()
        self.jobs, self.changes, self.queue = [], [], []
        self.cv = threading.Condition(self.lock)
        threading.Thread(target=self._loop, daemon=True, name="jobs").start()

    def new(self, type_, ids, dest=""):
        with self.lock:
            j = {"id": len(self.jobs) + 1, "type": type_, "total": len(ids), "done": 0, "bytes": 0,
                 "errors": 0, "state": "running", "lastError": "", "dest": str(dest)}
            self.jobs.append(j)
            self.queue.append((j, ids))
            self.cv.notify()
            return j["id"]

    def active(self) -> bool:
        with self.lock:
            return any(j["state"] == "running" for j in self.jobs)

    def snapshot(self):
        with self.lock:
            changes, self.changes = self.changes, []
            return {"jobs": [dict(j) for j in self.jobs], "changes": changes}

    def _loop(self):
        while True:
            with self.cv:
                while not self.queue:
                    self.cv.wait()
                j, ids = self.queue.pop(0)
            try:
                (self._save if j["type"] == "save" else self._delete)(j, ids)
            except Exception as ex:  # noqa: BLE001
                log.exception("Job %s failed", j["id"])
                j["lastError"] = f"{type(ex).__name__}: {ex}"[:200]
                j["errors"] += 1
            j["state"] = "finished"

    def _error(self, j, e, ex):
        log.warning("[%s] %s: %s", j["type"], e.name, ex)
        with self.lock:
            j["errors"] += 1
            j["lastError"] = f"{e.name}: {ex}"[:200]

    def _save_one(self, j, e, folder: Path):
        app = self.app
        if app.state.is_saved(e.id):
            with self.lock:
                j["done"] += 1
            return
        sub = getattr(app, "subfolder", None)
        if sub:
            dest = folder / sub(e)
        else:
            dt = datetime.fromtimestamp(e.date) if e.date > 0 else datetime(1970, 1, 1)
            dest = folder / f"{dt:%Y}" / f"{dt:%m}"
        if folder.resolve() not in (dest.resolve(), *dest.resolve().parents):
            self._error(j, e, IOError("path outside the destination folder"))
            return
        paths, total = [], 0
        try:
            dest.mkdir(parents=True, exist_ok=True)
            for name, size, key in e.parts:
                name = os.path.basename(name) or f"{e.id[:8]}.bin"     # never paths coming from outside
                target = dest / name
                if target.exists():
                    stem, suf = os.path.splitext(name)
                    target = dest / f"{stem}_{e.id[:8]}{suf}"
                partial = target.with_name(target.name + ".part")

                def cb(n):
                    with self.lock:
                        j["bytes"] += n
                written = app.source.download(e, key, partial, cb)
                if size and written != size and app.source.name != "demo":
                    partial.unlink(missing_ok=True)
                    raise IOError(f"size mismatch ({written} of {size} bytes)")
                partial.replace(target)
                if e.date > 0:
                    os.utime(target, (e.date, e.date))
                paths.append(str(target))
                total += written
        except Exception as ex:  # noqa: BLE001
            self._error(j, e, ex)
            return
        app.state.mark_saved(e.id, paths, total)
        hook = getattr(app, "after_save", None)
        if hook:
            try:
                hook(e, paths)
            except Exception as ex:  # noqa: BLE001 - an XMP that fails does not spoil what was saved
                log.warning("XMP for %s: %s", e.name, ex)
        with self.lock:
            j["done"] += 1
            self.changes.append({"id": e.id, "saved": True})

    def _save(self, j, ids):
        folder = Path(j["dest"])
        items = [self.app.by_id[i] for i in ids if i in self.app.by_id]
        threads = getattr(self.app.source, "download_threads", 4)
        with ThreadPoolExecutor(max_workers=threads) as ex:
            list(ex.map(lambda e: self._save_one(j, e, folder), items))

    def _delete(self, j, ids):
        source = self.app.source
        items = [self.app.by_id[i] for i in ids if i in self.app.by_id]
        if hasattr(source, "delete_many"):          # cable mode deletes in bulk
            for e, ex in source.delete_many(items):
                self._delete_done(j, e, ex)
            return
        for e in items:
            try:
                source.delete(e)
                ex = None
            except Exception as err:  # noqa: BLE001
                ex = err
            self._delete_done(j, e, ex)

    def _delete_done(self, j, e, ex):
        if ex is not None:
            self._error(j, e, ex)
            return
        self.app.state.mark_deleted(e.id)
        with self.lock:
            j["done"] += 1
            j["bytes"] += e.size
            self.changes.append({"id": e.id, "deleted": True})
