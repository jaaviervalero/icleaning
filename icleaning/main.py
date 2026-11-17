"""iCleaning startup: a single instance, local server and browser.

- If an instance is already running, it just opens the browser on its page and exits.
- It shuts itself down when no tab has been open for a while and no jobs are running
  (the executables have no window or terminal), or with the page's «Quit» button.
"""
from __future__ import annotations

import argparse
import json
import logging
import logging.handlers
import os
import secrets
import shutil
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

from . import __version__
from .app import App
from .paths import account_id, data_dir, private_dir
from .server import make_server

log = logging.getLogger("icleaning")
DEFAULT_PORT = 8737
IDLE_TIMEOUT = 10 * 60      # with no tab open for this long → it shuts down


def _setup_logging(base: Path, verbose: bool):
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    fh = logging.handlers.RotatingFileHandler(base / "app.log", maxBytes=1_000_000, backupCount=2,
                                              encoding="utf-8")
    fh.setFormatter(fmt)
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    root.addHandler(fh)
    if sys.stderr:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter("%(message)s"))
        root.addHandler(sh)
    # These libraries log URLs with account data at DEBUG: never below WARNING.
    for noise in ("pyicloud", "urllib3", "requests", "pymobiledevice3", "asyncio"):
        logging.getLogger(noise).setLevel(logging.WARNING)


def _running_instance(base: Path):
    """URL of an instance that is already running, or None."""
    try:
        d = json.loads((base / "instance.json").read_text(encoding="utf-8"))
        req = urllib.request.Request(f"http://127.0.0.1:{int(d['port'])}/api/ping",
                                     headers={"X-Token": d["token"]})
        with urllib.request.urlopen(req, timeout=2) as r:
            if r.status == 200:
                return f"http://127.0.0.1:{int(d['port'])}/#{d['token']}"
    except Exception:  # noqa: BLE001
        pass
    return None


def _write_instance(base: Path, port: int, token: str):
    path = base / "instance.json"
    fd = os.open(path.with_suffix(".tmp"), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"pid": os.getpid(), "port": port, "token": token}, f)
    os.replace(path.with_suffix(".tmp"), path)


def _migrate_legacy_data(base: Path, app: App):
    """Older version (from the source tree): everything lived in ./.datos with the session in plain text.
    It moves it to the new data folder and encrypts the session. Saved photos are not touched."""
    legacy = Path(__file__).resolve().parent.parent / ".datos"
    account_txt = legacy / "sesion" / "cuenta.txt"
    if getattr(sys, "frozen", False) or not account_txt.exists():
        return
    from . import secure_store
    email = account_txt.read_text(encoding="utf-8").strip()
    cid = account_id(email)
    d = private_dir(base / "accounts" / cid)
    if (d / "session.enc").exists():
        return
    log.info("Migrating the data from the previous version to %s", d)
    for old, new in (("estado.json", "state.json"), ("biblioteca.json", "library.json"),
                     ("Photos.sqlite", "Photos.sqlite"), ("Photos.sqlite-wal", "Photos.sqlite-wal"),
                     ("Photos.sqlite-shm", "Photos.sqlite-shm"), ("miniaturas", "thumbnails")):
        if (legacy / old).exists() and not (d / new).exists():
            shutil.move(str(legacy / old), str(d / new))
    store = secure_store.EncryptedSession(d, cid)
    if secure_store.import_plaintext_files(legacy / "sesion", store):
        # the session is now encrypted: the plain-text copies (backed-up ones too) are no longer needed
        for f in list((legacy / "sesion").rglob("*.session")) + list((legacy / "sesion").rglob("*.cookiejar")):
            f.unlink()
    accounts = dict(app.settings.get("accounts", {}))
    accounts[cid] = email
    app.settings.set(last_account=cid, accounts=accounts)
    old_archive = Path.home() / "Fotos-archivo"
    if not app.settings.get("archive") and old_archive.is_dir():
        app.settings.set(archive=str(old_archive))
    log.info("Migration done. You can delete %s whenever you like (it is no longer used).", legacy)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="icleaning", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--demo", action="store_true", help="made-up data, without iCloud or an iPhone")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT, help="local port (0 = any free one)")
    ap.add_argument("--no-open", action="store_true", help="do not open the browser")
    ap.add_argument("--data", type=Path, help="app data folder (the system one by default)")
    ap.add_argument("--no-auto-quit", action="store_true", help="do not quit when no tabs are left open")
    ap.add_argument("--verbose", action="store_true", help="verbose logging")
    ap.add_argument("--version", action="version", version=f"iCleaning {__version__}")
    a = ap.parse_args(argv)

    base = data_dir(a.data)
    _setup_logging(base, a.verbose)
    url = _running_instance(base)
    if url:
        log.info("iCleaning is already running; opening its page.")
        if not a.no_open:
            webbrowser.open(url)
        return

    token = secrets.token_urlsafe(32)
    app = App(base, token)
    if not a.demo and not a.data:          # never when trying it with sample data or another folder
        try:
            _migrate_legacy_data(base, app)
        except Exception:  # noqa: BLE001
            log.exception("Could not migrate the previous version; carrying on without it")

    stop = threading.Event()
    try:
        srv = make_server(app, a.port, stop.set)
    except OSError:
        srv = make_server(app, 0, stop.set)       # port taken: another free one
    _write_instance(base, srv.port, token)
    url = f"http://127.0.0.1:{srv.port}/#{token}"
    threading.Thread(target=srv.serve_forever, daemon=True, name="http").start()
    app.start(demo=a.demo)
    log.info("iCleaning %s at http://127.0.0.1:%d (data in %s)", __version__, srv.port, base)
    if a.no_open:
        print(url, flush=True) if sys.stdout else None
    else:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()

    app.last_seen = time.time() + 120          # margin for the browser to open
    try:
        while not stop.wait(5):
            if a.no_auto_quit:
                continue
            if time.time() - app.last_seen > IDLE_TIMEOUT and not app.jobs.active():
                log.info("No tabs open for %d min: shutting down.", IDLE_TIMEOUT // 60)
                break
    except KeyboardInterrupt:
        pass
    time.sleep(0.3)                                  # let the «Quit» response reach the browser
    srv.shutdown()
    try:
        (base / "instance.json").unlink()
    except OSError:
        pass
    log.info("See you later.")


if __name__ == "__main__":
    main()
