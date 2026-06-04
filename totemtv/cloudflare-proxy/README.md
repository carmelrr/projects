# TotemTV Drive Proxy — Cloudflare Worker

A tiny, free, always-on HTTP proxy that streams Google Drive media files so the
2017 Samsung TV (Tizen 3.0 / AVPlay) can play them. The TV's native media engine
cannot complete a TLS handshake with `googleapis.com`, but it streams plain
Worker URLs (served over Cloudflare's modern TLS) without any problem.

## What it does

- `GET /drive/<fileId>` → streams the Drive file (supports HTTP `Range`, so the
  TV can seek and buffer normally).
- `HEAD /drive/<fileId>` → same headers, no body.
- `GET /health` → returns `ok`.

The Google API key and the allowed Drive folder id are stored as Worker
**secrets/vars**, never in the client app.

## Free tier

Cloudflare Workers free plan: 100,000 requests/day, no bandwidth charge,
no cold starts. More than enough for a single always-on TV.

## Files

- `src/worker.js` — the Worker code.
- `wrangler.toml` — Worker config (project name, vars).

## Deploy (done from the browser — see DEPLOY_INSTRUCTIONS.md)

You do **not** need to install anything locally. Everything is created through
the Cloudflare dashboard. Follow `DEPLOY_INSTRUCTIONS.md`.
