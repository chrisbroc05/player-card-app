"""Marketplace balance ledger, Stripe transfers, payouts, and platform revenue."""

from __future__ import annotations

import logging
import os
from decimal import Decimal

import stripe
from fastapi import HTTPException
from sqlalchemy.orm import Session

from credit_service import TX_CARD_PURCHASE, TX_CARD_SALE, TX_REFUND, TX_TOP_UP, TX_WITHDRAWAL
from marketplace_repo import compute_royalty_amount, float_from_decimal, royalty_rate_percent_label
from models import Card, CreditLedger, MarketplaceOffer, PlatformRevenueLedger, ProcessedStripeEvent, User, utcnow
from stripe_connect import configure_stripe_client, ensure_connect_account, sync_connect_account_status

logger = logging.getLogger(__name__)

BALANCE_TYPE_MARKETPLACE = "marketplace"
REVENUE_SOURCE_MARKETPLACE_SALE = "marketplace_sale"
REVENUE_SOURCE_MARKETPLACE_TOPUP = "marketplace_topup"


class InsufficientMarketplaceBalanceError(ValueError):
    pass


class UserNotFoundError(ValueError):
    pass


def _decimal_amount(amount: Decimal | float | int | str) -> Decimal:
    return Decimal(str(amount)).quantize(Decimal("0.01"))


def _marketplace_balance(user: User) -> Decimal:
    return _decimal_amount(getattr(user, "marketplace_balance", None) or Decimal("0.00"))


def _lock_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).with_for_update().first()
    if user is None:
        raise UserNotFoundError(f"User not found: {user_id}")
    return user


def _append_marketplace_ledger(
    db: Session,
    *,
    user_id: int,
    amount: Decimal,
    balance_after: Decimal,
    transaction_type: str,
    reference_id: str | None,
    note: str | None,
) -> CreditLedger:
    row = CreditLedger(
        user_id=user_id,
        amount=amount,
        balance_after=balance_after,
        transaction_type=transaction_type,
        reference_id=(reference_id or "").strip() or None,
        note=(note or "").strip() or None,
        balance_type=BALANCE_TYPE_MARKETPLACE,
        created_at=utcnow(),
    )
    db.add(row)
    return row


def get_marketplace_balance(db: Session, user_id: int) -> Decimal:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise UserNotFoundError(f"User not found: {user_id}")
    return _marketplace_balance(user)


def add_marketplace_balance(
    db: Session,
    user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    *,
    reference_id: str | None = None,
    note: str | None = None,
) -> CreditLedger:
    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise ValueError("Amount must be greater than zero")
    user = _lock_user(db, user_id)
    new_balance = _marketplace_balance(user) + amt
    user.marketplace_balance = new_balance
    return _append_marketplace_ledger(
        db,
        user_id=user_id,
        amount=amt,
        balance_after=new_balance,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )


def deduct_marketplace_balance(
    db: Session,
    user_id: int,
    amount: Decimal | float,
    transaction_type: str,
    *,
    reference_id: str | None = None,
    note: str | None = None,
) -> CreditLedger:
    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise ValueError("Amount must be greater than zero")
    user = _lock_user(db, user_id)
    current = _marketplace_balance(user)
    if current < amt:
        raise InsufficientMarketplaceBalanceError("Insufficient marketplace balance")
    new_balance = current - amt
    user.marketplace_balance = new_balance
    return _append_marketplace_ledger(
        db,
        user_id=user_id,
        amount=-amt,
        balance_after=new_balance,
        transaction_type=transaction_type,
        reference_id=reference_id,
        note=note,
    )


def record_platform_revenue(
    db: Session,
    *,
    amount: Decimal | float,
    source: str,
    reference_id: str | None,
    note: str | None,
) -> PlatformRevenueLedger:
    amt = _decimal_amount(amount)
    if amt <= Decimal("0.00"):
        raise ValueError("Platform revenue amount must be greater than zero")
    row = PlatformRevenueLedger(
        amount=amt,
        source=source,
        reference_id=(reference_id or "").strip() or None,
        note=(note or "").strip() or None,
        created_at=utcnow(),
    )
    db.add(row)
    logger.info(
        "Platform revenue recorded: $%s source=%s reference=%s",
        amt,
        source,
        reference_id,
    )
    return row


def _stripe_session_already_processed(db: Session, session_id: str) -> bool:
    ref = (session_id or "").strip()
    if not ref:
        return False
    try:
        if (
            db.query(ProcessedStripeEvent.id)
            .filter(ProcessedStripeEvent.event_id == f"checkout:{ref}")
            .first()
            is not None
        ):
            return True
    except Exception as exc:
        logger.warning("Could not query processed_stripe_events for %s: %s", ref, exc)
        db.rollback()

    try:
        q = db.query(CreditLedger.id).filter(
            CreditLedger.reference_id == ref,
            CreditLedger.amount > Decimal("0.00"),
            CreditLedger.transaction_type == TX_TOP_UP,
        )
        if hasattr(CreditLedger, "balance_type"):
            q = q.filter(CreditLedger.balance_type == BALANCE_TYPE_MARKETPLACE)
        return q.first() is not None
    except Exception as exc:
        logger.warning("Could not query credit_ledger idempotency for %s: %s", ref, exc)
        db.rollback()
        return False


def apply_marketplace_stripe_checkout(
    db: Session,
    *,
    session_id: str,
    recipient_user_id: int,
    amount_dollars: Decimal | float,
) -> None:
    """Credit marketplace balance after Stripe Checkout; idempotent per session id."""
    logger.info(
        "apply_marketplace_stripe_checkout session=%s recipient=%s amount=%s",
        session_id,
        recipient_user_id,
        amount_dollars,
    )
    if _stripe_session_already_processed(db, session_id):
        logger.info("Marketplace checkout session already processed: %s", session_id)
        return

    recipient = db.query(User).filter(User.id == recipient_user_id).first()
    if recipient is None:
        raise UserNotFoundError(f"Recipient user not found: {recipient_user_id}")

    amt = _decimal_amount(amount_dollars)
    add_marketplace_balance(
        db,
        recipient_user_id,
        amt,
        TX_TOP_UP,
        reference_id=session_id,
        note="Marketplace funds loaded via Stripe",
    )
    db.add(
        ProcessedStripeEvent(
            event_id=f"checkout:{session_id}",
            event_type="checkout.session.completed",
            processed_at=utcnow(),
        )
    )


def _decimal_to_cents(amount: Decimal) -> int:
    return int((amount * Decimal("100")).quantize(Decimal("1")))


def _connect_available_cents(stripe_account_id: str) -> int:
    """USD cents currently available on a connected Express account (from prior sale transfers)."""
    configure_stripe_client()
    balance = stripe.Balance.retrieve(stripe_account=stripe_account_id)
    total = 0
    for entry in balance.available or []:
        if getattr(entry, "currency", None) == "usd":
            total += int(getattr(entry, "amount", 0) or 0)
    return total


def _create_sale_transfer(
    *,
    seller: User,
    offer: MarketplaceOffer,
    card: Card,
    net_amount: Decimal,
    fee_amount: Decimal,
    gross_amount: Decimal,
) -> str | None:
    stripe_account_id = (seller.stripe_account_id or "").strip()
    if not stripe_account_id:
        logger.error(
            "Cannot transfer sale proceeds: seller %s has no Connect account (offer %s)",
            seller.id,
            offer.id,
        )
        return None

    net_cents = _decimal_to_cents(net_amount)
    if net_cents <= 0:
        return None

    configure_stripe_client()
    transfer = stripe.Transfer.create(
        amount=net_cents,
        currency="usd",
        destination=stripe_account_id,
        transfer_group=f"offer_{offer.id}",
        description=f"Marketplace sale for {card.card_id}",
        metadata={
            "offer_id": str(offer.id),
            "card_id": card.card_id,
            "buyer_id": str(offer.buyer_id),
            "seller_id": str(seller.id),
            "gross_cents": str(_decimal_to_cents(gross_amount)),
            "fee_cents": str(_decimal_to_cents(fee_amount)),
            "net_cents": str(net_cents),
        },
    )
    transfer_id = getattr(transfer, "id", None)
    logger.info(
        "TRANSFER created: $%.2f to %s for offer %s (transfer_id=%s)",
        net_cents / 100,
        stripe_account_id,
        offer.id,
        transfer_id,
    )
    return transfer_id


def settle_marketplace_cash_sale(
    db: Session,
    *,
    offer: MarketplaceOffer,
    card: Card,
    buyer_id: int,
    seller_id: int,
    amount_decimal: Decimal,
) -> tuple[User, User, float, float, float, float, float, str | None]:
    """
    Settle a cash marketplace sale:
    - Deduct gross from buyer marketplace_balance
    - Credit net to seller marketplace_balance
    - Record platform fee in platform_revenue_ledger
    - Transfer net to seller Connect account
    """
    buyer = _lock_user(db, buyer_id)
    seller = _lock_user(db, seller_id)

    gross = _decimal_amount(amount_decimal)
    fee = compute_royalty_amount(gross)
    net = _decimal_amount(gross - fee)

    if _marketplace_balance(buyer) < gross:
        raise InsufficientMarketplaceBalanceError("Buyer has insufficient marketplace balance")

    stripe_account_id = (seller.stripe_account_id or "").strip()
    if not stripe_account_id:
        raise HTTPException(
            status_code=400,
            detail="Seller has not connected a Stripe account. Sale cannot complete.",
        )

    if not bool(getattr(seller, "stripe_charges_enabled", False)):
        raise HTTPException(
            status_code=400,
            detail="Seller must complete Stripe onboarding before receiving marketplace payments.",
        )

    buyer_row = deduct_marketplace_balance(
        db,
        buyer.id,
        gross,
        TX_CARD_PURCHASE,
        reference_id=str(offer.id),
        note=f"Purchased {card.player_name} ({card.card_id})",
    )
    seller_row = add_marketplace_balance(
        db,
        seller.id,
        net,
        TX_CARD_SALE,
        reference_id=str(offer.id),
        note=f"Sold {card.player_name} ({card.card_id}) — net after {royalty_rate_percent_label()} fee",
    )
    record_platform_revenue(
        db,
        amount=fee,
        source=REVENUE_SOURCE_MARKETPLACE_SALE,
        reference_id=str(offer.id),
        note=(
            f"{royalty_rate_percent_label()} marketplace fee — "
            f"{buyer.display_name} purchased {card.player_name} ({card.card_id}) "
            f"from {seller.display_name} for ${float_from_decimal(gross):.2f}"
        ),
    )

    offer.royalty_amount = fee
    transfer_id = _create_sale_transfer(
        seller=seller,
        offer=offer,
        card=card,
        net_amount=net,
        fee_amount=fee,
        gross_amount=gross,
    )

    return (
        buyer,
        seller,
        float_from_decimal(gross),
        float_from_decimal(fee),
        float_from_decimal(net),
        float_from_decimal(buyer_row.balance_after),
        float_from_decimal(seller_row.balance_after),
        transfer_id,
    )


def initiate_marketplace_withdrawal(
    db: Session,
    user: User,
    amount: Decimal | float,
) -> tuple[CreditLedger, str]:
    """Deduct marketplace balance and create a Stripe payout on the user's Connect account."""
    amt = _decimal_amount(amount)
    if amt < Decimal("5.00"):
        raise ValueError("Minimum withdrawal is $5.00")

    sync_connect_account_status(db, user)
    if not user.stripe_payouts_enabled:
        raise HTTPException(
            status_code=400,
            detail="Complete Stripe onboarding and connect a bank account before withdrawing.",
        )
    stripe_account_id = (user.stripe_account_id or "").strip()
    if not stripe_account_id:
        raise HTTPException(
            status_code=400,
            detail="No Stripe Connect account. Connect your account before withdrawing.",
        )

    amount_cents = _decimal_to_cents(amt)
    available_cents = _connect_available_cents(stripe_account_id)
    if amount_cents > available_cents:
        available_dollars = Decimal(str(available_cents)) / Decimal("100")
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only sale earnings in your connected Stripe account can be withdrawn "
                f"(${float_from_decimal(available_dollars):.2f} available). "
                "Funds loaded for marketplace purchases stay in your spending balance and "
                "cannot be paid out to your bank."
            ),
        )

    row = deduct_marketplace_balance(
        db,
        user.id,
        amt,
        TX_WITHDRAWAL,
        reference_id=None,
        note="Marketplace withdrawal initiated — pending Stripe payout",
    )

    logger.info(
        "WITHDRAW initiating payout from Connect account: user=%s amount=$%s account=%s available_cents=%s",
        user.id,
        amt,
        stripe_account_id,
        available_cents,
    )
    payout = stripe.Payout.create(
        amount=amount_cents,
        currency="usd",
        stripe_account=stripe_account_id,
        metadata={"user_id": str(user.id), "marketplace_balance_after": str(row.balance_after)},
    )
    payout_id = getattr(payout, "id", None) or ""
    row.reference_id = payout_id
    row.note = f"Marketplace withdrawal to bank (payout {payout_id})"
    logger.info("WITHDRAW payout created: payout_id=%s user=%s", payout_id, user.id)
    return row, payout_id


def refund_marketplace_withdrawal(
    db: Session,
    *,
    user_id: int,
    amount: Decimal | float,
    payout_id: str,
) -> None:
    """Restore marketplace balance when a payout fails."""
    amt = _decimal_amount(amount)
    add_marketplace_balance(
        db,
        user_id,
        amt,
        TX_REFUND,
        reference_id=payout_id,
        note="Marketplace withdrawal failed — funds restored",
    )
    logger.warning(
        "WITHDRAW refund applied: user=%s amount=$%s payout=%s",
        user_id,
        amt,
        payout_id,
    )


def require_connect_account_for_marketplace(db: Session, user: User) -> str:
    """Ensure user has a Connect account before loading marketplace funds or listing."""
    try:
        return ensure_connect_account(db, user)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def require_seller_onboarding_complete(db: Session, user: User) -> None:
    """Seller must finish Stripe onboarding (charges enabled) before listing or receiving sales."""
    require_connect_account_for_marketplace(db, user)
    sync_connect_account_status(db, user)
    if not bool(getattr(user, "stripe_charges_enabled", False)):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "stripe_onboarding_incomplete",
                "message": "Complete Stripe onboarding to sell cards on the marketplace.",
            },
        )


def stripe_event_already_processed(db: Session, event_id: str) -> bool:
    eid = (event_id or "").strip()
    if not eid:
        return False
    try:
        return (
            db.query(ProcessedStripeEvent.id)
            .filter(ProcessedStripeEvent.event_id == eid)
            .first()
            is not None
        )
    except Exception as exc:
        logger.warning("Could not query processed_stripe_events for event %s: %s", eid, exc)
        db.rollback()
        return False


def mark_stripe_event_processed(db: Session, event_id: str, event_type: str) -> None:
    if stripe_event_already_processed(db, event_id):
        return
    db.add(
        ProcessedStripeEvent(
            event_id=event_id,
            event_type=event_type,
            processed_at=utcnow(),
        )
    )
