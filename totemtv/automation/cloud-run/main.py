"""
TotemTV Video Processor — Cloud Run Service
Receives video details, overlays video_background.png + text, uploads to Drive.
"""

import io
import os
import json
import logging
import subprocess
import tempfile
from pathlib import Path

from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import requests

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────
SCOPES = ['https://www.googleapis.com/auth/drive']

# Font paths (Noto Sans Hebrew for RTL support)
FONT_PATHS = [
    '/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansHebrew-Regular.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]

# Banner occupies roughly the bottom 10% of the frame
BANNER_HEIGHT_RATIO = 0.10
# Text vertical position within the banner (from top of banner)
TEXT_Y_OFFSET_RATIO = 0.04
# Font size relative to video height
FONT_SIZE_RATIO = 0.035
# Horizontal margins
MARGIN_LEFT_RATIO = 0.05
MARGIN_RIGHT_RATIO = 0.05


def get_drive_service():
    """Create authenticated Drive API service."""
    # In Cloud Run, use the default service account or a key file
    creds_json = os.environ.get('GOOGLE_CREDENTIALS')
    if creds_json:
        info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        # Fall back to Application Default Credentials
        from google.auth import default
        creds, _ = default(scopes=SCOPES)

    return build('drive', 'v3', credentials=creds)


def download_file(drive_service, file_id, dest_path):
    """Download a file from Google Drive."""
    request_obj = drive_service.files().get_media(fileId=file_id)
    with open(dest_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request_obj)
        done = False
        while not done:
            status, done = downloader.next_chunk()
            if status:
                logger.info(f'Download {file_id}: {int(status.progress() * 100)}%')
    logger.info(f'Downloaded {file_id} to {dest_path}')


def find_background_image(drive_service, folder_id):
    """Find video_background image in the unedited folder."""
    query = (
        f"'{folder_id}' in parents and trashed = false and "
        f"name contains 'video_background'"
    )
    results = drive_service.files().list(
        q=query, fields='files(id, name, mimeType)', pageSize=5
    ).execute()

    files = results.get('files', [])
    if not files:
        raise FileNotFoundError('video_background not found in the unedited folder')

    return files[0]['id'], files[0]['name']


def get_video_dimensions(video_path):
    """Get video width and height using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        str(video_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)
    stream = info['streams'][0]
    return int(stream['width']), int(stream['height'])


def find_font():
    """Find an available font file."""
    for font_path in FONT_PATHS:
        if Path(font_path).exists():
            return font_path
    # Search for any Noto font
    result = subprocess.run(
        ['find', '/usr/share/fonts', '-name', '*NotoSans*Bold*', '-type', 'f'],
        capture_output=True, text=True
    )
    fonts = result.stdout.strip().split('\n')
    if fonts and fonts[0]:
        return fonts[0]
    # Last resort
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def escape_ffmpeg_text(text):
    """Escape special characters for FFmpeg drawtext filter."""
    # FFmpeg drawtext needs these characters escaped
    text = text.replace('\\', '\\\\')
    text = text.replace("'", "\\'")
    text = text.replace(':', '\\:')
    text = text.replace('%', '%%')
    return text


def process_video(video_path, background_path, output_path, climber, route, grade):
    """
    Process video: overlay background PNG + draw text on the bottom banner.
    
    Layout on the dark banner:
      - Right side: climber name (שם מטפס)
      - Center: route name (שם מסלול)
      - Left side: grade (דירוג)
    """
    width, height = get_video_dimensions(video_path)
    logger.info(f'Video dimensions: {width}x{height}')

    font_path = find_font()
    logger.info(f'Using font: {font_path}')

    font_size = max(int(height * FONT_SIZE_RATIO), 20)
    
    # Text Y position: in the middle of the bottom banner
    # Banner starts at roughly (height - height * BANNER_HEIGHT_RATIO)
    banner_top = height - int(height * BANNER_HEIGHT_RATIO)
    text_y = banner_top + int(height * TEXT_Y_OFFSET_RATIO)

    # Horizontal positions
    margin_left = int(width * MARGIN_LEFT_RATIO)
    margin_right = int(width * MARGIN_RIGHT_RATIO)
    center_x = width // 2

    # Escape text for FFmpeg
    climber_esc = escape_ffmpeg_text(climber)
    route_esc = escape_ffmpeg_text(route)
    grade_esc = escape_ffmpeg_text(grade)

    # Build FFmpeg filter complex:
    # 1. Scale background to match video dimensions
    # 2. Overlay background on video
    # 3. Draw text (grade left, route center, climber right)
    filter_complex = (
        f"[1:v]scale={width}:{height}[bg];"
        f"[0:v][bg]overlay=0:0[overlaid];"
        # Grade — left side
        f"[overlaid]drawtext="
        f"fontfile='{font_path}':"
        f"text='{grade_esc}':"
        f"fontcolor=white:"
        f"fontsize={font_size}:"
        f"x={margin_left}:"
        f"y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
        f"[t1];"
        # Route name — center
        f"[t1]drawtext="
        f"fontfile='{font_path}':"
        f"text='{route_esc}':"
        f"fontcolor=white:"
        f"fontsize={font_size}:"
        f"x=(w-text_w)/2:"
        f"y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
        f"[t2];"
        # Climber name — right side
        f"[t2]drawtext="
        f"fontfile='{font_path}':"
        f"text='{climber_esc}':"
        f"fontcolor=white:"
        f"fontsize={font_size}:"
        f"x=w-text_w-{margin_right}:"
        f"y={text_y}:"
        f"shadowcolor=black@0.5:shadowx=2:shadowy=2"
    )

    cmd = [
        'ffmpeg', '-y',
        '-i', str(video_path),
        '-i', str(background_path),
        '-filter_complex', filter_complex,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'copy',
        '-movflags', '+faststart',
        str(output_path)
    ]

    logger.info(f'Running FFmpeg: {" ".join(cmd[:6])}...')
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        logger.error(f'FFmpeg stderr: {result.stderr}')
        raise RuntimeError(f'FFmpeg failed: {result.stderr[-500:]}')

    logger.info(f'Video processed successfully: {output_path}')
    return output_path


def upload_to_drive(drive_service, file_path, folder_id, filename):
    """Upload processed video to the output Drive folder."""
    file_metadata = {
        'name': filename,
        'parents': [folder_id],
    }
    media = MediaFileUpload(
        str(file_path),
        mimetype='video/mp4',
        resumable=True
    )
    file = drive_service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id'
    ).execute()

    logger.info(f'Uploaded to Drive: {file.get("id")}')
    return file.get('id')


def notify_callback(callback_url, file_id, status, output_file_id=None, error=None):
    """Notify Apps Script callback about processing result."""
    if not callback_url:
        return

    payload = {
        'fileId': file_id,
        'status': status,
    }
    if output_file_id:
        payload['outputFileId'] = output_file_id
    if error:
        payload['error'] = str(error)[:500]

    try:
        resp = requests.post(callback_url, json=payload, timeout=30)
        logger.info(f'Callback response: {resp.status_code}')
    except Exception as e:
        logger.error(f'Callback failed: {e}')


@app.route('/process', methods=['POST'])
def process():
    """Main endpoint: receive video details and process."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No JSON payload'}), 400

    file_id = data.get('fileId')
    climber = data.get('climber', '')
    route = data.get('route', '')
    grade = data.get('grade', '')
    unedited_folder_id = data.get('uneditedFolderId')
    output_folder_id = data.get('outputFolderId')
    callback_url = data.get('callbackUrl')

    if not all([file_id, climber, route, grade, unedited_folder_id, output_folder_id]):
        return jsonify({'error': 'Missing required fields'}), 400

    logger.info(f'Processing video {file_id}: {climber} / {route} / {grade}')

    try:
        drive_service = get_drive_service()

        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)

            # Get original filename
            file_meta = drive_service.files().get(
                fileId=file_id, fields='name'
            ).execute()
            original_name = file_meta['name']

            # Download the raw video
            video_path = tmpdir / 'input.mp4'
            download_file(drive_service, file_id, video_path)

            # Download video_background.png
            bg_id, bg_name = find_background_image(drive_service, unedited_folder_id)
            bg_ext = Path(bg_name).suffix or '.png'
            bg_path = tmpdir / f'background{bg_ext}'
            download_file(drive_service, bg_id, bg_path)

            # Process the video
            output_path = tmpdir / 'output.mp4'
            process_video(video_path, bg_path, output_path, climber, route, grade)

            # Generate output filename
            name_stem = Path(original_name).stem
            output_name = f'{name_stem} - {climber} - {route} {grade}.mp4'

            # Upload to output folder
            output_file_id = upload_to_drive(
                drive_service, output_path, output_folder_id, output_name
            )

        # Notify callback
        notify_callback(callback_url, file_id, 'done', output_file_id=output_file_id)

        return jsonify({
            'success': True,
            'outputFileId': output_file_id,
            'outputName': output_name,
        })

    except Exception as e:
        logger.exception(f'Error processing video {file_id}')
        notify_callback(callback_url, file_id, 'error', error=str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok'})


@app.route('/', methods=['GET'])
def root():
    """Root endpoint."""
    return jsonify({'service': 'totemtv-processor', 'status': 'running'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
