#!/usr/bin/env python3
"""
generate_icons.py

Generates simple placeholder PWA icons into icons/ so the app is installable and
passes a Lighthouse PWA audit. These are deliberately plain (a stylized open
book on the app's dark theme color); swap in real artwork any time by replacing
the PNGs in icons/ with the same filenames and sizes.

The emblem is drawn from shapes only, so no font files are required and output
is identical on any machine.

Icons are committed to the repo. The deploy workflow does NOT regenerate them,
so you only need to run this once (or again when you want new placeholders).

Requires Pillow:  pip install pillow
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow is required. Install it with: pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
# Icons live under public/ so Vite serves them and the manifest can reference them.
ICONS_DIR = ROOT / "public" / "icons"

# Match the dark theme in styles.css / manifest.json
BG = (21, 23, 28, 255)        # #15171c
ACCENT = (217, 160, 91, 255)  # #d9a05b


def draw_icon(size, inset_frac):
    """Draw an open-book emblem centered on the dark background."""
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    inset = int(size * inset_frac)
    left, top, right, bottom = inset, inset, size - inset, size - inset
    radius = max(2, int(size * 0.06))

    # Book block
    d.rounded_rectangle((left, top, right, bottom), radius=radius, fill=ACCENT)

    # Center spine
    cx = size // 2
    spine = max(2, int(size * 0.018))
    d.rectangle((cx - spine // 2, top, cx + spine // 2, bottom), fill=BG)

    # A few "text lines" on each page, drawn in the background color
    line_h = max(2, int(size * 0.022))
    gap = int((bottom - top) / 7)
    pad_x = int((right - left) * 0.10)
    for i in range(1, 6):
        y = top + gap * i
        # left page line
        d.rounded_rectangle(
            (left + pad_x, y, cx - spine, y + line_h), radius=line_h // 2, fill=BG
        )
        # right page line
        d.rounded_rectangle(
            (cx + spine, y, right - pad_x, y + line_h), radius=line_h // 2, fill=BG
        )

    return img


def save(img, name, opaque=False):
    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    out = img.convert("RGB") if opaque else img
    path = ICONS_DIR / name
    out.save(path, format="PNG")
    print(f"wrote {path.relative_to(ROOT)}  ({img.width}x{img.height})")


def main():
    # Standard install icons (small inset so the emblem fills the tile)
    save(draw_icon(192, 0.14), "icon-192.png")
    save(draw_icon(512, 0.14), "icon-512.png")

    # Maskable icon: keep the emblem inside the ~80% safe zone so platforms can
    # crop to a circle/squircle without clipping it.
    save(draw_icon(512, 0.26), "icon-maskable-512.png")

    # Apple touch icon should be opaque (iOS does not support transparency well)
    save(draw_icon(180, 0.14), "apple-touch-icon-180.png", opaque=True)


if __name__ == "__main__":
    main()
