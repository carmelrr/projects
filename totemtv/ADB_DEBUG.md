# TotemTV — ADB Debug Guide (Xiaomi Android TV)

## 1. Install ADB

### Windows
1. Download [Platform Tools](https://developer.android.com/tools/releases/platform-tools) from Google.
2. Extract to `C:\adb\`.
3. Add `C:\adb\` to your **PATH** (System Properties → Environment Variables → Path → New).
4. Open a new Command Prompt and verify: `adb version`

### macOS
```bash
brew install android-platform-tools
adb version
```

### Linux (Debian/Ubuntu)
```bash
sudo apt install adb
adb version
```

---

## 2. Enable ADB on the Xiaomi TV Box

1. Go to **Settings → About → Build Number** and press OK **7 times** until "Developer options are enabled" appears.
2. Go to **Settings → Developer Options → USB Debugging** → Enable.
3. Go to **Settings → Developer Options → Network Debugging** (or "ADB over Network") → Enable.
4. Note the IP address of the TV box: **Settings → About → Status → IP Address** (in this case `10.0.0.6`).

---

## 3. Connect via ADB over Wi-Fi

Make sure your development machine and the TV box are on the **same network**.

```bash
adb connect 10.0.0.6:5555
```

Expected output:
```
connected to 10.0.0.6:5555
```

Verify the device is listed:
```bash
adb devices
```

Expected:
```
List of devices attached
10.0.0.6:5555   device
```

If it shows `unauthorized`, accept the RSA key fingerprint prompt on the TV.

If it shows `offline`, try:
```bash
adb disconnect 10.0.0.6:5555
adb connect 10.0.0.6:5555
```

---

## 4. Build & Install

From the project root (`totemtv/`):

```bash
# Sync web assets into android/
npx cap sync android

# Build a debug APK (Windows)
cd android && gradlew.bat assembleDebug

# Build a debug APK (macOS/Linux)
cd android && ./gradlew assembleDebug
```

The APK is at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install over ADB:
```bash
adb -s 10.0.0.6:5555 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Launch the app:
```bash
adb -s 10.0.0.6:5555 shell am start -n com.totemtv.app/.MainActivity
```

---

## 5. Logcat — Filtered Commands

**All TotemTV-relevant tags in one stream (recommended for debugging):**
```bash
adb -s 10.0.0.6:5555 logcat -v time \
  TotemTV:V \
  AndroidRuntime:E \
  ActivityManager:W \
  ANR:V \
  lmkd:V \
  chromium:W \
  Capacitor:V \
  *:S
```

**Crash & kill only (minimal noise):**
```bash
adb -s 10.0.0.6:5555 logcat -v time \
  TotemTV:V \
  AndroidRuntime:E \
  ActivityManager:E \
  ANR:V \
  lmkd:V \
  *:S
```

**Web console logs (heartbeat + watchdog appear here):**
```bash
adb -s 10.0.0.6:5555 logcat -v time chromium:V Capacitor:V *:S
```

**Save all output to a file while watching live:**
```bash
adb -s 10.0.0.6:5555 logcat -v time TotemTV:V AndroidRuntime:E ActivityManager:W ANR:V lmkd:V chromium:W Capacitor:V *:S | tee totemtv_log_$(date +%Y%m%d_%H%M%S).txt
```
*(On Windows CMD replace `$(date ...)` with a fixed filename like `totemtv_log.txt`)*

**Clear logcat buffer before starting a session:**
```bash
adb -s 10.0.0.6:5555 logcat -c
```

---

## 6. What Each Tag Tells You

| Tag | What it diagnoses |
|---|---|
| `TotemTV` | Lifecycle events (onCreate/onPause/onDestroy), boot receiver, heartbeat |
| `AndroidRuntime` | Java crashes and stack traces |
| `ActivityManager` | App being pushed to background, killed, or ANR'd |
| `ANR` | "Application Not Responding" — UI thread blocked > 5s |
| `lmkd` | Low Memory Killer daemon — reports when Android kills the app for RAM |
| `chromium` | WebView JS errors, network failures, content errors |
| `Capacitor` | Capacitor bridge errors, plugin failures |

---

## 7. Interpreting the Results

### App crashed (Java exception)
Look for `AndroidRuntime:E` with `FATAL EXCEPTION`. The stack trace shows the cause.

### App killed by Android (memory)
Look for `lmkd` lines like:
```
lmkd: Kill 'com.totemtv.app' (pid XXXX), adj X, to free XXXXXKB
```

### App went to background
Look for `TotemTV: onPause` or `ActivityManager` lines like:
```
ActivityManager: Displayed com.totemtv.app/.MainActivity
ActivityManager: Process com.totemtv.app (pid XXXX) has died
```

### ANR (UI freeze)
Look for `ANR` or `ActivityManager` lines containing `ANR in com.totemtv.app`.
A full ANR trace is written to `/data/anr/traces.txt`:
```bash
adb -s 10.0.0.6:5555 shell cat /data/anr/traces.txt
```

### App is alive but slideshow stuck
The heartbeat logs every 60s:
```
[TotemTV] heartbeat | playing | slide 3/12 | 2026-05-06T14:23:00.000Z
```
If heartbeats stop appearing but the process is still running, the JavaScript has frozen.

---

## 8. Useful One-Liners

```bash
# Check if app is running
adb -s 10.0.0.6:5555 shell pidof com.totemtv.app

# Force-stop app
adb -s 10.0.0.6:5555 shell am force-stop com.totemtv.app

# Relaunch app
adb -s 10.0.0.6:5555 shell am start -n com.totemtv.app/.MainActivity

# View battery & power state (TV boxes sometimes throttle on low charge)
adb -s 10.0.0.6:5555 shell dumpsys battery

# View memory usage
adb -s 10.0.0.6:5555 shell dumpsys meminfo com.totemtv.app

# View activity stack (is our activity on top?)
adb -s 10.0.0.6:5555 shell dumpsys activity activities | grep -A5 totemtv

# Simulate memory pressure (triggers lmkd)
adb -s 10.0.0.6:5555 shell am send-trim-memory com.totemtv.app RUNNING_CRITICAL
```

---

## 9. Full Debug Session Checklist

1. `adb connect 10.0.0.6:5555` — connect
2. `adb -s 10.0.0.6:5555 logcat -c` — clear old logs
3. Start the log capture to file (command from §5)
4. `adb -s 10.0.0.6:5555 shell am start -n com.totemtv.app/.MainActivity` — launch app
5. Wait for the failure to reproduce
6. Check the log file for the tags in §6
7. If app died silently: `adb -s 10.0.0.6:5555 shell dumpsys activity activities | grep totemtv`
8. If ANR: `adb -s 10.0.0.6:5555 shell cat /data/anr/traces.txt`
