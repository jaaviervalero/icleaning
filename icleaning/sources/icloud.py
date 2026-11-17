"""iCloud Photos with pyicloud: step-by-step sign-in (from the page), listing, thumbnails,
downloads and «Recently Deleted».

- The password comes from the page (127.0.0.1) and only lives in memory while the sign-in
  lasts; if Apple asks to accept the terms it is kept at most a few minutes and then forgotten.
- The session (cookies/tokens) is stored encrypted: see icleaning.secure_store.
- The pyicloud session is not thread-safe: listing, lookups and deletions go with a lock.
  Downloads use another HTTP session of their own, with a copy of the cookies.
- Download URLs carry account identifiers: they are never logged or shown.
"""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path

import requests

from .. import secure_store
from ..model import Item
from ..paths import account_id, private_dir

log = logging.getLogger(__name__)
EXPIRED = (401, 403, 404, 410)
PW_RETENTION = 300   # seconds the password is kept in memory if Apple asks to accept the terms


class LoginError(Exception):
    """Presentable error: `code` is a translation key of the page."""

    def __init__(self, code, detail=""):
        super().__init__(code)
        self.code, self.detail = code, detail


def _explain(ex) -> LoginError:
    from pyicloud.exceptions import PyiCloudAccountLockedException
    txt = str(ex)
    if isinstance(ex, PyiCloudAccountLockedException) or "-20209" in txt or "locked" in txt.lower():
        return LoginError("login.locked")
    if "-20101" in txt or "complete" in txt.lower() or "password" in txt.lower():
        return LoginError("login.credentials")
    if isinstance(ex, requests.RequestException):
        return LoginError("login.network")
    code = next((c for c in ("-900007", "503", "429") if c in txt), "")
    return LoginError("login.rejected", code or type(ex).__name__)


class ICloudLogin:
    """Sign-in handled from the page: enter → (terms) → (2FA code) → ready."""

    def __init__(self, account_dir: Path, apple_id: str):
        secure_store.install_patch()
        self.apple_id = apple_id.strip()
        self.dir = private_dir(account_dir)
        self.store = secure_store.EncryptedSession(self.dir, account_id(self.apple_id))
        # pyicloud needs a cookie directory; it stays empty because the session goes to the encrypted store
        self.cookies_dir = str(private_dir(self.dir / "pyicloud"))
        secure_store.register(self.cookies_dir, self.store)
        self.api = None
        self._pw, self._pw_until = None, 0.0
        self.two_factor_method = ""

    # ------------------------------------------------------------ steps
    def resume(self) -> bool:
        """Tries to sign in with the saved session, without a password."""
        from pyicloud import PyiCloudService
        from pyicloud.exceptions import PyiCloudException
        if self.store.read() is None:
            return False
        try:
            api = PyiCloudService(self.apple_id, cookie_directory=self.cookies_dir, with_family=False,
                                  authenticate=False)
            st = api.get_auth_status()
        except (PyiCloudException, requests.RequestException) as ex:
            log.info("Could not reuse the saved session: %s", type(ex).__name__)
            return False
        if st.get("authenticated") and st.get("trusted_session") and not st.get("requires_2fa"):
            self.api = api
            return True
        return False

    def sign_in(self, password: str) -> str:
        """Returns "ready", "2fa" or "terms". Raises LoginError."""
        from pyicloud.exceptions import PyiCloudAcceptTermsException, PyiCloudFailedLoginException
        try:
            try:
                self.api = self._create(password)
            except PyiCloudFailedLoginException as ex:
                if "initiate srp" not in str(ex).lower() or self.store.read() is None:
                    raise
                log.info("Apple rejected the sign-in with the saved session; retrying with a clean one")
                self.store.delete()
                self.api = self._create(password)
        except PyiCloudAcceptTermsException:
            self._pw, self._pw_until = password, time.time() + PW_RETENTION
            return "terms"
        except LoginError:
            raise
        except Exception as ex:  # noqa: BLE001
            raise _explain(ex) from None
        return self._after_sign_in()

    def accept_terms(self) -> str:
        """Only called when the user ticks on the page that they have read and accept them."""
        pw = self._pw if time.time() < self._pw_until else None
        self._pw = None
        if not pw:
            raise LoginError("login.expired")
        try:
            self.api = self._create(pw, accept=True)
        except LoginError:
            raise
        except Exception as ex:  # noqa: BLE001
            raise _explain(ex) from None
        finally:
            del pw
        return self._after_sign_in()

    def verify_code(self, code: str) -> str:
        code = "".join(ch for ch in code if ch.isdigit())
        if len(code) != 6:
            raise LoginError("login.codeFormat")
        try:
            ok = self.api.validate_2fa_code(code)
        except Exception as ex:  # noqa: BLE001
            raise _explain(ex) from None
        if not ok:
            raise LoginError("login.badCode")
        if not self.api.is_trusted_session:
            self.api.trust_session()
        return "ready"

    def resend_code(self):
        self.api._two_factor_code_requested = False  # noqa: SLF001 - pyicloud does not resend if it was already asked
        self._request_code()

    def forget(self):
        self._pw = None
        self.api = None

    # ------------------------------------------------------------ internals
    def _create(self, password, accept=False):
        from pyicloud import PyiCloudService
        return PyiCloudService(self.apple_id, password, cookie_directory=self.cookies_dir, with_family=False,
                               accept_terms=accept)

    def _request_code(self):
        try:
            if not self.api.request_2fa_code():
                raise LoginError("login.securityKey")
        except LoginError:
            raise
        except Exception as ex:  # noqa: BLE001
            raise _explain(ex) from None
        self.two_factor_method = getattr(self.api, "two_factor_delivery_method", "") or ""

    def _after_sign_in(self) -> str:
        self._pw = None
        if self.api.requires_2fa:
            self._request_code()
            return "2fa"
        if self.api.requires_2sa:
            raise LoginError("login.2sa")
        return "ready"


class ICloudSource:
    name = "icloud"
    permanent_delete = False
    download_threads = 4

    def __init__(self, api, account_dir: Path):
        from pyicloud.exceptions import PyiCloudException
        self.api = api
        self.api_lock = threading.RLock()
        try:
            self.photos = api.photos          # every access to .photos is a request: only once
            self.album = self.photos.all      # main library, without hidden or deleted
        except PyiCloudException as ex:
            log.warning("iCloud Photos unavailable: %s: %s", type(ex).__name__, ex)
            raise LoginError("icloud.photosUnavailable") from None
        self._cookies = requests.cookies.RequestsCookieJar()
        self._cookies.update(api.session.cookies)
        self._headers = dict(api.session.headers)
        self._http_session = None
        self._http_lock = threading.Lock()
        self.info = {}            # id -> {"master", "movie", "res": {key: (url, size, name)}}
        self.cache_path = account_dir / "library.json"
        self._pending = set()     # ids whose URLs have to be refreshed (in a batch)
        self._pending_lock = threading.Lock()
        self._batch_lock = threading.Lock()
        self.icloud_total = 0

    # ------------------------------------------------------------ listing
    def list_items(self, progress):
        """Walks the whole library. It does not use pyicloud's iterator because that one stops as
        soon as a page brings fewer items than the account has (with big libraries it stopped early)."""
        alb = self.album
        with self.api_lock:
            total = len(alb)
        self.icloud_total = total
        offset = total - 1            # descending order: from newest to oldest
        seen, out, empty = set(), [], 0
        while offset >= 0:
            n = 0
            with self.api_lock:       # one lock per page: thumbnails may slip in between pages
                page = list(alb._get_photos_at(offset, alb._direction, alb.page_size))  # noqa: SLF001
            for a in page:
                n += 1
                if a.id in seen:
                    continue
                seen.add(a.id)
                e = self._register(a)
                if e:
                    out.append(e)
            if n == 0:
                empty += 1
                if empty > 200:
                    break
                if empty % 3 == 0:   # empty page: retry twice and then move one by one
                    offset -= 1
            else:
                empty = 0
                offset -= n
            progress(len(seen), total)
        log.info("iCloud says there are %d items; read %d", total, len(seen))
        if len(seen) < total * 0.98:
            log.warning("Some items are missing (%d of %d)", len(seen), total)
        progress(len(out), len(out))
        self._save_cache(out)
        return out

    # ------------------------------------------------------------ list cache between starts
    def _save_cache(self, out):
        rows = [{"id": e.id, "n": e.name, "s": e.size, "d": e.date, "k": e.kind, "p": e.parts,
                 "m": self.info[e.id]["master"], "mv": self.info[e.id]["movie"],
                 # no URLs: they expire and carry account data
                 "r": {k: [v[1], v[2]] for k, v in self.info[e.id]["res"].items()}} for e in out]
        tmp = self.cache_path.with_suffix(".tmp")
        fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"v": 2, "date": time.time(), "items": rows}, f, ensure_ascii=False)
        tmp.replace(self.cache_path)

    def read_cache(self):
        """Saved list from the previous start (to open instantly), or None."""
        try:
            d = json.loads(self.cache_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        out = []
        for f in d.get("items", []):
            kind = "photo" if f["k"] == "foto" else f["k"]   # v1 files still say "foto"
            self.info.setdefault(f["id"], {"master": f["m"], "movie": f["mv"],
                                           "res": {k: (None, v[0], v[1]) for k, v in f["r"].items()}})
            out.append(Item(f["id"], f["n"], f["s"], f["d"], kind, [tuple(x) for x in f["p"]]))
        return out or None

    def _register(self, a):
        """Keeps the bare minimum of a PhotoAsset (not the whole object: tens of thousands weigh too much)."""
        res = {k: (r.url, r.size or 0, r.filename) for k, r in a.resources.items() if r.url}
        if "original" not in res:
            return None
        movie = a.item_type == "movie"
        self.info[a.id] = {"master": a.master_id, "movie": movie, "res": res}
        parts = [(res["original"][2], res["original"][1], "original")]
        if not movie and "original_video" in res and a.is_live_photo:
            parts.append((res["original_video"][2], res["original_video"][1], "original_video"))
        try:
            date = a.asset_date.timestamp()
        except Exception:  # noqa: BLE001
            date = 0
        return Item(a.id, a.filename, sum(p[1] for p in parts), date, "video" if movie else "photo", parts)

    def _lookup(self, ids):
        """Asks iCloud for the records of several items at once. Returns {id: PhotoAsset}."""
        from pyicloud.common.cloudkit import CKRecord, CKZoneIDReq
        from pyicloud.services.photos.constants import PRIMARY_ZONE
        from pyicloud.services.photos.service import PhotoAsset
        names = []
        for i in ids:
            names += [i, self.info[i]["master"]]
        with self.api_lock:
            resp = self.photos.private_client.lookup(record_names=names, zone_id=CKZoneIDReq(**PRIMARY_ZONE))
        recs = {r.recordName: r for r in resp.records if isinstance(r, CKRecord)}
        out = {}
        for i in ids:
            asset, master = recs.get(i), recs.get(self.info[i]["master"])
            if asset is not None and master is not None:
                a = PhotoAsset(self.photos, master, asset)
                self.info[i]["res"] = {k: (r.url, r.size or 0, r.filename) for k, r in a.resources.items() if r.url}
                out[i] = a
        return out

    def _refresh(self, id_):
        """Renews an item's URLs. If several threads are waiting (e.g. thumbnails), they go in one batch."""
        with self._pending_lock:
            self._pending.add(id_)
        with self._batch_lock:
            with self._pending_lock:
                if id_ not in self._pending:
                    return            # another thread already refreshed it in its batch
                batch = [id_] + [i for i in self._pending if i != id_][:99]
                self._pending.difference_update(batch)
            done = self._lookup(batch)
        if id_ not in done:
            raise IOError("it is no longer in iCloud")

    def _fresh_asset(self, id_):
        a = self._lookup([id_]).get(id_)
        if a is None:
            raise IOError("it is no longer in iCloud")
        return a

    # ------------------------------------------------------------ downloads
    def _http(self):
        with self._http_lock:
            if self._http_session is None:
                s = requests.Session()
                s.mount("https://", requests.adapters.HTTPAdapter(pool_connections=4, pool_maxsize=16))
                s.headers.update(self._headers)
                s.cookies.update(self._cookies)
                self._http_session = s
            return self._http_session

    def _get(self, id_, key, stream=False, headers=None):
        for attempt in range(3):
            res = self.info[id_]["res"].get(key)
            if attempt or (res and res[0] is None):
                self._refresh(id_)
                res = self.info[id_]["res"].get(key)
            if not res:
                return None
            try:
                r = self._http().get(res[0], stream=stream, timeout=(10, 120), headers=headers)
            except requests.RequestException as ex:
                if attempt == 2:
                    raise IOError(f"network error ({type(ex).__name__})") from None
                time.sleep(2)
                continue
            if r.status_code == 429:
                r.close()
                time.sleep(min(int(r.headers.get("Retry-After", "5") or 5), 60))
                continue
            if r.status_code in EXPIRED and attempt < 2:
                r.close()
                continue
            if r.status_code >= 400 and r.status_code != 416:
                r.close()
                raise IOError(f"iCloud replied HTTP {r.status_code}")  # no URL: it carries account data
            return r
        raise IOError("could not download")

    def image(self, item, large=False):
        if self.info[item.id]["movie"]:
            keys = ("medium_image", "thumb_image") if large else ("thumb_image", "medium_image")
        else:
            keys = ("medium", "thumb") if large else ("thumb", "medium")
        for key in keys:
            r = self._get(item.id, key)
            if r is not None:
                return r.content, r.headers.get("Content-Type", "image/jpeg").split(";")[0] or "image/jpeg"
        return None, None

    def open_video(self, item, range_header=None):
        """Streaming response of the medium version of the video (H.264, light and playable in the browser).
        Forwards the Range header so it can be skipped without downloading it whole."""
        inf = self.info[item.id]
        keys = ("medium", "original") if inf["movie"] else ("medium_video", "original_video")
        for key in keys:
            if key in inf["res"]:
                return self._get(item.id, key, stream=True, headers={"Range": range_header} if range_header else None)
        return None

    def download(self, item, key, dest, chunk_cb):
        r = self._get(item.id, key, stream=True)
        if r is None:
            raise IOError(f"no «{key}» version")
        n = 0
        with r, open(dest, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
                n += len(chunk)
                chunk_cb(len(chunk))
        return n

    # ------------------------------------------------------------ trash
    def delete(self, item):
        """Moves to «Recently Deleted» (isDeleted=1). Only after the user's double confirmation."""
        for _ in range(2):
            a = self._fresh_asset(item.id)   # recordChangeTag up to date
            with self.api_lock:
                if a.delete():
                    return
        raise IOError("iCloud did not accept the change")
