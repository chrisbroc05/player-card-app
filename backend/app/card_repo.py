"""PostgreSQL persistence for collectible cards."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Card, utcnow

PRINT_RUN_ALLOWED_QUANTITIES = frozenset({1, 2, 5, 10})


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
    return d


def animation_fields_for_card(card: Card) -> dict:
    return {
        "is_animated": bool(getattr(card, "is_animated", False)),
        "animated_video_url": getattr(card, "animated_video_url", None) or None,
        "animation_status": getattr(card, "animation_status", None),
        "animation_motion": getattr(card, "animation_motion", None),
    }


def list_all_cards_dicts(db: Session) -> list[dict]:
    rows = db.query(Card).order_by(Card.created_at.desc()).all()
    return [card_to_dict(r, db) for r in rows]


def list_my_cards_dicts(db: Session, owner_id: int) -> list[dict]:
    """Cards in the user's collection — excludes studio previews and discarded variants."""
    rows = (
        db.query(Card)
        .filter(
            Card.owner_id == owner_id,
            Card.status.in_(["active", "pending_trade"]),
        )
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
    row.animation_requested_at = utcnow()
    row.animation_completed_at = None
    row.animated_video_url = None
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
    Grow the owner's print run for this image to target_quantity (allowed: 1,2,5,10).
    Updates print_run on all existing family rows, appends new rows with new card_ids.
    Returns only newly created Card ORM rows (empty if already at target).
    """
    if target_quantity not in PRINT_RUN_ALLOWED_QUANTITIES:
        raise ValueError("invalid_quantity")
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
