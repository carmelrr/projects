#!/usr/bin/env python3
"""
TotemTV — Local Video Processing Test
Wraps .github/scripts/process_video.py for easy local testing.

Usage:
    python scripts/test_local.py
    python scripts/test_local.py --input "path/to/video.mov" --climber "שם" --route "מסלול" --grade "V5"

Without arguments, processes the sample video in the repo root.
"""

import os
import subprocess
import sys


def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    process_script = os.path.join(repo_root, ".github", "scripts", "process_video.py")

    # Defaults: use the sample video in the repo
    default_input = None
    for f in os.listdir(repo_root):
        ext = os.path.splitext(f)[1].lower()
        if ext in (".mov", ".mp4", ".avi", ".mkv", ".webm", ".3gp"):
            default_input = os.path.join(repo_root, f)
            break

    # Parse simple args
    import argparse
    parser = argparse.ArgumentParser(description="TotemTV Local Test")
    parser.add_argument("--input", "-i", default=default_input,
                        help="Input video (default: first video in repo root)")
    parser.add_argument("--climber", default="מאיה דריימר",
                        help="Climber name (default: מאיה דריימר)")
    parser.add_argument("--route", default="Ineschakra V8",
                        help="Route name (default: Ineschakra V8)")
    parser.add_argument("--grade", default="Albarracin",
                        help="Grade/location (default: Albarracin)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output path (default: output/<input_name>.mp4)")
    args = parser.parse_args()

    if not args.input:
        sys.exit("No input video found. Use --input to specify one.")
    if not os.path.isfile(args.input):
        sys.exit(f"Input video not found: {args.input}")

    # Default output path
    if not args.output:
        output_dir = os.path.join(repo_root, "output")
        os.makedirs(output_dir, exist_ok=True)
        base = os.path.splitext(os.path.basename(args.input))[0]
        args.output = os.path.join(output_dir, f"{base}_edited.mp4")

    print("=" * 60)
    print("  TotemTV Local Test")
    print("=" * 60)
    print(f"  Input:   {args.input}")
    print(f"  Output:  {args.output}")
    print(f"  Climber: {args.climber}")
    print(f"  Route:   {args.route}")
    print(f"  Grade:   {args.grade}")
    print("=" * 60)

    cmd = [
        sys.executable, process_script,
        "--local",
        "--input", args.input,
        "--output", args.output,
        "--climber", args.climber,
        "--route", args.route,
        "--grade", args.grade,
    ]

    result = subprocess.run(cmd)
    if result.returncode != 0:
        sys.exit(f"\nProcessing failed with code {result.returncode}")

    print(f"\nOutput ready: {args.output}")
    print("Opening output file...")

    # Open the output video with the default player
    if sys.platform == "win32":
        os.startfile(args.output)
    elif sys.platform == "darwin":
        subprocess.run(["open", args.output])
    else:
        subprocess.run(["xdg-open", args.output])


if __name__ == "__main__":
    main()
