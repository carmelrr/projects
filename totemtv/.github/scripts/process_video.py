#!/usr/bin/env python3
"""
TotemTV Video Processor
Downloads a video from Google Drive, burns a banner overlay with
climber/route/grade text using FFmpeg, uploads the result, and
updates the tracking sheet.

Usage (GitHub Actions):
    Environment variables: GOOGLE_CREDENTIALS, UNEDITED_FOLDER_ID,
                           OUTPUT_FOLDER_ID, SHEET_ID
    Inputs via env:        INPUT_FILE_ID, INPUT_FILE_NAME, INPUT_CLIMBER_NAME,
                           INPUT_ROUTE_NAME, INPUT_GRADE, INPUT_SHEET_ROW

Usage (local test — see scripts/test_local.py):
    python process_video.py --local --input video.mov --output out.mp4 \
        --climber "שם" --route "מסלול" --grade "V5"
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

# ── Layout constants ───────────────────────────────────────────
# Bottom decorative banner (orange line + dark band with green waves)
BANNER_HEIGHT_RATIO = 0.09       # 9% of video height (was 6% — taller, more presence)
BANNER_CROP_RATIO = 0.095        # crop from the orange line down (no white strip above it)
# Top-right brand logo (white TOTEM "Climbing House" mark)
LOGO_HEIGHT_RATIO = 0.13         # logo height as % of video height
LOGO_RIGHT_MARGIN_RATIO = 0.025  # right margin as % of video width
LOGO_TOP_MARGIN_RATIO = 0.040    # top margin as % of video height
# Text
FONT_SIZE_RATIO = 0.040          # font size relative to shorter dimension
SEPARATOR = " | "
CRF = 20                         # quality: 18 = near-lossless, 23 = default
MAX_HEIGHT = 1080                 # scale down to 1080p for TV compatibility
MAX_FPS = 30                      # 30fps is plenty for TV playback
OUT_W = 1920                      # TV canvas — every output is a full 16:9 frame
OUT_H = 1080
# Characters not allowed in filenames (Windows + Drive)
INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]')


def build_output_name(climber: str, route: str, grade: str, fallback: str) -> str:
    """Build a descriptive output filename from metadata, or fall back to original name."""
    parts = [p.strip() for p in [route, grade, climber] if p.strip()]
    if parts:
        base = " - ".join(parts)
    else:
        base = os.path.splitext(fallback)[0]
    # Sanitize
    base = INVALID_FILENAME_CHARS.sub("", base).strip()
    if not base:
        base = os.path.splitext(fallback)[0]
    return f"{base}.mp4"


def get_video_dimensions(path: str):
    """Return (width, height) of the video after rotation is applied."""
    # Get raw dimensions
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    parts = [p for p in result.stdout.strip().split(",") if p]
    w, h = int(parts[0]), int(parts[1])

    # Check for rotation metadata
    cmd_rot = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream_side_data=rotation",
        "-of", "csv=p=0",
        path,
    ]
    rot_result = subprocess.run(cmd_rot, capture_output=True, text=True)
    rotation = 0
    if rot_result.returncode == 0 and rot_result.stdout.strip():
        try:
            rotation = abs(int(float(rot_result.stdout.strip())))
        except ValueError:
            pass

    # Swap dimensions if rotated 90 or 270 degrees
    if rotation in (90, 270):
        w, h = h, w

    return w, h


def find_default_font():
    """Find a suitable font file for the current platform."""
    candidates = []
    if sys.platform == "win32":
        fonts_dir = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
        candidates = [
            os.path.join(fonts_dir, "arialbd.ttf"),   # Arial Bold
            os.path.join(fonts_dir, "arial.ttf"),      # Arial
        ]
    else:
        # Linux (GitHub Actions ubuntu-latest)
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for f in candidates:
        if os.path.isfile(f):
            return f
    return None


def resolve_asset(repo_root: str, name: str) -> str:
    """Locate a brand asset whether the script runs from the totemtv/ folder
    or from the repo root (the cloud workflow checks out the whole repo and
    runs the synced copy at <root>/.github/, while the assets live under
    <root>/totemtv/)."""
    candidates = [
        os.path.join(repo_root, name),
        os.path.join(repo_root, "totemtv", name),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return candidates[0]  # fall through so the caller errors with a clear path


def build_upload_drive(sa_credentials):
    """Return (drive_client, label) for CREATING new files in Drive.

    Service accounts have no personal storage quota, so creating a file in a
    normal (non-Shared) folder fails with 403 "Service Accounts do not have
    storage quota". When the GDRIVE_CLIENT_ID / GDRIVE_CLIENT_SECRET /
    GDRIVE_REFRESH_TOKEN secrets are set we upload as the user (who has quota,
    and owns the resulting file); otherwise we fall back to the service account
    (which only works for in-place updates or Shared Drives)."""
    from googleapiclient.discovery import build
    cid = os.environ.get("GDRIVE_CLIENT_ID", "")
    csec = os.environ.get("GDRIVE_CLIENT_SECRET", "")
    rtok = os.environ.get("GDRIVE_REFRESH_TOKEN", "")
    if cid and csec and rtok:
        from google.oauth2.credentials import Credentials
        oauth = Credentials(
            None,
            refresh_token=rtok,
            client_id=cid,
            client_secret=csec,
            token_uri="https://oauth2.googleapis.com/token",
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        return build("drive", "v3", credentials=oauth), "user OAuth"
    return build("drive", "v3", credentials=sa_credentials), "service account"


def build_ffmpeg_command(
    input_path: str,
    output_path: str,
    banner_path: str,
    logo_path: str,
    climber: str,
    route: str,
    grade: str,
    font_file: str | None = None,
):
    """Build the FFmpeg command that burns the banner into the video."""
    # Always render a 16:9 landscape frame sized for the TV. Portrait / off-ratio
    # sources would otherwise be squished — the banner, text and logo crammed
    # into a narrow width. Instead we centre the source at full height over a
    # blurred, filled copy of itself, so the video is never distorted and the
    # banner/logo always sit on a full-width frame.
    vw, vh = OUT_W, OUT_H

    banner_h = int(vh * BANNER_HEIGHT_RATIO)
    logo_h = int(vh * LOGO_HEIGHT_RATIO)
    logo_right = int(vw * LOGO_RIGHT_MARGIN_RATIO)
    logo_top = int(vh * LOGO_TOP_MARGIN_RATIO)
    # Soft drop shadow keeps the white logo readable over bright skies/rock
    shadow_blur = max(3, int(logo_h * 0.04))
    shadow_offset = max(2, int(logo_h * 0.02))
    # Use the shorter dimension so text never overflows on portrait videos
    ref_dim = min(vw, vh)
    font_size = int(ref_dim * FONT_SIZE_RATIO)

    # Build the display text: "climber | route | grade".
    # Kept raw — it is passed to drawtext via a sidecar file (see below),
    # so no FFmpeg quoting/escaping is applied to it.
    parts = [p for p in [climber, route, grade] if p]
    display_text = SEPARATOR.join(parts)

    # ── Filter graph ──────────────────────────────────────────
    # [0:v] = input video
    # [1:v] = banner background image (mostly white, design only at bottom ~12%)
    # [2:v] = white TOTEM logo (already trimmed to its content bounds)
    filters = []

    # 0) Build the 16:9 frame: a blurred "cover" copy fills the whole canvas,
    #    and the source is fit at full size and centred on top. Landscape
    #    sources fill the frame (no blur visible); portrait sources get soft
    #    side fills instead of black bars, and are never stretched.
    filters.append("[0:v]split=2[bgsrc][fgsrc]")
    filters.append(
        f"[bgsrc]scale={vw}:{vh}:force_original_aspect_ratio=increase,"
        f"crop={vw}:{vh},gblur=sigma=22[bg]"
    )
    filters.append(
        f"[fgsrc]scale={vw}:{vh}:force_original_aspect_ratio=decrease[fg]"
    )
    filters.append(f"[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={MAX_FPS}[scaled]")

    # 1) Crop the decorative strip from the bottom of the banner image
    #    (orange line + green waves + figure on dark background) and scale
    #    it to fill the banner area. The 12% crop keeps the orange line
    #    that gives the band its finished look.
    filters.append(
        f"[1:v]crop=iw:ih*{BANNER_CROP_RATIO}:0:ih-ih*{BANNER_CROP_RATIO},"
        f"scale={vw}:{banner_h}[banner]"
    )

    # 2) Scale logo to logo_h, then split into a soft dark shadow + the
    #    white mark so it stays visible on any background.
    filters.append(f"[2:v]scale=-1:{logo_h}:flags=lanczos,split=2[logo_main][logo_src]")
    filters.append(
        f"[logo_src]format=rgba,lutrgb=r=0:g=0:b=0,"
        f"gblur=sigma={shadow_blur}:steps=2,colorchannelmixer=aa=0.55[logo_shadow]"
    )

    # 3) Overlay banner at bottom of video
    banner_y = vh - banner_h
    filters.append(f"[scaled][banner]overlay=0:{banner_y}[with_banner]")

    # 4) Overlay the logo at top-right: shadow first, then the white mark on top
    logo_x = f"W-w-{logo_right}"
    filters.append(
        f"[with_banner][logo_shadow]"
        f"overlay={logo_x}+{shadow_offset}:{logo_top}+{shadow_offset}[with_shadow]"
    )
    filters.append(f"[with_shadow][logo_main]overlay={logo_x}:{logo_top}[with_logo]")

    # 5) Draw text centered on the dark part of the banner (no box/border).
    #    The text is written to a sidecar file and read via drawtext's
    #    `textfile` option. This sidesteps every FFmpeg inline-text quoting
    #    pitfall — apostrophes ("מוצ'י"), colons, and RTL punctuation that
    #    would otherwise truncate the text or break the whole filtergraph.
    if display_text:
        resolved_font = font_file or find_default_font()
        if resolved_font:
            escaped_font = resolved_font.replace("\\", "/").replace(":", "\\:")
            font_spec = f"fontfile='{escaped_font}'"
        else:
            font_spec = "font='Arial'"

        out_dir = os.path.dirname(os.path.abspath(output_path))
        os.makedirs(out_dir, exist_ok=True)
        text_path = os.path.join(out_dir, ".banner_text.txt")
        with open(text_path, "w", encoding="utf-8") as tf:
            tf.write(display_text)
        escaped_text_path = text_path.replace("\\", "/").replace(":", "\\:")

        text_y = banner_y + int(banner_h * 0.58) - (font_size // 2)
        drawtext = (
            f"drawtext="
            f"{font_spec}:"
            f"textfile='{escaped_text_path}':"
            f"fontsize={font_size}:"
            f"fontcolor=white:"
            f"shadowcolor=black@0.7:"
            f"shadowx=2:shadowy=2:"
            f"x=(w-text_w)/2:"
            f"y={text_y}"
        )
        filters.append(f"[with_logo]{drawtext}[out]")
    else:
        # No climber/route/grade — finalize with just the logo + banner.
        filters[-1] = filters[-1].replace("[with_logo]", "[out]")

    filter_complex = ";".join(filters)

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-i", banner_path,
        "-i", logo_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-profile:v", "main",
        "-level", "4.1",
        "-preset", "medium",
        "-crf", str(CRF),
        "-maxrate", "15M",
        "-bufsize", "30M",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]
    return cmd


def process_local(args):
    """Process a local video file (no cloud interaction)."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    banner_path = args.banner or resolve_asset(repo_root, "totem-banner.jpeg")
    logo_path = args.logo or resolve_asset(repo_root, "totem-logo-white-trim.png")

    if not os.path.isfile(banner_path):
        sys.exit(f"Banner image not found: {banner_path}")
    if not os.path.isfile(logo_path):
        sys.exit(f"Logo image not found: {logo_path}")
    if not os.path.isfile(args.input):
        sys.exit(f"Input video not found: {args.input}")

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    print(f"Processing: {args.input}")
    print(f"  Climber: {args.climber}")
    print(f"  Route:   {args.route}")
    print(f"  Grade:   {args.grade}")

    cmd = build_ffmpeg_command(
        input_path=args.input,
        output_path=args.output,
        banner_path=banner_path,
        logo_path=logo_path,
        climber=args.climber,
        route=args.route,
        grade=args.grade,
        font_file=args.font,
    )

    print(f"\nRunning FFmpeg...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("FFmpeg STDERR:", result.stderr, file=sys.stderr)
        sys.exit(f"FFmpeg failed with code {result.returncode}")

    print(f"Done! Output: {args.output}")


def process_cloud():
    """Download from Drive, process, upload, update sheet."""
    # Read inputs from environment (set by GitHub Actions)
    file_id = os.environ["INPUT_FILE_ID"]
    file_name = os.environ["INPUT_FILE_NAME"]
    climber = os.environ.get("INPUT_CLIMBER_NAME", "")
    route = os.environ.get("INPUT_ROUTE_NAME", "")
    grade = os.environ.get("INPUT_GRADE", "")
    sheet_row = os.environ.get("INPUT_SHEET_ROW", "")
    output_folder_id = os.environ["OUTPUT_FOLDER_ID"]
    sheet_id = os.environ.get("SHEET_ID", "")

    # Parse service account credentials
    creds_json = os.environ["GOOGLE_CREDENTIALS"]
    creds_info = json.loads(creds_json)

    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
    import gspread
    import io

    SCOPES = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]
    credentials = service_account.Credentials.from_service_account_info(
        creds_info, scopes=SCOPES
    )

    drive = build("drive", "v3", credentials=credentials)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
    banner_path = resolve_asset(repo_root, "totem-banner.jpeg")
    logo_path = resolve_asset(repo_root, "totem-logo-white-trim.png")

    # ── Update sheet: processing ──
    gc = None
    sheet = None
    if sheet_id:
        gc = gspread.authorize(credentials)
        spreadsheet = gc.open_by_key(sheet_id)
        sheet = spreadsheet.worksheet("Tracking")
        if sheet_row:
            row = int(sheet_row)
            sheet.update_cell(row, 3, "processing")  # Column C = Status

    with tempfile.TemporaryDirectory() as tmpdir:
        # ── Download video ──
        ext = os.path.splitext(file_name)[1] or ".mp4"
        input_path = os.path.join(tmpdir, f"input{ext}")
        print(f"Downloading {file_name} ({file_id})...")

        request = drive.files().get_media(fileId=file_id)
        with open(input_path, "wb") as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    pct = int(status.progress() * 100)
                    print(f"  Download: {pct}%")

        # ── Process ──
        output_name = build_output_name(climber, route, grade, file_name)
        output_path = os.path.join(tmpdir, output_name)

        print(f"Processing video with FFmpeg...")
        cmd = build_ffmpeg_command(
            input_path=input_path,
            output_path=output_path,
            banner_path=banner_path,
            logo_path=logo_path,
            climber=climber,
            route=route,
            grade=grade,
        )
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            error_msg = result.stderr[-500:] if result.stderr else "Unknown error"
            print(f"FFmpeg error: {error_msg}", file=sys.stderr)
            if sheet and sheet_row:
                row = int(sheet_row)
                sheet.update_cell(row, 3, "error")
                sheet.update_cell(row, 9, error_msg[:200])
            sys.exit(1)

        # ── Upload (as the user via OAuth when configured — SAs have no quota) ──
        upload_drive, up_label = build_upload_drive(credentials)
        print(f"Uploading {output_name} to Drive via {up_label}...")
        file_metadata = {
            "name": output_name,
            "parents": [output_folder_id],
        }
        media = MediaFileUpload(output_path, mimetype="video/mp4", resumable=True)
        uploaded = upload_drive.files().create(
            body=file_metadata, media_body=media, fields="id"
        ).execute()
        output_file_id = uploaded["id"]
        print(f"Uploaded: {output_file_id}")

        # ── Update sheet: done ──
        if sheet and sheet_row:
            row = int(sheet_row)
            sheet.update_cell(row, 3, "done")      # Status
            sheet.update_cell(row, 8, output_file_id)  # Output File ID
            sheet.update_cell(row, 9, "")           # Clear error

    print("All done!")


def main():
    parser = argparse.ArgumentParser(description="TotemTV Video Processor")
    parser.add_argument("--local", action="store_true",
                        help="Process a local file (no cloud)")
    parser.add_argument("--input", "-i", help="Input video path (local mode)")
    parser.add_argument("--output", "-o", help="Output video path (local mode)")
    parser.add_argument("--climber", default="", help="Climber name")
    parser.add_argument("--route", default="", help="Route name")
    parser.add_argument("--grade", default="", help="Grade")
    parser.add_argument("--banner", help="Path to banner image (default: repo root)")
    parser.add_argument("--logo", help="Path to logo image (default: repo root)")
    parser.add_argument("--font", help="Path to .ttf font file (optional)")
    args = parser.parse_args()

    if args.local:
        if not args.input or not args.output:
            parser.error("--input and --output are required in local mode")
        process_local(args)
    else:
        process_cloud()


if __name__ == "__main__":
    main()
