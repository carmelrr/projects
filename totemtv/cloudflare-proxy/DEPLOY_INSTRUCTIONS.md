# Deploy the TotemTV Drive Proxy to Cloudflare Workers (free)

These instructions are written so they can be handed to an AI browser agent
(Claude in Chrome) **with permission to act on the user's behalf**, or followed
manually. They produce an always-on, free HTTPS proxy that lets the 2017 Samsung
TV play Google Drive videos without a PC running.

The agent will use the user's already-signed-in browser. **No payment is
required** — the Cloudflare Workers free plan covers this entirely.

---

## Values the agent needs (already known)

- **Worker name:** `totemtv-drive-proxy`
- **Worker code:** the full contents of `cloudflare-proxy/src/worker.js` in the
  GitHub repo `https://github.com/carmelrr/projects` under
  `totemtv/cloudflare-proxy/src/worker.js`.
- **Environment variable `FOLDER_ID`** (plain text):
  `16avbuT7FPkikcxX4_oX3_tw-Fyl50y64`
- **Environment variable `DRIVE_API_KEY`** (encrypted secret):
  `AIzaSyCfimRAzTq-1jm0v0T7UxaQ9tD3VHe1DgQ`
- **Test Drive file id (a known video):** `1dzdNOFViqMsH1gqgrRNly0E1NQCuvrsB`

---

## Task for the browser agent — step by step

### 1. Open Cloudflare and sign in / sign up
1. Go to `https://dash.cloudflare.com/`.
2. If not signed in, sign in. If the user has no account, create a **free**
   account with their email (ask the user to complete any email verification or
   CAPTCHA — do not guess credentials). **Do NOT enter any payment details; the
   free plan does not require them.**

### 2. Create the Worker
3. In the left sidebar choose **Compute (Workers)** → **Workers & Pages**
   (older UI: just **Workers & Pages**).
4. Click **Create application** → **Create Worker** (or **Create** → **Worker**).
5. Set the Worker **name** to exactly: `totemtv-drive-proxy`.
6. Click **Deploy** to create the starter Worker (it deploys a "Hello World").

### 3. Paste the real code
7. After deploy, click **Edit code** (opens the online editor at
   `*.workers.dev` quick-edit).
8. **Select all** existing code in the editor and delete it.
9. Paste the **entire** contents of
   `totemtv/cloudflare-proxy/src/worker.js` from the GitHub repo
   (`https://github.com/carmelrr/projects/blob/main/totemtv/cloudflare-proxy/src/worker.js`
   → use the **Raw** view to copy the exact text).
10. Click **Deploy** (top right of the editor).

### 4. Add the environment variables
11. Leave the editor, go to the Worker's **Settings** tab →
    **Variables and Secrets** (older UI: **Settings → Variables**).
12. Add a variable:
    - Name: `FOLDER_ID`
    - Type: **Plaintext**
    - Value: `16avbuT7FPkikcxX4_oX3_tw-Fyl50y64`
13. Add another variable:
    - Name: `DRIVE_API_KEY`
    - Type: **Secret** (Encrypt)
    - Value: `AIzaSyCfimRAzTq-1jm0v0T7UxaQ9tD3VHe1DgQ`
14. Click **Save and deploy** (this redeploys with the variables bound).

### 5. Find the Worker URL
15. On the Worker overview page, copy the public URL. It looks like:
    `https://totemtv-drive-proxy.<account-subdomain>.workers.dev`
    (If `workers.dev` is disabled, enable the subdomain when prompted — it is
    free.)

### 6. Verify it works
16. In a new browser tab open:
    `https://totemtv-drive-proxy.<account-subdomain>.workers.dev/health`
    → it must show `ok`.
17. Then open:
    `https://totemtv-drive-proxy.<account-subdomain>.workers.dev/drive/1dzdNOFViqMsH1gqgrRNly0E1NQCuvrsB`
    → a video should download/stream (the browser may start playing or
    downloading an `.mp4`). If you get `403 file not allowed`, the `FOLDER_ID`
    is wrong; if `400 bad file id`, the path is malformed; if `500`, the
    `DRIVE_API_KEY` secret is missing.

### 7. Report back
18. Return to the user the final Worker base URL in this exact form:
    `https://totemtv-drive-proxy.<account-subdomain>.workers.dev/drive/`
    The user / their dev tool will paste it into the TV app
    (`www/index.html`, the `VIDEO_PROXY_BASE` variable) replacing
    `https://REPLACE_WITH_WORKER_SUBDOMAIN.workers.dev/drive/`.

---

## After deployment (done by the developer, not the browser agent)

1. In `totemtv/www/index.html`, set:
   ```js
   var VIDEO_PROXY_BASE = 'https://totemtv-drive-proxy.<subdomain>.workers.dev/drive/';
   ```
2. Repackage and install the Tizen app:
   ```powershell
   $env:Path += ";C:\tizen-studio\tools;C:\tizen-studio\tools\ide\bin"
   cd totemtv\www
   tizen package -t wgt -s TotemTV -- .
   tizen install -n TotemTV.wgt -t UE65MU7000
   tizen run -p TotemTVApp.TotemTV -t UE65MU7000
   ```
3. The TV now plays videos with **no PC required**.

---

## Security note

The Drive API key is already present (committed) in the public repo's
`index.html`, and it is scoped to the Drive API for a public folder, so exposure
is low risk. The Worker keeps the key server-side for any **new** flows. If you
want to fully lock this down later: create a *restricted* Google API key (HTTP
referrer / IP restrictions won't help a TV, but you can restrict it to only the
Drive API), and consider making the Drive folder share-by-link only.
