"""Subtle baked-in watermark for final card images stored in R2."""

from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import httpx
from PIL import Image, ImageDraw, ImageFont

from utils.storage import app_data_root, local_path_from_media_url, save_bytes_to_storage

logger = logging.getLogger(__name__)

WATERMARK_TEXT = "P R O S P E C T  L E G E N D S"
WATERMARK_OPACITY = 51  # 20% of 255
WATERMARK_MARGIN_RIGHT = 12
WATERMARK_MARGIN_BOTTOM = 28
MIN_FONT_SIZE = 14
FONT_SIZE_RATIO = 0.018

_FONT_CANDIDATES: tuple[str, ...] = (
    str(Path(__file__).resolve().parent.parent / "fonts" / "BarlowCondensed-Regular.ttf"),
    "/Library/Fonts/Barlow Condensed.ttf",
    "/Library/Fonts/BarlowCondensed-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial Narrow.ttf",
    "/Library/Fonts/Arial Narrow.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/arialn.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed.ttf",
)


def _load_watermark_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    logger.warning("No condensed watermark font found; using PIL default")
    return ImageFont.load_default()


def add_watermark(image_bytes: bytes) -> bytes:
    """
    Composite semi-transparent "PROSPECT LEGENDS" text onto the bottom-right of a card image.
    Returns PNG bytes suitable for R2 storage.
    """
    img = Image.open(BytesIO(image_bytes))
    img = img.convert("RGBA")

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(MIN_FONT_SIZE, int(img.width * FONT_SIZE_RATIO))
    font = _load_watermark_font(font_size)

    bbox = draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = img.width - text_width - WATERMARK_MARGIN_RIGHT
    y = img.height - text_height - WATERMARK_MARGIN_BOTTOM

    draw.text(
        (x, y),
        WATERMARK_TEXT,
        font=font,
        fill=(255, 255, 255, WATERMARK_OPACITY),
    )

    watermarked = Image.alpha_composite(img, overlay)

    output = BytesIO()
    watermarked.save(output, format="PNG")
    return output.getvalue()


def _fetch_image_bytes(image_url: str) -> bytes:
    local_path = local_path_from_media_url(image_url)
    if local_path is not None and local_path.is_file():
        return local_path.read_bytes()

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        response = client.get(image_url)
        response.raise_for_status()
        return response.content


def watermark_and_reupload(image_url: str, *, card_id: str | None = None) -> str:
    """
    Download a card image, apply the watermark, and upload a new final PNG to storage.
    Returns the new public URL.
    """
    image_bytes = _fetch_image_bytes(image_url)
    watermarked = add_watermark(image_bytes)

    safe_id = (card_id or "card").replace("/", "_")
    card_filename = f"{safe_id}-final-{uuid4().hex}.png"

    return save_bytes_to_storage(
        watermarked,
        r2_key=f"cards/{card_filename}",
        content_type="image/png",
        local_dir=app_data_root() / "cards",
        local_url_prefix="/media/cards",
    )
