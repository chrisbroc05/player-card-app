import base64
import io
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, ConfigDict, Field

# Load repo-root .env (e.g. OPENAI_API_KEY) when uvicorn runs from backend/
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://player-card-app.onrender.com",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Image uploads (local disk; not linked to players yet)
# ---------------------------------------------------------------------------

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
CARD_DIR = Path(__file__).resolve().parent.parent / "cards"
# Layout reference for AI card generation (replace with your own asset).
CARD_TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "cardtemplate.png"

# content-type -> file extension (images only)
_IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CARD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# In-memory storage (replaced by a database later)
# ---------------------------------------------------------------------------

_players: list[dict] = []
_next_player_id: int = 1
_cards: list[dict] = []
_next_card_id: int = 1
_orders: list[dict] = []
_next_order_id: int = 1
MAX_CARDS_PER_PLAYER = 3

# DALL·E 2 image edit API requires a square PNG (we resize/crop locally first).
_EDIT_IMAGE_SIZE = 1024

# AI trading card rarity (drives different visual intensity in prompts).
CardTier = Literal["base", "rare", "legendary"]
BattingHand = Literal["Right", "Left", "Switch"]
OrderTier = Literal["rookie", "all_star", "legends"]
OrderStatus = Literal[
    "new_order",
    "awaiting_review",
    "in_design",
    "ready_for_delivery",
    "delivered",
    "completed",
]


def _tier_animated_card_prompt(
    name: str,
    team: str,
    tier: str,
    *,
    variant: Literal["dual_edit", "single_edit", "text_generate"] = "dual_edit",
    player_context_text: str = "",
) -> str:
    """
    Shared rules: illustrated/cel-shaded game-style athlete (not a photo).
    Tier block: Base vs Rare vs 1-of-1 Legendary — each must read clearly different in impact.
    variant: dual_edit = player + template images; single_edit = DALL·E 2 one image; text_generate = no image inputs.
    """
    t = tier.lower()
    if t not in ("base", "rare", "legendary"):
        t = "base"

    tier_rules = {
        "base": (
            "TIER: BASE — Common card. Clean, simple composition; minimal VFX; standard, even lighting; "
            "straightforward stadium or field background. Feels like a normal, common pull — restrained polish."
        ),
        "rare": (
            "TIER: RARE — Clearly upgraded vs Base: stronger rim light and subtle glow; more kinetic background "
            "(motion blur, light streaks, speed lines, energy); punchier contrast and richer color; busier and "
            "more exciting, but still readable."
        ),
        "legendary": (
            "TIER: 1-of-1 LEGENDARY — Show-stopper: lavish gold/chrome/holographic and/or neon accents; particle "
            "sparks, lens flare, energy bursts; cinematic or epic backdrop; maximal stylization; must feel "
            "obviously rarer and more intense than RARE — premium grail energy."
        ),
    }

    if variant == "dual_edit":
        layout = (
            "Use the FIRST image ONLY as inspiration for the subject's identity, pose, and general appearance — "
            "redraw as a stylized fictional athlete. "
            "Use the SECOND image as the CARD TEMPLATE — follow its layout, borders, proportions, and framing. "
        )
    elif variant == "single_edit":
        layout = (
            "Use the INPUT image ONLY as loose inspiration for identity, pose, and general appearance — "
            "fully redraw the subject as a stylized fictional athlete. "
            "Design a bold trading-card frame, borders, and composition appropriate to the tier (no photo crop). "
        )
    else:
        layout = (
            "Illustrate a single square baseball trading card featuring one central cel-shaded fictional athlete "
            f"character (team vibe: {team}). Invent a strong card frame and dynamic sports background for this tier. "
        )

    return (
        "OUTPUT MUST BE FULLY ILLUSTRATED, CARTOON / CEL-SHADED animated baseball trading card art — like modern "
        "sports VIDEO GAME character cards. NOT a photograph, NOT photorealistic, NOT a light photo edit. "
        "Do NOT preserve or copy exact pixels from the source photo; redraw everything as illustrated artwork. "
        "Slightly exaggerated athletic proportions, dynamic action pose (batting stance, mid-swing, or pitching); "
        "clean outlines, bold lighting, vibrant saturated colors. "
        f"{layout}"
        "Dramatic sports background: stadium lights, motion, energy effects scaled to tier. "
        f"{tier_rules[t]} "
        f"Player context (mood only): {name}, team {team}. "
        f"{player_context_text} "
        "If numbers or labels appear in artwork, keep them abstract or unreadable. "
        "Do NOT add any lower-third panel, text bar, label box, caption plate, or overlay box inside the artwork. "
        "Keep the player's full body visible where possible, including legs/feet when in frame. "
        "CRITICAL TEXT RULE: Do NOT render readable player names, team names, letters, words, or jersey text "
        "on the card art itself; keep all naming text blank because it is added later in a clean overlay. "
        "Graphic logos/icons without readable text are allowed. "
        "Prioritize stylization and creativity over realism."
    )


def _resolve_player_and_source_path(player_id: int) -> tuple[dict, Path]:
    """Load player row and absolute path to their uploaded image; raise HTTPException if invalid."""
    player_row = next((row for row in _players if row["id"] == player_id), None)
    if player_row is None:
        raise HTTPException(status_code=404, detail="Player not found")

    image_url = player_row.get("image_url")
    if not image_url:
        raise HTTPException(status_code=400, detail="Player has no image_url")

    source_path = _resolve_source_path_from_image_url(image_url)
    return player_row, source_path


def _player_display_name(player_row: dict) -> str:
    display_name = str(player_row.get("display_name") or "").strip()
    if display_name:
        return display_name
    first = str(player_row.get("first_name") or "").strip()
    last = str(player_row.get("last_name") or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return full
    return str(player_row.get("name") or "Unknown Player")


def _player_team_name(player_row: dict) -> str:
    return str(
        player_row.get("team_name")
        or player_row.get("team")
        or player_row.get("player_team")
        or "Unknown Team"
    )


def _player_jersey_number(player_row: dict) -> str:
    return str(player_row.get("jersey_number") or player_row.get("player_jersey_number") or "").strip()


def _player_prompt_context(player_row: dict) -> str:
    """Structured player metadata to personalize generated cards."""
    name = _player_display_name(player_row)
    team = _player_team_name(player_row)
    jersey_number = str(player_row.get("jersey_number") or "").strip() or "N/A"
    position = str(player_row.get("position") or "").strip() or "N/A"
    grad_year = str(player_row.get("grad_year") or "").strip() or "N/A"
    batting_hand = str(player_row.get("batting_hand") or "").strip()
    batting_line = f"- Batting Hand: {batting_hand}" if batting_hand else ""
    return (
        "Player details to incorporate into the card design: "
        f"- Name: {name} "
        f"- Jersey Number: #{jersey_number} "
        f"- Position: {position} "
        f"- Team: {team} "
        f"- Grad Year: {grad_year} "
        f"{batting_line}"
    ).strip()


def _resolve_source_path_from_image_url(image_url: str) -> Path:
    """Resolve /uploads/... URL to a local file path."""
    image_path_value = urlparse(image_url).path
    if not image_path_value.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="image_url must point to /uploads/")

    source_path = (Path(__file__).resolve().parent.parent / image_path_value.lstrip("/")).resolve()
    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(status_code=404, detail="Source image not found")
    return source_path


def _player_exists(player_id: int) -> bool:
    return any(row["id"] == player_id for row in _players)


def _card_count_for_player(player_id: int) -> int:
    return sum(1 for card in _cards if card["player_id"] == player_id)


def _ensure_card_generation_limit(player_id: int, cards_to_generate: int = 1) -> None:
    """
    Simple per-player card cap.
    If creating the requested number would exceed the max, reject the request.
    """
    existing = _card_count_for_player(player_id)
    if existing + cards_to_generate > MAX_CARDS_PER_PLAYER:
        remaining = max(0, MAX_CARDS_PER_PLAYER - existing)
        raise HTTPException(
            status_code=400,
            detail=(
                f"Card generation limit reached for player {player_id}. "
                f"Max {MAX_CARDS_PER_PLAYER} cards per player; "
                f"currently {existing}; remaining slots {remaining}."
            ),
        )


def _style_from_generated_card(result: dict) -> str:
    """Normalize style metadata for card history."""
    mode = str(result.get("mode", "unknown"))
    tier = str(result.get("tier", "base"))
    generation = str(result.get("generation", "n/a"))
    if mode == "ai":
        return f"ai-{tier}-{generation}"
    if mode == "pillow_fallback":
        return f"pillow-fallback-{tier}"
    if mode == "pillow":
        return f"pillow-{tier}"
    return mode


def _get_order_or_404(order_id: int) -> dict:
    for order in _orders:
        if order["id"] == order_id:
            return order
    raise HTTPException(status_code=404, detail="Order not found")


def _order_tier_to_card_tier(order_tier: str) -> CardTier:
    mapping = {
        "rookie": "base",
        "all_star": "rare",
        "legends": "legendary",
    }
    return mapping.get(order_tier, "base")


def _preview_limit_for_tier(order_tier: str) -> int:
    """
    Default preview limit per order.
    Kept as a helper so tier-based limits can be introduced later.
    """
    _ = order_tier
    return 3


def _store_generated_card(player_id: int, image_url: str, style: str) -> dict:
    """Persist generated-card metadata in-memory."""
    global _next_card_id
    card = Card(
        id=_next_card_id,
        player_id=player_id,
        image_url=image_url,
        style=style,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _cards.append(card.model_dump())
    _next_card_id += 1
    return card.model_dump()


def _image_to_square_png_bytes(source_path: Path, side: int = _EDIT_IMAGE_SIZE) -> bytes:
    """Crop center square and resize so OpenAI image edit accepts the input."""
    with Image.open(source_path).convert("RGBA") as im:
        w, h = im.size
        crop_side = min(w, h)
        left = (w - crop_side) // 2
        top = (h - crop_side) // 2
        cropped = im.crop((left, top, left + crop_side, top + crop_side))
        resized = cropped.resize((side, side), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        resized.save(buf, format="PNG")
        return buf.getvalue()


def _bytesio_image_file_for_edit(path: Path, label: str) -> io.BytesIO:
    """Normalize uploads for GPT image edit (jpg or png, under API limits)."""
    with Image.open(path) as im:
        buf = io.BytesIO()
        if im.mode in ("RGBA", "P"):
            im.convert("RGBA").save(buf, format="PNG")
            ext = "png"
        else:
            im.convert("RGB").save(buf, format="JPEG", quality=92)
            ext = "jpg"
        buf.seek(0)
        buf.name = f"{label}.{ext}"
        return buf


def _decode_first_image_bytes(response) -> bytes:
    item = response.data[0]
    if getattr(item, "b64_json", None):
        return base64.b64decode(item.b64_json)
    if getattr(item, "url", None):
        return urllib.request.urlopen(item.url).read()
    raise RuntimeError("OpenAI returned no image data")


def _gpt_image_dual_edit_bytes(
    client: OpenAI,
    player_path: Path,
    template_path: Path,
    name: str,
    team: str,
    *,
    model: str,
    tier: str,
    player_context_text: str,
) -> bytes:
    """
    Pass two images to images.edit: (1) player likeness, (2) card template.
    Order matches the prompt (first / second image).
    """
    player_f = _bytesio_image_file_for_edit(player_path, "player")
    template_f = _bytesio_image_file_for_edit(template_path, "template")
    prompt = _tier_animated_card_prompt(name, team, tier, player_context_text=player_context_text)
    kwargs: dict = {
        "model": model,
        "image": [player_f, template_f],
        "prompt": prompt,
        "size": "1024x1024",
        "n": 1,
    }
    if model in ("gpt-image-1", "gpt-image-1.5"):
        kwargs["input_fidelity"] = "high"
    response = client.images.edit(**kwargs)
    return _decode_first_image_bytes(response)


def _jpeg_data_url_for_vision(source_path: Path, max_side: int = 1024) -> str:
    """Shrink JPEG for GPT-4o-mini vision (smaller payload, under typical limits)."""
    with Image.open(source_path).convert("RGB") as im:
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _vision_caption_for_card(client: OpenAI, source_path: Path) -> str:
    """Turn the uploaded photo into a short visual brief so DALL·E 3 can illustrate without copying the photo."""
    data_url = _jpeg_data_url_for_vision(source_path)
    r = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "In 2 short phrases, describe the person's appearance (hair, skin tone, expression, "
                            "clothing colors) for an illustrator drawing a stylized fictional sports trading card. "
                            "Do not use real names."
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        max_tokens=120,
    )
    text = (r.choices[0].message.content or "").strip()
    return text if text else "athletic portrait, confident pose"


def _dalle3_generate_card_bytes(
    client: OpenAI, name: str, team: str, caption: str, tier: str, player_context_text: str
) -> bytes:
    """
    Full illustrated card (not a photo edit). This is what makes the art look clearly 'AI generated'.
    """
    prompt = (
        _tier_animated_card_prompt(
            name, team, tier, variant="text_generate", player_context_text=player_context_text
        )
        + f" Subject inspiration (fictional): {caption}. NOT a photograph."
    )
    resp = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        response_format="b64_json",
        n=1,
    )
    return _decode_first_image_bytes(resp)


def _dalle2_edit_card_bytes(
    client: OpenAI, source_path: Path, name: str, team: str, tier: str, player_context_text: str
) -> bytes:
    """
    Fallback: DALL·E 2 image *edit* — often keeps most of the original photo pixels; use only if DALL·E 3 fails.
    """
    prompt = _tier_animated_card_prompt(
        name, team, tier, variant="single_edit", player_context_text=player_context_text
    )
    png_bytes = _image_to_square_png_bytes(source_path)
    image_file = io.BytesIO(png_bytes)
    image_file.name = "input.png"
    response = client.images.edit(
        model="dall-e-2",
        image=image_file,
        prompt=prompt,
        n=1,
        size=f"{_EDIT_IMAGE_SIZE}x{_EDIT_IMAGE_SIZE}",
        response_format="b64_json",
    )
    return _decode_first_image_bytes(response)


def _resolve_card_fonts(
    width: int, tier: str = "base"
) -> tuple[ImageFont.FreeTypeFont | ImageFont.ImageFont, ImageFont.FreeTypeFont | ImageFont.ImageFont]:
    """Prefer Arial/DejaVu so text is readable across macOS/Linux."""
    tier_scale = {"base": 1.0, "rare": 1.07, "legendary": 1.14}.get(tier.lower(), 1.0)
    name_size = int(max(26, min(58, (width // 20) * tier_scale)))
    team_size = int(max(16, min(34, (width // 28) * tier_scale)))
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    regular_candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    name_font: ImageFont.FreeTypeFont | ImageFont.ImageFont | None = None
    team_font: ImageFont.FreeTypeFont | ImageFont.ImageFont | None = None
    for path in bold_candidates:
        if Path(path).exists():
            try:
                name_font = ImageFont.truetype(path, name_size)
                break
            except OSError:
                continue
    for path in regular_candidates:
        if Path(path).exists():
            try:
                team_font = ImageFont.truetype(path, team_size)
                break
            except OSError:
                continue
    if name_font is None:
        name_font = ImageFont.load_default()
    if team_font is None:
        team_font = name_font
    return name_font, team_font


def _tier_banner_style(
    tier: str,
) -> tuple[
    tuple[int, int, int, int],
    tuple[int, int, int, int],
    tuple[int, int, int, int],
    tuple[int, int, int, int],
    tuple[int, int, int, int],
    tuple[int, int, int, int],
]:
    """Return banner/text/accent colors tuned to card rarity."""
    t = tier.lower()
    if t == "legendary":
        return (
            (16, 10, 20, 235),     # banner top
            (36, 20, 10, 235),     # banner bottom
            (255, 232, 140, 255),  # name (gold)
            (235, 245, 255, 255),  # team
            (255, 190, 60, 255),   # accent line
            (75, 45, 10, 240),     # rarity chip bg
        )
    if t == "rare":
        return (
            (8, 22, 46, 230),      # banner top
            (8, 46, 72, 230),      # banner bottom
            (170, 225, 255, 255),  # name (cool glow tint)
            (232, 246, 255, 255),  # team
            (80, 195, 255, 255),   # accent line
            (10, 62, 96, 240),     # rarity chip bg
        )
    return (
        (8, 12, 22, 225),          # banner top
        (12, 18, 32, 225),         # banner bottom
        (255, 255, 255, 255),      # name
        (230, 240, 255, 255),      # team
        (180, 180, 180, 255),      # accent line
        (36, 46, 62, 240),         # rarity chip bg
    )


def _draw_vertical_gradient(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    top: tuple[int, int, int, int],
    bottom: tuple[int, int, int, int],
) -> None:
    """Paint a simple vertical RGBA gradient for the banner background."""
    height = max(1, y1 - y0)
    for i in range(height):
        t = i / max(1, height - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        a = int(top[3] + (bottom[3] - top[3]) * t)
        y = y0 + i
        draw.line([(x0, y), (x1, y)], fill=(r, g, b, a))


def _overlay_clean_text_on_card(
    image: Image.Image, name: str, team: str, tier: str = "base", jersey_number: str | None = None
) -> Image.Image:
    """
    Draw a dark bottom banner with large player name and smaller team name.
    White fill + dark stroke keeps text readable on busy AI backgrounds.
    """
    img = image.convert("RGBA")
    w, h = img.size
    name_font, team_font = _resolve_card_fonts(w, tier=tier)
    banner_top_fill, banner_bottom_fill, name_fill, team_fill, accent_fill, chip_fill = _tier_banner_style(tier)

    pad = max(14, w // 48)
    stroke = max(1, min(4, w // 256))

    # Measure text first, then append a new banner area below the image
    # so no part of the generated artwork is covered/cut off.
    measure = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    x_text = pad
    nb = measure.textbbox((0, 0), name, font=name_font, anchor="lt")
    tb = measure.textbbox((0, 0), team, font=team_font, anchor="lt")
    name_h = nb[3] - nb[1]
    team_h = tb[3] - tb[1]
    gap = max(6, h // 90)
    banner_h = pad + name_h + gap + team_h + pad
    out_h = h + banner_h

    out = Image.new("RGBA", (w, out_h), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    draw = ImageDraw.Draw(out)
    banner_top = h
    banner_bottom = out_h
    _draw_vertical_gradient(draw, 0, banner_top, w, banner_bottom, banner_top_fill, banner_bottom_fill)
    draw.line([(0, banner_top), (w, banner_top)], fill=accent_fill, width=max(2, w // 256))

    # Rare/legendary-style rarity chip to the right, aligned with app theme.
    tier_label = {"legendary": "1-OF-1", "rare": "RARE", "base": "BASE"}.get(tier.lower(), "BASE")
    chip_font = team_font
    cb = draw.textbbox((0, 0), tier_label, font=chip_font, anchor="lt")
    chip_w = (cb[2] - cb[0]) + pad
    chip_h = (cb[3] - cb[1]) + max(8, pad // 2)
    chip_x1 = w - pad
    chip_x0 = max(chip_x1 - chip_w, w // 2)
    chip_y0 = banner_top + pad
    chip_y1 = chip_y0 + chip_h
    radius = max(8, pad // 2)
    draw.rounded_rectangle(
        [(chip_x0, chip_y0), (chip_x1, chip_y1)],
        radius=radius,
        fill=chip_fill,
        outline=accent_fill,
        width=max(1, w // 500),
    )
    draw.text(
        (chip_x0 + pad // 2, chip_y0 + max(4, pad // 4)),
        tier_label,
        font=chip_font,
        fill=team_fill,
        stroke_width=max(1, stroke - 1),
        stroke_fill=(0, 0, 0, 255),
        anchor="lt",
    )

    # Deterministic jersey number chip (exact value from data, avoids AI text drift).
    jersey_text = f"#{jersey_number}" if jersey_number else ""
    if jersey_text:
        jb = draw.textbbox((0, 0), jersey_text, font=chip_font, anchor="lt")
        jersey_w = (jb[2] - jb[0]) + pad
        jersey_h = chip_h
        jersey_x0 = pad
        jersey_x1 = jersey_x0 + jersey_w
        jersey_y0 = chip_y0
        jersey_y1 = jersey_y0 + jersey_h
        draw.rounded_rectangle(
            [(jersey_x0, jersey_y0), (jersey_x1, jersey_y1)],
            radius=radius,
            fill=chip_fill,
            outline=accent_fill,
            width=max(1, w // 500),
        )
        draw.text(
            (jersey_x0 + pad // 2, jersey_y0 + max(4, pad // 4)),
            jersey_text,
            font=chip_font,
            fill=team_fill,
            stroke_width=max(1, stroke - 1),
            stroke_fill=(0, 0, 0, 255),
            anchor="lt",
        )

    y_name = banner_top + pad
    name_text = name.upper()
    team_text = team
    draw.text(
        (x_text, y_name),
        name_text,
        font=name_font,
        fill=name_fill,
        stroke_width=stroke,
        stroke_fill=(0, 0, 0, 255),
        anchor="lt",
    )
    nb2 = draw.textbbox((x_text, y_name), name_text, font=name_font, anchor="lt")
    y_team = nb2[3] + gap
    draw.text(
        (x_text, y_team),
        team_text,
        font=team_font,
        fill=team_fill,
        stroke_width=stroke,
        stroke_fill=(0, 0, 0, 255),
        anchor="lt",
    )
    return out.convert("RGB")


def _generate_card_pillow(
    player_row: dict, player_id: int, source_path: Path, tier: str = "base"
) -> dict:
    """Local fallback: draw name + team on the photo and save to cards/."""
    player_name = _player_display_name(player_row)
    team_name = _player_team_name(player_row)
    jersey_number = _player_jersey_number(player_row)
    with Image.open(source_path) as image:
        final_rgb = _overlay_clean_text_on_card(
            image, player_name, team_name, tier=tier, jersey_number=jersey_number
        )
        card_filename = f"player-{player_id}-{uuid4().hex}.png"
        card_path = CARD_DIR / card_filename
        final_rgb.save(card_path, format="PNG")

    return {
        "filename": card_filename,
        "path": str(card_path),
        "url": f"/cards/{card_filename}",
        "mode": "pillow",
        "tier": tier.lower(),
    }


def _generate_card_openai(
    player_row: dict, player_id: int, source_path: Path, *, tier: str = "base"
) -> dict:
    """
    1) Prefer GPT Image edit with [player photo, card template] and tier-specific animated prompt.
    2) Fallback: DALL·E 3 + vision caption, then DALL·E 2 edit (single image).
    3) Pillow overlay for crisp name + team on the final image.
    """
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    if not CARD_TEMPLATE_PATH.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Card template not found. Add an image at: {CARD_TEMPLATE_PATH}",
        )

    tier_norm = tier.lower()
    if tier_norm not in ("base", "rare", "legendary"):
        tier_norm = "base"

    name = _player_display_name(player_row)
    team = _player_team_name(player_row)
    jersey_number = _player_jersey_number(player_row)
    player_context_text = _player_prompt_context(player_row)
    client = OpenAI(api_key=api_key)

    generation = "gpt-image-template"
    out_bytes: bytes | None = None

    # Prefer template-guided generation to keep consistent card framing/style.
    for model in ("gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"):
        try:
            out_bytes = _gpt_image_dual_edit_bytes(
                client,
                source_path,
                CARD_TEMPLATE_PATH,
                name,
                team,
                model=model,
                tier=tier_norm,
                player_context_text=player_context_text,
            )
            break
        except Exception:
            continue

    if out_bytes is None:
        generation = "dall-e-3"
        try:
            caption = _vision_caption_for_card(client, source_path)
        except Exception:
            caption = "athletic portrait, confident sports pose"
        try:
            out_bytes = _dalle3_generate_card_bytes(
                client, name, team, caption, tier_norm, player_context_text
            )
        except Exception:
            out_bytes = None

    if out_bytes is None:
        generation = "dall-e-2-edit"
        out_bytes = _dalle2_edit_card_bytes(client, source_path, name, team, tier_norm, player_context_text)

    with Image.open(io.BytesIO(out_bytes)) as generated:
        final_rgb = _overlay_clean_text_on_card(
            generated, name, team, tier=tier_norm, jersey_number=jersey_number
        )

    card_filename = f"player-{player_id}-ai-{tier_norm}-{uuid4().hex}.png"
    card_path = CARD_DIR / card_filename
    final_rgb.save(card_path, format="PNG")

    return {
        "filename": card_filename,
        "path": str(card_path),
        "url": f"/cards/{card_filename}",
        "mode": "ai",
        "tier": tier_norm,
        "generation": generation,
    }


# ---------------------------------------------------------------------------
# Schemas (JSON request / response shapes)
# ---------------------------------------------------------------------------


class PlayerCreate(BaseModel):
    """JSON body for POST /players — only these fields are accepted."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    first_name: str = Field(..., min_length=1, max_length=100, description="Player first name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Player last name")
    display_name: str | None = Field(default=None, max_length=200, description="Optional display name")
    jersey_number: str = Field(..., min_length=1, max_length=10, description="Jersey number")
    position: str = Field(..., min_length=1, max_length=60, description="Player position")
    grad_year: int = Field(..., ge=2000, le=2100, description="Graduation year")
    team_name: str = Field(..., min_length=1, max_length=200, description="Team name")
    batting_hand: BattingHand | None = Field(default=None)
    image_url: str = Field(..., min_length=1, max_length=2000, description="Uploaded player image URL")


class Player(BaseModel):
    """Stored player: request fields plus id."""

    id: int = Field(..., ge=1)
    first_name: str
    last_name: str
    display_name: str | None = None
    jersey_number: str
    position: str
    grad_year: int
    team_name: str
    batting_hand: BattingHand | None = None
    image_url: str


class PlayerImageUpdate(BaseModel):
    """Body for PUT /players/{id}/image."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    image_url: str = Field(..., min_length=1, max_length=2000)


class Card(BaseModel):
    """Stored generated card metadata (in-memory)."""

    id: int = Field(..., ge=1)
    player_id: int = Field(..., ge=1)
    image_url: str = Field(..., min_length=1, max_length=2000)
    style: str = Field(..., min_length=1, max_length=200)
    created_at: str


class OrderCreate(BaseModel):
    """Body for creating a card order."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    # Customer fields
    customer_name: str = Field(..., min_length=1, max_length=200)
    customer_email: str = Field(..., min_length=3, max_length=320)

    # Player fields
    player_first_name: str = Field(..., min_length=1, max_length=100)
    player_last_name: str = Field(..., min_length=1, max_length=100)
    player_display_name: str | None = Field(default=None, max_length=200)
    player_jersey_number: str = Field(..., min_length=1, max_length=10)
    player_position: str = Field(..., min_length=1, max_length=60)
    player_grad_year: int = Field(..., ge=2000, le=2100)
    player_team_name: str = Field(..., min_length=1, max_length=200)
    player_batting_hand: BattingHand | None = Field(default=None)
    player_image_url: str = Field(..., min_length=1, max_length=2000)

    # Order details
    tier: OrderTier
    add_ons: list[str] = Field(default_factory=list)
    status: OrderStatus = "new_order"


class GeneratedOrderCard(BaseModel):
    image_url: str = Field(..., min_length=1, max_length=2000)
    tier: CardTier
    created_at: str


class Order(OrderCreate):
    """Stored order record."""

    id: int = Field(..., ge=1)
    created_at: str
    generated_cards: list[GeneratedOrderCard] = Field(default_factory=list)
    preview_count: int = Field(default=0, ge=0)
    preview_limit: int = Field(default=3, ge=1)
    final_card_url: str | None = Field(default=None, max_length=2000)
    delivered_at: str | None = None


class OrderDeliverRequest(BaseModel):
    """Optional override for selecting final delivered card URL."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    final_card_url: str | None = Field(default=None, max_length=2000)


class OrderStatusUpdate(BaseModel):
    """Body for updating order status."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    status: OrderStatus


class OrderApprovePreviewRequest(BaseModel):
    """Customer approval payload for selecting a preview as final."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    image_url: str | None = Field(default=None, max_length=2000)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/test-openai")
def test_openai():
    """Verify OPENAI_API_KEY with a minimal chat completion."""
    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return JSONResponse(
            status_code=503,
            content={
                "ok": False,
                "error": "OPENAI_API_KEY is not set in the environment.",
            },
        )

    try:
        client = OpenAI(api_key=api_key)
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly this phrase and nothing else: OpenAI OK",
                }
            ],
            max_tokens=32,
        )
        text = (completion.choices[0].message.content or "").strip()
    except Exception as exc:
        return JSONResponse(
            status_code=502,
            content={
                "ok": False,
                "error": f"OpenAI request failed: {exc}",
            },
        )

    return {"ok": True, "message": text}


@app.post("/players", response_model=Player, status_code=201)
def create_player(body: PlayerCreate):
    """Create a player from JSON; assign id; keep in memory."""
    global _next_player_id

    player = Player(
        id=_next_player_id,
        first_name=body.first_name,
        last_name=body.last_name,
        display_name=body.display_name,
        jersey_number=body.jersey_number,
        position=body.position,
        grad_year=body.grad_year,
        team_name=body.team_name,
        batting_hand=body.batting_hand,
        image_url=body.image_url,
    )
    _players.append(player.model_dump())
    _next_player_id += 1
    return player


@app.get("/players", response_model=list[Player])
def list_players():
    """All players in memory, including image_url when set."""
    return _players


@app.get("/cards", response_model=list[Card])
def list_cards():
    """List all generated cards in memory."""
    return _cards


@app.get("/players/{player_id}/cards", response_model=list[Card])
def list_cards_for_player(player_id: int):
    """List generated cards for one player."""
    if not _player_exists(player_id):
        raise HTTPException(status_code=404, detail="Player not found")
    return [card for card in _cards if card["player_id"] == player_id]


@app.post("/orders", response_model=Order, status_code=201)
def create_order(body: OrderCreate):
    """Create a new in-memory order."""
    global _next_order_id

    order = Order(
        id=_next_order_id,
        customer_name=body.customer_name,
        customer_email=body.customer_email,
        player_first_name=body.player_first_name,
        player_last_name=body.player_last_name,
        player_display_name=body.player_display_name,
        player_jersey_number=body.player_jersey_number,
        player_position=body.player_position,
        player_grad_year=body.player_grad_year,
        player_team_name=body.player_team_name,
        player_batting_hand=body.player_batting_hand,
        player_image_url=body.player_image_url,
        tier=body.tier,
        add_ons=body.add_ons,
        status=body.status,
        created_at=datetime.now(timezone.utc).isoformat(),
        preview_count=0,
        preview_limit=_preview_limit_for_tier(body.tier),
    )
    _orders.append(order.model_dump())
    _next_order_id += 1
    return order


@app.get("/orders", response_model=list[Order])
def list_orders(
    status: OrderStatus | None = Query(default=None),
    tier: OrderTier | None = Query(default=None),
):
    """List in-memory orders, optionally filtered by status and/or tier."""
    results = _orders
    if status is not None:
        results = [order for order in results if order["status"] == status]
    if tier is not None:
        results = [order for order in results if order["tier"] == tier]
    return results


@app.get("/orders/{order_id}", response_model=Order)
def get_order(order_id: int):
    """Get one order by id."""
    order = _get_order_or_404(order_id)
    return Order.model_validate(order)


@app.patch("/orders/{order_id}/status", response_model=Order)
def update_order_status(order_id: int, body: OrderStatusUpdate):
    """Update only the status for one order."""
    order = _get_order_or_404(order_id)
    order["status"] = body.status
    return Order.model_validate(order)


@app.post("/orders/{order_id}/generate-card", response_model=GeneratedOrderCard)
def generate_card_for_order(order_id: int):
    """
    Generate one card from order player data and image.
    Stores generated card metadata in order.generated_cards.
    """
    order = _get_order_or_404(order_id)
    preview_count = int(order.get("preview_count", 0))
    preview_limit = int(order.get("preview_limit", _preview_limit_for_tier(order.get("tier", "rookie"))))
    if preview_count >= preview_limit:
        raise HTTPException(status_code=400, detail="Preview limit reached")

    player_row = {
        "first_name": order.get("player_first_name", ""),
        "last_name": order.get("player_last_name", ""),
        "display_name": order.get("player_display_name"),
        "jersey_number": order.get("player_jersey_number", ""),
        "position": order.get("player_position", ""),
        "grad_year": order.get("player_grad_year", ""),
        "team_name": order.get("player_team_name") or order.get("player_team", ""),
        "batting_hand": order.get("player_batting_hand"),
        "image_url": order["player_image_url"],
    }
    source_path = _resolve_source_path_from_image_url(order["player_image_url"])
    card_tier = _order_tier_to_card_tier(order["tier"])

    try:
        result = _generate_card_openai(player_row, order_id, source_path, tier=card_tier)
    except Exception:
        result = _generate_card_pillow(player_row, order_id, source_path, tier=card_tier)

    generated = GeneratedOrderCard(
        image_url=result["url"],
        tier=card_tier,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    order.setdefault("generated_cards", []).append(generated.model_dump())
    order["preview_count"] = preview_count + 1
    order["preview_limit"] = preview_limit
    return generated


@app.post("/orders/{order_id}/deliver", response_model=Order)
def deliver_order(order_id: int, body: OrderDeliverRequest | None = None):
    """
    Mark order as delivered.
    - final_card_url: use provided URL or latest generated card URL
    - delivered_at: current UTC timestamp
    - status: delivered
    """
    order = _get_order_or_404(order_id)

    provided_url = body.final_card_url if body else None
    if provided_url:
        final_url = provided_url
    else:
        generated_cards = order.get("generated_cards", [])
        if not generated_cards:
            raise HTTPException(
                status_code=400,
                detail="No generated cards available. Provide final_card_url or generate a card first.",
            )
        final_url = generated_cards[-1]["image_url"]

    order["final_card_url"] = final_url
    order["delivered_at"] = datetime.now(timezone.utc).isoformat()
    order["status"] = "delivered"
    return Order.model_validate(order)


@app.post("/orders/{order_id}/approve-preview", response_model=Order)
def approve_order_preview(order_id: int, body: OrderApprovePreviewRequest | None = None):
    """
    Customer confirms which generated preview they want fulfilled.
    - Sets final_card_url from provided image_url or latest generated preview
    - Moves status to awaiting_review for admin quality check
    """
    order = _get_order_or_404(order_id)
    provided_url = body.image_url if body else None

    if provided_url:
        final_url = provided_url
    else:
        generated_cards = order.get("generated_cards", [])
        if not generated_cards:
            raise HTTPException(
                status_code=400,
                detail="No generated previews available. Generate a preview first.",
            )
        final_url = generated_cards[-1]["image_url"]

    order["final_card_url"] = final_url
    if order.get("status") in ("new_order", "in_design"):
        order["status"] = "awaiting_review"
    return Order.model_validate(order)


@app.put("/players/{player_id}/image", response_model=Player)
def set_player_image(player_id: int, body: PlayerImageUpdate):
    """Set image_url for the player with this id."""
    for row in _players:
        if row["id"] == player_id:
            row["image_url"] = body.image_url
            return Player.model_validate(row)
    raise HTTPException(status_code=404, detail="Player not found")


@app.post("/upload-image")
async def upload_image(file: UploadFile = File(..., description="Image file (JPEG, PNG, GIF, or WebP)")):
    """Accept a single image upload, save under uploads/, return path and URL."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    ext = _IMAGE_TYPES.get(content_type)
    if ext is None:
        raise HTTPException(
            status_code=400,
            detail="Only image uploads are allowed (JPEG, PNG, GIF, or WebP).",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    filename = f"{uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(data)

    return {
        "filename": filename,
        "path": str(dest),
        "url": f"/uploads/{filename}",
    }


@app.post("/generate-card/{player_id}")
def generate_card(
    player_id: int,
    use_ai: bool = Query(
        False,
        description="If true, generate with OpenAI image API (falls back to Pillow on failure).",
    ),
    tier: CardTier = Query(
        "base",
        description="Rarity tier for AI art: base (common), rare, or legendary (1-of-1 style).",
    ),
):
    """
    Generate a player card image into cards/.

    Default: Pillow overlay (name + team). With use_ai=true: try OpenAI image edit using the
    player's uploaded photo as input; on any failure, use the Pillow path.
    """
    player_row, source_path = _resolve_player_and_source_path(player_id)
    _ensure_card_generation_limit(player_id, cards_to_generate=1)

    if use_ai:
        try:
            result = _generate_card_openai(player_row, player_id, source_path, tier=tier)
        except Exception as exc:
            # Fallback: keep the app usable if the key is missing, quota fails, or the API errors.
            result = _generate_card_pillow(player_row, player_id, source_path, tier=tier)
            result["mode"] = "pillow_fallback"
            result["ai_error"] = str(exc)
    else:
        result = _generate_card_pillow(player_row, player_id, source_path, tier=tier)

    card = _store_generated_card(player_id, result["url"], _style_from_generated_card(result))
    result["card_id"] = card["id"]
    result["created_at"] = card["created_at"]
    return result


@app.post("/generate-card-set/{player_id}")
def generate_card_set(player_id: int):
    """
    Generate three AI cards for the same player: BASE, RARE, and LEGENDARY (distinct prompt intensity).
    Each result includes its own url; failures are reported per tier without stopping the batch.
    """
    player_row, source_path = _resolve_player_and_source_path(player_id)
    _ensure_card_generation_limit(player_id, cards_to_generate=3)
    cards: list[dict] = []
    for tier in ("base", "rare", "legendary"):
        try:
            result = _generate_card_openai(player_row, player_id, source_path, tier=tier)
            card = _store_generated_card(player_id, result["url"], _style_from_generated_card(result))
            result["card_id"] = card["id"]
            result["created_at"] = card["created_at"]
            cards.append(result)
        except Exception as exc:
            cards.append({"tier": tier, "ok": False, "error": str(exc)})
    return {"player_id": player_id, "cards": cards}


# Mount after API routes so /upload-image wins over static routing edge cases.
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/cards", StaticFiles(directory=str(CARD_DIR)), name="cards")
