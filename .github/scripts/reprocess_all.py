#!/usr/bin/env python3
"""
TotemTV — Batch Re-Processor
Downloads all videos from the output Drive folder, re-encodes them
to TV-friendly settings (1080p, 30fps, Main profile, level 4.1),
and re-uploads them (replacing the originals).

This is a ONE-TIME migration script meant to fix videos that were
processed before the TV-compatible encoding settings were added.

Usage (GitHub Actions):
    Environment variables: GOOGLE_CREDENTIALS, OUTPUT_FOLDER_ID

Usage (local — requires gcloud service account JSON):
    python reprocess_all.py --local --credentials path/to/creds.json --folder-id FOLDER_ID
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

# Import the processing function from the main script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from process_video import get_video_dimensions, MAX_HEIGHT, MAX_FPS, CRF


def needs_reprocess(video_path: str) -> dict:
    """Check if a video needs re-processing. Returns a dict with reasons, or empty if OK."""
    reasons = {}

    try:
        vw, vh = get_video_dimensions(video_path)
        if vh > MAX_HEIGHT:
            reasons['resolution'] = f"{vw}x{vh} → 1080p"
    except Exception:
        pass

    # Check fps
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=r_frame_rate",
        "-of", "csv=p=0",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        fps_str = result.stdout.strip()
        if '/' in fps_str:
            num, den = fps_str.split('/')
            fps = int(num) / int(den)
        else:
            fps = float(fps_str)
        if fps > MAX_FPS + 1:
            reasons['fps'] = f"{fps:.0f}fps → {MAX_FPS}fps"
    except Exception:
        pass

    # Check bitrate
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=bit_rate",
        "-of", "csv=p=0",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        bitrate = int(result.stdout.strip())
        if bitrate > 20_000_000:  # > 20 Mbps
            reasons['bitrate'] = f"{bitrate // 1_000_000}Mbps → ≤15Mbps"
    except Exception:
        pass

    # Check profile
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=profile",
        "-of", "csv=p=0",
        video_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        profile = result.stdout.strip()
        if profile and profile.lower() != "main":
            reasons['profile'] = f"{profile} → Main"
    except Exception:
        pass

    return reasons


def reencode(input_path: str, output_path: str):
    """Re-encode a video with TV-friendly settings (no banner — already burned in)."""
    vw, vh = get_video_dimensions(input_path)

    # Calculate target dimensions
    if vh > MAX_HEIGHT:
        scale_factor = MAX_HEIGHT / vh
        tw = int(vw * scale_factor)
        th = MAX_HEIGHT
        tw = tw + (tw % 2)  # ensure even
    else:
        tw = vw + (vw % 2)
        th = vh + (vh % 2)

    filter_str = f"scale={tw}:{th}:force_original_aspect_ratio=decrease,pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2,fps={MAX_FPS}"

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", filter_str,
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

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[-500:]}")


def run_cloud(dry_run=False):
    """Re-process all videos in the Drive output folder."""
    if dry_run:
        print("=== DRY RUN — checking only, no re-encoding or uploading ===")
    output_folder_id = os.environ["OUTPUT_FOLDER_ID"]
    creds_json = os.environ["GOOGLE_CREDENTIALS"]
    creds_info = json.loads(creds_json)

    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload

    SCOPES = ["https://www.googleapis.com/auth/drive"]
    credentials = service_account.Credentials.from_service_account_info(
        creds_info, scopes=SCOPES
    )
    drive = build("drive", "v3", credentials=credentials)

    # List all video files in the output folder
    query = f"'{output_folder_id}' in parents and trashed = false and mimeType contains 'video/'"
    results = drive.files().list(
        q=query,
        fields="files(id,name,mimeType,size)",
        pageSize=1000,
    ).execute()
    videos = results.get("files", [])

    if not videos:
        print("No videos found in the output folder.")
        return

    print(f"Found {len(videos)} video(s) in output folder.\n")

    processed = 0
    skipped = 0
    failed = 0

    for i, video in enumerate(videos, 1):
        file_id = video["id"]
        file_name = video["name"]
        print(f"[{i}/{len(videos)}] {file_name}")

        with tempfile.TemporaryDirectory() as tmpdir:
            # Download
            ext = os.path.splitext(file_name)[1] or ".mp4"
            input_path = os.path.join(tmpdir, f"input{ext}")

            print(f"  Downloading...")
            request = drive.files().get_media(fileId=file_id)
            with open(input_path, "wb") as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    status, done = downloader.next_chunk()

            # Check if re-processing is needed
            reasons = needs_reprocess(input_path)
            if not reasons:
                print(f"  Already OK — skipping.")
                skipped += 1
                continue

            print(f"  Needs re-processing: {', '.join(f'{k}: {v}' for k, v in reasons.items())}")

            if dry_run:
                processed += 1
                continue

            # Re-encode
            output_path = os.path.join(tmpdir, f"output.mp4")
            print(f"  Re-encoding...")
            try:
                reencode(input_path, output_path)
            except RuntimeError as e:
                print(f"  FAILED: {e}")
                failed += 1
                continue

            # Show before/after sizes
            in_size = os.path.getsize(input_path)
            out_size = os.path.getsize(output_path)
            print(f"  Size: {in_size // (1024*1024)}MB → {out_size // (1024*1024)}MB")

            # Upload replacement — update the same file ID (replace content, keep metadata)
            print(f"  Uploading replacement...")
            media = MediaFileUpload(output_path, mimetype="video/mp4", resumable=True)
            drive.files().update(
                fileId=file_id,
                media_body=media,
            ).execute()

            processed += 1
            print(f"  Done!")

    print(f"\n{'='*50}")
    if dry_run:
        print(f"Summary (DRY RUN): {processed} need re-processing, {skipped} already OK")
    else:
        print(f"Summary: {processed} re-processed, {skipped} already OK, {failed} failed")


def run_local(args):
    """Re-process a single video file locally (for testing)."""
    input_path = args.input
    output_path = args.output

    if not os.path.isfile(input_path):
        sys.exit(f"Input not found: {input_path}")

    reasons = needs_reprocess(input_path)
    if not reasons:
        print("Video already meets TV specs — no re-processing needed.")
        return

    print(f"Re-processing needed: {', '.join(f'{k}: {v}' for k, v in reasons.items())}")
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    reencode(input_path, output_path)

    in_size = os.path.getsize(input_path)
    out_size = os.path.getsize(output_path)
    print(f"Size: {in_size // (1024*1024)}MB → {out_size // (1024*1024)}MB")
    print("Done!")


def main():
    parser = argparse.ArgumentParser(description="TotemTV Batch Re-Processor")
    parser.add_argument("--local", action="store_true",
                        help="Re-process a local file (no cloud)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only check which videos need re-processing (no actual encoding/upload)")
    parser.add_argument("--input", "-i", help="Input video path (local mode)")
    parser.add_argument("--output", "-o", help="Output video path (local mode)")
    args = parser.parse_args()

    if args.local:
        if not args.input or not args.output:
            parser.error("--input and --output are required in local mode")
        run_local(args)
    else:
        run_cloud(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
