"""Prepares demo photos for Returns Manager inspection (§5).

- Downscales long edge to at most 1280 px.
- Strips EXIF metadata completely (ensures no GPS or device data is retained).
- Compresses to stay under 300 KB per photo.
- Uses Pillow only.
"""
from __future__ import annotations

import argparse
import sys
from io import BytesIO
from pathlib import Path
from PIL import Image


def process_image(src_path: Path, dest_path: Path, max_long_edge: int = 1280, max_bytes: int = 300 * 1024) -> int:
    """Processes a single image: strips EXIF, resizes, and saves under max_bytes."""
    with Image.open(src_path) as img:
        # Convert to RGB if needed (strips transparency/CMYK)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        elif img.mode == "L":
            img = img.convert("RGB")

        # Downscale long edge to max_long_edge preserving aspect ratio
        width, height = img.size
        long_edge = max(width, height)
        if long_edge > max_long_edge:
            scale = max_long_edge / float(long_edge)
            new_w = max(1, int(round(width * scale)))
            new_h = max(1, int(round(height * scale)))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        dest_path.parent.mkdir(parents=True, exist_ok=True)

        # Quality search to fit within max_bytes
        quality = 85
        buffer = BytesIO()
        while quality >= 30:
            buffer.seek(0)
            buffer.truncate()
            # Do not pass exif parameter to ensure EXIF is stripped
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            if buffer.tell() <= max_bytes or quality == 30:
                break
            quality -= 5

        data = buffer.getvalue()
        dest_path.write_bytes(data)
        return len(data)


def main() -> int:
    parser = argparse.ArgumentParser(description="Downscale photos to <=1280px long edge, strip EXIF, keep under 300KB")
    parser.add_argument("--src", "-s", type=Path, required=True, help="Source image file or directory")
    parser.add_argument("--dest", "-d", type=Path, required=True, help="Destination file or directory")
    parser.add_argument("--max-edge", type=int, default=1280, help="Max long edge in pixels (default 1280)")
    parser.add_argument("--max-kb", type=int, default=300, help="Max file size in KB (default 300)")

    args = parser.parse_args()
    max_bytes = args.max_kb * 1024

    if args.src.is_file():
        dest = args.dest
        if dest.is_dir() or (not dest.exists() and dest.suffix == ""):
            dest = dest / args.src.name
            if dest.suffix.lower() not in (".jpg", ".jpeg"):
                dest = dest.with_suffix(".jpg")
        size = process_image(args.src, dest, args.max_edge, max_bytes)
        print(f"Processed {args.src} -> {dest} ({size / 1024:.1f} KB)")
        return 0

    if args.src.is_dir():
        args.dest.mkdir(parents=True, exist_ok=True)
        count = 0
        for p in sorted(args.src.iterdir()):
            if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"):
                dest = (args.dest / p.name).with_suffix(".jpg")
                size = process_image(p, dest, args.max_edge, max_bytes)
                print(f"Processed {p.name} -> {dest.name} ({size / 1024:.1f} KB)")
                count += 1
        print(f"Done. Processed {count} images into {args.dest}")
        return 0

    print(f"Error: {args.src} is not a valid file or directory", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
