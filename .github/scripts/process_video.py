"""
TotemTV Video Processor — GitHub Actions Script

1. Downloads raw video from Google Drive (FILE_ID)
2. FFmpeg: drawbox + drawtext — black banner at TOP with:
        {CLIMBER_NAME} | {ROUTE_NAME} {GRADE}
    3. Uploads edited video to OUTPUT_FOLDER_ID on Drive
    4. Updates status in Google Sheet (row SHEET_ROW, column G -> "Done")
    """

import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import gspread

# -- Environment variables -------------------------------------------
GOOGLE_CREDENTIALS = os.environ['GOOGLE_CREDENTIALS']
OUTPUT_FOLDER_ID   = os.environ['OUTPUT_FOLDER_ID']
SHEET_ID           = os.environ['SHEET_ID']
FILE_ID            = os.environ['FILE_ID']
FILE_NAME          = os.environ['FILE_NAME']
CLIMBER_NAME       = os.environ['CLIMBER_NAME']
ROUTE_NAME         = os.environ['ROUTE_NAME']
GRADE              = os.environ['GRADE']
SHEET_ROW          = int(os.environ['SHEET_ROW']) if os.environ.get('SHEET_ROW', '').strip() else None

GDRIVE_REFRESH_TOKEN = os.environ.get("GDRIVE_REFRESH_TOKEN", "")
GDRIVE_CLIENT_ID     = os.environ.get("GDRIVE_CLIENT_ID", "")
GDRIVE_CLIENT_SECRET = os.environ.get("GDRIVE_CLIENT_SECRET", "")

print(f'[INFO] Service Account: {json.loads(GOOGLE_CREDENTIALS).get("client_email", "unknown")}')

SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
]

# -- Banner / text constants (tweak after first test) -----------------
BANNER_HEIGHT = 60    # pixels - black bar at the top
FONT_SIZE     = 36    # drawtext font size
FONT_COLOR    = 'white'
BANNER_COLOR  = 'black@0.85'

# Fonts available on ubuntu-latest + fonts-noto-core
FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/noto/NotoSansHebrew-Bold.ttf',
    '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
]

# -- Helpers ---------------------------------------------------------
def get_credentials():
    info = json.loads(GOOGLE_CREDENTIALS)
    return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)

def drive_service(creds):
    return build('drive', 'v3', credentials=creds)

def download_file(svc, file_id, dest):
    """Download a file from Google Drive."""
    req = svc.files().get_media(fileId=file_id)
    with open(dest, 'wb') as fh:
        dl = MediaIoBaseDownload(fh, req)
        done = False
        while not done:
            status, done = dl.next_chunk()
            if status:
                print(f'  download {int(status.progress() * 100)}%')
    print(f'  to {dest} ({os.path.getsize(dest) / 1024 / 1024:.1f} MB)')

def find_font():
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return p
    res = subprocess.run(
        ['fc-list', ':lang=he', '-f', '%{file}\n'],
        capture_output=True, text=True,
    )
    lines = [l for l in res.stdout.strip().split('\n') if l]
    if lines:
        return lines[0]
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def escape_text(t):
    """Escape for FFmpeg drawtext."""
    for old, new in [('\\', '\\\\'), ("'", "\\'"), (':', '\\:'), ('%', '%%')]:
        t = t.replace(old, new)
    return t

def get_video_info(path):
    """Return (width, height) via ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        str(path),
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, check=True)
    s = json.loads(out.stdout)['streams'][0]
    return int(s['width']), int(s['height'])

def process_video(src, dst, climber, route, grade):
    w, h = get_video_info(src)
    print(f'  video: {w}x{h}')
    font = find_font()
    print(f'  font: {font}')
    label = f'{climber} | {route} {grade}'
    label_esc = escape_text(label)
    vf = (
        f"drawbox=x=0:y=0:w=iw:h={BANNER_HEIGHT}:color={BANNER_COLOR}:t=fill,"
        f"drawtext="
        f"fontfile='{font}':"
        f"text='{label_esc}':"
        f"fontcolor={FONT_COLOR}:"
        f"fontsize={FONT_SIZE}:"
        f"x=(w-text_w)/2:"
        f"y=({BANNER_HEIGHT}-text_h)/2:"
        f"shadowcolor=black@0.6:shadowx=1:shadowy=1"
    )
    cmd = [
        'ffmpeg', '-y', '-i', str(src),
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-c:a', 'copy', '-movflags', '+faststart',
        str(dst),
    ]
    print('  running ffmpeg ...')
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if result.returncode != 0:
        print(result.stderr[-2000:], file=sys.stderr)
        raise RuntimeError(f'FFmpeg exited with code {result.returncode}')
    mb = os.path.getsize(dst) / 1024 / 1024
    print(f'  output: {dst} ({mb:.1f} MB)')

def get_oauth_access_token():
    """Get OAuth access token using refresh token. Returns None on failure."""
    if not GDRIVE_REFRESH_TOKEN or not GDRIVE_CLIENT_ID or not GDRIVE_CLIENT_SECRET:
        return None
    try:
        data = urllib.parse.urlencode({
            'client_id': GDRIVE_CLIENT_ID,
            'client_secret': GDRIVE_CLIENT_SECRET,
            'refresh_token': GDRIVE_REFRESH_TOKEN,
            'grant_type': 'refresh_token',
        }).encode()
        req = urllib.request.Request(
            'https://oauth2.googleapis.com/token',
            data=data,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )
        with urllib.request.urlopen(req) as resp:
            token_data = json.loads(resp.read())
        return token_data.get('access_token')
    except Exception as e:
        print(f'  OAuth token fetch failed ({e}), falling back to service account', file=sys.stderr)
        return None

def upload_file(svc, path, folder_id, name):
    access_token = get_oauth_access_token()
    if access_token:
        print('  uploading via OAuth user token (resumable) ...')
        try:
            file_size = os.path.getsize(path)
            metadata = json.dumps({'name': name, 'parents': [folder_id]}).encode()
            init_req = urllib.request.Request(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
                data=metadata,
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Type': 'video/mp4',
                    'X-Upload-Content-Length': str(file_size),
                },
                method='POST',
            )
            with urllib.request.urlopen(init_req) as resp:
                upload_url = resp.headers['Location']
            with open(path, 'rb') as f:
                upload_req = urllib.request.Request(
                    upload_url,
                    data=f.read(),
                    headers={
                        'Content-Type': 'video/mp4',
                        'Content-Length': str(file_size),
                    },
                    method='PUT',
                )
            with urllib.request.urlopen(upload_req) as resp:
                result = json.loads(resp.read())
            fid = result['id']
            print(f'  uploaded to {fid}')
            return fid
        except Exception as e:
            print(f'  OAuth upload failed ({e}), falling back to service account', file=sys.stderr)

    print('  uploading via service account ...')
    meta  = {'name': name, 'parents': [folder_id]}
    media = MediaFileUpload(str(path), mimetype='video/mp4', resumable=True)
    f = svc.files().create(body=meta, media_body=media, fields='id').execute()
    fid = f['id']
    print(f'  uploaded to {fid}')
    return fid

def update_sheet(creds, status, output_file_id=None, error=None):
    if not SHEET_ROW or not SHEET_ID:
        print('  sheet update skipped (no SHEET_ROW or SHEET_ID)')
        return
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(SHEET_ID).worksheet('Tracking')
    ws.update_cell(SHEET_ROW, 3, status)
    ws.update_cell(SHEET_ROW, 7, status)
    if output_file_id:
        ws.update_cell(SHEET_ROW, 8, output_file_id)
    if error:
        ws.update_cell(SHEET_ROW, 9, str(error)[:500])

# -- Main ------------------------------------------------------------
def main():
    print('=' * 60)
    print('TotemTV Video Processor')
    print('=' * 60)
    print(f'  File:    {FILE_NAME} ({FILE_ID})')
    print(f'  Climber: {CLIMBER_NAME}')
    print(f'  Route:   {ROUTE_NAME}')
    print(f'  Grade:   {GRADE}')
    print(f'  Row:     {SHEET_ROW}')
    print()

    creds = get_credentials()
    svc   = drive_service(creds)

    try:
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)

            # 1 - download raw video
            print('[1/4] Downloading video ...')
            src = tmp / 'input.mp4'
            download_file(svc, FILE_ID, src)

            # 2 - process (drawbox + drawtext)
            print('[2/4] Processing ...')
            dst = tmp / 'output.mp4'
            process_video(src, dst, CLIMBER_NAME, ROUTE_NAME, GRADE)

            # 3 - upload edited video
            print('[3/4] Uploading ...')
            stem     = Path(FILE_NAME).stem
            out_name = f'{stem} - {CLIMBER_NAME} - {ROUTE_NAME} {GRADE}.mp4'
            out_id   = upload_file(svc, dst, OUTPUT_FOLDER_ID, out_name)

            # 4 - update sheet
            print('[4/4] Updating sheet ...')
            update_sheet(creds, 'Done', output_file_id=out_id)

        print('\nDone!')

    except Exception as exc:
        print(f'\nERROR: {exc}', file=sys.stderr)
        try:
            update_sheet(creds, 'Error', error=str(exc))
        except Exception:
            pass
        sys.exit(1)

if __name__ == '__main__':
    main()
