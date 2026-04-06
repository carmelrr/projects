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
import subprocess
import sys
import tempfile

# ── Layout constants (match www/index.html CSS) ────────────────
BANNER_HEIGHT_RATIO = 0.06       # 6% of video height — compact banner
LOGO_HEIGHT_RATIO = 0.55         # logo = 55% of banner height
LOGO_RIGHT_MARGIN_RATIO = 0.01   # 1% from right edge
LOGO_TOP_MARGIN_RATIO = 0.08     # 8% from top of banner
FONT_SIZE_RATIO = 0.038          # font size relative to shorter dimension
SEPARATOR = " | "
CRF = 20                         # quality: 18 = near-lossless, 23 = default


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
    vw, vh = get_video_dimensions(input_path)

    banner_h = int(vh * BANNER_HEIGHT_RATIO)
    logo_h = int(banner_h * LOGO_HEIGHT_RATIO)
    logo_right = int(vw * LOGO_RIGHT_MARGIN_RATIO)
    logo_top = int(banner_h * LOGO_TOP_MARGIN_RATIO)
    # Use the shorter dimension so text never overflows on portrait videos
    ref_dim = min(vw, vh)
    font_size = int(ref_dim * FONT_SIZE_RATIO)

    # Build the display text: "climber | route | grade"
    parts = [p for p in [climber, route, grade] if p]
    display_text = SEPARATOR.join(parts)

    # Escape special FFmpeg drawtext characters
    display_text = (
        display_text
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
    )

    # ── Filter graph ──────────────────────────────────────────
    # [0:v] = input video
    # [1:v] = banner background image (mostly white, design only at bottom ~12%)
    # [2:v] = logo image
    filters = []

    # 1) Crop only the dark design strip from the very bottom of the
    #    banner image (orange line + green waves on dark background).
    #    Original image is 1600x900; the design is ~bottom 7%.
    #    Then scale to fill the banner area exactly.
    filters.append(
        f"[1:v]crop=iw:ih*0.07:0:ih-ih*0.07,scale={vw}:{banner_h}[banner]"
    )

    # 2) Scale logo proportionally to logo_h height
    filters.append(f"[2:v]scale=-1:{logo_h}[logo]")

    # 3) Overlay banner at bottom of video
    banner_y = vh - banner_h
    filters.append(f"[0:v][banner]overlay=0:{banner_y}[with_banner]")

    # 4) Overlay logo at top-right of banner area
    logo_x = f"W-overlay_w-{logo_right}"
    logo_y = banner_y + logo_top
    filters.append(f"[with_banner][logo]overlay={logo_x}:{logo_y}[with_logo]")

    # 5) Draw text centered on the banner (transparent — no box/border)
    text_y = banner_y + int(banner_h * 0.45) - (font_size // 2)
    resolved_font = font_file or find_default_font()
    if resolved_font:
        # Escape backslashes and colons for FFmpeg on Windows
        escaped_font = resolved_font.replace("\\", "/").replace(":", "\\:")
        font_spec = f"fontfile='{escaped_font}'"
    else:
        font_spec = "font='Arial'"
    drawtext = (
        f"drawtext="
        f"{font_spec}:"
        f"text='{display_text}':"
        f"fontsize={font_size}:"
        f"fontcolor=white:"
        f"shadowcolor=black@0.7:"
        f"shadowx=2:shadowy=2:"
        f"x=(w-text_w)/2:"
        f"y={text_y}"
    )
    filters.append(f"[with_logo]{drawtext}[out]")

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
        "-preset", "medium",
        "-crf", str(CRF),
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]
    return cmd


def find_asset(repo_root, filename):
    """Find an asset file in the repo root or totemtv/ subfolder."""
    for candidate in [
        os.path.join(repo_root, filename),
        os.path.join(repo_root, "totemtv", filename),
    ]:
        if os.path.isfile(candidate):
            return candidate
    return os.path.join(repo_root, filename)  # fallback for error message


def process_local(args):
    """Process a local video file (no cloud interaction)."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(script_dir, "..", ".."))

    banner_path = args.banner or find_asset(repo_root, "totem-banner.jpeg")
    logo_path = args.logo or find_asset(repo_root, "totem-logo.png")

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
    banner_path = find_asset(repo_root, "totem-banner.jpeg")
    logo_path = find_asset(repo_root, "totem-logo.png")

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
        base_name = os.path.splitext(file_name)[0]
        output_name = f"{base_name}.mp4"
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

        # ── Upload via OAuth user token (bypasses service account storage quota) ──
        print(f"Uploading {output_name} to Drive...")
        import urllib.request
        import urllib.parse

        gdrive_refresh_token = os.environ.get("GDRIVE_REFRESH_TOKEN", "")
        gdrive_client_id = os.environ.get("GDRIVE_CLIENT_ID", "")
        gdrive_client_secret = os.environ.get("GDRIVE_CLIENT_SECRET", "")

        output_file_id = None

        if gdrive_refresh_token and gdrive_client_id and gdrive_client_secret:
            try:
                token_data = urllib.parse.urlencode({
                    "client_id": gdrive_client_id,
                    "client_secret": gdrive_client_secret,
                    "refresh_token": gdrive_refresh_token,
                    "grant_type": "refresh_token",
                }).encode()
                token_req = urllib.request.Request(
                    "https://oauth2.googleapis.com/token",
                    data=token_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                with urllib.request.urlopen(token_req) as resp:
                    access_token = json.loads(resp.read())["access_token"]
                file_size = os.path.getsize(output_path)
                metadata = json.dumps({"name": output_name, "parents": [output_folder_id]}).encode()
                init_req = urllib.request.Request(
                    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
                    data=metadata,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json; charset=UTF-8",
                        "X-Upload-Content-Type": "video/mp4",
                        "X-Upload-Content-Length": str(file_size),
                    },
                    method="POST",
                )
                with urllib.request.urlopen(init_req) as resp:
                    upload_url = resp.headers["Location"]
                with open(output_path, "rb") as f:
                    upload_req = urllib.request.Request(
                        upload_url,
                        data=f.read(),
                        headers={
                            "Content-Type": "video/mp4",
                            "Content-Length": str(file_size),
                        },
                        method="PUT",
                    )
                    with urllib.request.urlopen(upload_req) as resp:
                        output_file_id = json.loads(resp.read())["id"]
                print(f"Uploaded via OAuth: {output_file_id}")
            except Exception as e:
                print(f"OAuth upload failed ({e}), falling back to service account", file=sys.stderr)

        if output_file_id is None:
            file_metadata = {"name": output_name, "parents": [output_folder_id]}
            media = MediaFileUpload(output_path, mimetype="video/mp4", resumable=True)
            uploaded = drive.files().create(body=file_metadata, media_body=media, fields="id").execute()
            output_file_id = uploaded["id"]
            print(f"Uploaded via service account: {output_file_id}")

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
