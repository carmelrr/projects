"""
TotemTV Video Processor — GitHub Actions Script
Downloads video from Drive, overlays video_background.png + text, uploads to Drive.
"""

import io
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import gspread

# ── Configuration from environment ───────────────────────────
GOOGLE_CREDENTIALS = os.environ['GOOGLE_CREDENTIALS']
UNEDITED_FOLDER_ID = os.environ['UNEDITED_FOLDER_ID']
OUTPUT_FOLDER_ID = os.environ['OUTPUT_FOLDER_ID']
SHEET_ID = os.environ['SHEET_ID']
FILE_ID = os.environ['FILE_ID']
FILE_NAME = os.environ['FILE_NAME']
CLIMBER_NAME = os.environ['CLIMBER_NAME']
ROUTE_NAME = os.environ['ROUTE_NAME']
GRADE = os.environ['GRADE']
SHEET_ROW = int(os.environ['SHEET_ROW'])

SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
]

# Overlay positioning constants (adjust after first test)
BANNER_HEIGHT_RATIO = 0.10    # banner = bottom 10% of frame
TEXT_Y_OFFSET_RATIO = 0.04    # text offset from top of banner
FONT_SIZE_RATIO = 0.035       # font size relative to video height
MARGIN_X_RATIO = 0.05         # horizontal margin

# Font search paths (Ubuntu + Noto)
FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]


def get_credentials():
    """Parse service account credentials from env var (JSON string)."""
    info = json.loads(GOOGLE_CREDENTIALS)
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)


def download_file(drive_service, file_id, dest_path):
    """Download a file from Google Drive."""
    req = drive_service.files().get_media(fileId=file_id)
    with open(dest_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, req)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                print(f'  Download {file_id}: {int(status.progress() * 100)}%')
    print(f'  Downloaded → {dest_path}')


def find_background_image(drive_service, folder_id):
    """Locate video_background image in the unedited folder."""
    query = f"'{folder_id}' in parents and trashed = false and name contains 'video_background'"
    results = drive_service.files().list(
        q=query, fields='files(id, name)', pageSize=5
    ).execute()
    files = results.get('files', [])
    if not files:
        raise FileNotFoundError('video_background not found in unedited folder')
    return files[0]['id'], files[0]['name']


def get_video_dimensions(video_path):
    """Get width and height via ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    stream = json.loads(result.stdout)['streams'][0]
    return int(stream['width']), int(stream['height'])


def find_font():
    """Return the first available font path."""
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return p
    # Fallback: search filesystem
    result = subprocess.run(
        ['find', '/usr/share/fonts', '-name', '*NotoSans*Bold*', '-type', 'f'],
        capture_output=True, text=True,
    )
    fonts = [f for f in result.stdout.strip().split('\n') if f]
    if fonts:
        return fonts[0]
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def escape_ffmpeg_text(text):
    """Escape special chars for FFmpeg drawtext filter."""
    text = text.replace('\\', '\\\\')
    text = text.replace("'", "\\'")
    text = text.replace(':', '\\:')
    text = text.replace('%', '%%')
    return text


def process_video(video_path, bg_path, output_path, climber, route, grade):
    """Overlay background PNG + draw text on the bottom banner."""
    width, height = get_video_dimensions(video_path)
    print(f'  Video: {width}x{height}')

    font = find_font()
    print(f'  Font:  {font}')

    font_size = max(int(height * FONT_SIZE_RATIO), 20)
    banner_top = height - int(height * BANNER_HEIGHT_RATIO)
    text_y = banner_top + int(height * TEXT_Y_OFFSET_RATIO)
    margin = int(width * MARGIN_X_RATIO)

    climber_esc = escape_ffmpeg_text(climber)
    route_esc = escape_ffmpeg_text(route)
    grade_esc = escape_ffmpeg_text(grade)

    # filter_complex:
    #   1) Scale background PNG to match video
    #   2) Overlay on video
    #   3) Draw grade (left), route (center), climber (right)
    filter_complex = (
        f"[1:v]scale={width}:{height}[bg];"
        f"[0:v][bg]overlay=0:0[ov];"
        # Grade — left
        f"[ov]drawtext="
        f"fontfile='{font}':"
        f"text='{grade_esc}':"
        f"fontcolor=white:fontsize={font_size}:"
        f"x={margin}:y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
        f"[t1];"
        # Route — center
        f"[t1]drawtext="
        f"fontfile='{font}':"
        f"text='{route_esc}':"
        f"fontcolor=white:fontsize={font_size}:"
        f"x=(w-text_w)/2:y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
        f"[t2];"
        # Climber — right
        f"[t2]drawtext="
        f"fontfile='{font}':"
        f"text='{climber_esc}':"
        f"fontcolor=white:fontsize={font_size}:"
        f"x=w-text_w-{margin}:y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
    )

    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_path),
        '-i', str(bg_path),
        '-filter_complex', filter_complex,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        str(output_path),
    ]

    print('  Running FFmpeg...')
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if result.returncode != 0:
        print(f'  FFmpeg STDERR:\n{result.stderr[-1000:]}', file=sys.stderr)
        raise RuntimeError(f'FFmpeg failed (exit {result.returncode})')

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f'  Output: {output_path} ({size_mb:.1f} MB)')


def upload_to_drive(drive_service, file_path, folder_id, filename):
    """Upload processed video to the output folder."""
    metadata = {'name': filename, 'parents': [folder_id]}
    media = MediaFileUpload(str(file_path), mimetype='video/mp4', resumable=True)
    uploaded = drive_service.files().create(
        body=metadata, media_body=media, fields='id'
    ).execute()
    file_id = uploaded['id']
    print(f'  Uploaded → {file_id}')
    return file_id


def update_sheet(creds, status, output_file_id=None, error=None):
    """Update the tracking row in Google Sheet."""
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(SHEET_ID)
    ws = sh.worksheet('Tracking')

    # Column C = status (col 3), H = output file ID (col 8), I = error (col 9)
    ws.update_cell(SHEET_ROW, 3, status)
    if output_file_id:
        ws.update_cell(SHEET_ROW, 8, output_file_id)
    if error:
        ws.update_cell(SHEET_ROW, 9, str(error)[:500])


def main():
    print('=' * 60)
    print('TotemTV Video Processor')
    print('=' * 60)
    print(f'  File:    {FILE_NAME} ({FILE_ID})')
    print(f'  Climber: {CLIMBER_NAME}')
    print(f'  Route:   {ROUTE_NAME}')
    print(f'  Grade:   {GRADE}')
    print()

    creds = get_credentials()
    drive_service = build('drive', 'v3', credentials=creds)

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # 1. Download raw video
            print('[1/5] Downloading video...')
            video_path = tmpdir / 'input.mp4'
            download_file(drive_service, FILE_ID, video_path)

            # 2. Download video_background
            print('[2/5] Downloading background overlay...')
            bg_id, bg_name = find_background_image(drive_service, UNEDITED_FOLDER_ID)
            bg_ext = Path(bg_name).suffix or '.png'
            bg_path = tmpdir / f'background{bg_ext}'
            download_file(drive_service, bg_id, bg_path)

            # 3. Process with FFmpeg
            print('[3/5] Processing video...')
            output_path = tmpdir / 'output.mp4'
            process_video(video_path, bg_path, output_path, CLIMBER_NAME, ROUTE_NAME, GRADE)

            # 4. Upload to output folder
            print('[4/5] Uploading to Drive...')
            stem = Path(FILE_NAME).stem
            output_name = f'{stem} - {CLIMBER_NAME} - {ROUTE_NAME} {GRADE}.mp4'
            output_file_id = upload_to_drive(drive_service, output_path, OUTPUT_FOLDER_ID, output_name)

            # 5. Update sheet status
            print('[5/5] Updating sheet...')
            update_sheet(creds, 'done', output_file_id=output_file_id)

        print()
        print('Done!')

    except Exception as e:
        print(f'\nERROR: {e}', file=sys.stderr)
        try:
            update_sheet(creds, 'error', error=str(e))
        except Exception:
            pass
        sys.exit(1)


if __name__ == '__main__':
    main()
