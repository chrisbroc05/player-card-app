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
        "http://127.0.0.1:4173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
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
MAX_CARDS_PER_PLAYER = 3

# DALL·E 2 image edit API requires a square PNG (we resize/crop locally first).
_EDIT_IMAGE_SIZE = 1024

# AI trading card rarity (drives different visual intensity in prompts).
CardTier = Literal["base", "rare", "legendary"]


def _tier_animated_card_prompt(
    name: str,
    team: str,
    tier: str,
    *,
    variant: Literal["dual_edit", "single_edit", "text_generate"] = "dual_edit",
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
        "Slightly exaggerated athletic proportions, dynamic action pose (batting stance, mid-swing, or pitching); "
        "clean outlines, bold lighting, vibrant saturated colors. "
        f"{layout}"
        "Dramatic sports background: stadium lights, motion, energy effects scaled to tier. "
        f"{tier_rules[t]} "
        f"Player context (mood only): {name}, team {team}. "
        "Reserve the bottom fifth for a name strip (keep it calmer). "
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

    image_path_value = urlparse(image_url).path
    if not image_path_value.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="image_url must point to /uploads/")

    source_path = (Path(__file__).resolve().parent.parent / image_path_value.lstrip("/")).resolve()
    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(status_code=404, detail="Source image not found")

    return player_row, source_path


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
) -> bytes:
    """
    Pass two images to images.edit: (1) player likeness, (2) card template.
    Order matches the prompt (first / second image).
    """
    player_f = _bytesio_image_file_for_edit(player_path, "player")
    template_f = _bytesio_image_file_for_edit(template_path, "template")
    prompt = _tier_animated_card_prompt(name, team, tier)
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
    client: OpenAI, name: str, team: str, caption: str, tier: str
) -> bytes:
    """
    Full illustrated card (not a photo edit). This is what makes the art look clearly 'AI generated'.
    """
    prompt = (
        _tier_animated_card_prompt(name, team, tier, variant="text_generate")
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
    client: OpenAI, source_path: Path, name: str, team: str, tier: str
) -> bytes:
    """
    Fallback: DALL·E 2 image *edit* — often keeps most of the original photo pixels; use only if DALL·E 3 fails.
    """
    prompt = _tier_animated_card_prompt(name, team, tier, variant="single_edit")
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
) -> tuple[tuple[int, int, int, int], tuple[int, int, int, int], tuple[int, int, int, int], tuple[int, int, int, int]]:
    """Return banner/text/accent colors tuned to card rarity."""
    t = tier.lower()
    if t == "legendary":
        return (
            (16, 10, 20, 225),     # banner
            (255, 232, 140, 255),  # name (gold)
            (235, 245, 255, 255),  # team
            (255, 190, 60, 255),   # accent line
        )
    if t == "rare":
        return (
            (8, 22, 46, 220),      # banner
            (170, 225, 255, 255),  # name (cool glow tint)
            (232, 246, 255, 255),  # team
            (80, 195, 255, 255),   # accent line
        )
    return (
        (0, 0, 0, 210),            # banner
        (255, 255, 255, 255),      # name
        (230, 240, 255, 255),      # team
        (180, 180, 180, 255),      # accent line
    )


def _overlay_clean_text_on_card(
    image: Image.Image, name: str, team: str, tier: str = "base"
) -> Image.Image:
    """
    Draw a dark bottom banner with large player name and smaller team name.
    White fill + dark stroke keeps text readable on busy AI backgrounds.
    """
    img = image.convert("RGBA")
    w, h = img.size
    name_font, team_font = _resolve_card_fonts(w, tier=tier)
    banner_fill, name_fill, team_fill, accent_fill = _tier_banner_style(tier)

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
    draw.rectangle([(0, banner_top), (w, banner_bottom)], fill=banner_fill)
    draw.line([(0, banner_top), (w, banner_top)], fill=accent_fill, width=max(2, w // 256))

    y_name = banner_top + pad
    draw.text(
        (x_text, y_name),
        name,
        font=name_font,
        fill=name_fill,
        stroke_width=stroke,
        stroke_fill=(0, 0, 0, 255),
        anchor="lt",
    )
    nb2 = draw.textbbox((x_text, y_name), name, font=name_font, anchor="lt")
    y_team = nb2[3] + gap
    draw.text(
        (x_text, y_team),
        team,
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
    with Image.open(source_path) as image:
        final_rgb = _overlay_clean_text_on_card(image, player_row["name"], player_row["team"], tier=tier)
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

    name = player_row["name"]
    team = player_row["team"]
    client = OpenAI(api_key=api_key)

    generation = "gpt-image-template"
    out_bytes: bytes | None = None
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
            out_bytes = _dalle3_generate_card_bytes(client, name, team, caption, tier_norm)
        except Exception:
            generation = "dall-e-2-edit"
            out_bytes = _dalle2_edit_card_bytes(client, source_path, name, team, tier_norm)

    with Image.open(io.BytesIO(out_bytes)) as generated:
        final_rgb = _overlay_clean_text_on_card(generated, name, team, tier=tier_norm)

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

    name: str = Field(..., min_length=1, max_length=200, description="Player name")
    age: int = Field(..., ge=0, le=130, description="Age in years")
    team: str = Field(..., min_length=1, max_length=200, description="Team name")
    image_url: str | None = Field(
        default=None,
        max_length=2000,
        description="Optional image URL (e.g. from POST /upload-image)",
    )


class Player(BaseModel):
    """Stored player: request fields plus id and optional image_url."""

    id: int = Field(..., ge=1)
    name: str
    age: int
    team: str
    image_url: str | None = None


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
        name=body.name,
        age=body.age,
        team=body.team,
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
