"""Resend-powered transactional emails for Future Legends (trading flow)."""

from __future__ import annotations

import html as html_module
import logging
import os
from typing import Any

import resend

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
    return f"Future Legends <{raw}>"


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
        return "#ffd700"
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
          <td align="center" style="padding:30px;background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);border-bottom:2px solid #ffd700;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td align="center" style="padding:0;font-size:28px;font-weight:900;color:#ffd700;letter-spacing:3px;text-transform:uppercase;line-height:1.2;">⚡ FUTURE LEGENDS</td>
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
                <td align="center" style="padding:0;font-size:12px;color:#555555;line-height:1.5;">Future Legends Digital Collectibles</td>
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
        'style="background-color:#161616;border-left:3px solid #ffd700;border-radius:0 8px 8px 0;padding:0;margin:0 0 28px 0;">'
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
        "background:linear-gradient(135deg,#ffd700 0%,#ffaa00 100%);color:#000000;font-weight:800;font-size:15px;"
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


def _send_resend_html(to: str, subject: str, html: str, trade_id: int | None, kind: str) -> None:
    key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if not key:
        logger.warning("RESEND_API_KEY unset; skipping %s email to %s", kind, to)
        return
    resend.api_key = key
    params: dict[str, Any] = {
        "from": _from_email(),
        "to": [to],
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
) -> None:
    try:
        sn_plain = html_module.escape(sender_name)
        tier_word = html_module.escape(_tier_label(card_tier))
        tc = _tier_color(card_tier)
        sub_inner = (
            f'{sn_plain} has sent you a <span style="color:{tc};font-weight:700;">{tier_word}</span> Future Legends card.<br />'
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
        subject = f"⚡ {sender_name} sent you a Future Legends card!"
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_offer")
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
        _send_resend_html(sender_email, subject, html, trade_id, "trade_accepted")
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
        _send_resend_html(sender_email, subject, html, trade_id, "trade_declined")
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
        _send_resend_html(recipient_email, subject, html, trade_id, "trade_cancelled")
    except Exception as e:
        logger.error("Email failed for trade %s: %s", trade_id, e)


def _money_label(amount: float) -> str:
    return f"${amount:,.2f}"


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
) -> None:
    try:
        bn = html_module.escape(buyer_name)
        player = html_module.escape(card_player_name)
        amt = html_module.escape(_money_label(offer_amount))
        sub_inner = (
            f"{bn} made an offer of <span style=\"color:#ffd700;font-weight:700;\">{amt}</span> "
            f"on your {player} card. View and respond to the offer in your Future Legends account."
        )
        parts = [
            _heading("New marketplace offer"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(offers_url, "View incoming offers →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"Someone wants your {card_player_name} card!"
        _send_resend_html(owner_email, subject, html, offer_id, "marketplace_offer_received")
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
) -> None:
    try:
        amt = html_module.escape(_money_label(offer_amount))
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"Your offer of <span style=\"color:#ffd700;font-weight:700;\">{amt}</span> for the "
            f"{player} card was accepted. The card is now in your collection."
        )
        parts = [
            _heading("Your offer was accepted! 🎉"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(collection_url, "View My Collection →"),
        ]
        html = _email_shell("".join(parts))
        subject = "Your offer was accepted! 🎉"
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_accepted")
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
) -> None:
    try:
        bn = html_module.escape(buyer_name)
        amt = html_module.escape(_money_label(offer_amount))
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"Sale confirmed — {bn} purchased your {player} card for "
            f"<span style=\"color:#ffd700;font-weight:700;\">{amt}</span>."
        )
        parts = [
            _heading("Sale confirmed"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(collection_url, "Open Future Legends →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"Sale confirmed — {card_player_name}"
        _send_resend_html(seller_email, subject, html, offer_id, "marketplace_sale_confirmed")
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
) -> None:
    try:
        amt = html_module.escape(_money_label(offer_amount))
        player = html_module.escape(card_player_name)
        sub_inner = (
            f"The owner declined your offer of <span style=\"color:#ffd700;font-weight:700;\">{amt}</span> "
            f"for {player}. You can browse more cards on Free Agency."
        )
        parts = [
            _heading("Offer declined"),
            _subtext_html(sub_inner),
            _card_info_box(card_player_name, card_tier, card_rarity, card_image_url),
            _divider(),
            _cta_button(marketplace_url, "Browse Free Agency →"),
        ]
        html = _email_shell("".join(parts))
        subject = f"Your offer on {card_player_name} was declined"
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_declined")
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)


def send_marketplace_offer_cancelled_email(
    buyer_email: str,
    buyer_name: str,
    card_player_name: str,
    offer_id: int,
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
        _send_resend_html(buyer_email, subject, html, offer_id, "marketplace_offer_cancelled")
    except Exception as e:
        logger.error("Email failed for marketplace offer %s: %s", offer_id, e)
