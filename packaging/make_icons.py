"""Generate the iCleaning icon (original artwork, no Apple marks).

A macOS-style rounded square with a warm gradient and, on top, a stylised white
"photo" (mountains and sun cut out) slightly tilted, plus a small sparkle. It is
drawn at 4x and downscaled with LANCZOS so the edges stay smooth.

Outputs, next to this script:
  icon.png   1024x1024, for Linux and the repository
  icon.ico   16-256 px multi-size, for Windows
  icon.icns  the macOS format (written by Pillow)

Usage:  python packaging/make_icons.py   (needs Pillow)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent

SIZE = 1024          # final size
SUPERSAMPLE = 4      # drawn at 4096 and downscaled
S = SIZE * SUPERSAMPLE

ORANGE = (255, 159, 10)   # #FF9F0A
PINK = (255, 55, 95)      # #FF375F
WHITE = (255, 255, 255, 255)
TILT = 8                  # photo tilt, in degrees


def gradient(side: int) -> Image.Image:
    """Diagonal gradient from ORANGE (top left) to PINK (bottom right)."""
    # Computed small and scaled up: same result, far less work.
    n = 256
    img = Image.new("RGB", (n, n))
    px = img.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(ORANGE, PINK))
    return img.resize((side, side), Image.Resampling.BICUBIC)


def photo_masks() -> tuple[Image.Image, Image.Image]:
    """Return (card, cutouts) of the "photo", both rotated the same way."""
    card = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(card)

    width, height = int(0.62 * S), int(0.47 * S)
    cx, cy = S // 2, S // 2
    left, top = cx - width // 2, cy - height // 2
    right, bottom = left + width, top + height
    d.rounded_rectangle((left, top, right, bottom), radius=int(0.075 * S), fill=255)

    # Sun and mountains are cut out of the card so the gradient shows through.
    cutouts = Image.new("L", (S, S), 0)
    c = ImageDraw.Draw(cutouts)
    sun_r = int(0.075 * S)
    sun_x = left + int(0.74 * width)
    sun_y = top + int(0.30 * height)
    c.ellipse((sun_x - sun_r, sun_y - sun_r, sun_x + sun_r, sun_y + sun_r), fill=255)

    base = bottom - int(0.10 * height)
    peak1 = (left + int(0.32 * width), top + int(0.24 * height))
    peak2 = (left + int(0.68 * width), top + int(0.38 * height))
    c.polygon(
        [
            (left + int(0.04 * width), base),
            peak1,
            (left + int(0.50 * width), base),
            peak2,
            (right - int(0.04 * width), base),
        ],
        fill=255,
    )

    # Both layers share the rotation centre so they line up exactly.
    centre = (cx, cy)
    card = card.rotate(TILT, resample=Image.Resampling.BICUBIC, center=centre)
    cutouts = cutouts.rotate(TILT, resample=Image.Resampling.BICUBIC, center=centre)
    return card, cutouts


def sparkle() -> Image.Image:
    """Four-pointed star in the top right corner."""
    layer = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(layer)
    cx, cy = int(0.78 * S), int(0.22 * S)
    r = int(0.055 * S)
    thin = r * 0.16
    d.polygon(
        [
            (cx, cy - r), (cx + thin, cy - thin), (cx + r, cy),
            (cx + thin, cy + thin), (cx, cy + r), (cx - thin, cy + thin),
            (cx - r, cy), (cx - thin, cy - thin),
        ],
        fill=255,
    )
    return layer


def icon() -> Image.Image:
    canvas = gradient(S)

    # Rounded-square mask (22 % radius, like macOS icons).
    shape = Image.new("L", (S, S), 0)
    ImageDraw.Draw(shape).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(0.22 * S), fill=255)
    base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    base.paste(canvas, (0, 0), shape)

    card, cutouts = photo_masks()
    photo = ImageChops.subtract(card, cutouts)   # the photo, with its holes
    base.paste(Image.new("RGBA", (S, S), WHITE), (0, 0), photo)
    base.paste(Image.new("RGBA", (S, S), WHITE), (0, 0), sparkle())

    return base.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main() -> None:
    img = icon()
    img.save(HERE / "icon.png")
    img.save(HERE / "icon.ico", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    img.save(HERE / "icon.icns")
    for name in ("icon.png", "icon.ico", "icon.icns"):
        print(f"{name}: {(HERE / name).stat().st_size} bytes")


if __name__ == "__main__":
    main()
