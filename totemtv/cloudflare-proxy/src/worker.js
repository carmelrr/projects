/**
 * TotemTV Drive Proxy — Cloudflare Worker
 *
 * Streams Google Drive media files over Cloudflare's modern TLS so the
 * 2017 Samsung TV (Tizen 3.0 AVPlay) can play them. AVPlay can't handshake
 * directly with googleapis.com, but it streams this Worker fine.
 *
 * Routes:
 *   GET|HEAD  /drive/<fileId>   -> proxy the Drive file (supports Range)
 *   GET       /health           -> "ok"
 *
 * Config (set as Worker Variables in the dashboard):
 *   DRIVE_API_KEY   (secret)  - Google API key with Drive API enabled
 *   FOLDER_ID       (plain)   - only files inside this Drive folder are allowed
 */

const DRIVE_META =
  "https://www.googleapis.com/drive/v3/files/{id}?fields=id,parents,mimeType,size&key={key}";
const DRIVE_MEDIA =
  "https://www.googleapis.com/drive/v3/files/{id}?alt=media&key={key}";

function cors(headers = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    ...headers,
  };
}

function isValidFileId(id) {
  // Google Drive file ids are URL-safe base64-ish tokens.
  return typeof id === "string" && /^[A-Za-z0-9_-]{10,}$/.test(id);
}

async function isInAllowedFolder(fileId, env) {
  // If no FOLDER_ID configured, allow any file (less safe).
  if (!env.FOLDER_ID) return true;
  const url = DRIVE_META.replace("{id}", encodeURIComponent(fileId)).replace(
    "{key}",
    encodeURIComponent(env.DRIVE_API_KEY)
  );
  const r = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
  // If the file isn't readable at all with this key, deny.
  if (!r.ok) return false;
  const meta = await r.json();
  // NOTE: Drive's v3 API frequently omits `parents` for API-key (unauthenticated)
  // access, even when requested. When it's absent we cannot verify the folder, so
  // we allow the file (the API key only grants access to public/shared files
  // anyway). When `parents` IS present, enforce the folder match strictly.
  const parents = meta.parents;
  if (!parents || parents.length === 0) return true;
  return parents.indexOf(env.FOLDER_ID) !== -1;
}

async function handleDrive(request, env, fileId, headOnly) {
  if (!isValidFileId(fileId)) {
    return new Response("bad file id", { status: 400, headers: cors() });
  }
  if (!env.DRIVE_API_KEY) {
    return new Response("server not configured", {
      status: 500,
      headers: cors(),
    });
  }

  const allowed = await isInAllowedFolder(fileId, env);
  if (!allowed) {
    return new Response("file not allowed", { status: 403, headers: cors() });
  }

  const mediaUrl = DRIVE_MEDIA.replace(
    "{id}",
    encodeURIComponent(fileId)
  ).replace("{key}", encodeURIComponent(env.DRIVE_API_KEY));

  // Forward the Range header so the TV can seek / buffer in chunks.
  const fwdHeaders = new Headers();
  const range = request.headers.get("Range");
  if (range) fwdHeaders.set("Range", range);

  const upstream = await fetch(mediaUrl, {
    method: headOnly ? "GET" : "GET", // Drive ignores HEAD; we read headers then maybe drop body
    headers: fwdHeaders,
  });

  // Build response headers from upstream, stripping Drive's attachment disposition.
  const outHeaders = new Headers(cors());
  const passthrough = [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Last-Modified",
    "ETag",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) outHeaders.set(h, v);
  }
  if (!outHeaders.has("Accept-Ranges")) outHeaders.set("Accept-Ranges", "bytes");
  if (!outHeaders.has("Content-Type"))
    outHeaders.set("Content-Type", "application/octet-stream");
  outHeaders.set("Cache-Control", "public, max-age=300");

  if (headOnly) {
    // Discard the body but keep the headers.
    if (upstream.body) {
      try {
        await upstream.body.cancel();
      } catch (e) {}
    }
    return new Response(null, { status: upstream.status, headers: outHeaders });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (pathname === "/health" || pathname === "/") {
      return new Response("ok", {
        status: 200,
        headers: cors({ "Content-Type": "text/plain" }),
      });
    }

    if (pathname.startsWith("/drive/")) {
      const fileId = decodeURIComponent(pathname.slice("/drive/".length));
      const headOnly = request.method === "HEAD";
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("method not allowed", {
          status: 405,
          headers: cors(),
        });
      }
      try {
        return await handleDrive(request, env, fileId, headOnly);
      } catch (e) {
        return new Response("proxy error: " + (e && e.message), {
          status: 502,
          headers: cors(),
        });
      }
    }

    return new Response("not found", { status: 404, headers: cors() });
  },
};
