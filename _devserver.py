"""Local dev server that mirrors vercel.json rewrites for extension-less routes.

Run:  python _devserver.py   (defaults to http://127.0.0.1:5500)
"""
import http.server
import os
import re
import socketserver
import sys
from urllib.parse import urlsplit, urlunsplit

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5500

# (regex, target). Order matters. Mirrors the non-host-scoped rewrites in vercel.json.
REWRITES = [
    (re.compile(r"^/agenda(?:/.*)?$"),          "/agenda.html"),
    (re.compile(r"^/gestion-interna(?:/.*)?$"), "/gestion-interna/index.html"),
    (re.compile(r"^/dashboard$"),               "/dashboard.html"),
    (re.compile(r"^/registro$"),                "/registro.html"),
    (re.compile(r"^/refiere(?:/.*)?$"),         "/refiere.html"),
    (re.compile(r"^/empieza$"),                 "/empieza.html"),
    (re.compile(r"^/demo$"),                    "/empieza.html"),
    (re.compile(r"^/contacto$"),                "/empieza.html"),
    (re.compile(r"^/crea$"),                    "/crea.html"),
    (re.compile(r"^/servicios$"),               "/index.html"),
    (re.compile(r"^/catalogo$"),                "/catalogo.html"),
    (re.compile(r"^/membresia$"),               "/membresia.html"),
    (re.compile(r"^/chat-miembros$"),           "/chat-miembros.html"),
    (re.compile(r"^/admin-membresias$"),        "/admin-membresias.html"),
    (re.compile(r"^/kronnos$"),                 "/kronnos.html"),
    (re.compile(r"^/kronnos-admin$"),           "/kronnos-admin.html"),
    (re.compile(r"^/chat$"),                    "/chat.html"),
    (re.compile(r"^/bio$"),                     "/bio.html"),
    (re.compile(r"^/sorteo(?:/.*)?$"),          "/sorteo.html"),
]


class RewriteHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _rewrite(self):
        parts = urlsplit(self.path)
        path = parts.path
        # If the file exists as-is, don't rewrite.
        candidate = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        if candidate.startswith(ROOT) and os.path.isfile(candidate):
            return
        for pattern, target in REWRITES:
            if pattern.match(path):
                self.path = urlunsplit(("", "", target, parts.query, parts.fragment))
                return

    def do_GET(self):
        self._rewrite()
        return super().do_GET()

    def do_HEAD(self):
        self._rewrite()
        return super().do_HEAD()

    def end_headers(self):
        # Match Vercel: no-cache for HTML so live edits show up.
        if self.path.endswith(".html") or self.path.endswith("/"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ReusableTCPServer(("127.0.0.1", PORT), RewriteHandler) as httpd:
        print(f"Dev server ready -> http://127.0.0.1:{PORT}/  (root: {ROOT})", flush=True)
        httpd.serve_forever()
