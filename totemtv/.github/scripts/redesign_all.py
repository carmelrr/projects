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
  3. REPLACES the current edited file in place (same Drive file → TV auto-updates).

The edited file is located in the OUTPUT folder rather than trusting the sheet's
Output File ID (col H), which can be stale if outputs were re-uploaded: we match
the row to the current file by the canonical output name (route - grade - climber),
falling back to the sheet id only when it is still valid.

Requires the original raws to still exist in the "unedited" folder. Rows whose raw
is gone, or whose current output cannot be located, are reported and skipped.

Env: GOOGLE_CREDENTIALS, SHEET_ID, OUTPUT_FOLDER_ID
Usage (GitHub Actions):
    python redesign_all.py --dry-run   # preview: targets, raw availability, output match
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
from process_video import build_ffmpeg_command, build_output_name, resolve_asset

# Tracking sheet column indices (0-based), mirroring automation/apps-script/Code.gs
COL_FILE_ID, COL_FILENAME, COL_STATUS = 0, 1, 2
COL_CLIMBER, COL_ROUTE, COL_GRADE = 3, 4, 5
COL_OUTPUT_ID, COL_ERROR = 7, 8
STATUS_DONE = "done"


def ffprobe_info(path: str) -> str:
    """Return a one-line summary of a video file, or a failure note."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration:stream=codec_name,width,height,codec_type",
        "-of", "json", path,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return "PROBE FAILED (file likely corrupt/incomplete): " + (r.stderr or "")[-120:]
    try:
        d = json.loads(r.stdout)
        dur = d.get("format", {}).get("duration", "?")
        vs = [s for s in d.get("streams", []) if s.get("codec_type") == "video"]
        if not vs:
            return f"dur={dur}s — NO VIDEO STREAM (bad)"
        v = vs[0]
        return f"dur={dur}s codec={v.get('codec_name')} {v.get('width')}x{v.get('height')}"
    except Exception as e:
        return "probe parse error: " + str(e)


def run(dry_run: bool = False, verify: bool = False):
    if verify:
        print("=== VERIFY — downloading each current output and probing it (no replace) ===")
    elif dry_run:
        print("=== DRY RUN — checking targets only, nothing is downloaded or replaced ===")

    sheet_id = os.environ["SHEET_ID"]
    output_folder_id = os.environ.get("OUTPUT_FOLDER_ID", "")
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

    # Index the output folder by name + id so we can locate the CURRENT edited file
    # even when the sheet's Output File ID is stale.
    name_to_id, folder_ids, id_to_name = {}, set(), {}
    if output_folder_id:
        q = f"'{output_folder_id}' in parents and trashed = false and mimeType contains 'video/'"
        res = drive.files().list(q=q, fields="files(id,name)", pageSize=1000).execute()
        for fobj in res.get("files", []):
            name_to_id[fobj["name"]] = fobj["id"]
            id_to_name[fobj["id"]] = fobj["name"]
            folder_ids.add(fobj["id"])
        print(f"Output folder: {len(folder_ids)} video(s) — {sorted(name_to_id)}")
    else:
        print("WARNING: OUTPUT_FOLDER_ID not set — can only use sheet Output File IDs.")

    def locate_output(out_id, raw_filename, expected_name):
        """Return (file_id, how) for the current edited file, or (None, reason).

        Outputs in this library are named after the original raw filename, so the
        raw name is the most reliable key; the sheet's stored Output File ID can be
        stale, and build_output_name() is useless when the sheet metadata is junk."""
        if out_id and out_id in folder_ids:
            return out_id, "sheet id"
        if raw_filename in name_to_id:
            return name_to_id[raw_filename], f"raw name '{raw_filename}'"
        if expected_name in name_to_id:
            return name_to_id[expected_name], f"name '{expected_name}'"
        if out_id and not output_folder_id:
            return out_id, "sheet id (unverified)"
        return None, "no current output found"

    # Optional per-file text overrides (the sheet metadata is unreliable for older
    # rows). JSON: { "<raw filename>": {"climber":..,"route":..,"grade":..}, ... }.
    # When supplied, ONLY the listed files are processed, using the given text.
    overrides_raw = os.environ.get("RESKIN_OVERRIDES", "").strip()
    overrides = json.loads(overrides_raw) if overrides_raw else {}
    if overrides:
        print(f"Text overrides supplied for {len(overrides)} file(s) — only those will be re-skinned.")

    rows = sheet.get_all_values()

    def cell(row, i):
        return row[i].strip() if i < len(row) and row[i] else ""

    targets = []
    for sheet_row, row in enumerate(rows[1:], start=2):  # skip header; sheet rows are 1-based
        if cell(row, COL_STATUS).lower() != STATUS_DONE:
            continue
        raw_id = cell(row, COL_FILE_ID)
        filename = cell(row, COL_FILENAME)
        if not raw_id:
            continue
        if overrides and filename not in overrides:
            continue  # restrict to the explicitly-listed files
        ov = overrides.get(filename, {})
        targets.append({
            "sheet_row": sheet_row,
            "raw_id": raw_id,
            "out_id": cell(row, COL_OUTPUT_ID),
            "climber": ov.get("climber", cell(row, COL_CLIMBER)),
            "route": ov.get("route", cell(row, COL_ROUTE)),
            "grade": ov.get("grade", cell(row, COL_GRADE)),
            "filename": filename,
        })

    print(f"Found {len(targets)} done video(s) in the sheet.\n")

    reskinned = raw_missing = no_output = failed = 0
    for n, t in enumerate(targets, 1):
        expected_name = build_output_name(t["climber"], t["route"], t["grade"], t["filename"])
        meta = " | ".join(p for p in [t["climber"], t["route"], t["grade"]] if p) or "(no text)"
        current_out = id_to_name.get(t["out_id"], "")
        print(f"[{n}/{len(targets)}] row {t['sheet_row']}:")
        print(f"      raw filename : {t['filename']}  ({t['raw_id']})")
        print(f"      sheet text   : {meta}")
        print(f"      current output: {current_out or '(sheet id not in folder)'}  [{t['out_id'] or 'no id'}]")

        # The raw original is required to re-skin a burned-in output.
        try:
            drive.files().get(fileId=t["raw_id"], fields="id").execute()
        except Exception as e:
            print(f"  RAW MISSING ({t['raw_id']}) — skipping. {str(e)[:120]}")
            raw_missing += 1
            continue

        dest_id, how = locate_output(t["out_id"], t["filename"], expected_name)
        if not dest_id:
            print(f"  OUTPUT NOT FOUND — {how}; sheet id was {t['out_id'] or '(empty)'} — skipping.")
            no_output += 1
            continue
        print(f"  output target: {dest_id} (via {how})")

        if verify:
            try:
                meta = drive.files().get(
                    fileId=dest_id,
                    fields="name,size,mimeType,videoMediaMetadata",
                ).execute()
                print(f"  drive meta: mime={meta.get('mimeType')} size={meta.get('size')} "
                      f"driveVideoMeta={meta.get('videoMediaMetadata')}")
                with tempfile.TemporaryDirectory() as tmpdir:
                    op = os.path.join(tmpdir, "out.mp4")
                    request = drive.files().get_media(fileId=dest_id)
                    with open(op, "wb") as f:
                        downloader = MediaIoBaseDownload(f, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                    print(f"  OUTPUT: {os.path.getsize(op)/1e6:.1f}MB  {ffprobe_info(op)}")
                    # Full decode test — reads every frame; surfaces corruption a header probe misses.
                    dec = subprocess.run(
                        ["ffmpeg", "-v", "error", "-xerror", "-i", op, "-f", "null", "-"],
                        capture_output=True, text=True,
                    )
                    errs = (dec.stderr or "").strip()
                    print(f"  decode test: {'CLEAN (fully playable)' if dec.returncode == 0 and not errs else 'ERRORS: ' + errs[:240]}")
                reskinned += 1
            except Exception as e:
                print(f"  OUTPUT DOWNLOAD/PROBE FAILED: {str(e)[:160]}")
                failed += 1
            continue

        if dry_run:
            print("  would re-skin (dry-run)")
            reskinned += 1
            continue

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                ext = os.path.splitext(t["filename"])[1] or ".mp4"
                input_path = os.path.join(tmpdir, f"raw{ext}")
                print("  downloading raw...")
                request = drive.files().get_media(fileId=t["raw_id"])
                with open(input_path, "wb") as f:
                    downloader = MediaIoBaseDownload(f, request)
                    done = False
                    while not done:
                        _, done = downloader.next_chunk()

                output_path = os.path.join(tmpdir, "out.mp4")
                print("  re-rendering with the new design...")
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
                    print(f"  FFMPEG FAILED: {err}")
                    failed += 1
                    continue

                print("  replacing edited output in place...")
                media = MediaFileUpload(output_path, mimetype="video/mp4", resumable=True)
                drive.files().update(fileId=dest_id, media_body=media).execute()
                print("  re-skinned OK")
                reskinned += 1
        except Exception as e:
            print(f"  FAILED: {str(e)[:200]}")
            try:
                sheet.update_cell(t["sheet_row"], COL_ERROR + 1, f"reskin error: {str(e)[:150]}")
            except Exception:
                pass
            failed += 1

    print("\n" + "=" * 50)
    if verify:
        print(f"VERIFY: {reskinned} output(s) probed OK, {no_output} not found, {failed} probe failed")
    elif dry_run:
        print(f"DRY RUN: {reskinned} ready to re-skin, {raw_missing} raw missing, {no_output} output not found")
    else:
        print(f"Done: {reskinned} re-skinned, {raw_missing} raw missing, {no_output} output not found, {failed} failed")


def main():
    parser = argparse.ArgumentParser(description="TotemTV — re-skin edited videos with the current design")
    parser.add_argument("--dry-run", action="store_true",
                        help="Only check targets, raw availability and output match (no download/replace)")
    parser.add_argument("--verify", action="store_true",
                        help="Download each current output and ffprobe it (no replace)")
    args = parser.parse_args()
    run(dry_run=args.dry_run, verify=args.verify)


if __name__ == "__main__":
    main()
