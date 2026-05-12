"""PostgreSQL persistence for collectible cards."""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Card


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
) -> Card:
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
    )
    db.add(row)
    db.commit()
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
    return d


def list_all_cards_dicts(db: Session) -> list[dict]:
    rows = db.query(Card).order_by(Card.created_at.desc()).all()
    return [card_to_dict(r, db) for r in rows]


def list_my_cards_dicts(db: Session, owner_id: int) -> list[dict]:
    rows = (
        db.query(Card)
        .filter(Card.owner_id == owner_id)
        .order_by(Card.created_at.desc())
        .all()
    )
    return [card_to_dict(r, db) for r in rows]


def get_card_by_card_id(db: Session, canonical_id: str) -> Card | None:
    return db.query(Card).filter(Card.card_id == canonical_id).first()


def list_cards_for_player_dicts(db: Session, player_id: int) -> list[dict]:
    rows = (
        db.query(Card)
        .filter(Card.player_id == player_id)
        .order_by(Card.created_at.desc())
        .all()
    )
    return [card_to_dict(r, db) for r in rows]
