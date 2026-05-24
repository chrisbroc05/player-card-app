"""Internal credit ledger — balance mutations and history."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from models import CreditLedger, User, utcnow

TX_TOP_UP = "top_up"
TX_GIFT = "gift"
TX_CARD_PURCHASE = "card_purchase"
TX_CARD_SALE = "card_sale"
TX_ROYALTY = "royalty"
TX_GENERATION = "generation"
TX_ANIMATION = "animation"
TX_PRIORITY = "priority"
TX_WITHDRAWAL = "withdrawal"
TX_REFUND = "refund"

VALID_TRANSACTION_TYPES = frozenset(
    {
        TX_TOP_UP,
        TX_GIFT,
        TX_CARD_PURCHASE,
        TX_CARD_SALE,
        TX_ROYALTY,
        TX_GENERATION,
        TX_ANIMATION,
        TX_PRIORITY,
        TX_WITHDRAWAL,
        TX_REFUND,
    }
)


class InvalidCreditAmountError(ValueError):
    pass


class InsufficientCreditsError(ValueError):
    pass


class UserNotFoundError(ValueError):
    pass


def _decimal_amount(amount: Decimal | float | int | str) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"))


def _user_balance(user: User) -> Decimal:
    return _decimal_amount(user.credit_balance or Decimal("0.00"))


def _lock_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if user is None:
        raise UserNotFoundError(f"User not found: {user_id}")
    return user


def _append_ledger_row(
    db: Session,
    *,
    user_id: int,
    amount: Decimal,
    balance_after: Decimal,
    transaction_type: str,
    reference_id: str | None,
    note: str | None,
) -> CreditLedger:
    tx = (transaction_type or "").strip().lower()
    if tx not in VALID_TRANSACTION_TYPES:
        raise ValueError(f"Invalid transaction_type: {transaction_type}")
    row = CreditLedger(
        user_id=user_id,
        amount=amount,
        balance_after=balance_after,
        transaction_type=tx,
        reference_id=(reference_id or "").strip() or None,
        note=(note or "").strip() or None,
        created_at=utcnow(),
    )
    db.add(row)
    return row


def get_balance(db: Session, user_id: int) -> Decimal:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UserNotFoundError(f"User not found: {user_id}")
    return _user_balance(user)


def add_credits(
    db: Session,
    user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    reference_id: str | None = None,
    note: str | None = None,
    *,
    commit: bool = True,
) -> CreditLedger:
    """Add credits to a user balance and record a ledger entry."""
    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise InvalidCreditAmountError("Amount must be greater than zero")

    user = _lock_user(db, user_id)
    new_balance = _user_balance(user) + amt
    user.credit_balance = new_balance
    row = _append_ledger_row(
        db,
        user_id=user_id,
        amount=amt,
        balance_after=new_balance,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )
    if commit:
        db.commit()
        db.refresh(row)
    return row


def deduct_credits(
    db: Session,
    user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    reference_id: str | None = None,
    note: str | None = None,
    *,
    commit: bool = True,
) -> CreditLedger:
    """Deduct credits from a user balance and record a negative ledger entry."""
    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise InvalidCreditAmountError("Amount must be greater than zero")

    user = _lock_user(db, user_id)
    current = _user_balance(user)
    if current < amt:
        raise InsufficientCreditsError("Insufficient credit balance")

    new_balance = current - amt
    user.credit_balance = new_balance
    row = _append_ledger_row(
        db,
        user_id=user_id,
        amount=-amt,
        balance_after=new_balance,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )
    if commit:
        db.commit()
        db.refresh(row)
    return row


def transfer_credits(
    db: Session,
    from_user_id: int,
    to_user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    reference_id: str | None = None,
    note: str | None = None,
    *,
    commit: bool = True,
) -> tuple[CreditLedger, CreditLedger]:
    """Move credits between users in a single atomic transaction."""
    if from_user_id == to_user_id:
        raise ValueError("Cannot transfer credits to the same user")

    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise InvalidCreditAmountError("Amount must be greater than zero")

    sender = _lock_user(db, from_user_id)
    receiver = _lock_user(db, to_user_id)

    sender_balance = _user_balance(sender)
    if sender_balance < amt:
        raise InsufficientCreditsError("Insufficient credit balance")

    sender_new = sender_balance - amt
    receiver_new = _user_balance(receiver) + amt
    sender.credit_balance = sender_new
    receiver.credit_balance = receiver_new

    out_row = _append_ledger_row(
        db,
        user_id=from_user_id,
        amount=-amt,
        balance_after=sender_new,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )
    in_row = _append_ledger_row(
        db,
        user_id=to_user_id,
        amount=amt,
        balance_after=receiver_new,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )
    if commit:
        db.commit()
        db.refresh(out_row)
        db.refresh(in_row)
    return out_row, in_row


def ledger_row_dict(row: CreditLedger) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "amount": float(row.amount),
        "balance_after": float(row.balance_after),
        "transaction_type": row.transaction_type,
        "reference_id": row.reference_id or "",
        "note": row.note or "",
        "created_at": row.created_at.isoformat() if row.created_at else "",
    }


def _stripe_session_already_processed(db: Session, session_id: str) -> bool:
    return (
        db.query(CreditLedger.id)
        .filter(
            CreditLedger.reference_id == session_id,
            CreditLedger.amount > Decimal("0.00"),
        )
        .first()
        is not None
    )


def record_ledger_only(
    db: Session,
    user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    reference_id: str | None = None,
    note: str | None = None,
) -> CreditLedger:
    """Append a ledger row without changing the user's credit balance."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UserNotFoundError(f"User not found: {user_id}")
    amt = _decimal_amount(amount)
    bal = _user_balance(user)
    return _append_ledger_row(
        db,
        user_id=user_id,
        amount=amt,
        balance_after=bal,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )


def apply_stripe_checkout_credits(
    db: Session,
    *,
    session_id: str,
    purchaser_user_id: int,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> None:
    """Credit recipient after Stripe Checkout; idempotent per session id."""
    if _stripe_session_already_processed(db, session_id):
        return

    amt = _decimal_amount(amount_dollars)
    if amt <= Decimal("0.00"):
        raise InvalidCreditAmountError("Invalid Stripe checkout amount")

    is_gift = recipient_user_id != purchaser_user_id
    recipient = db.query(User).filter(User.id == recipient_user_id).first()
    if recipient is None:
        raise UserNotFoundError(f"Recipient user not found: {recipient_user_id}")

    add_credits(
        db,
        recipient_user_id,
        amt,
        TX_GIFT if is_gift else TX_TOP_UP,
        reference_id=session_id,
        note="Credits loaded via Stripe",
        commit=False,
    )

    if is_gift:
        record_ledger_only(
            db,
            purchaser_user_id,
            -amt,
            TX_GIFT,
            reference_id=session_id,
            note=f"Gift credits sent to {recipient.display_name}",
        )

    db.commit()


def get_ledger(
    db: Session,
    user_id: int,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Paginated ledger entries for a user, most recent first."""
    lim = max(1, min(int(limit), 200))
    off = max(0, int(offset))
    rows = (
        db.query(CreditLedger)
        .filter(CreditLedger.user_id == user_id)
        .order_by(CreditLedger.created_at.desc(), CreditLedger.id.desc())
        .offset(off)
        .limit(lim)
        .all()
    )
    return [ledger_row_dict(r) for r in rows]
