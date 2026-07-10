import base64
import io
import json
import logging
import os
import sys
import urllib.request
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse
import re
from uuid import uuid4

# Uvicorn cwd is often repo root or backend; ensure sibling modules (auth, database, …) resolve.
_app_dir = str(Path(__file__).resolve().parent)
try:
    sys.path.remove(_app_dir)
except ValueError:
    pass
sys.path.insert(0, _app_dir)

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session
from openai import OpenAI
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Load repo-root .env (e.g. OPENAI_API_KEY).
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

from auth import (  # noqa: E402
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    verify_password,
)
from credit_service import InsufficientCreditsError, TX_ANIMATION, TX_GENERATION, deduct_credits  # noqa: E402
from card_pricing import (  # noqa: E402
    animated_upgrade_price,
    copy_charge_for_quantity,
    tier_generation_price,
)
from card_history import build_card_history  # noqa: E402
from card_repo import (  # noqa: E402
    PRINT_RUN_ALLOWED_QUANTITIES,
    card_to_dict,
    count_cards_for_player,
    create_card_row,
    discard_pending_session,
    expand_print_run_for_owner_image,
    get_card_by_card_id,
    get_latest_pending_session,
    list_cards_by_image_url_dicts,
    list_cards_for_player_dicts,
    finalize_order_preview,
    list_my_cards_dicts,
    next_collectible_card_id,
    get_pending_session_by_id,
)
from database import SessionLocal, engine, get_db  # noqa: E402
from beta_config import get_beta_invite_code  # noqa: E402
from models import Base, User  # noqa: E402
from marketplace_jobs import run_marketplace_expiration_pass  # noqa: E402
from marketplace_scheduler import (
    shutdown_marketplace_scheduler,
    start_marketplace_scheduler,
)  # noqa: E402
from marketplace_repo import float_from_decimal  # noqa: E402
from parent_email_utils import normalize_optional_parent_email  # noqa: E402
from schema_migrations import run_schema_migrations_after_models  # noqa: E402
from trade_routes import router as trade_router  # noqa: E402
from routers.activity import router as activity_router  # noqa: E402
from routers.admin import router as admin_router  # noqa: E402
from routers.auth import router as auth_user_router  # noqa: E402
from routers.cards import router as cards_animation_router  # noqa: E402
from routers.connect import router as connect_router  # noqa: E402
from routers.credits import router as credits_router  # noqa: E402
from routers.marketplace import router as marketplace_router  # noqa: E402
from routers.stripe_webhook import router as stripe_webhook_router  # noqa: E402
from routers.users import router as users_router  # noqa: E402
from theme_library import (  # noqa: E402
    THEME_CATEGORIES,
    is_valid_theme_slug,
    theme_prompt_for_slug,
)


# ---------------------------------------------------------------------------
# Image uploads (local disk; not linked to players yet)
# ---------------------------------------------------------------------------
# Generated cards → {APP_DATA_DIR}/cards/, uploads → {APP_DATA_DIR}/uploads/.
# APP_DATA_DIR unset locally defaults to ./data (resolved from cwd). On Render,
# set APP_DATA_DIR to your mounted disk (e.g. /var/render/data).
def _app_data_root() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    return Path(base).expanduser().resolve()


def _upload_and_card_dirs() -> tuple[Path, Path]:
    root = _app_data_root()
    return root / "uploads", root / "cards"


def _card_generation_price() -> float:
    raw = (os.environ.get("CARD_GENERATION_PRICE") or "5.00").strip()
    try:
        return max(0.01, float(raw))
    except ValueError:
        return 5.00


UPLOAD_DIR, CARD_DIR = _upload_and_card_dirs()
ANIMATIONS_DIR = _app_data_root() / "animations"
# Served via StaticFiles — must not overlap REST routes /cards, /cards/{id}
CARD_MEDIA_URL_PREFIX = "/media/cards"
# Layout reference for AI card generation (replace with your own asset).
CARD_TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "cardtemplate.png"

# content-type -> file extension (images only)
_IMAGE_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CARD_DIR, exist_ok=True)
os.makedirs(ANIMATIONS_DIR, exist_ok=True)


def _startup_validate_admin_account() -> None:
    admin_email_raw = (os.environ.get("ADMIN_EMAIL") or "").strip()
    admin_email = admin_email_raw.lower()
    if not admin_email:
        logger.warning("[startup] ADMIN_EMAIL is not configured; royalty admin checks are disabled.")
        return
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(func.lower(User.email) == admin_email).first()
        if admin_user is None:
            logger.warning(
                "[startup] Admin account not found for ADMIN_EMAIL='%s'. "
                "The account will be auto-created on first royalty/admin earnings usage.",
                admin_email_raw,
            )
        else:
            logger.info(
                "[startup] Admin account verified for ADMIN_EMAIL='%s' -> user_id=%s",
                admin_email_raw,
                admin_user.id,
            )
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(CARD_DIR, exist_ok=True)
    os.makedirs(ANIMATIONS_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    run_schema_migrations_after_models(engine)
    _startup_validate_admin_account()
    run_marketplace_expiration_pass()
    start_marketplace_scheduler()
    print(f"[startup] UPLOAD_DIR={UPLOAD_DIR} CARD_DIR={CARD_DIR} (writable={os.access(CARD_DIR, os.W_OK)})")
    print("FRONTEND_URL:", os.environ.get("FRONTEND_URL"), flush=True)
    yield
    shutdown_marketplace_scheduler()


app = FastAPI(lifespan=lifespan)
app.include_router(trade_router, prefix="/trades", tags=["trades"])
app.include_router(admin_router, prefix="/admin", tags=["admin"])
app.include_router(auth_user_router, prefix="/auth", tags=["auth"])
app.include_router(activity_router, prefix="/activity", tags=["activity"])
app.include_router(credits_router, prefix="/credits", tags=["credits"])
app.include_router(connect_router, prefix="/connect", tags=["connect"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(stripe_webhook_router, prefix="/webhooks", tags=["webhooks"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["marketplace"])
app.include_router(
    cards_animation_router,
    prefix="/cards",
    tags=["cards", "animations"],
)
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


_players: list[dict] = []
_next_player_id: int = 1
_orders: list[dict] = []
_next_order_id: int = 1
MAX_CARDS_PER_PLAYER = 3

# DALL·E 2 image edit API requires a square PNG (we resize/crop locally first).
_EDIT_IMAGE_SIZE = 1024

# AI trading card rarity (drives different visual intensity in prompts).
CardTier = Literal["base", "rare", "legendary"]
OrderTier = Literal["rookie", "all_star", "legends"]
OrderCardType = Literal["standard", "animated"]
OrderStatus = Literal[
    "new_order",
    "awaiting_review",
    "in_design",
    "ready_for_delivery",
    "delivered",
    "completed",
]


_STYLE_ANCHOR = (
    "Professional sports trading card art in the style of Topps Project 70 and "
    "Panini Prizm. Ultra-sharp photorealistic player rendering. Studio-quality "
    "lighting with dramatic shadows. Rich saturated colors. Premium card stock feel. "
    "Cinematic depth of field with player in sharp focus against stylized background. "
    "The player should look like a real athlete photographed professionally, "
    "not illustrated or cartoon. Consistent proportions, no distortion."
)

_TIER_STYLE_RULES: dict[str, str] = {
    "base": (
        "ROOKIE TIER STYLE: Clean fresh design. Bright energetic colors. Subtle holographic shimmer on edges. "
        "Green and silver accent tones."
    ),
    "rare": (
        "ALL-STAR TIER STYLE: Bold dynamic design. Deep blue and silver tones. Refractor-style light rays "
        "emanating from player. Premium foil texture on borders."
    ),
    "legendary": (
        "LEGENDS TIER STYLE: Iconic premium design. Rich gold and black tones. Dramatic spotlight lighting "
        "on player. Gold prismatic border effect. Feels like a hall of fame moment."
    ),
}


def _card_composition_rules(*, variant: Literal["dual_edit", "single_edit", "text_generate"]) -> str:
    """Shared framing and full-card visibility rules — no baked-in typography."""
    aspect = (
        "Match the SECOND reference image (card template) aspect ratio, outer border, and layout grid "
        "EXACTLY — the finished card must align 1:1 with that template so no cropping is needed. "
        if variant == "dual_edit"
        else "Compose as a perfect square 1:1 trading card that fills the frame proportionally with no "
        "post-generation cropping required. "
    )
    return (
        "COMPOSITION (mandatory): "
        "Render one complete, self-contained premium sports trading card — a single unified design fully "
        "visible from edge to edge inside the image. The entire card border, frame, background, and "
        "decorative elements must appear in-frame; nothing clipped, truncated, or cut off by the image edge. "
        "Nothing may bleed, extend, or fade outside the card boundary. "
        f"{aspect}"
        "Do NOT render any readable text, numbers, letters, names, team labels, jersey numbers, graduation years, "
        "position labels, or statistics inside the image. No typography zones, no nameplates, no stat overlays. "
        "The player portrait and visual style are the only focal content. "
    )


def _player_framing_rules(*, variant: Literal["dual_edit", "single_edit", "text_generate"]) -> str:
    """How the athlete should be placed within the card art area."""
    identity = (
        "Use the FIRST reference image for the subject's identity, preserving the same athletic action "
        "and body pose (e.g. throwing stays throwing); render as ultra-sharp photorealistic trading card art. "
        if variant == "dual_edit"
        else (
            "Use the input photo for identity and the same action/pose; render as ultra-sharp photorealistic "
            "trading card art. "
            if variant == "single_edit"
            else ""
        )
    )
    return (
        f"{identity}"
        "PLAYER FRAMING: Center the athlete as the clear focal point in the card's main art window. "
        "Head and upper body (shoulders and chest) must be fully visible — never crop through the face, "
        "forehead, chin, or shoulders. Leave comfortable space above the head. "
        "The player should feel well-framed and balanced, not zoomed-in so tight that limbs or "
        "facial features are cut off. "
    )


def _tier_theme_balance_rules(tier_style_block: str, theme_line: str) -> str:
    """Layer theme on top of tier style without replacing it."""
    return (
        f"{tier_style_block} "
        f"{theme_line} "
        "Apply theme-specific color palette, background atmosphere, and accent effects on top of the tier style — "
        "theme enhances but does not replace the tier look. "
        "Tier and theme must be visible in borders, accents, and background atmosphere, "
        "but must NOT overwhelm or obscure the player portrait — the athlete remains the hero of the card. "
    )


def _tier_animated_card_prompt(
    name: str,
    team: str,
    tier: str,
    *,
    variant: Literal["dual_edit", "single_edit", "text_generate"] = "dual_edit",
    special_theme: str | None = None,
) -> str:
    """
    Shared premium trading-card prompt: photorealistic Topps/Prizm-style athlete art.
    Tier block: Base (Rookie) vs Rare (All-Star) vs Legendary (Legends).
    variant: dual_edit = player + template images; single_edit = DALL·E 2 one image; text_generate = no image inputs.
    """
    t = tier.lower()
    if t not in ("base", "rare", "legendary"):
        t = "base"

    tier_style = _TIER_STYLE_RULES[t]

    if variant == "dual_edit":
        layout = (
            "Use the SECOND image strictly as the CARD TEMPLATE — replicate its layout, border shape, "
            "proportions, and framing. Place the photorealistic player rendering into the template's art window "
            "without breaking the template structure. Leave any template text areas blank — no readable text in the output. "
        )
    elif variant == "single_edit":
        layout = (
            "Design a bold premium trading-card frame, borders, and composition appropriate to the tier. "
            "The frame is decorative only — no text, numbers, or labels in the artwork. "
        )
    else:
        layout = (
            "Compose a single square baseball trading card featuring one central photorealistic athlete "
            f"(team color vibe: {team}). Invent a strong premium card frame with clean decorative borders — "
            "no text or stat overlays. "
        )

    modifier = theme_prompt_for_slug(special_theme)
    theme_line = (
        f"THEME (layer on top of tier style — color palette, background atmosphere, border/frame accents): {modifier} "
        if modifier
        else ""
    )

    composition = _card_composition_rules(variant=variant)
    framing = _player_framing_rules(variant=variant)
    tier_theme = _tier_theme_balance_rules(tier_style, theme_line)

    if variant == "text_generate":
        pose_block = (
            "Believable athletic baseball pose and energy appropriate to this tier and the written subject brief. "
            "Photorealistic proportions, no distortion. "
        )
    else:
        pose_block = (
            "Match the **same pose and action** as the reference image "
            "(do not default to batting or swinging unless the photo already shows that). "
            "Photorealistic proportions, no distortion. "
        )

    return (
        f"{_STYLE_ANCHOR} "
        f"{composition}"
        f"{framing}"
        f"{pose_block}"
        f"{layout}"
        f"{tier_theme}"
        "Prioritize a clean, full, unclipped player portrait and correct full-card composition over busy edge detail."
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


def _resolve_source_path_from_image_url(image_url: str) -> Path:
    """Resolve /uploads/... URL to a local file path under UPLOAD_DIR."""
    image_path_value = urlparse(image_url).path
    if not image_path_value.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="image_url must point to /uploads/")

    rel = image_path_value.removeprefix("/uploads/").lstrip("/")
    if not rel or ".." in rel.split("/"):
        raise HTTPException(status_code=400, detail="Invalid upload path")
    source_path = (UPLOAD_DIR / rel).resolve()
    if not str(source_path).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=400, detail="Invalid upload path")
    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(status_code=404, detail="Source image not found")
    return source_path


def _player_exists(player_id: int) -> bool:
    return any(row["id"] == player_id for row in _players)


def _card_count_for_player(db: Session, player_id: int) -> int:
    return count_cards_for_player(db, player_id)


def _ensure_card_generation_limit(db: Session, player_id: int, cards_to_generate: int = 1) -> None:
    """
    Simple per-player card cap.
    If creating the requested number would exceed the max, reject the request.
    """
    existing = _card_count_for_player(db, player_id)
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


def _draft_metadata_from_order(order: dict) -> str:
    payload = {
        "customer_name": order.get("customer_name") or "",
        "customer_email": order.get("customer_email") or "",
        "player_first_name": order.get("player_first_name") or "",
        "player_last_name": order.get("player_last_name") or "",
        "player_display_name": order.get("player_display_name"),
        "player_jersey_number": order.get("player_jersey_number") or "",
        "player_position": order.get("player_position") or "",
        "player_grad_year": order.get("player_grad_year") or 2000,
        "player_team_name": order.get("player_team_name") or order.get("player_team") or "",
        "player_image_url": order.get("player_image_url") or "",
        "tier": order.get("tier") or "rookie",
        "card_type": order.get("card_type") or "standard",
        "special_theme": order.get("special_theme"),
        "selected_motion_id": order.get("selected_motion_id") or "",
        "action_category": order.get("action_category") or "",
    }
    return json.dumps(payload)


def _preview_session_id_for_order(order: dict) -> str:
    session_id = (order.get("preview_session_id") or "").strip()
    if not session_id:
        session_id = uuid4().hex
        order["preview_session_id"] = session_id
    return session_id


def _normalize_rarity(tier: str) -> str:
    t = str(tier or "").lower()
    if t == "legendary":
        return "legendary"
    if t == "rare":
        return "rare"
    return "base"


_CARD_ID_PATH_PATTERN = re.compile(r"^FL-(\d{4})-(\d{6})$", re.IGNORECASE)


def _canonical_card_id(raw: str) -> str | None:
    """Normalize URL/path card id to FL-YYYY-###### or None if invalid."""
    s = (raw or "").strip()
    m = _CARD_ID_PATH_PATTERN.match(s)
    if not m:
        return None
    return f"FL-{m.group(1)}-{m.group(2)}"


def _vault_tier_from_gen_tier(gen_tier: str) -> str:
    """Map AI/generation tier (base/rare/legendary) to product tier labels."""
    return {"base": "rookie", "rare": "allstar", "legendary": "legends"}.get(
        str(gen_tier or "").lower(), "rookie"
    )


def _vault_tier_from_order_tier(order_tier: str) -> str:
    return {"rookie": "rookie", "all_star": "allstar", "legends": "legends"}.get(
        str(order_tier or ""), "rookie"
    )


def _theme_field(special_theme: str | None) -> str:
    if special_theme is None or str(special_theme).strip() == "":
        return "none"
    return str(special_theme).strip().lower()


def _grad_year_from_player_row(player_row: dict) -> int:
    gy = player_row.get("grad_year")
    try:
        return int(gy)
    except (TypeError, ValueError):
        return 2000


def _player_id_for_order(order: dict) -> int:
    """Match order to an existing player row by image URL when possible."""
    url = order.get("player_image_url")
    if not url:
        return 0
    for p in _players:
        if p.get("image_url") == url:
            return int(p["id"])
    return 0


def _store_generated_card(
    db: Session,
    player_id: int,
    image_url: str,
    style: str,
    *,
    gen_tier: str,
    player_row: dict,
    special_theme: str | None = None,
    owner_name: str = "unassigned",
    vault_tier: str | None = None,
    owner_id: int | None = None,
    predefined_card_id: str | None = None,
    status: str = "active",
    preview_session_id: str | None = None,
    draft_metadata: str | None = None,
) -> dict:
    """Persist generated card to PostgreSQL; returns API-shaped dict."""
    vt = vault_tier or _vault_tier_from_gen_tier(gen_tier)
    cid = predefined_card_id or next_collectible_card_id(db)
    grad_year_str = str(_grad_year_from_player_row(player_row))
    row = create_card_row(
        db,
        card_id=cid,
        player_id=player_id,
        player_name=_player_display_name(player_row),
        team_name=_player_team_name(player_row),
        position=str(player_row.get("position") or "").strip(),
        jersey_number=_player_jersey_number(player_row),
        grad_year=grad_year_str,
        tier=vt,
        theme=_theme_field(special_theme),
        rarity=_normalize_rarity(gen_tier),
        edition_number=1,
        print_run=1,
        image_url=image_url,
        shareable_slug=cid.lower(),
        style=style,
        special_theme=special_theme,
        owner_name=owner_name,
        owner_id=owner_id,
        creator_user_id=owner_id,
        status=status,
        preview_session_id=preview_session_id,
        draft_metadata=draft_metadata,
    )
    return card_to_dict(row, db)


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
    special_theme: str | None,
) -> bytes:
    """
    Pass two images to images.edit: (1) player likeness, (2) card template.
    Order matches the prompt (first / second image).
    """
    player_f = _bytesio_image_file_for_edit(player_path, "player")
    template_f = _bytesio_image_file_for_edit(template_path, "template")
    prompt = _tier_animated_card_prompt(
        name,
        team,
        tier,
        special_theme=special_theme,
    )
    kwargs: dict = {
        "model": model,
        "image": [player_f, template_f],
        "prompt": prompt,
        "size": "1024x1024",
        "n": 1,
    }
    if model in ("gpt-image-1", "gpt-image-1.5"):
        kwargs["input_fidelity"] = "high"
    logger.info(
        "OpenAI images.edit request model=%s tier=%s prompt_len=%s prompt=%s",
        model,
        tier,
        len(prompt),
        prompt,
    )
    try:
        response = client.images.edit(**kwargs)
    except Exception as exc:
        logger.exception("OpenAI images.edit failed model=%s: %s", model, exc)
        raise
    logger.info("OpenAI images.edit succeeded model=%s", model)
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
                            "In 2 short phrases, describe the person's appearance and what their body is doing "
                            "(pose / action — e.g. throwing, batting, running) plus hair, skin tone, expression, "
                            "and clothing colors, for a photorealistic premium sports trading card. "
                            "Note whether head and upper body are fully in frame. Do not use real names."
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
    client: OpenAI,
    name: str,
    team: str,
    caption: str,
    tier: str,
    special_theme: str | None,
) -> bytes:
    """
    Full photorealistic trading card via DALL·E 3 text generation (fallback when template edit fails).
    """
    prompt = (
        _tier_animated_card_prompt(
            name,
            team,
            tier,
            variant="text_generate",
            special_theme=special_theme,
        )
        + f" Subject reference from uploaded photo: {caption}."
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
    client: OpenAI,
    source_path: Path,
    name: str,
    team: str,
    tier: str,
    special_theme: str | None,
) -> bytes:
    """
    Fallback: DALL·E 2 image *edit* — often keeps most of the original photo pixels; use only if DALL·E 3 fails.
    """
    prompt = _tier_animated_card_prompt(
        name,
        team,
        tier,
        variant="single_edit",
        special_theme=special_theme,
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
    Draw a dark bottom banner: top row has jersey # (left) and tier chip (right),
    then player name and team below so text does not cover the number.
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
    # Rarity chip height (jersey chip matches this height when present)
    tier_label = {"legendary": "1-OF-1", "rare": "RARE", "base": "BASE"}.get(tier.lower(), "BASE")
    chip_font = team_font
    cb = measure.textbbox((0, 0), tier_label, font=chip_font, anchor="lt")
    chip_h = (cb[3] - cb[1]) + max(8, pad // 2)
    # Banner: top chip row, then name, then team (jersey sits in chip row, left — not under name)
    banner_h = pad + chip_h + gap + name_h + gap + team_h + pad
    out_h = h + banner_h

    out = Image.new("RGBA", (w, out_h), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    draw = ImageDraw.Draw(out)
    banner_top = h
    banner_bottom = out_h
    _draw_vertical_gradient(draw, 0, banner_top, w, banner_bottom, banner_top_fill, banner_bottom_fill)
    draw.line([(0, banner_top), (w, banner_top)], fill=accent_fill, width=max(2, w // 256))

    # Rare/legendary-style rarity chip to the right, aligned with app theme.
    chip_w = (cb[2] - cb[0]) + pad
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

    y_name = chip_y1 + gap
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
    player_row: dict,
    player_id: int,
    source_path: Path,
    tier: str = "base",
    special_theme: str | None = None,
) -> dict:
    """Local fallback: draw name + team on the photo and save to cards/."""
    with Image.open(source_path) as image:
        final_rgb = image.convert("RGB")
        card_filename = f"player-{player_id}-{uuid4().hex}.png"
        card_path = CARD_DIR / card_filename
        final_rgb.save(card_path, format="PNG")

    return {
        "filename": card_filename,
        "path": str(card_path),
        "url": f"{CARD_MEDIA_URL_PREFIX}/{card_filename}",
        "mode": "pillow",
        "tier": tier.lower(),
        "special_theme": special_theme,
    }


def _generate_card_openai(
    player_row: dict,
    player_id: int,
    source_path: Path,
    *,
    tier: str = "base",
    special_theme: str | None = None,
) -> dict:
    """
    1) Prefer GPT Image edit with [player photo, card template] and tier-specific prompt.
    2) Fallback: DALL·E 3 + vision caption, then DALL·E 2 edit (single image).
    Player info is shown via the frontend CardInfoBanner — not baked into the image.
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
                special_theme=special_theme,
            )
            logger.info("Card generation succeeded via gpt-image model=%s player_id=%s", model, player_id)
            break
        except Exception as exc:
            logger.warning("Card generation failed for model=%s player_id=%s: %s", model, player_id, exc)
            continue

    if out_bytes is None:
        generation = "dall-e-3"
        try:
            caption = _vision_caption_for_card(client, source_path)
        except Exception as exc:
            logger.warning("Vision caption failed player_id=%s: %s", player_id, exc)
            caption = "athletic portrait, confident sports pose"
        try:
            out_bytes = _dalle3_generate_card_bytes(
                client, name, team, caption, tier_norm, special_theme
            )
            logger.info("Card generation succeeded via dall-e-3 player_id=%s", player_id)
        except Exception as exc:
            logger.warning("DALL-E 3 generation failed player_id=%s: %s", player_id, exc)
            out_bytes = None

    if out_bytes is None:
        generation = "dall-e-2-edit"
        out_bytes = _dalle2_edit_card_bytes(
            client, source_path, name, team, tier_norm, special_theme
        )
        logger.info("Card generation succeeded via dall-e-2-edit player_id=%s", player_id)

    with Image.open(io.BytesIO(out_bytes)) as generated:
        final_rgb = generated.convert("RGB")

    card_filename = f"player-{player_id}-ai-{tier_norm}-{uuid4().hex}.png"
    card_path = CARD_DIR / card_filename
    final_rgb.save(card_path, format="PNG")

    result = {
        "filename": card_filename,
        "path": str(card_path),
        "url": f"{CARD_MEDIA_URL_PREFIX}/{card_filename}",
        "mode": "ai",
        "tier": tier_norm,
        "generation": generation,
        "special_theme": special_theme,
    }
    logger.info(
        "Card image saved player_id=%s generation=%s url=%s bytes=%s",
        player_id,
        generation,
        result["url"],
        len(out_bytes),
    )
    return result


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
    image_url: str


class PlayerImageUpdate(BaseModel):
    """Body for PUT /players/{id}/image."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    image_url: str = Field(..., min_length=1, max_length=2000)


class CardVaultSummary(BaseModel):
    """Public list row for GET /cards."""

    card_id: str
    player_name: str
    tier: str
    theme: str
    rarity: str
    edition_number: int
    print_run: int
    created_at: str
    image_url: str
    shareable_slug: str
    status: str = Field(default="active")
    owner_id: int | None = Field(default=None)
    pending_trade_offer_id: int | None = Field(default=None)
    is_animated: bool = Field(default=False)
    animated_video_url: str | None = Field(default=None)
    animation_status: str | None = Field(default=None)
    animation_motion: str | None = Field(default=None)
    action_category: str | None = Field(default=None)


class CardDuplicateBody(BaseModel):
    """Request body for expanding a print run (target total: 1, 2, 5, or 10)."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    quantity: int = Field(..., ge=1, le=10)


class Card(BaseModel):
    """Full collectible record (vault) — GET /cards/{card_id} and player card lists."""

    id: int = Field(..., ge=0)
    card_id: str = Field(..., min_length=12, max_length=40)
    player_id: int = Field(default=0, ge=0)
    player_name: str = Field(..., min_length=1, max_length=200)
    team_name: str = Field(..., min_length=1, max_length=200)
    position: str = Field(default="", max_length=80)
    jersey_number: str = Field(default="", max_length=20)
    grad_year: int = Field(default=2000, ge=1900, le=2100)
    tier: str = Field(..., min_length=1, max_length=40)
    theme: str = Field(default="none", max_length=120)
    rarity: str = Field(..., min_length=1, max_length=40)
    edition_number: int = Field(default=1, ge=1)
    print_run: int = Field(default=1, ge=1)
    created_at: str
    image_url: str = Field(..., min_length=1, max_length=2000)
    shareable_slug: str = Field(..., min_length=12, max_length=48)
    style: str = Field(..., min_length=1, max_length=200)
    special_theme: str | None = Field(default=None, max_length=120)
    owner_name: str = Field(default="unassigned", min_length=1, max_length=200)
    owner_id: int | None = Field(default=None)
    status: str = Field(default="active")
    trade_offered_to: int | None = Field(default=None)
    pending_trade_offer_id: int | None = Field(default=None)
    is_animated: bool = Field(default=False)
    animated_video_url: str | None = Field(default=None)
    animation_status: str | None = Field(default=None)
    animation_motion: str | None = Field(default=None)
    action_category: str | None = Field(default=None)


class CardShareMeta(BaseModel):
    """Public metadata for social sharing (GET /cards/{id}/meta)."""

    card_id: str
    player_name: str
    tier: str
    rarity: str
    edition_number: int
    print_run: int
    image_url: str
    shareable_url: str
    share_text: str


def _frontend_base_url() -> str:
    return (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")


def _tier_share_labels(tier: str) -> tuple[str, str]:
    """(readable tier phrase, hashtag segment without #) for share copy."""
    t = (tier or "").lower().replace("-", "").replace("_", "")
    if t == "legends":
        return "Legends", "Legends"
    if t == "allstar":
        return "All-Star", "AllStar"
    return "Rookie", "Rookie"


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
    player_image_url: str = Field(..., min_length=1, max_length=2000)

    # Order details
    tier: OrderTier
    card_type: OrderCardType = Field(default="standard")
    special_theme: str | None = Field(default=None, max_length=120)
    selected_motion_id: str | None = Field(default=None, max_length=64)
    action_category: str | None = Field(default=None, max_length=32)
    add_ons: list[str] = Field(default_factory=list)
    status: OrderStatus = "new_order"

    @field_validator("special_theme", mode="before")
    @classmethod
    def _validate_special_theme(cls, v: object) -> str | None:
        if v is None:
            return None
        if isinstance(v, str) and not v.strip():
            return None
        s = str(v).strip().lower()
        if not is_valid_theme_slug(s):
            raise ValueError("Invalid theme id. Use GET /themes for allowed values.")
        return s


class GeneratedOrderCard(BaseModel):
    card_id: str = Field(..., min_length=12, max_length=30)
    image_url: str = Field(..., min_length=1, max_length=2000)
    tier: CardTier
    created_at: str
    edition_number: int = Field(default=1, ge=1)
    print_run: int = Field(default=1, ge=1)
    owner_name: str = Field(default="unassigned", min_length=1, max_length=200)
    player_name: str = Field(..., min_length=1, max_length=200)
    team_name: str = Field(..., min_length=1, max_length=200)
    special_theme: str | None = Field(default=None, max_length=120)
    rarity: str = Field(..., min_length=1, max_length=40)


class Order(OrderCreate):
    """Stored order record."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    id: int = Field(..., ge=1)
    created_at: str
    generated_cards: list[GeneratedOrderCard] = Field(default_factory=list)
    preview_count: int = Field(default=0, ge=0)
    preview_limit: int = Field(default=3, ge=1)
    final_card_url: str | None = Field(default=None, max_length=2000)
    delivered_at: str | None = None
    preview_session_id: str | None = Field(default=None, max_length=128)
    draft_metadata: str | None = None
    selected_motion_id: str | None = Field(default=None, max_length=64)


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


class PendingPreviewCard(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: str
    image_url: str
    tier: str
    created_at: str
    edition_number: int = 1
    print_run: int = 1
    owner_name: str = "unassigned"
    player_name: str = ""
    team_name: str = ""
    special_theme: str | None = None
    rarity: str = "base"


class PendingCardDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_name: str = ""
    customer_email: str = ""
    player_first_name: str = ""
    player_last_name: str = ""
    player_display_name: str | None = None
    player_jersey_number: str = ""
    player_position: str = ""
    player_grad_year: int = 2000
    player_team_name: str = ""
    player_image_url: str = ""
    tier: OrderTier = "rookie"
    card_type: OrderCardType = "standard"
    special_theme: str | None = None
    selected_motion_id: str = ""
    action_category: str = ""


class PendingCardSession(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preview_session_id: str
    expires_at: str
    draft: PendingCardDraft
    preview_count: int = Field(ge=0)
    preview_limit: int = Field(default=3, ge=1)
    previews: list[PendingPreviewCard] = Field(default_factory=list)


class PendingCardsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    session: PendingCardSession | None = None


class PendingRestoreRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    preview_session_id: str = Field(..., min_length=1, max_length=128)


class RegisterBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(..., min_length=3, max_length=320)
    display_name: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=8, max_length=128)
    invite_code: str | None = Field(default=None, max_length=200)
    parent_email: str | None = Field(default=None, max_length=320)


class BetaStatusResponse(BaseModel):
    beta_mode: bool
    message: str | None = None


class FeaturesResponse(BaseModel):
    social_sharing_enabled: bool


class ThemeOption(BaseModel):
    id: str
    name: str
    category: str
    ai_prompt_modifier: str


class ThemeCategoryPayload(BaseModel):
    id: str
    name: str
    themes: list[ThemeOption]


class ThemesResponse(BaseModel):
    categories: list[ThemeCategoryPayload]


class LoginBody(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(..., min_length=1, max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


class UserPublic(BaseModel):
    id: int
    email: str
    display_name: str
    created_at: str
    credit_balance: float = 0.0


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


def _user_public(user: User) -> UserPublic:
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return UserPublic(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        created_at=created.isoformat(),
        credit_balance=float_from_decimal(user.credit_balance),
    )


def _beta_invite_code_required() -> str | None:
    """If set, registration must supply a matching invite code (case-insensitive)."""
    return get_beta_invite_code()


def _social_sharing_enabled() -> bool:
    raw = (os.environ.get("SOCIAL_SHARING_ENABLED") or "").strip().lower()
    if raw == "false":
        return False
    if raw == "true":
        return True
    return True


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {"message": "API is running"}


@app.get("/auth/beta-status", response_model=BetaStatusResponse)
def auth_beta_status():
    beta = _beta_invite_code_required() is not None
    return BetaStatusResponse(
        beta_mode=beta,
        message=(
            "This app is currently in private beta. You need an invite code to register."
            if beta
            else None
        ),
    )


@app.get("/config/features", response_model=FeaturesResponse)
def config_features():
    return FeaturesResponse(social_sharing_enabled=_social_sharing_enabled())


@app.get("/themes", response_model=ThemesResponse)
def get_themes():
    """Theme library for the card creation flow (ids match order `special_theme`)."""
    return {"categories": THEME_CATEGORIES}


@app.post("/auth/register", response_model=AuthTokenResponse, status_code=201)
def auth_register(body: RegisterBody, db: Session = Depends(get_db)):
    required_invite = _beta_invite_code_required()
    if required_invite is not None:
        provided = (body.invite_code or "").strip()
        if not provided or provided.casefold() != required_invite.casefold():
            raise HTTPException(
                status_code=400,
                detail="Invalid invite code. This app is currently in private beta.",
            )
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        parent_email = normalize_optional_parent_email(body.parent_email)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid parent email address")
    user = User(
        email=email,
        display_name=body.display_name.strip(),
        hashed_password=hash_password(body.password),
        parent_email=parent_email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email})
    return AuthTokenResponse(access_token=token, user=_user_public(user))


@app.post("/auth/login", response_model=AuthTokenResponse)
def auth_login(body: LoginBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return AuthTokenResponse(access_token=token, user=_user_public(user))


@app.get("/auth/me", response_model=UserPublic)
def auth_me(current_user: User = Depends(get_current_user)):
    return _user_public(current_user)


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
def create_player(
    body: PlayerCreate,
    _current_user: User = Depends(get_current_user),
):
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
        image_url=body.image_url,
    )
    _players.append(player.model_dump())
    _next_player_id += 1
    return player


@app.get("/players", response_model=list[Player])
def list_players(_current_user: User = Depends(get_current_user)):
    """All players in memory, including image_url when set."""
    return _players


@app.get("/cards", response_model=list[CardVaultSummary])
def list_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List the authenticated user's cards (newest first). Same data as GET /cards/my-cards."""
    rows = list_my_cards_dicts(db, current_user.id)
    return [CardVaultSummary.model_validate(r) for r in rows]


@app.get("/cards/my-cards", response_model=list[CardVaultSummary])
def list_my_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Authenticated user's cards only."""
    rows = list_my_cards_dicts(db, current_user.id)
    return [CardVaultSummary.model_validate(r) for r in rows]


@app.get("/cards/pending", response_model=PendingCardsResponse)
def get_pending_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the user's most recent unfinished preview session, if any (24h retention)."""
    session = get_latest_pending_session(db, current_user.id)
    if session is None:
        return PendingCardsResponse(session=None)
    try:
        validated = PendingCardSession.model_validate(session)
    except Exception:
        discard_pending_session(
            db,
            owner_id=current_user.id,
            preview_session_id=session.get("preview_session_id"),
        )
        return PendingCardsResponse(session=None)
    if not validated.previews:
        discard_pending_session(
            db,
            owner_id=current_user.id,
            preview_session_id=validated.preview_session_id,
        )
        return PendingCardsResponse(session=None)
    return PendingCardsResponse(session=validated)


@app.delete("/cards/pending")
def discard_pending_cards(
    preview_session_id: str = Query(..., min_length=1, max_length=128),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Discard all preview cards in an unfinished session (idempotent)."""
    count = discard_pending_session(
        db,
        owner_id=current_user.id,
        preview_session_id=preview_session_id,
    )
    return {"success": True, "discarded_count": count}


@app.post("/cards/pending/restore", response_model=Order)
def restore_pending_cards(
    body: PendingRestoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Rebuild an in-memory order from a persisted preview session so the user can
    confirm or regenerate without paying again for existing previews.
    """
    global _next_order_id

    session = get_pending_session_by_id(db, current_user.id, body.preview_session_id)
    if session is None:
        discard_pending_session(
            db,
            owner_id=current_user.id,
            preview_session_id=body.preview_session_id,
        )
        raise HTTPException(status_code=404, detail="No pending preview session found.")

    draft = session["draft"]
    if not session.get("previews"):
        discard_pending_session(
            db,
            owner_id=current_user.id,
            preview_session_id=body.preview_session_id,
        )
        raise HTTPException(status_code=404, detail="No pending preview session found.")
    generated_cards = [
        GeneratedOrderCard.model_validate(preview).model_dump() for preview in session["previews"]
    ]

    order = Order(
        id=_next_order_id,
        customer_name=draft.get("customer_name") or current_user.display_name,
        customer_email=draft.get("customer_email") or current_user.email,
        player_first_name=draft.get("player_first_name") or "",
        player_last_name=draft.get("player_last_name") or "N/A",
        player_display_name=draft.get("player_display_name"),
        player_jersey_number=draft.get("player_jersey_number") or "",
        player_position=draft.get("player_position") or "",
        player_grad_year=int(draft.get("player_grad_year") or 2000),
        player_team_name=draft.get("player_team_name") or "",
        player_image_url=draft.get("player_image_url") or "",
        tier=draft.get("tier") or "rookie",
        card_type=draft.get("card_type") or "standard",
        special_theme=draft.get("special_theme"),
        add_ons=[],
        status="awaiting_review",
        created_at=datetime.now(timezone.utc).isoformat(),
        generated_cards=generated_cards,
        preview_count=int(session.get("preview_count") or len(generated_cards)),
        preview_limit=int(session.get("preview_limit") or _preview_limit_for_tier(draft.get("tier") or "rookie")),
        preview_session_id=session["preview_session_id"],
        draft_metadata=json.dumps(draft),
        selected_motion_id=draft.get("selected_motion_id") or None,
        action_category=draft.get("action_category") or None,
    )
    order_payload = order.model_dump()
    _orders.append(order_payload)
    _next_order_id += 1
    return order


@app.get("/cards/{card_id}/meta", response_model=CardShareMeta)
def get_card_share_meta(card_id: str, db: Session = Depends(get_db)):
    """Public card fields + share URL/text for Open Graph / social clients."""
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    orm = get_card_by_card_id(db, key)
    if orm is None:
        raise HTTPException(status_code=404, detail="Card not found")
    d = card_to_dict(orm, db)
    slug = d.get("shareable_slug") or d.get("card_id")
    base = _frontend_base_url()
    shareable_url = f"{base}/card/{slug}"
    tier_readable, tier_tag = _tier_share_labels(d.get("tier") or "")
    player_name = d.get("player_name") or "Player"
    share_text = (
        f"Check out my {tier_readable} Future Legends card for {player_name}! "
        f"#{tier_tag}Card #FutureLegends #YouthBaseball"
    )
    return CardShareMeta(
        card_id=d["card_id"],
        player_name=player_name,
        tier=d.get("tier") or "",
        rarity=d.get("rarity") or "",
        edition_number=int(d.get("edition_number") or 1),
        print_run=int(d.get("print_run") or 1),
        image_url=d.get("image_url") or "",
        shareable_url=shareable_url,
        share_text=share_text,
    )


@app.get("/cards/{card_id}", response_model=Card)
def get_card(
    card_id: str,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Single card by collectible id (shareable slug accepted: fl-2026-000001)."""
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    orm = get_card_by_card_id(db, key)
    if orm is None:
        raise HTTPException(status_code=404, detail="Card not found")
    data = card_to_dict(orm, db)
    is_owner = current_user is not None and orm.owner_id == current_user.id
    if not is_owner:
        data["animated_video_url"] = None
    return Card.model_validate(data)


@app.get("/cards/{card_id}/copies", response_model=list[CardVaultSummary])
def get_card_copies(card_id: str, db: Session = Depends(get_db)):
    """All cards sharing the same image (full print-run family), edition order."""
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    orm = get_card_by_card_id(db, key)
    if orm is None:
        raise HTTPException(status_code=404, detail="Card not found")
    rows = list_cards_by_image_url_dicts(db, orm.image_url)
    return [CardVaultSummary.model_validate(r) for r in rows]


class CardHistoryEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_type: str
    event_date: str
    description: str
    actor: str | None = None


@app.get("/cards/{card_id}/history", response_model=list[CardHistoryEvent])
def get_card_history(card_id: str, db: Session = Depends(get_db)):
    """Chronological lifetime events for a card (public, read-only)."""
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    orm = get_card_by_card_id(db, key)
    if orm is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return [CardHistoryEvent.model_validate(e) for e in build_card_history(db, orm)]


@app.post("/cards/{card_id}/duplicate", response_model=list[Card])
def duplicate_cards(
    card_id: str,
    body: CardDuplicateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Expand the owner's print run for this card's image to `quantity` total copies
    (allowed totals: 1, 2, 5, 10). Each new copy gets a new FL-YYYY-###### id and slug.
    """
    key = _canonical_card_id(card_id)
    if key is None:
        raise HTTPException(status_code=404, detail="Card not found")
    orm = get_card_by_card_id(db, key)
    if orm is None:
        raise HTTPException(status_code=404, detail="Card not found")
    if orm.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this card")
    if (orm.status or "active") != "active":
        raise HTTPException(status_code=400, detail="Only active cards can be duplicated")
    if body.quantity not in PRINT_RUN_ALLOWED_QUANTITIES:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be one of: 1, 2, 5, 10.",
        )
    current_run = int(orm.print_run or 1)
    copy_charge = copy_charge_for_quantity(body.quantity, current_run=current_run)
    if copy_charge["total"] > 0:
        try:
            deduct_credits(
                user_id=current_user.id,
                amount=copy_charge["total"],
                transaction_type=TX_GENERATION,
                reference_id=orm.card_id,
                note=(
                    f"Additional card copies ({copy_charge['extra_copies']}x "
                    f"@ ${copy_charge['unit_price']:.2f})"
                ),
                db=db,
            )
        except InsufficientCreditsError as exc:
            raise HTTPException(
                status_code=400,
                detail="Insufficient credits. Please add credits to your account at /credits",
            ) from exc
    try:
        new_rows = expand_print_run_for_owner_image(db, template=orm, target_quantity=body.quantity)
    except ValueError as exc:
        err = str(exc)
        if err == "cannot_reduce":
            raise HTTPException(
                status_code=400,
                detail="Print run cannot be reduced.",
            ) from exc
        if err == "invalid_quantity":
            raise HTTPException(
                status_code=400,
                detail="Quantity must be one of: 1, 2, 5, 10.",
            ) from exc
        raise HTTPException(status_code=500, detail="Could not create copies.") from exc
    return [Card.model_validate(card_to_dict(r, db)) for r in new_rows]


@app.get("/players/{player_id}/cards", response_model=list[Card])
def list_cards_for_player(
    player_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List generated cards for one player."""
    if not _player_exists(player_id):
        raise HTTPException(status_code=404, detail="Player not found")
    rows = list_cards_for_player_dicts(db, player_id)
    return [Card.model_validate(r) for r in rows]


@app.post("/orders", response_model=Order, status_code=201)
def create_order(
    body: OrderCreate,
    _current_user: User = Depends(get_current_user),
):
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
        player_image_url=body.player_image_url,
        tier=body.tier,
        card_type=body.card_type,
        special_theme=body.special_theme,
        selected_motion_id=body.selected_motion_id,
        action_category=body.action_category,
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
    _current_user: User = Depends(get_current_user),
):
    """List in-memory orders, optionally filtered by status and/or tier."""
    results = _orders
    if status is not None:
        results = [order for order in results if order["status"] == status]
    if tier is not None:
        results = [order for order in results if order["tier"] == tier]
    return results


@app.get("/orders/{order_id}", response_model=Order)
def get_order(order_id: int, _current_user: User = Depends(get_current_user)):
    """Get one order by id."""
    order = _get_order_or_404(order_id)
    return Order.model_validate(order)


@app.patch("/orders/{order_id}/status", response_model=Order)
def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    _current_user: User = Depends(get_current_user),
):
    """Update only the status for one order."""
    order = _get_order_or_404(order_id)
    order["status"] = body.status
    return Order.model_validate(order)


@app.post("/orders/{order_id}/generate-card", response_model=GeneratedOrderCard)
def generate_card_for_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate one card from order player data and image.
    Stores generated card metadata in order.generated_cards.
    """
    order = _get_order_or_404(order_id)
    preview_count = int(order.get("preview_count", 0))
    preview_limit = int(order.get("preview_limit", _preview_limit_for_tier(order.get("tier", "rookie"))))
    if preview_count >= preview_limit:
        raise HTTPException(status_code=400, detail="Preview limit reached")

    order_tier = str(order.get("tier", "rookie"))
    card_type = str(order.get("card_type", "standard") or "standard")
    player_label = _player_display_name(
        {
            "first_name": order.get("player_first_name", ""),
            "last_name": order.get("player_last_name", ""),
            "display_name": order.get("player_display_name"),
        }
    )

    try:
        if preview_count > 0:
            charge = tier_generation_price(order_tier)
            if charge > 0:
                deduct_credits(
                    user_id=current_user.id,
                    amount=charge,
                    transaction_type=TX_GENERATION,
                    reference_id=str(order_id),
                    note=f"Card preview - {order_tier} tier",
                    db=db,
                )
    except InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=400,
            detail="Insufficient credits. Please add credits to your account at /credits",
        ) from exc

    player_row = {
        "first_name": order.get("player_first_name", ""),
        "last_name": order.get("player_last_name", ""),
        "display_name": order.get("player_display_name"),
        "jersey_number": order.get("player_jersey_number", ""),
        "position": order.get("player_position", ""),
        "grad_year": order.get("player_grad_year", ""),
        "team_name": order.get("player_team_name") or order.get("player_team", ""),
        "image_url": order["player_image_url"],
        "special_theme": order.get("special_theme"),
    }
    source_path = _resolve_source_path_from_image_url(order["player_image_url"])
    card_tier = _order_tier_to_card_tier(order["tier"])

    try:
        result = _generate_card_openai(
            player_row, order_id, source_path, tier=card_tier, special_theme=order.get("special_theme")
        )
    except Exception as exc:
        logger.exception(
            "OpenAI card generation failed for order %s, using pillow fallback: %s",
            order_id,
            exc,
        )
        result = _generate_card_pillow(
            player_row, order_id, source_path, tier=card_tier, special_theme=order.get("special_theme")
        )

    new_card_id = next_collectible_card_id(db)
    owner_id = current_user.id
    preview_session_id = _preview_session_id_for_order(order)
    draft_metadata = order.get("draft_metadata")
    if not draft_metadata:
        draft_metadata = _draft_metadata_from_order(order)
        order["draft_metadata"] = draft_metadata
    vault_rec = _store_generated_card(
        db,
        _player_id_for_order(order),
        result["url"],
        _style_from_generated_card(result),
        gen_tier=card_tier,
        player_row=player_row,
        special_theme=order.get("special_theme"),
        owner_name=order.get("customer_name") or "unassigned",
        vault_tier=_vault_tier_from_order_tier(str(order.get("tier", "rookie"))),
        owner_id=owner_id,
        predefined_card_id=new_card_id,
        status="preview",
        preview_session_id=preview_session_id,
        draft_metadata=draft_metadata,
    )

    generated = GeneratedOrderCard(
        card_id=new_card_id,
        image_url=result["url"],
        tier=card_tier,
        created_at=vault_rec["created_at"],
        edition_number=1,
        print_run=1,
        owner_name=order.get("customer_name") or "unassigned",
        player_name=_player_display_name(player_row),
        team_name=_player_team_name(player_row),
        special_theme=order.get("special_theme"),
        rarity=_normalize_rarity(card_tier),
    )
    order.setdefault("generated_cards", []).append(generated.model_dump())
    order["preview_count"] = preview_count + 1
    order["preview_limit"] = preview_limit
    return generated


@app.post("/orders/{order_id}/deliver", response_model=Order)
def deliver_order(
    order_id: int,
    body: OrderDeliverRequest | None = None,
    _current_user: User = Depends(get_current_user),
):
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
def approve_order_preview(
    order_id: int,
    body: OrderApprovePreviewRequest | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Customer confirms which generated preview they want fulfilled.
    - Sets final_card_url from provided image_url or latest generated preview
    - Automatically marks the order as delivered for customer flow
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
    order["delivered_at"] = datetime.now(timezone.utc).isoformat()
    order["status"] = "delivered"

    generated_cards = order.get("generated_cards", [])
    card_ids = [str(g.get("card_id") or "") for g in generated_cards if g.get("card_id")]
    finalize_order_preview(
        db,
        owner_id=current_user.id,
        final_image_url=final_url,
        generated_card_ids=card_ids,
    )

    return Order.model_validate(order)


@app.put("/players/{player_id}/image", response_model=Player)
def set_player_image(
    player_id: int,
    body: PlayerImageUpdate,
    _current_user: User = Depends(get_current_user),
):
    """Set image_url for the player with this id."""
    for row in _players:
        if row["id"] == player_id:
            row["image_url"] = body.image_url
            return Player.model_validate(row)
    raise HTTPException(status_code=404, detail="Player not found")


@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, GIF, or WebP)"),
    _current_user: User = Depends(get_current_user),
):
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    use_ai: bool = Query(
        False,
        description="If true, generate with OpenAI image API (falls back to Pillow on failure).",
    ),
    tier: CardTier = Query(
        "base",
        description="Rarity tier for AI art: base (common), rare, or legendary (1-of-1 style).",
    ),
    special_theme: str | None = Query(
        default=None,
        description="Optional theme id from GET /themes (e.g. neon, christmas, gold_edition).",
    ),
):
    """
    Generate a player card image into cards/.

    Default: Pillow overlay (name + team). With use_ai=true: try OpenAI image edit using the
    player's uploaded photo as input; on any failure, use the Pillow path.
    """
    if special_theme is not None and str(special_theme).strip():
        s = str(special_theme).strip().lower()
        if not is_valid_theme_slug(s):
            raise HTTPException(
                status_code=400,
                detail="Invalid special_theme. Use GET /themes for valid theme ids.",
            )
        special_theme = s
    else:
        special_theme = None

    player_row, source_path = _resolve_player_and_source_path(player_id)
    _ensure_card_generation_limit(db, player_id, cards_to_generate=1)

    price = _card_generation_price()
    try:
        deduct_credits(
            user_id=current_user.id,
            amount=price,
            transaction_type="generation",
            note=f"Card generation - {tier} tier",
            db=db,
        )
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=400,
            detail="Insufficient credits. Please add credits to your account at /credits",
        ) from e

    if use_ai:
        try:
            result = _generate_card_openai(player_row, player_id, source_path, tier=tier, special_theme=special_theme)
        except Exception as exc:
            # Fallback: keep the app usable if the key is missing, quota fails, or the API errors.
            result = _generate_card_pillow(player_row, player_id, source_path, tier=tier, special_theme=special_theme)
            result["mode"] = "pillow_fallback"
            result["ai_error"] = str(exc)
    else:
        result = _generate_card_pillow(player_row, player_id, source_path, tier=tier, special_theme=special_theme)

    card = _store_generated_card(
        db,
        player_id,
        result["url"],
        _style_from_generated_card(result),
        gen_tier=str(result.get("tier", tier)),
        player_row=player_row,
        special_theme=special_theme,
        owner_name="unassigned",
        owner_id=current_user.id,
    )
    result["card_id"] = card["card_id"]
    result["card_record_id"] = card["id"]
    result["created_at"] = card["created_at"]
    return result


@app.post("/generate-card-set/{player_id}")
def generate_card_set(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate three AI cards for the same player: BASE, RARE, and LEGENDARY (distinct prompt intensity).
    Each result includes its own url; failures are reported per tier without stopping the batch.
    """
    player_row, source_path = _resolve_player_and_source_path(player_id)
    _ensure_card_generation_limit(db, player_id, cards_to_generate=3)
    price = _card_generation_price() * 3
    try:
        deduct_credits(
            user_id=current_user.id,
            amount=price,
            transaction_type="generation",
            note="Card generation - set",
            db=db,
        )
    except InsufficientCreditsError as e:
        raise HTTPException(
            status_code=400,
            detail="Insufficient credits. Please add credits to your account at /credits",
        ) from e
    cards: list[dict] = []
    for tier in ("base", "rare", "legendary"):
        try:
            result = _generate_card_openai(player_row, player_id, source_path, tier=tier, special_theme=None)
            card = _store_generated_card(
                db,
                player_id,
                result["url"],
                _style_from_generated_card(result),
                gen_tier=str(tier),
                player_row=player_row,
                special_theme=None,
                owner_name="unassigned",
                owner_id=current_user.id,
            )
            result["card_id"] = card["card_id"]
            result["card_record_id"] = card["id"]
            result["created_at"] = card["created_at"]
            cards.append(result)
        except Exception as exc:
            cards.append({"tier": tier, "ok": False, "error": str(exc)})
    return {"player_id": player_id, "cards": cards}


# Mount after API routes so /upload-image wins over static routing edge cases.
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount(CARD_MEDIA_URL_PREFIX, StaticFiles(directory=str(CARD_DIR)), name="card_media")
app.mount("/animations", StaticFiles(directory=str(ANIMATIONS_DIR)), name="animations")
