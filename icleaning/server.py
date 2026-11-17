"""Local HTTP server (127.0.0.1 only) that serves the page and its API.

Security:
- It listens only on 127.0.0.1. The Host header must be 127.0.0.1:port or localhost:port
  (prevents DNS rebinding attacks from malicious websites).
- Everything except the static page asks for this run's random token (X-Token header,
  or ?t= on images and videos, which the browser requests without headers).
- POSTs must be JSON, with our own Origin if the browser sends one, and of bounded size.
- Strict CSP headers (no inline or external scripts), no Referer, no frames.
- The login password travels only from the page to this process; it is never logged.
"""
from __future__ import annotations

import json
import logging
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from .app import AppError
from .paths import resource

log = logging.getLogger(__name__)
MAX_POST = 8 * 1024 * 1024
STATIC = {"/": ("index.html", "text/html; charset=utf-8"), "/index.html": ("index.html", "text/html; charset=utf-8"),
          "/app.js": ("app.js", "text/javascript; charset=utf-8"),
          "/filters.js": ("filters.js", "text/javascript; charset=utf-8"),
          "/views.js": ("views.js", "text/javascript; charset=utf-8"),
          "/i18n.js": ("i18n.js", "text/javascript; charset=utf-8"),
          "/styles.css": ("styles.css", "text/css; charset=utf-8"),
          "/filters.css": ("filters.css", "text/css; charset=utf-8"),
          "/views.css": ("views.css", "text/css; charset=utf-8"),
          "/world.json": ("world.json", "application/json"),
          "/icon.png": ("icon.png", "image/png")}
CSP = ("default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
       "media-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; "
       "frame-ancestors 'none'")
SECURITY_HEADERS = {"X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY",
                    "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "same-origin",
                    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), usb=()"}


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False   # on Windows this would let another process steal the port


def make_server(app, port: int, on_quit) -> Server:
    """Creates the server on 127.0.0.1:port (0 = a free one). `on_quit()` is called when «Quit» is pressed."""
    srv = Server(("127.0.0.1", port), _handler(app, on_quit))
    srv.port = srv.server_address[1]
    srv.allowed_hosts = {f"127.0.0.1:{srv.port}", f"localhost:{srv.port}"}
    srv.allowed_origins = {f"http://{h}" for h in srv.allowed_hosts}
    return srv


def _handler(app, on_quit):
    class H(BaseHTTPRequestHandler):
        server_version = "iCleaning"
        sys_version = ""

        def log_message(self, *a):
            pass   # no URLs (they carry the token) in the logs

        # ------------------------------------------------------------ response
        def _send(self, code, body=b"", kind="text/plain; charset=utf-8", extra=None, cache=False):
            self.send_response(code)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "private, max-age=86400" if cache else "no-store")
            for k, v in SECURITY_HEADERS.items():
                self.send_header(k, v)
            if kind.startswith("text/html"):
                self.send_header("Content-Security-Policy", CSP)
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass   # the browser cancelled (e.g. thumbnails no longer on screen)

        def _json(self, obj, code=200):
            self._send(code, json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8")

        def _error(self, ex: AppError):
            self._json({"error": ex.code, "detail": ex.detail}, ex.http)

        # ------------------------------------------------------------ checks
        def _host_ok(self):
            return self.headers.get("Host") in self.server.allowed_hosts

        def _token_ok(self, q):
            tok = self.headers.get("X-Token") or (q.get("t") or [""])[0]
            return bool(tok) and secrets.compare_digest(tok.encode(), app.token.encode())

        # ------------------------------------------------------------ GET
        def do_GET(self):  # noqa: N802
            u = urlparse(self.path)
            q = parse_qs(u.query)
            if not self._host_ok():
                return self._send(403, b"host")
            if u.path in STATIC:
                filename, kind = STATIC[u.path]
                path = resource(f"web/{filename}")
                if not path.exists():
                    return self._send(404)
                return self._send(200, path.read_bytes(), kind,
                                  cache=filename in ("world.json", "icon.png"))
            if not self._token_ok(q):
                return self._send(403, b"token")
            app.touch()
            try:
                return self._get(u.path, q)
            except AppError as ex:
                return self._error(ex)
            except Exception:  # noqa: BLE001
                log.exception("Error in GET %s", u.path.split("/")[1:3])
                return self._json({"error": "internal"}, 500)

        def _get(self, route, q):
            if route == "/api/ping":
                return self._json({"ok": True})
            if route == "/api/state":
                return self._json(app.state_json())
            if route == "/api/items":
                if app.phase != "ready":
                    return self._json({"version": app.version, "items": [], "meta": {}})
                return self._json(app.items_json())
            if route == "/api/jobs":
                return self._json(app.jobs.snapshot())
            if route == "/api/folders":
                return self._json(app.folders((q.get("path") or [None])[0]))
            if route == "/api/settings":
                return self._json(app.settings_json())
            for prefix, large in (("/thumb/", False), ("/preview/", True)):
                if route.startswith(prefix):
                    try:
                        data, kind = app.image(unquote(route[len(prefix):]), large)
                    except Exception as ex:  # noqa: BLE001
                        log.warning("Thumbnail: %s", type(ex).__name__)
                        data, kind = None, None
                    if not data:
                        return self._send(404)
                    return self._send(200, data, kind or "image/jpeg", cache=True)
            if route.startswith("/video/"):
                return self._video(app.by_id.get(unquote(route[len("/video/"):])))
            return self._send(404)

        def _video(self, e):
            try:
                r = e and app.source.open_video(e, self.headers.get("Range"))
            except Exception as ex:  # noqa: BLE001
                log.warning("Video: %s", type(ex).__name__)
                r = None
            if not r:
                return self._send(404)
            with r:
                self.send_response(r.status_code)
                ct = r.headers.get("Content-Type") or ""
                self.send_header("Content-Type", ct if ct.startswith("video/") else "video/mp4")
                for h in ("Content-Length", "Content-Range", "Accept-Ranges"):
                    if h in r.headers:
                        self.send_header(h, r.headers[h])
                self.send_header("Cache-Control", "no-store")
                for k, v in SECURITY_HEADERS.items():
                    self.send_header(k, v)
                self.end_headers()
                try:
                    for chunk in r.iter_content(256 * 1024):
                        self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    pass   # when seeking in the video the browser cuts and asks for another chunk

        # ------------------------------------------------------------ POST
        def do_POST(self):  # noqa: N802
            u = urlparse(self.path)
            origin = self.headers.get("Origin")
            site = self.headers.get("Sec-Fetch-Site")
            if (not self._host_ok() or not self._token_ok({})
                    or (origin and origin not in self.server.allowed_origins)
                    or (site and site not in ("same-origin", "none"))
                    or not (self.headers.get("Content-Type") or "").startswith("application/json")):
                return self._send(403, b"forbidden")
            try:
                n = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                n = -1
            if n < 0 or n > MAX_POST:
                return self._send(413)
            try:
                body = json.loads(self.rfile.read(n) or b"{}")
                if not isinstance(body, dict):
                    raise ValueError
            except ValueError:
                return self._json({"error": "json"}, 400)
            app.touch()
            try:
                return self._json(self._post(u.path, body) or {"ok": True})
            except AppError as ex:
                return self._error(ex)
            except Exception:  # noqa: BLE001
                log.exception("Error in POST %s", u.path)
                return self._json({"error": "internal"}, 500)
            finally:
                body.pop("password", None)

        def _post(self, route, b):
            if route == "/api/login":
                return {"phase": app.login_start(b.get("appleId"), b.get("password"))}
            if route == "/api/login/code":
                return {"phase": app.login_code(b.get("code"))}
            if route == "/api/login/terms":
                if b.get("accept") is not True:
                    raise AppError("login.terms")
                return {"phase": app.login_accept_terms()}
            if route == "/api/login/resend":
                return app.login_resend()
            if route == "/api/login/cancel":
                return app.login_cancel()
            if route == "/api/mode":
                mode = b.get("mode")
                if mode == "demo":
                    return app.open_demo()
                if mode == "usb":
                    return app.open_usb(b.get("udid"))
                raise AppError("mode")
            if route == "/api/classify":
                return app.import_classification()
            if route == "/api/save":
                return {"job": app.save(b.get("ids"))}
            if route == "/api/delete/prepare":
                return app.prepare_delete(b.get("ids"))
            if route == "/api/delete/confirm":
                return {"job": app.confirm_delete(b.get("ticket"))}
            if route == "/api/account/close":
                return app.close(delete_data=b.get("deleteData") is True, logout=b.get("logout") is not False)
            if route == "/api/settings":
                return app.update_settings(b)
            if route == "/api/template":
                return app.template_preview(b.get("template"))
            if route == "/api/quit":
                if app.jobs.active() and b.get("force") is not True:
                    raise AppError("jobs.running")
                on_quit()
                return {"ok": True}
            raise AppError("route", http=404)

    return H
