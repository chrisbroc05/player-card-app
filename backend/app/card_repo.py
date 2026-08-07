"""PostgreSQL persistence for collectible cards."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Card, utcnow

_CARD_ID_PATTERN = re.compile(r"^FL-\d{4}-\d{6}$", re.IGNORECASE)

PRINT_RUN_ALLOWED_QUANTITIES = frozenset({1, 2, 5, 10})  # legacy presets; validation uses range below
COPY_QUANTITY_MIN = 1
COPY_QUANTITY_MAX = 100


def validate_print_run_quantity(quantity: int) -> None:
    if not isinstance(quantity, int):
        raise ValueError("invalid_quantity_type")
    if quantity < COPY_QUANTITY_MIN or quantity > COPY_QUANTITY_MAX:
        raise ValueError("invalid_quantity")
PENDING_CARD_TTL_HOURS = 24

# Same rows surfaced in My Collection and profile "Cards in Collection" KPI.
import logging

logger = logging.getLogger(__name__)

COLLECTION_STATUSES = ("active", "pending_trade")

# Studio previews and discarded variants never count toward creation KPIs.
EXCLUDED_CREATOR_STATUSES = ("preview", "discarded")


def owned_collection_filter(owner_id: int):
    """Cards visible in the user's collection."""
    from sqlalchemy import and_

    return and_(
        Card.owner_id == owner_id,
        Card.status.in_(COLLECTION_STATUSES),
    )


def cards_created_by_user_filter(user_id: int):
    """Cards this user originated; legacy rows without creator still count when owned."""
    from sqlalchemy import and_, or_

    return and_(
        or_(
            Card.creator_user_id == user_id,
            and_(Card.creator_user_id.is_(None), Card.owner_id == user_id),
        ),
        Card.status.notin_(EXCLUDED_CREATOR_STATUSES),
    )


def _year_prefix() -> str:
    year = datetime.now(timezone.utc).year
    return f"FL-{year}-"


def next_collectible_card_id(db: Session) -> str:
    """Next FL-YYYY-###### id; numeric suffix max + 1 (string sort is unsafe)."""
    prefix = _year_prefix()
    rows = db.query(Card).filter(Card.card_id.startswith(prefix)).all()
    max_seq = 0
    for row in rows:
        try:
            max_seq = max(max_seq, int(row.card_id.split("-")[-1]))
        except (ValueError, IndexError):
            continue
    return f"{prefix}{max_seq + 1:06d}"


def count_cards_for_player(db: Session, player_id: int) -> int:
    return int(db.query(func.count(Card.id)).filter(Card.player_id == player_id).scalar() or 0)


def create_card_row(
    db: Session,
    *,
    card_id: str,
    player_id: int,
    player_name: str,
    team_name: str,
    position: str,
    jersey_number: str,
    grad_year: str,
    tier: str,
    theme: str,
    rarity: str,
    edition_number: int,
    print_run: int,
    image_url: str,
    shareable_slug: str,
    style: str,
    special_theme: str | None,
    owner_name: str,
    owner_id: int | None,
    creator_user_id: int | None = None,
    status: str = "active",
    preview_session_id: str | None = None,
    draft_metadata: str | None = None,
    action_category: str | None = None,
    player_photo_url: str | None = None,
    photo_notes: str | None = None,
    animation_scenario_id: str | None = None,
    commit: bool = True,
) -> Card:
    creator = creator_user_id if creator_user_id is not None else owner_id
    row = Card(
        card_id=card_id,
        player_id=player_id,
        player_name=player_name,
        team_name=team_name,
        position=position,
        jersey_number=jersey_number,
        grad_year=grad_year,
        tier=tier,
        theme=theme,
        rarity=rarity,
        edition_number=edition_number,
        print_run=print_run,
        image_url=image_url,
        shareable_slug=shareable_slug,
        style=style,
        special_theme=special_theme,
        owner_name=owner_name,
        owner_id=owner_id,
        creator_user_id=creator,
        status=(status or "active").strip() or "active",
        preview_session_id=preview_session_id,
        draft_metadata=draft_metadata,
        action_category=action_category,
        player_photo_url=(player_photo_url or "").strip() or None,
        photo_notes=(photo_notes or "").strip()[:200] or None,
        animation_scenario_id=(animation_scenario_id or "").strip() or None,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
        db.refresh(row)
    return row


def card_to_dict(card: Card, db: Session | None = None) -> dict:
    """Shape expected by existing Pydantic Card / CardVaultSummary responses."""
    created = card.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    created_iso = created.isoformat()
    gy = card.grad_year or "0"
    try:
        grad_year_int = int(gy)
    except ValueError:
        grad_year_int = 2000
    st = getattr(card, "status", None) or "active"
    d = {
        "id": card.id,
        "card_id": card.card_id,
        "player_id": card.player_id,
        "player_name": card.player_name,
        "team_name": card.team_name,
        "position": card.position or "",
        "jersey_number": card.jersey_number or "",
        "grad_year": grad_year_int,
        "tier": card.tier,
        "theme": card.theme,
        "rarity": card.rarity,
        "edition_number": card.edition_number,
        "print_run": card.print_run,
        "created_at": created_iso,
        "image_url": card.image_url,
        "shareable_slug": card.shareable_slug,
        "style": card.style,
        "special_theme": card.special_theme,
        "owner_name": card.owner_name,
        "owner_id": card.owner_id,
        "status": st,
        "trade_offered_to": getattr(card, "trade_offered_to", None),
        "pending_trade_offer_id": None,
    }
    if db is not None and st == "pending_trade":
        from trade_repo import pending_offer_id_for_card

        d["pending_trade_offer_id"] = pending_offer_id_for_card(db, card.id)
    d.update(animation_fields_for_card(card))
    d.update(highlight_fields_for_card(card))
    return d


def animation_fields_for_card(card: Card) -> dict:
    return {
        "is_animated": bool(getattr(card, "is_animated", False)),
        "animated_video_url": getattr(card, "animated_video_url", None) or None,
        "animation_status": getattr(card, "animation_status", None),
        "animation_motion": getattr(card, "animation_motion", None),
        "action_category": getattr(card, "action_category", None) or None,
        "player_photo_url": getattr(card, "player_photo_url", None) or None,
        "photo_notes": getattr(card, "photo_notes", None) or None,
        "animation_scenario_id": getattr(card, "animation_scenario_id", None) or None,
    }


def player_photo_url_for_card(card: Card) -> str | None:
    """Original uploaded player photo URL used as Runway promptImage source."""
    url = (getattr(card, "player_photo_url", None) or "").strip()
    if url:
        return url
    draft = _parse_draft_metadata(getattr(card, "draft_metadata", None))
    fallback = (draft.get("player_image_url") or draft.get("player_photo_url") or "").strip()
    return fallback or None


def photo_notes_for_card(card: Card) -> str | None:
    notes = (getattr(card, "photo_notes", None) or "").strip()
    if notes:
        return notes[:200]
    draft = _parse_draft_metadata(getattr(card, "draft_metadata", None))
    draft_notes = (draft.get("photo_notes") or "").strip()
    return draft_notes[:200] if draft_notes else None


def animation_scenario_id_for_card(card: Card) -> str | None:
    scenario_id = (getattr(card, "animation_scenario_id", None) or "").strip()
    if scenario_id:
        return scenario_id
    draft = _parse_draft_metadata(getattr(card, "draft_metadata", None))
    draft_scenario = (draft.get("animation_scenario_id") or "").strip()
    return draft_scenario or None


def highlight_fields_for_card(card: Card) -> dict:
    uploaded = getattr(card, "highlight_uploaded_at", None)
    trim_start = getattr(card, "highlight_trim_start", None)
    trim_end = getattr(card, "highlight_trim_end", None)
    return {
        "is_highlight": bool(getattr(card, "is_highlight", False)),
        "highlight_video_url": getattr(card, "highlight_video_url", None) or None,
        "highlight_thumbnail_url": getattr(card, "highlight_thumbnail_url", None) or None,
        "highlight_status": getattr(card, "highlight_status", None),
        "highlight_uploaded_at": uploaded.isoformat() if uploaded is not None else None,
        "highlight_trim_start": float(trim_start) if trim_start is not None else None,
        "highlight_trim_end": float(trim_end) if trim_end is not None else None,
    }


def list_all_cards_dicts(db: Session) -> list[dict]:
    rows = db.query(Card).order_by(Card.created_at.desc()).all()
    return [card_to_dict(r, db) for r in rows]


def list_my_cards_dicts(db: Session, owner_id: int) -> list[dict]:
    """Cards in the user's collection — excludes studio previews and discarded variants."""
    rows = (
        db.query(Card)
        .filter(owned_collection_filter(owner_id))
        .order_by(Card.created_at.desc())
        .all()
    )
    return [card_to_dict(r, db) for r in rows]


def _image_urls_match(a: str | None, b: str | None) -> bool:
    sa = (a or "").strip()
    sb = (b or "").strip()
    if not sa or not sb:
        return False
    if sa == sb:
        return True
    return sa.endswith(sb) or sb.endswith(sa)


def finalize_order_preview(
    db: Session,
    *,
    owner_id: int,
    final_image_url: str,
    generated_card_ids: list[str],
) -> str | None:
    """
    Promote the chosen preview to active; mark other order previews discarded.
    Returns the activated card_id, if any.
    """
    selected_id: str | None = None
    for cid in generated_card_ids:
        if not cid:
            continue
        card = get_card_by_card_id(db, cid)
        if card is None or card.owner_id != owner_id:
            continue
        if _image_urls_match(card.image_url, final_image_url):
            selected_id = cid
            break

    for cid in generated_card_ids:
        if not cid:
            continue
        card = get_card_by_card_id(db, cid)
        if card is None or card.owner_id != owner_id:
            continue
        if cid == selected_id or (selected_id is None and _image_urls_match(card.image_url, final_image_url)):
            card.status = "active"
            if selected_id is None:
                selected_id = cid
        elif (card.status or "") == "preview":
            card.status = "discarded"

    db.commit()
    return selected_id


def get_card_by_card_id(db: Session, canonical_id: str) -> Card | None:
    return db.query(Card).filter(Card.card_id == canonical_id).first()


ANIMATED_UPGRADE_STYLE_PREFIX = "animated-from:"


def animated_upgrade_source_card_id(card: Card) -> str | None:
    style = (card.style or "").strip()
    if not style.startswith(ANIMATED_UPGRADE_STYLE_PREFIX):
        return None
    return style[len(ANIMATED_UPGRADE_STYLE_PREFIX) :].strip() or None


def create_animated_upgrade_card(
    db: Session,
    *,
    source: Card,
    motion_id: str,
    action_category: str | None = None,
) -> Card:
    """
    Clone a static card into a new 1/1 animated edition; source row is unchanged.
    """
    new_id = next_collectible_card_id(db)
    slug = new_id.lower()
    row = create_card_row(
        db,
        card_id=new_id,
        player_id=source.player_id,
        player_name=source.player_name,
        team_name=source.team_name,
        position=source.position or "",
        jersey_number=source.jersey_number or "",
        grad_year=str(source.grad_year or ""),
        tier=source.tier,
        theme=source.theme or "none",
        rarity=source.rarity,
        edition_number=1,
        print_run=1,
        image_url=source.image_url,
        shareable_slug=slug,
        style=f"{ANIMATED_UPGRADE_STYLE_PREFIX}{source.card_id}",
        special_theme=source.special_theme,
        owner_name=source.owner_name,
        owner_id=source.owner_id,
        creator_user_id=getattr(source, "creator_user_id", None) or source.owner_id,
        status="active",
        commit=False,
    )
    row.is_animated = True
    row.animation_status = "pending"
    row.animation_motion = motion_id
    row.action_category = action_category
    row.animation_requested_at = utcnow()
    row.animation_completed_at = None
    row.animated_video_url = None
    row.player_photo_url = getattr(source, "player_photo_url", None) or player_photo_url_for_card(source)
    row.photo_notes = getattr(source, "photo_notes", None) or photo_notes_for_card(source)
    row.animation_scenario_id = (
        getattr(source, "animation_scenario_id", None) or animation_scenario_id_for_card(source)
    )
    db.commit()
    db.refresh(row)
    return row


def list_print_family_for_owner_image(db: Session, owner_id: int, image_url: str) -> list[Card]:
    return (
        db.query(Card)
        .filter(Card.owner_id == owner_id, Card.image_url == image_url)
        .order_by(Card.edition_number.asc(), Card.id.asc())
        .all()
    )


def list_cards_by_image_url_dicts(db: Session, image_url: str) -> list[dict]:
    rows = (
        db.query(Card)
        .filter(Card.image_url == image_url)
        .order_by(Card.edition_number.asc(), Card.id.asc())
        .all()
    )
    return [card_to_dict(r, db) for r in rows]


def expand_print_run_for_owner_image(
    db: Session,
    *,
    template: Card,
    target_quantity: int,
) -> list[Card]:
    """
    Grow the owner's print run for this image to target_quantity (1–100).
    Updates print_run on all existing family rows, appends new rows with new card_ids.
    Returns only newly created Card ORM rows (empty if already at target).
    """
    validate_print_run_quantity(target_quantity)
    family = list_print_family_for_owner_image(db, template.owner_id, template.image_url)
    n = len(family)
    if target_quantity < n:
        raise ValueError("cannot_reduce")
    if target_quantity == n:
        return []
    to_add = target_quantity - n
    for c in family:
        c.print_run = target_quantity
    new_rows: list[Card] = []
    for k in range(to_add):
        edition = n + 1 + k
        nid = next_collectible_card_id(db)
        slug = nid.lower()
        row = create_card_row(
            db,
            card_id=nid,
            player_id=template.player_id,
            player_name=template.player_name,
            team_name=template.team_name,
            position=template.position or "",
            jersey_number=template.jersey_number or "",
            grad_year=str(template.grad_year or ""),
            tier=template.tier,
            theme=template.theme or "none",
            rarity=template.rarity,
            edition_number=edition,
            print_run=target_quantity,
            image_url=template.image_url,
            shareable_slug=slug,
            style=template.style,
            special_theme=template.special_theme,
            owner_name=template.owner_name,
            owner_id=template.owner_id,
            creator_user_id=getattr(template, "creator_user_id", None) or template.owner_id,
            commit=False,
        )
        new_rows.append(row)
    db.commit()
    for r in new_rows:
        db.refresh(r)
    return new_rows


def list_cards_for_player_dicts(db: Session, player_id: int) -> list[dict]:
    rows = (
        db.query(Card)
        .filter(Card.player_id == player_id)
        .order_by(Card.created_at.desc())
        .all()
    )
    return [card_to_dict(r, db) for r in rows]


def _pending_cutoff() -> datetime:
    return utcnow() - timedelta(hours=PENDING_CARD_TTL_HOURS)


def _card_created_at(card: Card) -> datetime:
    created = card.created_at
    if created.tzinfo is None:
        return created.replace(tzinfo=timezone.utc)
    return created


def _parse_draft_metadata(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def _vault_tier_to_order_tier(vault_tier: str) -> str:
    mapping = {
        "rookie": "rookie",
        "allstar": "all_star",
        "legends": "legends",
    }
    return mapping.get(str(vault_tier or "").lower(), "rookie")


def _fallback_session_key(card: Card) -> str:
    created = _card_created_at(card)
    bucket = created.strftime("%Y%m%d%H")
    return f"legacy-{card.player_id}-{bucket}"


def list_pending_preview_cards(db: Session, owner_id: int) -> list[Card]:
    cutoff = _pending_cutoff()
    return (
        db.query(Card)
        .filter(
            Card.owner_id == owner_id,
            Card.status == "preview",
            Card.created_at >= cutoff,
        )
        .order_by(Card.created_at.desc())
        .all()
    )


def _app_data_root() -> Path:
    base = (os.environ.get("APP_DATA_DIR") or "").strip() or "./data"
    return Path(base).expanduser().resolve()


def _canonical_pending_card_id(card_id: str | None) -> str | None:
    s = (card_id or "").strip()
    if not _CARD_ID_PATTERN.match(s):
        return None
    parts = s.upper().split("-")
    return f"FL-{parts[1]}-{parts[2]}"


def _pending_preview_image_available(image_url: str | None) -> bool:
    """True when the preview image URL is present and backed by a local file (if applicable)."""
    s = (image_url or "").strip()
    if not s:
        return False
    if s.startswith("http://") or s.startswith("https://"):
        return True
    from utils.storage import is_r2_public_url

    if is_r2_public_url(s):
        return True
    root = _app_data_root()
    filename = s.rsplit("/", 1)[-1]
    if not filename:
        return False
    if "/media/cards/" in s or s.startswith("/media/cards/"):
        return (root / "cards" / filename).is_file()
    if "/uploads/" in s or s.startswith("/uploads/"):
        return (root / "uploads" / filename).is_file()
    return False


def _pending_card_is_retrievable(db: Session, card: Card) -> bool:
    key = _canonical_pending_card_id(card.card_id)
    if key is None:
        return False
    row = get_card_by_card_id(db, key)
    return row is not None and row.id == card.id and row.owner_id == card.owner_id


def _pending_card_is_resumable(card: Card) -> bool:
    """Studio resume flow requires a persisted session id or full draft metadata."""
    session_id = (getattr(card, "preview_session_id", None) or "").strip()
    if session_id:
        return True
    draft = _parse_draft_metadata(getattr(card, "draft_metadata", None))
    player_image = (draft.get("player_image_url") or "").strip()
    player_name = (draft.get("player_first_name") or draft.get("player_display_name") or "").strip()
    return bool(player_image and player_name)


def pending_card_validation_errors(db: Session, card: Card) -> list[str]:
    """Human-readable reasons a preview card cannot be resumed."""
    errors: list[str] = []
    if (card.status or "") != "preview":
        errors.append("not_preview")
    if not card.owner_id:
        errors.append("no_owner")
    if not _canonical_pending_card_id(card.card_id):
        errors.append("invalid_card_id")
    if not (card.image_url or "").strip():
        errors.append("missing_image_url")
    elif not _pending_preview_image_available(card.image_url):
        errors.append("image_unavailable")
    if not (card.player_name or "").strip():
        errors.append("missing_player_name")
    if not _pending_card_is_retrievable(db, card):
        errors.append("not_retrievable")
    if not _pending_card_is_resumable(card):
        errors.append("not_resumable")
    return errors


def discard_preview_cards(db: Session, cards: list[Card], *, owner_id: int | None = None) -> int:
    """Mark preview rows discarded so they never surface as pending again."""
    updated = 0
    for card in cards:
        if (card.status or "") != "preview":
            continue
        card.status = "discarded"
        updated += 1
        if owner_id is not None:
            logger.info("Card %s discarded by user %s", card.card_id, owner_id)
    if updated:
        db.commit()
    return updated


def discard_preview_cards_by_ids(
    db: Session,
    *,
    owner_id: int,
    card_ids: list[str],
) -> int:
    """Discard preview cards by collectible id (most reliable for studio discard)."""
    keys: list[str] = []
    for raw in card_ids:
        key = _canonical_pending_card_id(raw)
        if key:
            keys.append(key)
    if not keys:
        return 0
    cards = (
        db.query(Card)
        .filter(
            Card.owner_id == owner_id,
            Card.status == "preview",
            Card.card_id.in_(keys),
        )
        .all()
    )
    return discard_preview_cards(db, cards, owner_id=owner_id)


def validate_and_cleanup_pending_cards(db: Session, owner_id: int) -> list[Card]:
    """Drop invalid or non-resumable preview rows (auto-discard) and return valid cards."""
    cards = list_pending_preview_cards(db, owner_id)
    valid: list[Card] = []
    invalid: list[Card] = []
    for card in cards:
        if pending_card_validation_errors(db, card):
            invalid.append(card)
        else:
            valid.append(card)
    if invalid:
        discard_preview_cards(db, invalid)
    return valid


def _group_pending_sessions(cards: list[Card]) -> dict[str, list[Card]]:
    groups: dict[str, list[Card]] = {}
    for card in cards:
        key = (getattr(card, "preview_session_id", None) or "").strip() or _fallback_session_key(card)
        groups.setdefault(key, []).append(card)
    for key in groups:
        groups[key].sort(key=_card_created_at, reverse=True)
    return groups


def _build_pending_session_payload(session_cards: list[Card], session_id: str) -> dict:
    session_cards = sorted(session_cards, key=_card_created_at, reverse=True)
    anchor = session_cards[0]
    draft = _parse_draft_metadata(getattr(anchor, "draft_metadata", None))
    if not draft:
        draft = {
            "customer_name": anchor.owner_name or "",
            "player_team_name": anchor.team_name or "",
            "player_jersey_number": anchor.jersey_number or "",
            "player_position": anchor.position or "",
            "player_grad_year": int(anchor.grad_year or 2000),
            "player_image_url": "",
            "tier": _vault_tier_to_order_tier(anchor.tier),
            "card_type": "standard",
            "special_theme": anchor.special_theme,
        }
        if anchor.player_name:
            parts = str(anchor.player_name).split(" ", 1)
            draft["player_first_name"] = parts[0]
            draft["player_last_name"] = parts[1] if len(parts) > 1 else "N/A"
    if not draft.get("photo_notes") and getattr(anchor, "photo_notes", None):
        draft["photo_notes"] = anchor.photo_notes or ""
    if not draft.get("animation_scenario_id") and getattr(anchor, "animation_scenario_id", None):
        draft["animation_scenario_id"] = anchor.animation_scenario_id or ""

    previews = []
    for card in sorted(session_cards, key=_card_created_at):
        previews.append(
            {
                "card_id": card.card_id,
                "image_url": card.image_url,
                "tier": card.rarity or "base",
                "created_at": _card_created_at(card).isoformat(),
                "edition_number": card.edition_number,
                "print_run": card.print_run,
                "owner_name": card.owner_name,
                "player_name": card.player_name,
                "team_name": card.team_name,
                "special_theme": card.special_theme,
                "rarity": card.rarity,
                "status": card.status or "preview",
            }
        )

    newest_created = _card_created_at(anchor)
    expires_at = newest_created + timedelta(hours=PENDING_CARD_TTL_HOURS)
    resolved_session_id = (getattr(anchor, "preview_session_id", None) or "").strip() or session_id

    return {
        "preview_session_id": resolved_session_id,
        "expires_at": expires_at.isoformat(),
        "draft": draft,
        "preview_count": len(previews),
        "preview_limit": 3,
        "previews": previews,
    }


def get_latest_pending_session(db: Session, owner_id: int) -> dict | None:
    """Return the most recent unfinished preview session for a user, if any."""
    cards = validate_and_cleanup_pending_cards(db, owner_id)
    if not cards:
        return None

    groups = _group_pending_sessions(cards)
    newest_session_key = max(
        groups.keys(),
        key=lambda k: _card_created_at(groups[k][0]),
    )
    session_cards = groups[newest_session_key]
    payload = _build_pending_session_payload(session_cards, newest_session_key)
    if not payload.get("previews"):
        discard_preview_cards(db, session_cards)
        return None
    return payload


def get_pending_session_by_id(db: Session, owner_id: int, preview_session_id: str) -> dict | None:
    """Return a pending session by id, or None if expired/missing."""
    validate_and_cleanup_pending_cards(db, owner_id)
    cards = pending_session_cards(db, owner_id=owner_id, preview_session_id=preview_session_id)
    if not cards:
        return None

    invalid = [c for c in cards if pending_card_validation_errors(db, c)]
    if invalid:
        discard_preview_cards(db, invalid)
    invalid_ids = {c.id for c in invalid}
    cards = [c for c in cards if c.id not in invalid_ids]
    if not cards:
        return None

    return _build_pending_session_payload(cards, preview_session_id)


def discard_pending_session(
    db: Session,
    *,
    owner_id: int,
    preview_session_id: str | None = None,
    card_ids: list[str] | None = None,
) -> int:
    """Mark all preview cards in a session as discarded. Returns count updated."""
    updated = 0
    if card_ids:
        updated += discard_preview_cards_by_ids(db, owner_id=owner_id, card_ids=card_ids)

    if not preview_session_id:
        return updated

    target = preview_session_id.strip()
    direct = (
        db.query(Card)
        .filter(
            Card.owner_id == owner_id,
            Card.status == "preview",
            Card.preview_session_id == target,
        )
        .all()
    )
    if direct:
        updated += discard_preview_cards(db, direct, owner_id=owner_id)
        return updated

    cards = (
        db.query(Card)
        .filter(
            Card.owner_id == owner_id,
            Card.status == "preview",
        )
        .all()
    )
    to_discard: list[Card] = []
    for card in cards:
        card_session = (getattr(card, "preview_session_id", None) or "").strip() or _fallback_session_key(
            card
        )
        if card_session == target:
            to_discard.append(card)
    updated += discard_preview_cards(db, to_discard, owner_id=owner_id)
    return updated


def pending_session_cards(
    db: Session,
    *,
    owner_id: int,
    preview_session_id: str,
) -> list[Card]:
    cards = list_pending_preview_cards(db, owner_id)
    return [
        c
        for c in cards
        if ((getattr(c, "preview_session_id", None) or "").strip() or _fallback_session_key(c))
        == preview_session_id
    ]
