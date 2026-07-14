import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NewCardCelebration from "../components/NewCardCelebration";
import { useAuth } from "./AuthContext";
import { authFetch } from "../utils/authFetch";
import {
  celebrationEventId,
  markCelebrationShown,
  secondaryLabelForSource,
  secondaryPathForSource,
  shouldShowAnimateUpsell,
  wasCelebrationShown,
} from "../utils/newCardCelebration";

const NewCardCelebrationContext = createContext(null);

async function fetchMyCards(token) {
  const { res } = await authFetch(token, "/cards/my-cards");
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function fetchCardDetail(token, cardId) {
  const { res } = await authFetch(token, `/cards/${encodeURIComponent(cardId)}`);
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export function NewCardCelebrationProvider({ children }) {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [state, setState] = useState(null);

  const dismiss = useCallback(() => {
    if (state?.eventId) markCelebrationShown(state.eventId);
    setState(null);
  }, [state?.eventId]);

  const showCelebration = useCallback(
    async ({
      card,
      source,
      counterparty = "",
      amount = null,
      showAnimateUpsell,
      secondaryLabel,
      secondaryPath,
    }) => {
      const cardId = card?.card_id;
      if (!cardId || !source) return false;

      const eventId = celebrationEventId(source, cardId);
      if (wasCelebrationShown(eventId)) return false;

      let resolvedCard = card;
      if (token) {
        const detail = await fetchCardDetail(token, cardId);
        if (detail) resolvedCard = { ...card, ...detail };
      }

      let upsell = showAnimateUpsell;
      if (upsell === undefined && token) {
        const cards = await fetchMyCards(token);
        upsell = shouldShowAnimateUpsell(resolvedCard, cards);
      }

      setState({
        card: resolvedCard,
        source,
        counterparty,
        amount,
        showAnimateUpsell: Boolean(upsell),
        secondaryLabel: secondaryLabel ?? secondaryLabelForSource(source),
        secondaryPath: secondaryPath ?? secondaryPathForSource(source),
        eventId,
      });
      markCelebrationShown(eventId);
      return true;
    },
    [token]
  );

  const value = useMemo(() => ({ showCelebration, dismiss }), [showCelebration, dismiss]);

  return (
    <NewCardCelebrationContext.Provider value={value}>
      {children}
      <NewCardCelebration
        open={Boolean(state)}
        card={state?.card}
        source={state?.source}
        counterparty={state?.counterparty}
        amount={state?.amount}
        showAnimateUpsell={state?.showAnimateUpsell}
        creditBalance={Number(user?.credit_balance) || 0}
        secondaryLabel={state?.secondaryLabel}
        onViewCollection={() => {
          if (state?.eventId) markCelebrationShown(state.eventId);
          setState(null);
          navigate("/my-collection");
        }}
        onSecondary={() => {
          if (state?.eventId) markCelebrationShown(state.eventId);
          const path = state?.secondaryPath;
          setState(null);
          if (path) navigate(path);
        }}
        onAnimateUpsell={() => {
          if (state?.eventId) markCelebrationShown(state.eventId);
          setState(null);
          navigate("/my-collection");
        }}
        onDismiss={dismiss}
      />
    </NewCardCelebrationContext.Provider>
  );
}

export function useNewCardCelebration() {
  const ctx = useContext(NewCardCelebrationContext);
  if (!ctx) {
    throw new Error("useNewCardCelebration must be used within NewCardCelebrationProvider");
  }
  return ctx;
}
