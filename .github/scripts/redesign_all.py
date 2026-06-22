#!/usr/bin/env python3
"""
TotemTV — Re-skin all automation-processed videos with the CURRENT overlay design.

Unlike reprocess_all.py (which only re-encodes already-edited outputs and cannot
change a banner that is already burned into the pixels), this script re-runs the
FULL FFmpeg overlay pipeline on the ORIGINAL raw videos and replaces the edited
outputs in place — so videos edited before the redesign get the new look.

For every "done" row in the Tracking sheet it:
  1. takes the raw video (File ID, col A) + saved climber/route/grade (cols D/E/F),
  2. re-renders it with build_ffmpeg_command() (white top-right logo, taller banner),
  3. REPLACES the existing edited file in place (same Output File ID, col H),
     so the TV picks up the new version automatically — no new files, no renames.

Requires the original raws to still exist in the "unedited" folder. Rows whose raw
is gone are reported and skipped (their burned-in output cannot be re-skinned).

Env: GOOGLE_CREDENTIALS, SHEET_ID
Usage (GitHub Actions):
    python redesign_all.py --dry-run   # preview: count targets + missing raws
    python redesign_all.py             # apply: re-skin and replace in place
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from process_video import build_ffmpeg_command, resolve_asset

# Tracking sheet column indices (0-based), mirroring automation/apps-script/Code.gs
COL_FILE_ID, COL_FILENAME, COL_STATUS = 0, 1, 2
COL_CLIMBER, COL_ROUTE, COL_GRADE = 3, 4, 5
COL_OUTPUT_ID, COL_ERROR = 7, 8
STATUS_DONE = "done"


def run(dry_run: bool = False):
    if dry_run:
        print("=== DRY RUN — counting targets only, nothing is downloaded or replaced ===")

    sheet_id = os.environ["SHEET_ID"]
    creds_info = json.loads(os.environ["GOOGLE_CREDENTIALS"])

    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
    import gspread

    scopes = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]
    credentials = service_account.Credentials.from_service_account_info(creds_info, scopes=scopes)
    drive = build("drive", "v3", credentials=credentials)
    gc = gspread.authorize(credentials)
    sheet = gc.open_by_key(sheet_id).worksheet("Tracking")

    repo_root = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
    banner_path = resolve_asset(repo_root, "totem-banner.jpeg")
    logo_path = resolve_asset(repo_root, "totem-logo-white-trim.png")

    rows = sheet.get_all_values()

    def cell(row, i):
        return row[i].strip() if i < len(row) and row[i] else ""

    targets = []
    for sheet_row, row in enumerate(rows[1:], start=2):  # skip header; sheet rows are 1-based
        if cell(row, COL_STATUS).lower() != STATUS_DONE:
            continue
        raw_id = cell(row, COL_FILE_ID)
        out_id = cell(row, COL_OUTPUT_ID)
        if not raw_id or not out_id:
            continue
        targets.append({
            "sheet_row": sheet_row,
            "raw_id": raw_id,
            "out_id": out_id,
            "climber": cell(row, COL_CLIMBER),
            "route": cell(row, COL_ROUTE),
            "grade": cell(row, COL_GRADE),
            "filename": cell(row, COL_FILENAME),
        })

    print(f"Found {len(targets)} done video(s) in the sheet.\n")

    reskinned = missing = failed = 0
    for n, t in enumerate(targets, 1):
        label = t["filename"] or t["out_id"]
        meta = " | ".join(p for p in [t["climber"], t["route"], t["grade"]] if p) or "(no text)"
        print(f"[{n}/{len(targets)}] row {t['sheet_row']}: {label}  →  {meta}")

        # The raw original is required — without it the burned-in output can't be re-skinned.
        try:
            drive.files().get(fileId=t["raw_id"], fields="id,name").execute()
        except Exception as e:
            print(f"  RAW MISSING ({t['raw_id']}) — skipping. {str(e)[:120]}")
            missing += 1
            continue

        if dry_run:
            print("  would re-skin (dry-run)")
            reskinned += 1
            continue

        with tempfile.TemporaryDirectory() as tmpdir:
            ext = os.path.splitext(t["filename"])[1] or ".mp4"
            input_path = os.path.join(tmpdir, f"raw{ext}")
            print("  Downloading raw...")
            request = drive.files().get_media(fileId=t["raw_id"])
            with open(input_path, "wb") as f:
                downloader = MediaIoBaseDownload(f, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()

            output_path = os.path.join(tmpdir, "out.mp4")
            print("  Re-rendering with the new design...")
            cmd = build_ffmpeg_command(
                input_path=input_path,
                output_path=output_path,
                banner_path=banner_path,
                logo_path=logo_path,
                climber=t["climber"],
                route=t["route"],
                grade=t["grade"],
            )
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                err = (result.stderr or "")[-300:]
                print(f"  FFmpeg FAILED: {err}")
                try:
                    sheet.update_cell(t["sheet_row"], COL_ERROR + 1, f"reskin error: {err[:150]}")
                except Exception:
                    pass
                failed += 1
                continue

            # Replace the existing edited file IN PLACE (same File ID → TV auto-updates).
            print("  Replacing edited output in place...")
            media = MediaFileUpload(output_path, mimetype="video/mp4", resumable=True)
            drive.files().update(fileId=t["out_id"], media_body=media).execute()
            try:
                sheet.update_cell(t["sheet_row"], COL_ERROR + 1, "")
            except Exception:
                pass
            print("  Re-skinned ✓")
            reskinned += 1

    print("\n" + "=" * 50)
    if dry_run:
        print(f"DRY RUN: {reskinned} would be re-skinned, {missing} raw missing")
    else:
        print(f"Done: {reskinned} re-skinned, {missing} raw missing, {failed} failed")


def main():
    parser = argparse.ArgumentParser(description="TotemTV — re-skin edited videos with the current design")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only count targets and check raw availability (no download/replace)")
    args = parser.parse_args()
    run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
