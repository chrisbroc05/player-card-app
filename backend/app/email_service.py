"""Resend-powered transactional emails for Prospect Legends (trading flow)."""

from __future__ import annotations

import html as html_module
import logging
import os
from typing import Any

import resend

from marketplace_repo import royalty_rate_percent_label

logger = logging.getLogger(__name__)

_api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
if _api_key:
    resend.api_key = _api_key


def frontend_url() -> str:
    return (os.environ.get("FRONTEND_URL") or "http://localhost:5173").rstrip("/")


def _from_email() -> str:
    raw = (os.environ.get("FROM_EMAIL") or "onboarding@resend.dev").strip()
    if "<" in raw:
        return raw
    return f"Prospect Legends <{raw}>"


def _public_api_base() -> str:
    """Base URL for absolute card image links (host that serves /media/cards)."""
    return (
        os.environ.get("PUBLIC_API_BASE_URL")
        or os.environ.get("API_PUBLIC_URL")
        or "https://player-card-backend.onrender.com"
    ).rstrip("/")


def _absolute_image_url(image_url: str | None) -> str | None:
    if not image_url:
        return None
    s = str(image_url).strip()
    if s.startswith("http://") or s.startswith("https://"):
        return s
    base = _public_api_base()
    if not base:
        return None
    path = s if s.startswith("/") else f"/{s}"
    return f"{base}{path}"


def _tier_label(tier: str) -> str:
    t = (tier or "").lower()
    if t == "legends":
        return "Legends"
    if t == "allstar":
        return "All-Star"
    return "Rookie"


def _tier_color(tier: str) -> str:
    t = (tier or "").lower()
    if t == "legends":
        return "#C9A84C"
    if t == "allstar":
        return "#00aaff"
    return "#ff4500"


def _rarity_label(rarity: str) -> str:
    r = (rarity or "").lower()
    if r == "legendary":
        return "Legendary"
    if r == "rare":
        return "Rare"
    return "Common"


# Canvas behind the 600px card — set on html/body + full-width tables so phone
# clients (Gmail iOS, etc.) match desktop instead of defaulting to white.
_CANVAS_BG = "#0a0a0a"


def _email_shell(content_tables: str) -> str:
    """Full document: table-based wrapper, inline CSS only (no style tags)."""
    c = _CANVAS_BG
    return f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" bgcolor="{c}" style="background-color:{c};">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
<body bgcolor="{c}" style="margin:0;padding:0;background-color:{c};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{c}" style="width:100%;background-color:{c};">
  <tr>
    <td bgcolor="{c}" style="background-color:{c};padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="{c}" style="width:100%;background-color:{c};padding:40px 20px;">
  <tr>
    <td align="center" bgcolor="{c}" style="padding:0;background-color:{c};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#111111" style="max-width:600px;width:100%;background-color:#111111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:30px;background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);border-bottom:2px solid #C9A84C;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding:0;font-size:28px;font-weight:900;color:#C9A84C;letter-spacing:3px;text-transform:uppercase;line-height:1.2;">⚡ PROSPECT LEGENDS</td>
              </tr>
              <tr>
                <td align="center" style="padding:6px 0 0 0;font-size:11px;color:#888888;letter-spacing:4px;text-transform:uppercase;line-height:1.4;">Digital Collectibles</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#111111" style="padding:36px 40px;color:#ffffff;background-color:#111111;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              {content_tables}
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" bgcolor="#0d0d0d" style="background-color:#0d0d0d;padding:24px 40px;border-top:1px solid #222222;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding:0;font-size:12px;color:#555555;line-height:1.5;">Prospect Legends Digital Collectibles</td>
              </tr>
              <tr>
                <td align="center" style="padding:4px 0 0 0;font-size:11px;color:#444444;line-height:1.5;">This is an automated message. Please do not reply.</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
    </td>
  </tr>
</table>
</body>
</html>"""


def _content_row(inner: str) -> str:
    return f'<tr><td style="padding:0;">{inner}</td></tr>'


def _heading(text: str) -> str:
    esc = html_module.escape(text)
    return _content_row(
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td style="padding:0;font-size:26px;font-weight:800;color:#ffffff;margin:0;line-height:1.2;">{esc}</td></tr></table>'
    )


def _subtext_plain(text: str) -> str:
    esc = html_module.escape(text)
    return _content_row(
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td style="padding:0 0 28px 0;font-size:15px;color:#aaaaaa;line-height:1.5;">{esc}</td></tr></table>'
    )


def _subtext_html(inner_html: str) -> str:
    return _content_row(
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td style="padding:0 0 28px 0;font-size:15px;color:#aaaaaa;line-height:1.5;">{inner_html}</td></tr></table>'
    )


def _divider() -> str:
    return _content_row(
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        '<tr><td style="padding:0;border:none;border-top:1px solid #222222;margin:0;height:1px;line-height:0;font-size:0;">&nbsp;</td></tr>'
        '<tr><td style="padding:0;height:28px;line-height:28px;font-size:0;">&nbsp;</td></tr></table>'
    )


def _card_info_box(
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
) -> str:
    tc = _tier_color(card_tier)
    tier_label = html_module.escape(_tier_label(card_tier))
    player = html_module.escape(card_player_name)
    rarity = html_module.escape(_rarity_label(card_rarity))
    edition = html_module.escape("Digital")
    badge_bg = f"{tc}22"
    badge_border = f"{tc}44"
    img_row = ""
    abs_url = _absolute_image_url(card_image_url)
    if abs_url:
        u = html_module.escape(abs_url, quote=True)
        img_row = (
            '<tr><td align="center" style="padding:0 0 16px 0;">'
            f'<img src="{u}" alt="" width="200" style="display:block;width:100%;max-width:200px;height:auto;'
            f'margin:0 auto;border-radius:8px;border:2px solid {tc};" />'
            "</td></tr>"
        )
    badge_row = (
        '<tr><td align="center" style="padding:0 0 16px 0;">'
        f'<span style="display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;'
        f'letter-spacing:1px;text-transform:uppercase;background-color:{badge_bg};color:{tc};border:1px solid {badge_border};">'
        f"{tier_label}</span></td></tr>"
    )
    detail_table = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td style="font-size:13px;color:#aaaaaa;padding:6px 0;border-bottom:1px solid #222222;">Player</td>'
        f'<td align="right" style="font-size:13px;color:#ffffff;font-weight:600;padding:6px 0;border-bottom:1px solid #222222;">{player}</td></tr>'
        f'<tr><td style="font-size:13px;color:#aaaaaa;padding:6px 0;border-bottom:1px solid #222222;">Rarity</td>'
        f'<td align="right" style="font-size:13px;color:#ffffff;font-weight:600;padding:6px 0;border-bottom:1px solid #222222;">{rarity}</td></tr>'
        f'<tr><td style="font-size:13px;color:#aaaaaa;padding:6px 0;border-bottom:1px solid #222222;">Edition</td>'
        f'<td align="right" style="font-size:13px;color:#ffffff;font-weight:600;padding:6px 0;border-bottom:1px solid #222222;">{edition}</td></tr>'
        "</table>"
    )
    inner = (
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        f'style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;margin:0 0 24px 0;">'
        f'<tr><td style="padding:20px;">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">{img_row}{badge_row}'
        f'<tr><td style="padding:0;">{detail_table}</td></tr></table></td></tr></table>'
    )
    return _content_row(inner)


def _message_box(sender_name: str, trade_message: str) -> str:
    sn = html_module.escape(sender_name)
    msg = html_module.escape(trade_message)
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="background-color:#161616;border-left:3px solid #C9A84C;border-radius:0 8px 8px 0;padding:0;margin:0 0 28px 0;">'
        '<tr><td style="padding:16px 20px;font-size:14px;color:#cccccc;line-height:1.6;font-style:italic;">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td style="padding:0 0 8px 0;font-size:13px;color:#aaaaaa;font-style:normal;font-weight:600;">{sn} says:</td></tr>'
        f'<tr><td style="padding:0;font-size:14px;color:#cccccc;font-style:italic;">{msg}</td></tr>'
        "</table></td></tr></table>"
    )
    return _content_row(inner)


def _cta_button(href: str, label: str) -> str:
    esc_href = html_module.escape(href, quote=True)
    esc_label = html_module.escape(label)
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        '<tr><td align="center" style="padding:0;">'
        f'<a href="{esc_href}" style="display:inline-block;padding:14px 36px;'
        "background:linear-gradient(135deg,#C9A84C 0%,#E8C56A 100%);color:#000000;font-weight:800;font-size:15px;"
        'text-decoration:none;border-radius:8px;letter-spacing:1px;text-transform:uppercase;">'
        f"{esc_label}</a></td></tr></table>"
    )
    return _content_row(inner)


def _muted_center(text: str) -> str:
    esc = html_module.escape(text)
    return _content_row(
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'<tr><td align="center" style="padding:12px 0 0 0;font-size:12px;color:#666666;line-height:1.5;">{esc}</td></tr></table>'
    )


def _success_banner(recipient_name: str) -> str:
    rn = html_module.escape(recipient_name)
    text = f"✅ Ownership successfully transferred to {rn}"
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="background-color:#052e16;border:1px solid #22c55e;border-radius:8px;margin:0 0 28px 0;">'
        f'<tr><td align="center" style="padding:16px;color:#22c55e;font-weight:700;font-size:14px;line-height:1.4;">{text}</td></tr></table>'
    )
    return _content_row(inner)


def _error_banner() -> str:
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="background-color:#2d1515;border:1px solid #ef4444;border-radius:8px;margin:0 0 28px 0;">'
        '<tr><td align="center" style="padding:16px;color:#ef4444;font-weight:700;font-size:14px;line-height:1.4;">'
        "↩️ Card returned to your collection</td></tr></table>"
    )
    return _content_row(inner)


def _warning_banner() -> str:
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="background-color:#1a1500;border:1px solid #f59e0b;border-radius:8px;margin:0 0 28px 0;">'
        '<tr><td align="center" style="padding:16px;color:#f59e0b;font-weight:700;font-size:14px;line-height:1.4;">'
        "🚫 This trade offer has been cancelled</td></tr></table>"
    )
    return _content_row(inner)


def _notification_recipients(primary: str, parent_email: str | None) -> list[str]:
    """Primary recipient plus optional parent copy (deduped)."""
    recipients: list[str] = []
    primary_clean = (primary or "").strip()
    if primary_clean:
        recipients.append(primary_clean)
    parent = (parent_email or "").strip().lower()
    primary_l = primary_clean.lower()
    if parent and parent != primary_l and parent not in {r.lower() for r in recipients}:
        recipients.append(parent)
    return recipients


def _send_resend_html(
    to: str,
    subject: str,
    html: str,
    trade_id: int | None,
    kind: str,
    *,
    parent_email: str | None = None,
) -> None:
    key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if not key:
        logger.warning("RESEND_API_KEY unset; skipping %s email to %s", kind, to)
        return
    resend.api_key = key
    for recipient in _notification_recipients(to, parent_email):
        params: dict[str, Any] = {
            "from": _from_email(),
            "to": [recipient],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)


def send_trade_offer_email(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    trade_message: str | None,
    trades_url: str,
    trade_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        sn_plain = html_module.escape(sender_name)
        tier_word = html_module.escape(_tier_label(card_tier))
        tc = _tier_color(card_tier)
        sub_inner = (
            f'{sn_plain} has sent you a <span style="color:{tc};font-weight:700;">{tier_word}</span> Prospect Legends card.<br />'
            "Log in to accept or decline the offer."
        )
        parts = [
            _heading("Trade incoming"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
        ]
        if trade_message and str(trade_message).strip():
            parts.append(_message_box(sender_name, str(trade_message).strip()))
        parts.extend(
            [
                _divider(),
                _cta_button(trades_url, "View Trade Offer →"),
                _muted_center(
                    "This offer will remain pending until you accept or decline in the app."
                ),
            ]
        )
        html = _email_shell("".join(parts))
        subject = f"⚡ {sender_name} sent you a Prospect Legends card!"
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_offer", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_accepted_email(
    sender_email: str,
    sender_name: str,
    recipient_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    collection_url: str,
    trade_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        rn = html_module.escape(recipient_name)
        tier_word = html_module.escape(_tier_label(card_tier))
        player = html_module.escape(card_player_name)
        tc = _tier_color(card_tier)
        sub_inner = (
            f"{rn} accepted your <span style=\"color:{tc};font-weight:700;\">{tier_word}</span> {player} card. "
            "The card has been transferred to their collection."
        )
        parts = [
            _heading("Trade Accepted! 🎉"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _success_banner(recipient_name),
            _cta_button(collection_url, "View My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"✅ {recipient_name} accepted your card!"
        _send_resend_html(sender_email, subject, html, trade_id, "trade_accepted", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_declined_email(
    sender_email: str,
    sender_name: str,
    recipient_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    collection_url: str,
    trade_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        rn = html_module.escape(recipient_name)
        tier_word = html_module.escape(_tier_label(card_tier))
        player = html_module.escape(card_player_name)
        tc = _tier_color(card_tier)
        sub_inner = (
            f"{rn} declined your <span style=\"color:{tc};font-weight:700;\">{tier_word}</span> {player} card. "
            "Don't worry — it's back in your collection."
        )
        parts = [
            _heading("Trade Declined"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _error_banner(),
            _cta_button(collection_url, "View My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"❌ {recipient_name} declined your trade"
        _send_resend_html(sender_email, subject, html, trade_id, "trade_declined", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def send_trade_cancelled_email(
    recipient_email: str,
    recipient_name: str,
    sender_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    trade_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        sn = html_module.escape(sender_name)
        tier_word = html_module.escape(_tier_label(card_tier))
        player = html_module.escape(card_player_name)
        tc = _tier_color(card_tier)
        sub_inner = (
            f"{sn} cancelled their offer to send you the <span style=\"color:{tc};font-weight:700;\">{tier_word}</span> {player} card. "
            "No action needed on your part."
        )
        parts = [
            _heading("Trade Cancelled"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _warning_banner(),
        ]
        html = _email_shell("".join(parts))
        subject = f"🚫 {sender_name} cancelled their trade offer"
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_cancelled", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def _money_label(amount: float) -> str:
    return f"${amount:,.2f}"


def _trade_cards_email_block(summary: str) -> str:
    if not (summary or "").strip():
        return ""
    text = html_module.escape(summary.strip())
    return (
        '<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#cbd5e1;">'
        f"<strong>Cards offered:</strong> {text}</p>"
    )


def _counter_trade_cards_email_block(summary: str) -> str:
    if not (summary or "").strip():
        return ""
    text = html_module.escape(summary.strip())
    return (
        '<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#cbd5e1;">'
        f"<strong>Seller counter cards:</strong> {text}</p>"
    )


def send_marketplace_offer_received_email(
    owner_email: str,
    owner_name: str,
    buyer_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    offer_amount: float,
    offers_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    parent_email: str | None = None,
) -> None:
    try:
        bn = html_module.escape(buyer_name)
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"{bn} submitted a <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Offer</span> "
                f"on your {player} card. View and respond in your Prospect Legends account."
            )
            heading = "New Card Trade Offer"
            subject = f"Card trade offer on your {card_player_name} card"
        else:
            amt = html_module.escape(_money_label(offer_amount))
            sub_inner = (
                f"{bn} made an offer of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> "
                f"on your {player} card. View and respond to the offer in your Prospect Legends account."
            )
            heading = "New marketplace offer"
            subject = f"Someone wants your {card_player_name} card!"
        parts = [
            _heading(heading),
            _subtext_html(sub_inner),
            _trade_cards_email_block(trade_cards_summary),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(offers_url, "View incoming offers →"),
        ]
        html = _email_shell("".join(parts))
        _send_resend_html(owner_email, subject, html, offer_id, "marketplace_offer_received", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_offer_accepted_buyer_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    offer_amount: float,
    collection_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    amount_paid_credits: float | None = None,
    new_credit_balance: float | None = None,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"Your <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Offer</span> for the "
                f"{player} card was accepted. The card is now in your collection."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            counter_block = _counter_trade_cards_email_block(counter_trade_summary)
        else:
            amt = html_module.escape(_money_label(offer_amount))
            sub_inner = (
                f"Your offer of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> for the "
                f"{player} card was accepted. The card is now in your collection."
            )
            trade_block = ""
            counter_block = ""
        parts = [
            _heading("Your offer was accepted! 🎉"),
            _subtext_html(sub_inner),
            trade_block,
            counter_block,
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _subtext_plain(
                f"Amount paid: {_money_label(amount_paid_credits)} in credits\n"
                f"Your new credit balance: {_money_label(new_credit_balance)}"
            )
            if (not is_card_trade and amount_paid_credits is not None and new_credit_balance is not None)
            else "",
            _divider(),
            _cta_button(collection_url, "View My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your card trade was accepted! 🎉" if is_card_trade else "Your offer was accepted! 🎉"
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_accepted", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_sale_confirmed_seller_email(
    seller_email: str,
    seller_name: str,
    buyer_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    offer_amount: float,
    collection_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    platform_fee: float | None = None,
    earnings: float | None = None,
    new_credit_balance: float | None = None,
    payout_initiated: bool | None = None,
    parent_email: str | None = None,
) -> None:
    try:
        bn = html_module.escape(buyer_name)
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"Card trade completed — {bn} traded for your {player} card. "
                "You received the offered cards in your collection."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            heading = "Card trade confirmed"
            subject = f"Card trade confirmed — {card_player_name}"
        else:
            amt = html_module.escape(_money_label(offer_amount))
            sub_inner = (
                f"Sale confirmed — {bn} purchased your {player} card for "
                f"<span style=\"color:#C9A84C;font-weight:700;\">{amt}</span>."
            )
            trade_block = ""
            heading = "Sale confirmed"
            subject = f"Sale confirmed — {card_player_name}"
        parts = [
            _heading(heading),
            _subtext_html(sub_inner),
            trade_block,
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _subtext_plain(
                f"Sale amount: {_money_label(offer_amount)}\n"
                f"Platform fee ({royalty_rate_percent_label()}): {_money_label(platform_fee)}\n"
                f"Your earnings: {_money_label(earnings)} added to your balance\n"
                f"Your new credit balance: {_money_label(new_credit_balance)}\n"
                + (
                    "A payout has been initiated to your connected bank account."
                    if payout_initiated
                    else ""
                )
            )
            if (
                not is_card_trade
                and platform_fee is not None
                and earnings is not None
                and new_credit_balance is not None
            )
            else "",
            _divider(),
            _cta_button(collection_url, "Open Prospect Legends →"),
        ]
        html = _email_shell("".join(parts))
        _send_resend_html(seller_email, subject, html, offer_id, "marketplace_sale_confirmed", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_offer_declined_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    card_tier: str,
    card_rarity: str,
    card_image_url: str | None,
    offer_amount: float,
    marketplace_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"The owner declined your <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Offer</span> "
                f"for {player}. Your offered cards are available again in your collection."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            subject = f"Your card trade offer on {card_player_name} was declined"
        else:
            amt = html_module.escape(_money_label(offer_amount))
            sub_inner = (
                f"The owner declined your offer of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> "
                f"for {player}. You can browse more cards on Free Agency Marketplace."
            )
            trade_block = ""
            subject = f"Your offer on {card_player_name} was declined"
        parts = [
            _heading("Offer declined" if not is_card_trade else "Card trade offer declined"),
            _subtext_html(sub_inner),
            trade_block,
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(marketplace_url, "Browse Free Agency Marketplace →"),
        ]
        html = _email_shell("".join(parts))
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_declined", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_offer_cancelled_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    offer_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        sub_inner = f"Your offer on {player} has been cancelled."
        parts = [
            _heading("Offer cancelled"),
            _subtext_plain(sub_inner),
        ]
        html = _email_shell("".join(parts))
        subject = "Offer cancelled"
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_cancelled", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_listing_expired_email(
    owner_email: str,
    owner_name: str,
    card_player_name: str,
    collection_url: str,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"Your {player} card was listed on Free Agency Marketplace for 30 days and has been removed. "
            "You can relist it anytime from your collection."
        )
        parts = [
            _heading("Listing expired"),
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(collection_url, "Open My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"Your listing for {card_player_name} has expired"
        _send_resend_html(owner_email, subject, html, 0, "marketplace_listing_expired", parent_email=parent_email)
    except Exception as e:
        logger.error("Listing expired email failed for %s: %s", owner_email, e)


def send_marketplace_offer_expired_buyer_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    offer_amount: float,
    marketplace_url: str,
    offer_id: int,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        amt = html_module.escape(_money_label(offer_amount))
        sub_inner = (
            f"Your offer of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> on the "
            f"{player} card expired after 14 days without a response from the seller. "
            "You can make a new offer anytime on Free Agency Marketplace."
        )
        parts = [
            _heading("Offer expired"),
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(marketplace_url, "Browse Free Agency Marketplace →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"Your offer on {card_player_name} has expired"
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_expired", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_counter_sent_buyer_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    original_amount: float,
    counter_amount: float,
    my_offers_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"The seller sent a <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Counter</span> "
                f"on your offer for {player}. Log in to accept or decline."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            counter_block = _counter_trade_cards_email_block(counter_trade_summary)
            heading = "Seller Card Trade Counter"
            subject = f"Card trade counter on {card_player_name}"
        else:
            orig = html_module.escape(_money_label(original_amount))
            ctr = html_module.escape(_money_label(counter_amount))
            sub_inner = (
                f"You offered <span style=\"color:#C9A84C;font-weight:700;\">{orig}</span> on the {player} card. "
                f"The seller has countered with <span style=\"color:#C9A84C;font-weight:700;\">{ctr}</span>. "
                "Log in to accept or decline the counter."
            )
            trade_block = ""
            counter_block = ""
            heading = "Seller counter-offer"
            subject = f"The seller countered your offer on {card_player_name}"
        parts = [
            _heading(heading),
            _subtext_html(sub_inner),
            trade_block,
            counter_block,
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(my_offers_url, "View My Offers →"),
        ]
        html = _email_shell("".join(parts))
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_counter_sent", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_counter_accepted_seller_email(
    seller_email: str,
    seller_name: str,
    card_player_name: str,
    counter_amount: float,
    collection_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    platform_fee: float | None = None,
    earnings: float | None = None,
    new_credit_balance: float | None = None,
    payout_initiated: bool | None = None,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"Your <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Counter</span> for {player} "
                "was accepted. Cards have been transferred."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            counter_block = _counter_trade_cards_email_block(counter_trade_summary)
            heading = "Card trade counter accepted! 🎉"
        else:
            amt = html_module.escape(_money_label(counter_amount))
            sub_inner = (
                f"Your counter of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> for {player} "
                "was accepted. The card has been transferred to the buyer."
            )
            trade_block = ""
            counter_block = ""
            heading = "Counter-offer accepted! 🎉"
        parts = [
            _heading(heading),
            _subtext_html(sub_inner),
            trade_block,
            counter_block,
            _subtext_html(sub_inner),
            _subtext_plain(
                f"Sale amount: {_money_label(counter_amount)}\n"
                f"Platform fee ({royalty_rate_percent_label()}): {_money_label(platform_fee)}\n"
                f"Your earnings: {_money_label(earnings)} added to your balance\n"
                f"Your new credit balance: {_money_label(new_credit_balance)}\n"
                + (
                    "A payout has been initiated to your connected bank account."
                    if payout_initiated
                    else ""
                )
            )
            if (
                not is_card_trade
                and platform_fee is not None
                and earnings is not None
                and new_credit_balance is not None
            )
            else "",
            _divider(),
            _cta_button(collection_url, "Open My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your counter-offer was accepted! 🎉"
        _send_resend_html(seller_email, subject, html, offer_id, "marketplace_counter_accepted_seller", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_counter_declined_seller_email(
    seller_email: str,
    seller_name: str,
    card_player_name: str,
    counter_amount: float,
    my_listings_url: str,
    offer_id: int,
    *,
    is_card_trade: bool = False,
    trade_cards_summary: str = "",
    counter_trade_summary: str = "",
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        if is_card_trade:
            sub_inner = (
                f"The buyer declined your <span style=\"color:#C9A84C;font-weight:700;\">Card Trade Counter</span> "
                f"on {player}. Offered and counter cards are available again."
            )
            trade_block = _trade_cards_email_block(trade_cards_summary)
            counter_block = _counter_trade_cards_email_block(counter_trade_summary)
            heading = "Card trade counter declined"
        else:
            amt = html_module.escape(_money_label(counter_amount))
            sub_inner = (
                f"The buyer declined your counter of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> "
                f"on {player}. The card remains listed on Free Agency Marketplace."
            )
            trade_block = ""
            counter_block = ""
            heading = "Counter-offer declined"
        parts = [
            _heading(heading),
            _subtext_html(sub_inner),
            trade_block,
            counter_block,
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(my_listings_url, "My Listings →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your counter-offer was declined"
        _send_resend_html(seller_email, subject, html, offer_id, "marketplace_counter_declined_seller", parent_email=parent_email)
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_withdrawal_confirmation_email(
    user_email: str,
    user_name: str,
    withdrawal_amount: float,
    new_credit_balance: float,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        amt = html_module.escape(_money_label(withdrawal_amount))
        bal = html_module.escape(_money_label(new_credit_balance))
        sub_inner = (
            f"A withdrawal of <span style=\"color:#C9A84C;font-weight:700;\">{amt}</span> "
            "has been initiated to your connected bank account.<br><br>"
            "Funds typically arrive in 2-3 business days.<br><br>"
            f"Your new credit balance: <span style=\"color:#00ffcc;font-weight:700;\">{bal}</span>"
        )
        parts = [
            _heading("Withdrawal initiated"),
            _subtext_html(sub_inner),
        ]
        html = _email_shell("".join(parts))
        subject = "Your withdrawal is on the way — Prospect Legends"
        _send_resend_html(
            user_email,
            subject,
            html,
            0,
            f"withdrawal_{withdrawal_amount}_{new_credit_balance}",
            parent_email=parent_email,
        )
    except Exception as e:
        logger.error("Withdrawal confirmation email failed for %s: %s", user_email, e)


def send_highlight_failed_email(
    owner_email: str,
    owner_name: str,
    card_player_name: str,
    collection_url: str,
    card_id: str,
    refund_amount: float,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        refund = html_module.escape(format(refund_amount, ".2f"))
        sub_inner = (
            f"We could not process the highlight video for your {player} card. "
            f"Your ${refund} has been refunded to your credit balance."
        )
        parts = [
            _heading("Your highlight video could not be processed"),
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(collection_url, "Open My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your highlight video could not be processed"
        _send_resend_html(owner_email, subject, html, 0, f"highlight_failed_{card_id}", parent_email=parent_email)
    except Exception as e:
        logger.error("Highlight failed email failed for card %s: %s", card_id, e)


def send_highlight_complete_email(
    owner_email: str,
    owner_name: str,
    card_player_name: str,
    card_url: str,
    card_id: str,
    card_image_url: str | None,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        sub_inner = f"Your highlight card for {player} is ready to view."
        parts = [
            _heading("Your highlight card is ready!"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, "all_star", "base", card_image_url),
            _divider(),
            _cta_button(card_url, "View highlight card →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your highlight card is ready!"
        _send_resend_html(owner_email, subject, html, 0, f"highlight_complete_{card_id}", parent_email=parent_email)
    except Exception as e:
        logger.error("Highlight complete email failed for card %s: %s", card_id, e)


def send_animation_complete_email(
    owner_email: str,
    owner_name: str,
    card_player_name: str,
    card_url: str,
    card_id: str,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"Your {player} card has been brought to life. "
            "Log in to see your animated card in action."
        )
        parts = [
            _heading("Your animated card is ready! 🎬"),
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(card_url, "View animated card →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your animated card is ready! 🎬"
        _send_resend_html(owner_email, subject, html, 0, f"animation_complete_{card_id}", parent_email=parent_email)
    except Exception as e:
        logger.error("Animation complete email failed for card %s: %s", card_id, e)


def send_animation_failed_email(
    owner_email: str,
    owner_name: str,
    card_player_name: str,
    collection_url: str,
    card_id: str,
    *,
    parent_email: str | None = None,
) -> None:
    try:
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"We ran into a problem generating the animation for your {player} card. "
            "Please try again from your collection. If the problem continues please contact support."
        )
        parts = [
            _heading("Animation issue"),
            _subtext_html(sub_inner),
            _divider(),
            _cta_button(collection_url, "Open My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = "There was an issue animating your card"
        _send_resend_html(owner_email, subject, html, 0, f"animation_failed_{card_id}", parent_email=parent_email)
    except Exception as e:
        logger.error("Animation failed email failed for card %s: %s", card_id, e)


def _numbered_steps(steps: list[str]) -> str:
    rows = []
    for i, step in enumerate(steps, start=1):
        esc = html_module.escape(step)
        rows.append(
            f'<tr><td style="padding:0 0 10px 0;font-size:15px;color:#dddddd;line-height:1.5;">'
            f'<span style="color:#C9A84C;font-weight:700;margin-right:8px;">{i}.</span>{esc}</td></tr>'
        )
    inner = (
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
        'style="background-color:#161616;border:1px solid #2a2a2a;border-radius:8px;margin:0 0 28px 0;">'
        f'<tr><td style="padding:18px 20px;">'
        f'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
        f'{"".join(rows)}'
        "</table></td></tr></table>"
    )
    return _content_row(inner)


def send_password_reset_email(
    user_email: str,
    display_name: str,
    reset_url: str,
) -> None:
    """Send password reset link to the user."""
    try:
        name = html_module.escape((display_name or "Legend").strip() or "Legend")
        parts = [
            _heading("Reset your password"),
            _subtext_html(f"Hi {name},"),
            _subtext_plain(
                "We received a request to reset your password. "
                "Click the button below to reset it. This link expires in 1 hour."
            ),
            _cta_button(reset_url, "Reset Password"),
            _divider(),
            _muted_center(
                "If you did not request this, you can safely ignore this email. "
                "Your password will not be changed."
            ),
        ]
        html = _email_shell("".join(parts))
        subject = "Reset your Prospect Legends password"
        _send_resend_html(user_email, subject, html, 0, "password_reset")
    except Exception as e:
        logger.error("Password reset email failed for %s: %s", user_email, e)


def send_welcome_email(
    user_email: str,
    display_name: str,
    *,
    parent_email: str | None = None,
) -> None:
    """Send welcome email to a newly registered user (and parent copy if provided)."""
    try:
        name = (display_name or "Legend").strip() or "Legend"
        studio_url = f"{frontend_url()}/studio"
        parts = [
            _heading(f"Welcome {name}!"),
            _subtext_plain("Your account is ready. Here's how to get started:"),
            _numbered_steps(
                [
                    "Load credits to your account",
                    "Create your first card in the Studio",
                    "Share, trade, and sell on the marketplace",
                ]
            ),
            _cta_button(studio_url, "Create Your First Card"),
            _divider(),
            _subtext_plain(
                "Share your experience with friends using invite code: PROSPECTLEGENDS2026"
            ),
            _muted_center(
                "You're receiving this because you created a Prospect Legends account. "
                "To stop account emails, contact support."
            ),
        ]
        html = _email_shell("".join(parts))
        subject = "Welcome to Prospect Legends! 🎉"
        _send_resend_html(user_email, subject, html, 0, "welcome", parent_email=parent_email)
    except Exception as e:
        logger.error("Welcome email failed for %s: %s", user_email, e)


def support_inbox_email() -> str:
    """Support inbox — ADMIN_EMAIL env, else public support address."""
    return (os.environ.get("ADMIN_EMAIL") or "support@prospectlegends.com").strip()


def send_contact_support_email(
    *,
    support_to: str,
    name: str,
    email: str,
    subject_key: str,
    subject_label: str,
    message: str,
    user_id: int | None,
    submitted_at: str,
) -> None:
    """Deliver a contact form submission to the support inbox."""
    key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("Email service is not configured")

    user_line = f"User ID: {user_id}" if user_id is not None else "User ID: (guest — not signed in)"
    esc_name = html_module.escape(name)
    esc_email = html_module.escape(email)
    esc_subject = html_module.escape(subject_label)
    esc_message = html_module.escape(message).replace("\n", "<br />")
    esc_time = html_module.escape(submitted_at)
    esc_user = html_module.escape(user_line)

    meta_rows = "".join(
        f'<tr><td style="padding:6px 0;font-size:13px;color:#888888;width:120px;vertical-align:top;">{html_module.escape(label)}</td>'
        f'<td style="padding:6px 0;font-size:14px;color:#ffffff;">{value}</td></tr>'
        for label, value in [
            ("Name", esc_name),
            ("Email", esc_email),
            ("Subject", esc_subject),
            ("Submitted", esc_time),
            ("Account", esc_user),
        ]
    )

    parts = [
        _heading("New Contact Form Message"),
        _subtext_plain(f"Category: {subject_label} ({subject_key})"),
        _content_row(
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" '
            'style="background-color:#161616;border:1px solid #2a2a2a;border-radius:8px;margin:0 0 24px 0;">'
            f'<tr><td style="padding:16px 18px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">{meta_rows}</table></td></tr></table>'
        ),
        _content_row(
            '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">'
            '<tr><td style="padding:0 0 8px 0;font-size:13px;font-weight:700;color:#C9A84C;text-transform:uppercase;letter-spacing:1px;">Message</td></tr>'
            f'<tr><td style="padding:12px 16px;background-color:#161616;border:1px solid #2a2a2a;border-radius:8px;font-size:14px;color:#dddddd;line-height:1.6;">{esc_message}</td></tr>'
            "</table>"
        ),
        _muted_center(f"Reply directly to {esc_email} to respond to this user."),
    ]
    html = _email_shell("".join(parts))
    mail_subject = f"[Contact] {subject_label} — {name}"

    resend.api_key = key
    params: dict[str, Any] = {
        "from": _from_email(),
        "to": [support_to.strip()],
        "reply_to": email,
        "subject": mail_subject,
        "html": html,
    }
    try:
        resend.Emails.send(params)
    except Exception as exc:
        logger.error("Contact form email failed for %s: %s", email, exc)
        raise RuntimeError("Could not send message. Please try again later.") from exc
