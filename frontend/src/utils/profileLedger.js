function extractAfterPrefix(note, prefix) {
  const n = (note || "").trim();
  if (!n.toLowerCase().startsWith(prefix.toLowerCase())) return null;
  return n.slice(prefix.length).trim();
}

function extractPlayerFromParen(note) {
  const match = (note || "").match(/^(.+?)\s*\([^)]+\)\s*$/);
  return match ? match[1].trim() : null;
}

function extractNameFromDash(note) {
  const parts = (note || "").split(" - ");
  if (parts.length >= 2) return parts.slice(1).join(" - ").trim();
  return null;
}

export function profileTransactionMeta(row) {
  const type = (row?.transaction_type || "").toLowerCase();
  const note = (row?.note || "").trim();
  const amt = Number(row?.amount);
  const positive = amt >= 0;

  if (type === "top_up" || type === "gift" || type === "refund") {
    return {
      icon: "⬆️",
      dotClass: "profile-tx-dot--green",
      description: type === "gift" && note ? note : "Credits Added",
      amountClass: "credit-ledger-row__amount--credit",
    };
  }

  if (type === "withdrawal") {
    const method = note.includes("bank") ? "Bank Transfer" : "Payout";
    return {
      icon: "⬇️",
      dotClass: "profile-tx-dot--gold",
      description: `Withdrawal — ${method}`,
      amountClass: "credit-ledger-row__amount--gold",
    };
  }

  if (type === "card_sale") {
    const name = extractPlayerFromParen(note) || "Card";
    return {
      icon: "•",
      dotClass: "profile-tx-dot--green",
      description: `Card Sold — ${name}`,
      amountClass: "credit-ledger-row__amount--credit",
    };
  }

  if (type === "card_purchase") {
    const name = extractPlayerFromParen(note) || "Card";
    return {
      icon: "•",
      dotClass: "profile-tx-dot--gray",
      description: `Card Purchased — ${name}`,
      amountClass: "credit-ledger-row__amount--debit",
    };
  }

  if (type === "animation") {
    const name = extractNameFromDash(note) || extractPlayerFromParen(note) || "Card";
    return {
      icon: "•",
      dotClass: "profile-tx-dot--gray",
      description: `Card Animated — ${name}`,
      amountClass: "credit-ledger-row__amount--debit",
    };
  }

  if (type === "generation") {
    if (/additional card copies/i.test(note)) {
      const qtyMatch = note.match(/\((\d+)x/i);
      const qty = qtyMatch ? qtyMatch[1] : "1";
      const cardName = extractNameFromDash(note) || "Card";
      return {
        icon: "•",
        dotClass: "profile-tx-dot--gray",
        description: `Copies Purchased — ${cardName} x${qty}`,
        amountClass: "credit-ledger-row__amount--debit",
      };
    }
    const tier = extractNameFromDash(note);
    const label = tier ? `Card Created — ${tier}` : "Card Created";
    return {
      icon: "•",
      dotClass: "profile-tx-dot--gray",
      description: note.toLowerCase().includes("preview") ? "Card Created — Preview" : label,
      amountClass: "credit-ledger-row__amount--debit",
    };
  }

  if (type === "highlight") {
    const name = extractNameFromDash(note)?.replace(/^Highlight video upgrade for\s+/i, "") || "Card";
    return {
      icon: "•",
      dotClass: "profile-tx-dot--gray",
      description: `Highlight Upgrade — ${name}`,
      amountClass: "credit-ledger-row__amount--debit",
    };
  }

  if (type === "priority") {
    return {
      icon: "•",
      dotClass: "profile-tx-dot--gray",
      description: note || "Priority Listing",
      amountClass: positive ? "credit-ledger-row__amount--credit" : "credit-ledger-row__amount--debit",
    };
  }

  if (type === "royalty") {
    return {
      icon: "•",
      dotClass: "profile-tx-dot--green",
      description: note || "Marketplace Royalty",
      amountClass: positive ? "credit-ledger-row__amount--credit" : "credit-ledger-row__amount--debit",
    };
  }

  return {
    icon: "•",
    dotClass: "profile-tx-dot--gray",
    description: note || type || "Transaction",
    amountClass: positive ? "credit-ledger-row__amount--credit" : "credit-ledger-row__amount--debit",
  };
}

export function formatLedgerDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
