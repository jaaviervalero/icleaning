"""Application state: mode (iCloud, cable or demo), sign-in, library, deletions and settings.

The page (icleaning/web) drives everything through icleaning.server.
"""
from __future__ import annotations

import locale
import logging
import os
import secrets
import shutil
import string
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import __version__
from . import organize
from .model import Jobs, State
from .paths import Settings, account_id, private_dir
from .photosdb import Classification, classify, name_date_key

log = logging.getLogger(__name__)

DELETE_WAIT = 7          # seconds to wait before a deletion can be confirmed
TICKET_TTL = 15 * 60
TERMS_URL = {"es": "https://www.apple.com/es/legal/internet-services/icloud/",
             "en": "https://www.apple.com/legal/internet-services/icloud/"}


class AppError(Exception):
    def __init__(self, code, detail="", http=400):
        super().__init__(code)
        self.code, self.detail, self.http = code, detail, http


class App:
    def __init__(self, base: Path, token: str):
        self.base = private_dir(base)
        self.token = token
        self.settings = Settings(self.base)
        self.lock = threading.RLock()
        self.jobs = Jobs(self)
        self.last_seen = 0.0
        self._reset()

    # ================================================================ general state
    def _reset(self):
        self.phase, self.mode, self.error = "start", None, None
        self.source, self.state, self.account_dir, self.account = None, None, None, None
        self.login = None
        self.items, self.by_id = [], {}
        self.classification = Classification()
        self.version = getattr(self, "version", 0) + 1
        self.progress = None
        self.prefetching, self.thumbs = False, [0, 0]
        self.usb = None
        self.import_status = None
        self.not_in_cloud = None
        self.tickets = {}
        self.two_factor_method = ""

    def touch(self):
        self.last_seen = time.time()

    def _fail(self, code, detail="", phase=None):
        self.error = {"code": code, "detail": detail}
        if phase:
            self.phase = phase

    def state_json(self):
        saved_account = None
        last = self.settings.get("last_account")
        if self.phase == "start" and last and (self.base / "accounts" / last / "session.enc").exists():
            saved_account = self.settings.get("accounts", {}).get(last)
        db = self.account_dir / "Photos.sqlite" if self.account_dir else None
        keychain = True
        if self.login is not None:
            keychain = self.login.store.in_keychain
        return {
            "app": __version__, "phase": self.phase, "mode": self.mode, "error": self.error,
            "account": self.account, "savedAccount": saved_account, "twoFactorMethod": self.two_factor_method,
            "termsUrl": TERMS_URL, "usb": self.usb, "import": self.import_status,
            "progress": self.progress, "thumbs": list(self.thumbs) if self.prefetching else None,
            "version": self.version, "keychain": keychain, "archiveDir": str(self.settings.archive_dir),
            "classification": ({"date": int(db.stat().st_mtime)} if db and db.exists()
                               else {"date": None} if self.mode in ("demo", "usb")
                               and (self.classification.people or self.classification.places) else None),
            "notInCloud": self.not_in_cloud, "jobsActive": self.jobs.active(),
            "permanent": bool(self.source and self.source.permanent_delete),
        }

    # ================================================================ startup and modes
    def start(self, demo=False):
        if demo:
            return self.open_demo()
        last = self.settings.get("last_account")
        email = self.settings.get("accounts", {}).get(last) if last else None
        if email and (self.base / "accounts" / last / "session.enc").exists():
            self.phase = "connecting"
            threading.Thread(target=self._resume, args=(email,), daemon=True).start()

    def _resume(self, email):
        try:
            from .sources.icloud import ICloudLogin
            lg = ICloudLogin(self.base / "accounts" / account_id(email), email)
            if lg.resume():
                self.login = lg
                return self._activate_icloud(lg)
        except Exception:  # noqa: BLE001
            log.exception("Failed to resume the session")
        with self.lock:
            if self.phase == "connecting":
                self.phase = "start"

    def open_demo(self):
        from .sources.demo import DemoSource
        with self.lock:
            self._require_start()
            self.mode, self.phase = "demo", "loading"
            self.account_dir = private_dir(self.base / "demo")
            self.source = DemoSource()
            self.state = State(self.account_dir / "state.json")
        threading.Thread(target=self.load, daemon=True).start()

    def _require_start(self):
        if self.jobs.active():
            raise AppError("jobs.running")
        if self.phase not in ("start", "usb", "2fa", "terms"):
            raise AppError("app.busy")

    # ================================================================ iCloud: sign-in
    def login_start(self, apple_id, password):
        apple_id = (apple_id or "").strip()
        if "@" not in apple_id and not apple_id.replace("+", "").isdigit():
            raise AppError("login.appleId")
        if not password:
            raise AppError("login.credentials")
        from .sources.icloud import ICloudLogin, LoginError
        with self.lock:
            self._require_start()
            self.error = None
            self.phase = "connecting"
        try:
            lg = ICloudLogin(self.base / "accounts" / account_id(apple_id), apple_id)
            step = lg.sign_in(password)
        except LoginError as ex:
            self._fail(ex.code, ex.detail, "start")
            raise AppError(ex.code, ex.detail) from None
        finally:
            del password
        self.login = lg
        return self._login_step(step)

    def login_accept_terms(self):
        from .sources.icloud import LoginError
        if self.phase != "terms" or not self.login:
            raise AppError("login.expired")
        try:
            step = self.login.accept_terms()
        except LoginError as ex:
            self._fail(ex.code, ex.detail, "start")
            raise AppError(ex.code) from None
        return self._login_step(step)

    def login_code(self, code):
        from .sources.icloud import LoginError
        if self.phase != "2fa" or not self.login:
            raise AppError("login.expired")
        try:
            step = self.login.verify_code(code or "")
        except LoginError as ex:
            self.error = {"code": ex.code, "detail": ex.detail}
            raise AppError(ex.code) from None
        return self._login_step(step)

    def login_resend(self):
        from .sources.icloud import LoginError
        if self.phase != "2fa" or not self.login:
            raise AppError("login.expired")
        try:
            self.login.resend_code()
        except LoginError as ex:
            raise AppError(ex.code) from None
        self.two_factor_method = self.login.two_factor_method

    def login_cancel(self):
        with self.lock:
            if self.phase in ("2fa", "terms", "connecting") and self.login:
                self.login.forget()
            if self.mode is None:
                self.login, self.phase, self.error = None, "start", None

    def _login_step(self, step):
        self.error = None
        if step == "2fa":
            self.phase, self.two_factor_method = "2fa", self.login.two_factor_method
        elif step == "terms":
            self.phase = "terms"
        else:
            self.phase = "connecting"
            threading.Thread(target=self._activate_icloud, args=(self.login,), daemon=True).start()
        return self.phase

    def _activate_icloud(self, lg):
        from .sources.icloud import ICloudSource, LoginError
        try:
            source = ICloudSource(lg.api, lg.dir)
        except LoginError as ex:
            self._fail(ex.code, ex.detail, "start")
            return
        except Exception as ex:  # noqa: BLE001
            log.exception("Could not open iCloud Photos")
            self._fail("icloud.photosUnavailable", type(ex).__name__, "start")
            return
        cid = account_id(lg.apple_id)
        accounts = dict(self.settings.get("accounts", {}))
        accounts[cid] = lg.apple_id
        self.settings.set(last_account=cid, accounts=accounts)
        with self.lock:
            self.mode, self.account, self.account_dir = "icloud", lg.apple_id, lg.dir
            self.source, self.phase = source, "loading"
            self.state = State(lg.dir / "state.json")
        self.load()

    # ================================================================ cable (USB)
    def open_usb(self, udid=None):
        with self.lock:
            self._require_start()
            self.mode, self.phase, self.error = "usb", "usb", None
            self.usb = {"stage": "searching", "done": 0, "total": 0, "device": None, "code": None}
        threading.Thread(target=self._usb, args=(udid,), daemon=True).start()

    def _usb(self, udid):
        try:
            from .sources import usb
        except Exception as ex:  # noqa: BLE001
            log.exception("Cable mode not available")
            self.usb.update(stage="error", code="usb.unavailable")
            return
        try:
            devs = usb.list_devices()
            dev = next((d for d in devs if not udid or d["udid"] == udid), None)
            if not dev:
                raise usb.USBError("usb.noDevice")
            self.usb["device"] = {"name": dev.get("name"), "model": dev.get("model"), "ios": dev.get("ios")}
            d = private_dir(self.base / "iphones" / account_id(dev["udid"]))
            self.usb["stage"] = "copying"

            def prog(done, total):
                self.usb.update(done=done, total=total)
            usb.copy_photos_db(dev["udid"], d, prog)
            self.usb["stage"] = "classifying"
            cls = classify(d / "Photos.sqlite")
            source = usb.USBSource(dev["udid"], cls, d)
        except Exception as ex:  # noqa: BLE001
            code = getattr(ex, "code", None) or "usb.other"
            if code == "usb.other":
                log.exception("Cable mode failed")
            self.usb.update(stage="error", code=code)
            return
        with self.lock:
            self.account_dir, self.source, self.classification = d, source, cls
            self.account = dev.get("name") or "iPhone"
            self.state = State(d / "state.json")
            self.phase = "loading"
        self.load()

    def import_classification(self):
        """In iCloud mode: copy the iPhone Photos database over cable in order to classify."""
        if self.mode != "icloud" or self.phase != "ready":
            raise AppError("app.busy")
        if self.import_status and self.import_status.get("stage") in ("searching", "copying", "classifying"):
            raise AppError("app.busy")
        self.import_status = {"stage": "searching", "done": 0, "total": 0, "code": None}
        threading.Thread(target=self._import, daemon=True).start()

    def _import(self):
        imp = self.import_status
        try:
            from .sources import usb
            devs = usb.list_devices()
            if not devs:
                raise usb.USBError("usb.noDevice")
            imp["stage"] = "copying"
            usb.copy_photos_db(devs[0]["udid"], self.account_dir, lambda done, total: imp.update(done=done, total=total))
            imp["stage"] = "classifying"
            cls = classify(self.account_dir / "Photos.sqlite")
            self._publish(list(self.all_items), cls)
            imp["stage"] = "done"
        except Exception as ex:  # noqa: BLE001
            code = getattr(ex, "code", None) or "usb.other"
            if code == "usb.other":
                log.exception("Failed to import the classification")
            imp.update(stage="error", code=code)

    # ================================================================ library
    def load(self):
        source = self.source
        try:
            with ThreadPoolExecutor(max_workers=1) as ex:
                fut = None
                if hasattr(source, "classification"):
                    cls = source.classification() or Classification()
                else:
                    self.progress = {"stage": "classifying", "done": 0, "total": 0}
                    fut = ex.submit(classify, self.account_dir / "Photos.sqlite")
                    cls = None
                cache = getattr(source, "read_cache", lambda: None)()
                if cache:
                    self._publish(cache, fut.result() if fut else cls, silent=True)
                    self.progress = {"stage": "updating", "done": 0, "total": 0}

                def prog(done, total):
                    self.progress = {"stage": "updating" if self.phase == "ready" else "reading",
                                     "done": done, "total": total}
                items = source.list_items(prog)
                if self.source is not source:
                    return              # the session was closed in the meantime
                self._publish(items, fut.result() if fut else cls)
            self.progress = None
        except Exception as ex:  # noqa: BLE001
            log.exception("Error reading the library")
            self.progress = None
            if self.source is source:
                if self.phase == "ready":
                    self.error = {"code": "library.update", "detail": type(ex).__name__}
                else:
                    self._fail(getattr(ex, "code", "library.read"), type(ex).__name__,
                               "usb" if self.mode == "usb" else "start")
                    if self.mode == "usb" and self.usb is not None:
                        self.usb.update(stage="error", code=getattr(ex, "code", "usb.other"))

    def _publish(self, items, cls, silent=False):
        cls = cls or Classification()
        unnamed = 0
        for e in items:
            info = cls.lookup(e.id, e.name, e.date)
            if info:
                e.cats = list(info["c"])
                e.dur = info.get("dur") or e.dur
                e.kind = info.get("k", e.kind)
                e.extra = {k: v for k, v in info.items() if k not in ("c", "dur", "k")}
            elif cls.info:
                unnamed += 1
        alive = [e for e in items if not self.state.is_deleted(e.id)]
        with self.lock:
            self.all_items = items
            self.items, self.by_id, self.classification = alive, {e.id: e for e in alive}, cls
            self.version += 1
            self.phase = "ready"
            self.error = None if (self.error or {}).get("code", "").startswith(("login.", "usb.")) else self.error
        self.not_in_cloud = self._compute_not_in_cloud(items, cls) if self.mode == "icloud" else None
        if self.mode == "icloud" and not self.prefetching:
            self.prefetching = True
            threading.Thread(target=self.prefetch_thumbnails, daemon=True).start()
        if not silent:
            log.info("Ready: %d items (%d unclassified), %.1f GB", len(alive), unnamed,
                     sum(e.size for e in alive) / 1e9)

    @staticmethod
    def _compute_not_in_cloud(items, cls):
        """How many photos the iPhone has that are NOT in iCloud (e.g. because iCloud filled up)."""
        if not cls.rows:
            return None
        ids = {e.id.upper() for e in items}
        keys = {name_date_key(e.name, e.date) for e in items}
        missing = [f for f in cls.rows if not f["hidden"] and not f["discarded_burst"]
                   and f["uuid"] not in ids and name_date_key(f["name"], f["date"]) not in keys]
        return {"n": len(missing), "bytes": sum(f["size"] for f in missing)} if len(missing) >= 10 else None

    def items_json(self):
        deleted = self.state.d["deleted"] if self.state else {}
        out = []
        for e in self.items:
            if e.id in deleted:
                continue
            d = {"id": e.id, "n": e.name, "s": e.size, "d": int(e.date), "k": e.kind, "c": e.cats,
                 "dur": round(e.dur or 0, 1), "sv": self.state.is_saved(e.id)}
            d.update(e.extra)
            out.append(d)
        c = self.classification
        return {"version": self.version, "items": out,
                "meta": {"people": c.people, "places": c.places, "cameras": c.cameras,
                         "moments": c.moments, "source": self.mode,
                         "permanent": bool(self.source and self.source.permanent_delete)}}

    # ================================================================ thumbnails
    def _image_path(self, id_, large):
        return self.account_dir / "thumbnails" / f"{id_.replace('/', '_').replace(chr(92), '_')}{'.m' if large else '.t'}"

    def prefetch_thumbnails(self):
        """Download every library thumbnail to disk (heaviest first) so that scrolling stays smooth."""
        source = self.source
        try:
            private_dir(self.account_dir / "thumbnails")
            for _pass in range(2):          # the 2nd one picks up whatever the background update added
                pend = [e.id for e in sorted(self.items, key=lambda e: -e.size)
                        if not self._image_path(e.id, False).exists()]
                self.thumbs = [len(self.items) - len(pend), len(self.items)]
                if not pend:
                    break

                def one(id_):
                    if self.source is not source:
                        return
                    try:
                        self.image(id_, False)
                    except Exception:  # noqa: BLE001
                        pass
                    self.thumbs[0] += 1
                with ThreadPoolExecutor(max_workers=6) as ex:
                    list(ex.map(one, pend))
                while self.progress and self.source is source:
                    time.sleep(5)
        finally:
            self.prefetching = False

    def image(self, id_, large):
        e = self.by_id.get(id_)
        if not e or not self.source:
            return None, None
        if self.mode in ("icloud",):
            path = self._image_path(id_, large)
            if path.exists():
                return path.read_bytes(), "image/jpeg"
            data, kind = self.source.image(e, large)
            if data and (kind or "").startswith("image/jpeg"):
                private_dir(path.parent)
                tmp = path.with_name(path.name + f".{threading.get_ident()}")
                tmp.write_bytes(data)
                tmp.replace(path)
            return data, kind
        return self.source.image(e, large)

    # ================================================================ save and delete
    def valid_ids(self, ids):
        if not isinstance(ids, list):
            return []
        return [i for i in ids if isinstance(i, str) and i in self.by_id and not self.state.is_deleted(i)]

    def save(self, ids):
        ids = self.valid_ids(ids)
        if not ids:
            raise AppError("save.nothing")
        dest = self.settings.archive_dir
        try:
            dest.mkdir(parents=True, exist_ok=True)
        except OSError:
            raise AppError("save.destination", str(dest)) from None
        return self.jobs.new("save", ids, dest)

    def prepare_delete(self, ids):
        ids = self.valid_ids(ids)
        if not ids:
            raise AppError("delete.nothing")
        now = time.monotonic()
        self.tickets = {k: v for k, v in self.tickets.items() if now - v["t"] < TICKET_TTL}
        tk = secrets.token_urlsafe(18)
        items = [self.by_id[i] for i in ids]
        self.tickets[tk] = {"ids": ids, "t": now}
        return {"ticket": tk, "n": len(ids), "bytes": sum(e.size for e in items), "wait": DELETE_WAIT,
                "unsaved": sum(1 for i in ids if not self.state.is_saved(i)),
                "videos": sum(1 for e in items if e.kind == "video"),
                "permanent": bool(self.source.permanent_delete), "mode": self.mode}

    def confirm_delete(self, ticket):
        t = self.tickets.get(ticket) if isinstance(ticket, str) else None
        now = time.monotonic()
        if not t or now - t["t"] > TICKET_TTL:
            self.tickets.pop(ticket, None) if isinstance(ticket, str) else None
            raise AppError("delete.ticket")
        left = DELETE_WAIT - (now - t["t"])
        if left > 0:
            raise AppError("delete.wait", f"{left:.1f}", http=425)
        if self.tickets.pop(ticket, None) is None:   # atomic: a ticket can only be used once
            raise AppError("delete.ticket")
        ids = self.valid_ids(t["ids"])
        if not ids:
            raise AppError("delete.nothing")
        log.info("The user confirmed deleting %d items (%s)", len(ids), self.mode)
        return self.jobs.new("delete", ids)

    # ================================================================ organizing when saving
    def _template(self):
        try:
            return organize.validate(self.settings.get("template", organize.DEFAULT_TEMPLATE))
        except organize.TemplateError:
            return organize.DEFAULT_TEMPLATE

    def folder_lang(self) -> str:
        """Language for folder names and XMP tags: the chosen one, or the system's when set to automatic."""
        lang = self.settings.get("lang", "auto")
        if lang in ("es", "en"):
            return lang
        loc = (locale.getlocale()[0] or os.environ.get("LC_ALL") or os.environ.get("LANG") or "").lower()
        return "es" if loc.startswith(("es", "spanish")) else "en"

    def subfolder(self, e) -> Path:
        """Called by Jobs when saving: relative folder according to the chosen template."""
        return organize.subfolder(e, self.classification, self._template(), self.folder_lang())

    def after_save(self, e, paths):
        """Called by Jobs after saving an item: writes the XMP sidecar if enabled."""
        if not self.settings.get("xmp") or not paths:
            return
        main = Path(paths[0])
        sidecar = main.with_suffix(".xmp")
        if sidecar.exists():
            return
        sidecar.write_text(organize.xmp(e, self.classification, self.folder_lang()), encoding="utf-8")

    def template_preview(self, template):
        """Example paths for the proposed template, for the Settings preview."""
        try:
            template = organize.validate(template)
        except organize.TemplateError as ex:
            raise AppError(str(ex)) from None
        sample, seen = [], set()
        for e in sorted(self.items, key=lambda e: (not e.extra.get("p"), "pl" not in e.extra, -e.size)):
            path = organize.subfolder(e, self.classification, template, self.folder_lang()) / e.name
            if str(path.parent) not in seen:
                seen.add(str(path.parent))
                sample.append(path.as_posix())
            if len(sample) >= 4:
                break
        return {"template": template, "examples": sample}

    def settings_json(self):
        return {"archive": str(self.settings.archive_dir), "template": self._template(),
                "presets": organize.PRESETS, "tokens": list(organize.TOKENS),
                "xmp": bool(self.settings.get("xmp")), "lang": self.settings.get("lang", "auto")}

    def update_settings(self, b):
        if "archive" in b:
            self.set_archive(b["archive"])
        if "template" in b:
            try:
                self.settings.set(template=organize.validate(b["template"]))
            except organize.TemplateError as ex:
                raise AppError(str(ex)) from None
        if "xmp" in b:
            self.settings.set(xmp=b["xmp"] is True)
        if b.get("lang") in ("es", "en", "auto"):
            self.settings.set(lang=b["lang"])
        return self.settings_json()

    # ================================================================ account and settings
    def close(self, delete_data=False, logout=True):
        """Signs out (or disconnects the iPhone / leaves the demo) and, if asked, deletes the app's
        local data for that account. It never touches the folder where photos are saved.
        With logout=False it only goes back to the start screen (e.g. to switch to cable mode)
        and the iCloud session stays stored for next time."""
        if self.jobs.active():
            raise AppError("jobs.running")
        if delete_data:
            logout = True
        with self.lock:
            mode, d, lg = self.mode, self.account_dir, self.login
            if mode == "icloud" and lg is not None and logout:
                lg.store.delete()
                if self.settings.get("last_account") == account_id(lg.apple_id):
                    self.settings.set(last_account="")
            if delete_data and d is not None:
                self._remove_dir(d)
                if mode == "icloud" and lg is not None:
                    accounts = dict(self.settings.get("accounts", {}))
                    accounts.pop(account_id(lg.apple_id), None)
                    self.settings.set(accounts=accounts)
            if lg is not None:
                lg.forget()
            self._reset()

    def _remove_dir(self, d: Path):
        base = self.base.resolve()
        d = Path(d).resolve()
        if d == base or base not in d.parents:   # only folders inside the app data
            raise AppError("app.path")
        shutil.rmtree(d, ignore_errors=True)

    def set_archive(self, path):
        p = Path(str(path or "")).expanduser()
        if not p.is_absolute():
            raise AppError("settings.path")
        try:
            p.mkdir(parents=True, exist_ok=True)
            probe = p / f".icleaning-{secrets.token_hex(4)}"
            probe.write_bytes(b"")
            probe.unlink()
        except OSError:
            raise AppError("settings.notWritable", str(p)) from None
        self.settings.set(archive=str(p))

    @staticmethod
    def folders(path=None):
        """List of subfolders for the destination folder picker (names only)."""
        shortcuts = []
        home = Path.home()
        for name, p in (("home", home), ("pictures", Path(os.path.expanduser("~/Pictures"))),
                        ("desktop", home / "Desktop")):
            if p.is_dir():
                shortcuts.append({"id": name, "path": str(p)})
        vol = []
        for root in ("/Volumes", f"/media/{os.environ.get('USER', '')}", f"/run/media/{os.environ.get('USER', '')}"):
            try:
                vol += [str(p) for p in Path(root).iterdir() if p.is_dir()]
            except OSError:
                pass
        if os.name == "nt":
            vol += [f"{c}:\\" for c in string.ascii_uppercase if os.path.exists(f"{c}:\\")]
        p = Path(path).expanduser() if path else home
        if not p.is_dir():
            p = home
        try:
            subs = sorted((c.name for c in p.iterdir() if c.is_dir() and not c.name.startswith(".")),
                          key=str.lower)[:500]
        except OSError:
            subs = []
        return {"path": str(p), "parent": str(p.parent) if p.parent != p else None, "folders": subs,
                "shortcuts": shortcuts, "volumes": vol}
