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
WATERMARK_OPACITY = 64  # 25% of 255
WATERMARK_MARGIN_RIGHT = 8
WATERMARK_MARGIN_TOP = 8
MIN_FONT_SIZE = 12
FONT_SIZE_RATIO = 0.02

_FONT_PATHS: tuple[str, ...] = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    str(Path(__file__).resolve().parent.parent / "fonts" / "BarlowCondensed-Regular.ttf"),
)


def _load_watermark_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_PATHS:
        try:
            font = ImageFont.truetype(path, size)
            logger.info("Watermark font loaded: %s", path)
            return font
        except Exception:
            continue
    logger.warning("No font found — watermark may be tiny")
    return ImageFont.load_default()


def add_watermark(image_bytes: bytes) -> bytes:
    """
    Composite semi-transparent "PROSPECT LEGENDS" text onto the top-right of a card image.
    Returns PNG bytes suitable for R2 storage.
    """
    logger.info("Applying watermark to card image")
    img = Image.open(BytesIO(image_bytes))
    img = img.convert("RGBA")
    logger.info("Card dimensions: %sx%s", img.width, img.height)

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_size = max(MIN_FONT_SIZE, int(img.width * FONT_SIZE_RATIO))
    font = _load_watermark_font(font_size)

    bbox = draw.textbbox((0, 0), WATERMARK_TEXT, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x = img.width - text_width - WATERMARK_MARGIN_RIGHT
    y = WATERMARK_MARGIN_TOP
    logger.info("Watermark position: x=%s, y=%s", x, y)

    draw.text(
        (x, y),
        WATERMARK_TEXT,
        font=font,
        fill=(255, 255, 255, WATERMARK_OPACITY),
    )

    watermarked = Image.alpha_composite(img, overlay)

    output = BytesIO()
    watermarked.save(output, format="PNG")
    logger.info("Watermark applied successfully")
    return output.getvalue()


def _fetch_image_bytes(image_url: str) -> bytes:
    local_path = local_path_from_media_url(image_url)
    if local_path is not None and local_path.is_file():
        return local_path.read_bytes()

    with httpx.Client(timeout=60.0, follow_redirects=True) as client:
        response = client.get(image_url)
        response.raise_for_status()
        return response.content


GOLD_BORDER = (201, 168, 76, 255)  # #C9A84C
DARK_BORDER = (18, 18, 22, 255)
GOLD_TEXT = (201, 168, 76, 255)
MUTED_TEXT = (255, 255, 255, 128)
BORDER_WIDTH_RATIO = 0.028
MIN_BORDER_PX = 6


def apply_edition_treatment(
    image_bytes: bytes,
    *,
    edition_number: int = 1,
    print_run: int = 1,
) -> bytes:
    """Bake copy-specific gold (1st) or dark (2+) border and edition numbering into the PNG."""
    edition = max(1, int(edition_number or 1))
    total = max(edition, int(print_run or 1))
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size
    border = max(MIN_BORDER_PX, int(min(w, h) * BORDER_WIDTH_RATIO))
    is_first_copy = edition == 1
    border_color = GOLD_BORDER if is_first_copy else DARK_BORDER

    framed = Image.new("RGBA", (w + border * 2, h + border * 2), border_color)
    framed.paste(img, (border, border))

    draw = ImageDraw.Draw(framed)
    label = f"{edition} of {total}"
    font_size = max(16, int(framed.width * (0.042 if is_first_copy else 0.032)))
    font = _load_watermark_font(font_size)
    bbox = draw.textbbox((0, 0), label, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = (framed.width - text_w) // 2
    text_y = framed.height - border - text_h - max(4, border // 3)
    fill = GOLD_TEXT if is_first_copy else MUTED_TEXT
    draw.text((text_x, text_y), label, font=font, fill=fill)

    if is_first_copy:
        star = "★"
        star_size = max(14, int(font_size * 0.85))
        star_font = _load_watermark_font(star_size)
        star_bbox = draw.textbbox((0, 0), star, font=star_font)
        star_w = star_bbox[2] - star_bbox[0]
        draw.text((text_x - star_w - 6, text_y + 1), star, font=star_font, fill=GOLD_TEXT)

    output = BytesIO()
    framed.save(output, format="PNG")
    return output.getvalue()


def finalize_card_image(
    image_url: str,
    *,
    card_id: str | None = None,
    edition_number: int = 1,
    print_run: int = 1,
) -> str:
    """Watermark + edition border/numbering, then upload final PNG."""
    logger.info(
        "Finalize card image card_id=%s edition=%s/%s url=%s",
        card_id,
        edition_number,
        print_run,
        image_url,
    )
    image_bytes = _fetch_image_bytes(image_url)
    watermarked = add_watermark(image_bytes)
    treated = apply_edition_treatment(
        watermarked,
        edition_number=edition_number,
        print_run=print_run,
    )
    safe_id = (card_id or "card").replace("/", "_")
    card_filename = f"{safe_id}-e{edition_number}-final-{uuid4().hex}.png"
    return save_bytes_to_storage(
        treated,
        r2_key=f"cards/{card_filename}",
        content_type="image/png",
        local_dir=app_data_root() / "cards",
        local_url_prefix="/media/cards",
    )


def watermark_and_reupload(image_url: str, *, card_id: str | None = None) -> str:
    """
    Download a card image, apply the watermark, and upload a new final PNG to storage.
    Returns the new public URL.
    """
    return finalize_card_image(image_url, card_id=card_id, edition_number=1, print_run=1)
