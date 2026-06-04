"""TotemTV LAN helper: log endpoint + Google Drive HTTP proxy for AVPlay.

The TV's AVPlay engine (2017 Samsung) cannot handshake with modern HTTPS endpoints.
This server runs on the dev machine and proxies Drive files over plain HTTP,
which AVPlay handles correctly.

Endpoints:
  POST /log                 - debug log line; printed to console.
  GET  /drive/<fileId>      - streams a Drive file via the Drive API key.
  HEAD /drive/<fileId>      - same headers as GET.
  GET  /test.mp4            - serves a local test file (if scripts/test.mp4 exists).
"""
import datetime
import os
import socket
import sys
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socketserver import ThreadingMixIn

API_KEY = "AIzaSyCfimRAzTq-1jm0v0T7UxaQ9tD3VHe1DgQ"
TEST_MP4 = os.path.join(os.path.dirname(__file__), "test.mp4")
DRIVE_TMPL = "https://www.googleapis.com/drive/v3/files/{fid}?alt=media&key=" + API_KEY


def ts():
    return datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        if self.path != "/log":
            self.send_response(404); self._cors(); self.end_headers(); return
        n = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(n).decode("utf-8", "replace") if n else ""
        for line in body.splitlines() or [""]:
            print("[{}] {}".format(ts(), line), flush=True)
        self.send_response(204); self._cors(); self.end_headers()

    # ---------- Drive proxy ----------
    def _proxy_drive(self, head_only=False):
        fid = self.path[len("/drive/"):].split("?", 1)[0].split("/", 1)[0]
        if not fid:
            self.send_response(400); self._cors(); self.end_headers(); return
        url = DRIVE_TMPL.format(fid=fid)
        headers = {"User-Agent": "TotemTV-Proxy/1.0"}
        rng = self.headers.get("Range")
        if rng:
            headers["Range"] = rng
        req = urllib.request.Request(url, headers=headers, method="HEAD" if head_only else "GET")
        print("[{}] PROXY {} fid={} range={}".format(ts(), self.command, fid, rng), flush=True)
        try:
            resp = urllib.request.urlopen(req, timeout=30)
        except urllib.error.HTTPError as e:
            print("[{}]   upstream HTTPError {}".format(ts(), e.code), flush=True)
            self.send_response(e.code); self._cors(); self.end_headers(); return
        except Exception as e:
            print("[{}]   upstream error {}".format(ts(), e), flush=True)
            self.send_response(502); self._cors(); self.end_headers(); return

        status = resp.status
        ct = resp.headers.get("Content-Type", "video/mp4")
        cl = resp.headers.get("Content-Length")
        cr = resp.headers.get("Content-Range")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", ct)
        self.send_header("Accept-Ranges", "bytes")
        if cl: self.send_header("Content-Length", cl)
        if cr: self.send_header("Content-Range", cr)
        self.send_header("Cache-Control", "no-cache")
        # NOTE: deliberately do NOT forward Content-Disposition
        self.end_headers()
        print("[{}]   upstream {} ct={} cl={} cr={}".format(ts(), status, ct, cl, cr), flush=True)
        if head_only:
            try: resp.close()
            except Exception: pass
            return
        try:
            while True:
                chunk = resp.read(64 * 1024)
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
                    return
        finally:
            try: resp.close()
            except Exception: pass

    # ---------- local test mp4 ----------
    def _serve_test(self, head_only=False):
        if not os.path.exists(TEST_MP4):
            self.send_response(404); self._cors(); self.end_headers(); return
        size = os.path.getsize(TEST_MP4)
        rng = self.headers.get("Range")
        start, end, status = 0, size - 1, 200
        if rng and rng.startswith("bytes="):
            try:
                s, e = rng[6:].split("-", 1)
                if s: start = int(s)
                if e: end = int(e)
                end = min(end, size - 1); status = 206
            except Exception: pass
        length = end - start + 1
        self.send_response(status); self._cors()
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", "bytes {}-{}/{}".format(start, end, size))
        self.end_headers()
        if head_only: return
        with open(TEST_MP4, "rb") as f:
            f.seek(start); remaining = length
            while remaining > 0:
                buf = f.read(min(64 * 1024, remaining))
                if not buf: break
                try: self.wfile.write(buf)
                except Exception: return
                remaining -= len(buf)

    def do_GET(self):
        if self.path.startswith("/drive/"): return self._proxy_drive(False)
        if self.path.startswith("/test.mp4"): return self._serve_test(False)
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", "3")
        self.end_headers(); self.wfile.write(b"ok\n")

    def do_HEAD(self):
        if self.path.startswith("/drive/"): return self._proxy_drive(True)
        if self.path.startswith("/test.mp4"): return self._serve_test(True)
        self.send_response(200); self._cors(); self.end_headers()

    def log_message(self, *a, **kw):  # silence default access log
        pass


class TServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]; s.close(); return ip
    except Exception:
        return "?"


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    srv = TServer(("0.0.0.0", port), H)
    print("TotemTV server on 0.0.0.0:{}  (LAN ip: {})".format(port, lan_ip()), flush=True)
    print("  proxy:  http://{}:{}/drive/<fileId>".format(lan_ip(), port), flush=True)
    print("  log:    POST http://{}:{}/log".format(lan_ip(), port), flush=True)
    srv.serve_forever()
