import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import FeaturedCard from "../components/FeaturedCard";
import CardGallery from "../components/CardGallery";
import PostGenerationPanel from "../components/PostGenerationPanel";
import StudioAuthGate from "../components/StudioAuthGate";
import StudioCreditBalance from "../components/StudioCreditBalance";
import GenerationCostSummary from "../components/GenerationCostSummary";
import ThemeLibraryPicker from "../components/ThemeLibraryPicker";
import CardTypeStep from "../components/CardTypeStep";
import QuantitySelector from "../components/QuantitySelector";
import MotionSelectionGrid from "../components/MotionSelectionGrid";
import AnimationLoadingScreen from "../components/AnimationLoadingScreen";
import AnimationFailedScreen from "../components/AnimationFailedScreen";
import PendingCardResumePrompt from "../components/PendingCardResumePrompt";
import { motionLabel } from "../constants/animationMotions";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { fetchGenerationPrice } from "../utils/cardPricing";
import { copyChargeForQuantity, normalizeCopyTiers } from "../utils/copyPricing";
import { formatMoney } from "../utils/marketplace";

const STEP_PHOTO = 1;
const STEP_DETAILS = 2;
const STEP_TIER = 3;
const STEP_THEME = 4;
const STEP_CARD_TYPE = 5;
const STEP_MOTION = 6;
const STEP_REVIEW = 7;
const TOTAL_WIZARD_STEPS = 7;

const WIZARD_STEP_LABELS = {
  [STEP_PHOTO]: "Upload Photo",
  [STEP_DETAILS]: "Player Details",
  [STEP_TIER]: "Choose Tier",
  [STEP_THEME]: "Choose Theme",
  [STEP_CARD_TYPE]: "Choose Card Type",
  [STEP_MOTION]: "Choose Motion",
  [STEP_REVIEW]: "Review & Generate",
};

const TIER_UI = {
  rookie: {
    label: "Rookie",
    sub: "BASE",
    desc: "Energetic entry-level collectible with bold momentum.",
    card:
      "border-orange-300/35 bg-gradient-to-br from-orange-500/15 via-rose-500/10 to-amber-500/15 hover:border-orange-300/60 hover:shadow-[0_0_30px_rgba(249,115,22,0.20)]",
    active:
      "border-orange-300/70 bg-gradient-to-br from-orange-500/25 via-rose-500/20 to-amber-500/20 shadow-[0_0_0_1px_rgba(251,146,60,0.45),0_18px_40px_rgba(251,146,60,0.2)]",
    pill: "border-orange-300/45 bg-orange-400/15 text-orange-100",
    preview:
      "border-orange-300/45 bg-gradient-to-b from-orange-400/10 via-rose-500/5 to-transparent",
    loading:
      "border-orange-300/35 bg-gradient-to-r from-orange-500/20 via-rose-500/20 to-amber-500/20",
  },
  all_star: {
    label: "All-Star",
    sub: "RARE",
    desc: "Premium chrome look with competitive modern polish.",
    card:
      "border-cyan-300/35 bg-gradient-to-br from-cyan-400/10 via-sky-500/10 to-indigo-500/10 backdrop-blur-sm hover:border-cyan-300/60 hover:shadow-[0_0_35px_rgba(56,189,248,0.20)]",
    active:
      "border-cyan-300/75 bg-gradient-to-br from-cyan-400/20 via-sky-500/15 to-indigo-500/20 shadow-[0_0_0_1px_rgba(103,232,249,0.4),0_20px_42px_rgba(56,189,248,0.2)]",
    pill: "border-cyan-300/45 bg-cyan-400/15 text-cyan-100",
    preview:
      "border-cyan-300/45 bg-gradient-to-b from-cyan-400/10 via-blue-400/5 to-transparent",
    loading:
      "border-cyan-300/35 bg-gradient-to-r from-cyan-400/20 via-sky-500/20 to-blue-500/20",
  },
  legends: {
    label: "Legends",
    sub: "1-OF-1",
    desc: "Elite black-and-gold rarity with luxury collectible aura.",
    card:
      "border-amber-300/35 bg-gradient-to-br from-zinc-900 via-zinc-800/90 to-amber-900/30 hover:border-amber-300/65 hover:shadow-[0_0_38px_rgba(245,158,11,0.22)]",
    active:
      "border-amber-300/80 bg-gradient-to-br from-zinc-900 via-zinc-800 to-amber-900/40 shadow-[0_0_0_1px_rgba(252,211,77,0.45),0_22px_46px_rgba(245,158,11,0.24)]",
    pill: "border-amber-300/50 bg-amber-300/15 text-amber-100",
    preview:
      "border-amber-300/45 bg-gradient-to-b from-amber-300/10 via-yellow-500/5 to-transparent",
    loading:
      "border-amber-300/35 bg-gradient-to-r from-zinc-700/40 via-amber-500/20 to-yellow-400/20",
  },
};

function playerNameFromForm(firstName, lastName, displayName) {
  return (displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim());
}

function isValidGradYear(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1950 && n <= 2100;
}

function validatePlayerDetails(firstName, lastName, displayName, teamName, position, jerseyNumber, gradYear) {
  const errors = {};
  const playerName = playerNameFromForm(firstName, lastName, displayName);
  if (playerName.length < 2) {
    errors.playerName = "Player name is required (minimum 2 characters)";
  }
  if (!teamName.trim()) errors.teamName = "Team name is required";
  if (!position.trim()) errors.position = "Position is required";
  if (!jerseyNumber.trim()) {
    errors.jerseyNumber = "Jersey number is required";
  } else if (!/^\d+$/.test(jerseyNumber.trim())) {
    errors.jerseyNumber = "Jersey number must be a number";
  }
  if (!String(gradYear || "").trim()) {
    errors.gradYear = "Grad year is required";
  } else if (!isValidGradYear(gradYear)) {
    errors.gradYear = "Enter a valid graduation year";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function getNextWizardStep(step, isAnimated) {
  if (step === STEP_CARD_TYPE && !isAnimated) return STEP_REVIEW;
  return Math.min(step + 1, STEP_REVIEW);
}

function getPrevWizardStep(step, isAnimated) {
  if (step === STEP_REVIEW && !isAnimated) return STEP_CARD_TYPE;
  return Math.max(step - 1, STEP_PHOTO);
}

function fieldErrorClass(hasError) {
  return hasError ? "border-rose-500/60 ring-1 ring-rose-500/30" : "border-white/15";
}

function WizardProgress({ currentStep, isAnimated, onGoToStep }) {
  const progressPct = Math.round((currentStep / TOTAL_WIZARD_STEPS) * 100);
  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-cardBg2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Step {currentStep} of {TOTAL_WIZARD_STEPS}
        </p>
        <p className="text-sm font-semibold text-white">{WIZARD_STEP_LABELS[currentStep]}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-neonBlue via-neonTeal to-neonBlue transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: TOTAL_WIZARD_STEPS }, (_, i) => {
          const step = i + 1;
          if (step === STEP_MOTION && !isAnimated) return null;
          const done = step < currentStep;
          const active = step === currentStep;
          const canClick = done && typeof onGoToStep === "function";
          return (
            <button
              key={step}
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onGoToStep(step)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] transition ${
                done
                  ? "border-neonTeal/40 bg-neonTeal/10 text-teal-100"
                  : active
                    ? "border-neonBlue/50 bg-neonBlue/15 text-neonBlue"
                    : "border-white/10 bg-cardBg text-slate-500"
              } ${canClick ? "cursor-pointer hover:border-neonTeal/60" : "cursor-default"}`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-neonTeal text-slate-950" : active ? "bg-neonBlue text-slate-950" : "bg-white/10"
                }`}
              >
                {done ? "✓" : step}
              </span>
              <span className="hidden sm:inline">{WIZARD_STEP_LABELS[step]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatApiError(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean);
    return msgs.length ? msgs.join(" | ") : fallback;
  }
  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.msg === "string") return detail.msg;
  }
  return fallback;
}

function PreviewGenerationLoading({ tierLabel, tierTheme }) {
  return (
    <div className={`rounded-xl border px-4 py-6 ${tierTheme.loading}`}>
      <div className="mb-3 flex items-center gap-2 text-sm text-violet-100">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-violet-300" />
        Minting your {tierLabel} preview...
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-neonBlue via-neonPurple to-neonTeal" />
      </div>
      <p className="mt-3 text-sm text-slate-200/90">Applying rarity framing, effects, and finish...</p>
      <p className="mt-1 text-xs text-slate-400">This usually takes 30–60 seconds. Please keep this page open.</p>
    </div>
  );
}

export default function StudioPage() {
  const navigate = useNavigate();
  const { token, user, initializing, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [teamName, setTeamName] = useState("");
  const [imageFile, setImageFile] = useState(null);

  const [playerId, setPlayerId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [generatedTier, setGeneratedTier] = useState("base");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");

  const [cards, setCards] = useState([]);
  const [orders, setOrders] = useState([]);

  const [orderCustomerName, setOrderCustomerName] = useState("Test User");
  const [orderCustomerEmail, setOrderCustomerEmail] = useState("test@email.com");
  const [orderTier, setOrderTier] = useState("");
  const [specialTheme, setSpecialTheme] = useState("");

  const [themeCategories, setThemeCategories] = useState([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [themesError, setThemesError] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orderActionKey, setOrderActionKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedCardDetail, setSavedCardDetail] = useState(null);
  const [cardType, setCardType] = useState("standard");
  const [selectedMotionId, setSelectedMotionId] = useState("");
  const [motionStepError, setMotionStepError] = useState("");
  const [reviewSubPhase, setReviewSubPhase] = useState("setup");
  const [photoStepError, setPhotoStepError] = useState("");
  const [detailsErrors, setDetailsErrors] = useState({});
  const [detailsShowErrors, setDetailsShowErrors] = useState(false);
  const [tierStepError, setTierStepError] = useState("");
  const [themeStepError, setThemeStepError] = useState("");
  const [animationLoadingCardId, setAnimationLoadingCardId] = useState(null);
  const [animationFailed, setAnimationFailed] = useState(false);
  const [generationPricing, setGenerationPricing] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [previewConfigureOpen, setPreviewConfigureOpen] = useState(false);
  const [addCollectionLoading, setAddCollectionLoading] = useState(false);
  const [copyQuantity, setCopyQuantity] = useState(1);
  const [pendingSession, setPendingSession] = useState(null);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingActionLoading, setPendingActionLoading] = useState(false);

  const selectedTierLabel = (TIER_UI[orderTier] || TIER_UI.all_star).label;
  const selectedTierRarityLabel = (TIER_UI[orderTier] || TIER_UI.all_star).sub;
  const selectedThemeLabel = useMemo(() => {
    if (!specialTheme) return "Default (no theme)";
    for (const cat of themeCategories) {
      const hit = (cat.themes || []).find((t) => t.id === specialTheme);
      if (hit) return hit.name;
    }
    return specialTheme;
  }, [specialTheme, themeCategories]);
  const tierTheme = TIER_UI[orderTier] || TIER_UI.all_star;
  const imagePreviewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ""), [imageFile]);
  const generatedCardFullUrl = useMemo(() => toApiUrl(generatedCardUrl), [generatedCardUrl]);

  const activeOrder = useMemo(
    () => orders.find((order) => order.id === currentOrderId) || null,
    [orders, currentOrderId]
  );
  const previewCards = activeOrder?.generated_cards || [];
  const activePreviewCount = Number(activeOrder?.preview_count ?? 0);
  const activePreviewLimit = Number(activeOrder?.preview_limit ?? 3);
  const remainingPreviews = Math.max(0, activePreviewLimit - activePreviewCount);
  const isPreviewLimitReached = Boolean(activeOrder && activePreviewCount >= activePreviewLimit);
  const isOrderDelivered = (activeOrder?.status || "").toLowerCase() === "delivered";
  const deliveredCardUrl = toApiUrl(activeOrder?.final_card_url || selectedPreviewUrl || generatedCardUrl);

  const refreshSavedCardDetail = useCallback(async () => {
    const cid =
      savedCardDetail?.card_id ||
      previewCards.find((p) => p.image_url === selectedPreviewUrl)?.card_id;
    if (!cid) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cid)}`);
      if (res.ok) setSavedCardDetail(await res.json());
    } catch {
      /* ignore */
    }
  }, [savedCardDetail?.card_id, previewCards, selectedPreviewUrl]);

  const fetchThemes = useCallback(async () => {
    setThemesLoading(true);
    setThemesError("");
    try {
      const res = await fetch(`${API_BASE_URL}/themes`);
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        const msg = formatApiError(data?.detail, "Could not load themes.");
        throw new Error(msg);
      }
      setThemeCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch (e) {
      setThemeCategories([]);
      setThemesError(e.message || "Could not load themes.");
    } finally {
      setThemesLoading(false);
    }
  }, []);

  const isAnimatedCardType = cardType === "animated";
  const playerDisplayName = playerNameFromForm(firstName, lastName, displayName);
  const creditBalance = Number(user?.credit_balance ?? 0);
  const animatedUpgradeCost = Number(generationPricing?.animated_upgrade_price ?? 10);
  const additionalPreviewCost = Number(generationPricing?.additional_preview_price ?? 0);
  const copyPricingTiers = useMemo(
    () => normalizeCopyTiers(generationPricing?.copy_pricing_tiers),
    [generationPricing?.copy_pricing_tiers]
  );
  const firstGenerateDue = isAnimatedCardType ? animatedUpgradeCost : 0;
  const canAffordFirstGenerate = creditBalance >= firstGenerateDue;
  const canAffordRegenerate = creditBalance >= additionalPreviewCost;
  const regenerateShortfall = Math.max(0, additionalPreviewCost - creditBalance);
  const firstGenerateShortfall = Math.max(0, firstGenerateDue - creditBalance);
  const motionDisplayName = isAnimatedCardType && selectedMotionId ? motionLabel(selectedMotionId) : "";
  const inCreationFlow = currentStep >= STEP_PHOTO && currentStep <= STEP_REVIEW;

  const detailsValidation = useMemo(
    () =>
      validatePlayerDetails(
        firstName,
        lastName,
        displayName,
        teamName,
        position,
        jerseyNumber,
        gradYear
      ),
    [firstName, lastName, displayName, teamName, position, jerseyNumber, gradYear]
  );

  const stepComplete = useMemo(
    () => ({
      [STEP_PHOTO]: Boolean(imageFile),
      [STEP_DETAILS]: detailsValidation.valid,
      [STEP_TIER]: Boolean(orderTier),
      [STEP_THEME]: Boolean(specialTheme),
      [STEP_CARD_TYPE]: Boolean(cardType),
      [STEP_MOTION]: !isAnimatedCardType || Boolean(selectedMotionId),
      [STEP_REVIEW]: true,
    }),
    [imageFile, detailsValidation.valid, orderTier, specialTheme, cardType, isAnimatedCardType, selectedMotionId]
  );

  const canAdvanceFromStep = stepComplete[currentStep] ?? false;

  const canCreateOrder = Boolean(
    currentStep === STEP_REVIEW &&
      reviewSubPhase === "setup" &&
      orderCustomerName.trim() &&
      orderCustomerEmail.trim() &&
      !isCreating &&
      !isGenerating
  );

  function goToStep(step) {
    if (step > currentStep) return;
    setCurrentStep(step);
  }

  function tryAdvanceStep() {
    if (currentStep === STEP_PHOTO) {
      if (!imageFile) {
        setPhotoStepError("Please upload a player photo to continue");
        return;
      }
      setPhotoStepError("");
      setCurrentStep(STEP_DETAILS);
      return;
    }
    if (currentStep === STEP_DETAILS) {
      setDetailsShowErrors(true);
      setDetailsErrors(detailsValidation.errors);
      if (!detailsValidation.valid) return;
      setCurrentStep(STEP_TIER);
      return;
    }
    if (currentStep === STEP_TIER) {
      if (!orderTier) {
        setTierStepError("Please select a tier");
        return;
      }
      setTierStepError("");
      setCurrentStep(STEP_THEME);
      return;
    }
    if (currentStep === STEP_THEME) {
      if (!specialTheme) {
        setThemeStepError("Please select a theme");
        return;
      }
      setThemeStepError("");
      setCurrentStep(STEP_CARD_TYPE);
      return;
    }
    if (currentStep === STEP_CARD_TYPE) {
      setCurrentStep(getNextWizardStep(STEP_CARD_TYPE, isAnimatedCardType));
      return;
    }
    if (currentStep === STEP_MOTION) {
      if (!selectedMotionId) {
        setMotionStepError("Please select a motion for your animated card");
        return;
      }
      setMotionStepError("");
      setCurrentStep(STEP_REVIEW);
    }
  }

  function goBackStep() {
    setCurrentStep(getPrevWizardStep(currentStep, isAnimatedCardType));
  }

  useEffect(() => {
    if (!isAnimatedCardType && currentStep === STEP_MOTION) {
      setCurrentStep(STEP_REVIEW);
    }
  }, [isAnimatedCardType, currentStep]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  useEffect(() => {
    if (!orderTier) {
      setGenerationPricing(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGenerationPrice(orderTier);
        if (!cancelled) {
          setGenerationPricing(data);
          setPricingError("");
        }
      } catch (e) {
        if (!cancelled) {
          setGenerationPricing(null);
          setPricingError(e.message || "Could not load pricing.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderTier]);

  useEffect(() => {
    if (!user || !token) return undefined;
    const onReview =
      currentStep === STEP_REVIEW &&
      (reviewSubPhase === "setup" || reviewSubPhase === "generate") &&
      (firstGenerateShortfall > 0 || regenerateShortfall > 0 || reviewSubPhase === "generate");
    if (!onReview && !inCreationFlow) return undefined;
    const id = window.setInterval(() => {
      refreshUser(token);
    }, 10000);
    return () => window.clearInterval(id);
  }, [
    user,
    token,
    currentStep,
    reviewSubPhase,
    firstGenerateShortfall,
    regenerateShortfall,
    inCreationFlow,
    refreshUser,
  ]);

  useEffect(() => {
    if (!previewCards.length) return;
    const currentExists = previewCards.some((p) => p.image_url === selectedPreviewUrl);
    if (!selectedPreviewUrl || !currentExists) {
      setSelectedPreviewUrl(previewCards[previewCards.length - 1].image_url);
    }
  }, [previewCards, selectedPreviewUrl]);

  const dismissPendingPrompt = useCallback(() => {
    setShowPendingPrompt(false);
    setShowDiscardConfirm(false);
    setPendingSession(null);
  }, []);

  const cleanupStalePending = useCallback(
    async (sessionId) => {
      if (token && sessionId) {
        try {
          await fetch(
            `${API_BASE_URL}/cards/pending?preview_session_id=${encodeURIComponent(sessionId)}`,
            { method: "DELETE", headers: { ...authHeaders(token) } }
          );
        } catch {
          /* best-effort cleanup */
        }
      }
      dismissPendingPrompt();
    },
    [token, dismissPendingPrompt]
  );

  const fetchPendingSession = useCallback(async () => {
    if (!token) {
      setPendingSession(null);
      return null;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/cards/pending`, {
        headers: { ...authHeaders(token) },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const session = data?.session || null;
      if (!session?.previews?.length) {
        setPendingSession(null);
        return null;
      }
      setPendingSession(session);
      return session;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (initializing || !token) return;
    fetchPendingSession().then((session) => {
      if (session?.previews?.length) setShowPendingPrompt(true);
    });
  }, [initializing, token, fetchPendingSession]);

  useEffect(() => {
    if (reviewSubPhase === "generate" && previewCards.length > 0) {
      setShowPendingPrompt(false);
    }
  }, [reviewSubPhase, previewCards.length]);

  useEffect(() => {
    const hasUnfinishedPreview =
      currentStep === STEP_REVIEW &&
      reviewSubPhase === "generate" &&
      previewCards.length > 0 &&
      !isOrderDelivered;

    if (!hasUnfinishedPreview) return undefined;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue =
        "You have an unfinished card. If you leave, you can resume from your collection page.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [currentStep, reviewSubPhase, previewCards.length, isOrderDelivered]);

  function applyDraftToWizard(draft) {
    if (!draft) return;
    setFirstName(draft.player_first_name || "");
    setLastName(draft.player_last_name || "");
    setDisplayName(draft.player_display_name || "");
    setJerseyNumber(draft.player_jersey_number || "");
    setPosition(draft.player_position || "");
    setGradYear(String(draft.player_grad_year || ""));
    setTeamName(draft.player_team_name || "");
    setOrderCustomerName(draft.customer_name || orderCustomerName);
    setOrderCustomerEmail(draft.customer_email || orderCustomerEmail);
    setOrderTier(draft.tier || "");
    setCardType(draft.card_type || "standard");
    setSpecialTheme(draft.special_theme || "");
    setSelectedMotionId(draft.selected_motion_id || "");
  }

  async function handleResumePending() {
    if (!pendingSession || !token) return;
    const sessionId = pendingSession.preview_session_id;
    setPendingActionLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/cards/pending/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ preview_session_id: sessionId }),
      });
      const order = await res.json();
      if (!res.ok) {
        await cleanupStalePending(sessionId);
        return;
      }

      const latestPreview = pendingSession.previews?.[pendingSession.previews.length - 1];
      if (latestPreview?.card_id) {
        try {
          const cardRes = await fetch(
            `${API_BASE_URL}/cards/${encodeURIComponent(latestPreview.card_id)}`,
            { headers: { ...authHeaders(token) } }
          );
          if (!cardRes.ok) {
            await cleanupStalePending(sessionId);
            return;
          }
        } catch {
          await cleanupStalePending(sessionId);
          return;
        }
      }

      applyDraftToWizard(pendingSession.draft);
      setOrders((prev) => {
        const without = prev.filter((row) => row.id !== order.id);
        return [...without, order];
      });
      setCurrentOrderId(order.id);

      const previewUrl = latestPreview?.image_url || "";
      setSelectedPreviewUrl(previewUrl);
      setGeneratedCardUrl(previewUrl);
      setGeneratedTier(latestPreview?.tier || "base");
      setCurrentStep(STEP_REVIEW);
      setReviewSubPhase("generate");
      setPreviewConfigureOpen(false);
      dismissPendingPrompt();
      setMessage("Welcome back — your preview is ready. No additional credits were charged.");
      await fetchOrders();
    } catch {
      await cleanupStalePending(sessionId);
    } finally {
      setPendingActionLoading(false);
    }
  }

  async function handleDiscardPending() {
    if (!pendingSession || !token) return;
    const sessionId = pendingSession.preview_session_id;
    setPendingActionLoading(true);
    setError("");
    try {
      await fetch(
        `${API_BASE_URL}/cards/pending?preview_session_id=${encodeURIComponent(sessionId)}`,
        {
          method: "DELETE",
          headers: { ...authHeaders(token) },
        }
      );
    } catch {
      /* dismiss even when discard fails */
    } finally {
      dismissPendingPrompt();
      setPendingActionLoading(false);
    }
  }

  useEffect(() => {
    const sel = previewCards.find((p) => p.image_url === selectedPreviewUrl);
    if (!sel?.card_id) {
      setSavedCardDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(sel.card_id)}`);
        if (!res.ok) throw new Error();
        const detail = await res.json();
        if (!cancelled) setSavedCardDetail(detail);
      } catch {
        if (!cancelled) setSavedCardDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPreviewUrl, previewCards]);

  useEffect(() => {
    if (currentStep !== STEP_REVIEW || reviewSubPhase !== "approve" || !activeOrder?.final_card_url) return;
    const match = (activeOrder.generated_cards || []).find((g) => g.image_url === activeOrder.final_card_url);
    if (!match?.card_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(match.card_id)}`);
        if (!res.ok) throw new Error();
        const detail = await res.json();
        if (!cancelled) setSavedCardDetail(detail);
      } catch {
        if (!cancelled) setSavedCardDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStep, reviewSubPhase, activeOrder]);

  async function fetchMyCards() {
    if (!token) {
      setCards([]);
      return;
    }
    const res = await fetch(`${API_BASE_URL}/cards/my-cards`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) throw new Error("Failed to load your cards.");
    const data = await res.json();
    setCards(Array.isArray(data) ? data : []);
  }

  async function fetchOrders() {
    if (!token) {
      setOrders([]);
      return;
    }
    const res = await fetch(`${API_BASE_URL}/orders`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) throw new Error("Failed to load orders.");
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setOrders(list);
  }

  useEffect(() => {
    if (initializing) return;
    Promise.all([fetchMyCards(), fetchOrders()]).catch((err) => {
      setError(err.message || "Could not load data.");
    });
  }, [token, initializing]);

  async function createPlayerFromCurrentForm() {
    const formData = new FormData();
    formData.append("file", imageFile);
    const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
      method: "POST",
      headers: { ...authHeaders(token) },
      body: formData,
    });
    if (!uploadRes.ok) throw new Error("Image upload failed.");
    const uploadData = await uploadRes.json();

    const playerRes = await fetch(`${API_BASE_URL}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim() || "N/A",
        display_name: displayName.trim() || null,
        jersey_number: jerseyNumber.trim(),
        position: position.trim(),
        grad_year: Number(gradYear),
        team_name: teamName.trim(),
        image_url: uploadData.url,
      }),
    });
    if (!playerRes.ok) {
      const detail = await playerRes.text();
      throw new Error(`Player creation failed. ${detail}`);
    }
    return playerRes.json();
  }

  async function handleGenerateForOrder(orderId) {
    setIsGenerating(true);
    setOrderActionKey(`generate-${orderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/generate-card`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Failed to generate order card."));
      setGeneratedCardUrl(data.image_url || "");
      setSelectedPreviewUrl(data.image_url || "");
      setGeneratedTier(data.tier || "base");
      setMessage(`Preview generated for order #${orderId}.`);
      await Promise.all([fetchMyCards(), fetchOrders(), refreshUser(token)]);
    } catch (err) {
      setError(err.message || "Failed to generate order card.");
    } finally {
      setIsGenerating(false);
      setOrderActionKey("");
    }
  }

  async function ensureOrderForGeneration() {
    if (currentOrderId) return currentOrderId;
    const playerData = await createPlayerFromCurrentForm();
    setPlayerId(playerData.id);
    setCurrentPlayer(playerData);

    const orderRes = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({
        customer_name: orderCustomerName.trim(),
        customer_email: orderCustomerEmail.trim(),
        player_first_name: playerData.first_name,
        player_last_name: playerData.last_name,
        player_display_name: playerData.display_name ?? null,
        player_jersey_number: playerData.jersey_number,
        player_position: playerData.position,
        player_grad_year: playerData.grad_year,
        player_team_name: playerData.team_name,
        player_image_url: playerData.image_url,
        tier: orderTier,
        card_type: cardType,
        special_theme: specialTheme || null,
        selected_motion_id: selectedMotionId || null,
        add_ons: [],
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(formatApiError(orderData?.detail, "Failed to create order."));
    setCurrentOrderId(orderData.id);
    await fetchOrders();
    return orderData.id;
  }

  async function handleGenerateFirstPreview() {
    if (isAnimatedCardType && !canAffordFirstGenerate) {
      setError(`You need ${formatMoney(firstGenerateDue)} in credits to generate this card.`);
      return;
    }
    setIsCreating(true);
    setOrderActionKey("generate-first");
    setMessage("");
    setError("");
    try {
      const orderId = await ensureOrderForGeneration();
      setReviewSubPhase("generate");
      await handleGenerateForOrder(orderId);
      setPreviewConfigureOpen(false);
    } catch (err) {
      setError(err.message || "Failed to start generation.");
    } finally {
      setIsCreating(false);
      setOrderActionKey("");
    }
  }

  async function handleGeneratePreviewForCurrentOrder() {
    if (!currentOrderId) return setError("Create an order first.");
    if (isPreviewLimitReached) return setError("You've reached your preview limit");
    if (activePreviewCount > 0 && !canAffordRegenerate) {
      setError(`You need ${formatMoney(additionalPreviewCost)} to generate another preview.`);
      setShowRegenerateConfirm(false);
      return;
    }
    setShowRegenerateConfirm(false);
    setPreviewConfigureOpen(false);
    await handleGenerateForOrder(currentOrderId);
  }

  async function handleConfirmAddToCollection(quantity) {
    if (!currentOrderId) return setError("Create an order first.");
    if (!selectedPreviewUrl && !generatedCardUrl) return setError("Select a preview first.");
    const { extra: extraCopies, total: extraCost } = copyChargeForQuantity(quantity, 1, copyPricingTiers);
    if (extraCost > creditBalance) {
      setError(`You need ${formatMoney(extraCost)} in credits for ${extraCopies} additional ${extraCopies === 1 ? "copy" : "copies"}.`);
      return;
    }
    setAddCollectionLoading(true);
    setOrderActionKey(`approve-${currentOrderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/approve-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ image_url: selectedPreviewUrl || generatedCardUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Failed to add card to collection."));
      if (data.final_card_url) setGeneratedCardUrl(data.final_card_url);

      const sel = previewCards.find((p) => p.image_url === (selectedPreviewUrl || generatedCardUrl));
      const cardId = sel?.card_id;
      if (cardId) await fetchCardDetailById(cardId);

      if (quantity > 1 && cardId) {
        const dupRes = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({ quantity }),
        });
        const dupData = await dupRes.json().catch(() => ({}));
        if (!dupRes.ok) {
          throw new Error(formatApiError(dupData?.detail, "Could not create additional copies."));
        }
        if (cardId) await fetchCardDetailById(cardId);
      }

      setMessage(`Order #${currentOrderId} completed and added to your collection.`);
      await Promise.all([fetchOrders(), fetchMyCards(), refreshUser(token)]);
      setPendingSession(null);
      setShowPendingPrompt(false);

      if (isAnimatedCardType && selectedMotionId && cardId) {
        await startCardAnimation(cardId);
        return;
      }
      setReviewSubPhase("approve");
      setPreviewConfigureOpen(false);
    } catch (err) {
      setError(err.message || "Failed to add card to collection.");
    } finally {
      setAddCollectionLoading(false);
      setOrderActionKey("");
    }
  }

  async function fetchCardDetailById(cardId) {
    const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
      headers: { ...authHeaders(token) },
    });
    if (!res.ok) throw new Error("Could not load card.");
    const detail = await res.json();
    setSavedCardDetail(detail);
    return detail;
  }

  async function startCardAnimation(cardId) {
    const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/animate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ motion_id: selectedMotionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start animation."));
    setAnimationFailed(false);
    setAnimationLoadingCardId(cardId);
  }

  async function handleAnimationComplete() {
    if (animationLoadingCardId) {
      try {
        await fetchCardDetailById(animationLoadingCardId);
      } catch {
        /* keep prior detail */
      }
    }
    setAnimationLoadingCardId(null);
    setAnimationFailed(false);
    setReviewSubPhase("approve");
    setCurrentStep(STEP_REVIEW);
    await Promise.all([fetchMyCards(), fetchOrders(), refreshUser(token)]);
  }

  function handlePhotoFileSelect(file) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setPhotoStepError("");
    setError("");
    setMessage(`Photo uploaded: ${file.name}`);
  }

  function handleDropFile(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handlePhotoFileSelect(file);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

      {showPendingPrompt && pendingSession ? (
        <PendingCardResumePrompt
          session={pendingSession}
          loading={pendingActionLoading}
          showDiscardConfirm={showDiscardConfirm}
          onResume={handleResumePending}
          onDiscardRequest={() => setShowDiscardConfirm(true)}
          onDiscardConfirm={handleDiscardPending}
          onDiscardCancel={() => setShowDiscardConfirm(false)}
          onDismiss={dismissPendingPrompt}
        />
      ) : null}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        <section className="rounded-2xl border border-white/10 bg-cardBg p-3 shadow-xl shadow-black/30 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Card Creation Experience</h2>
              <p className="text-xs text-slate-400">Guided flow to create your collectible cards.</p>
              {!initializing && !user ? (
                <p className="mt-2 text-xs text-neonTeal/90">
                  Sign up or log in to enter player details and create your own collectible cards.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {(message || error) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm shadow-lg ${
              error
                ? "border-rose-500/40 bg-rose-500/10 text-rose-100"
                : "border-neonTeal/40 bg-neonTeal/10 text-teal-100"
            }`}
          >
            {error || message}
          </div>
        )}

        {animationFailed ? (
          <section className="animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
            <AnimationFailedScreen cardId={savedCardDetail?.card_id} />
          </section>
        ) : animationLoadingCardId ? (
          <section className="animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
            <AnimationLoadingScreen
              cardId={animationLoadingCardId}
              token={token}
              onCompleted={handleAnimationComplete}
              onFailed={() => {
                setAnimationFailed(true);
                setAnimationLoadingCardId(null);
              }}
            />
          </section>
        ) : (
        <section className="animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
            <WizardProgress
              currentStep={currentStep}
              isAnimated={isAnimatedCardType}
              onGoToStep={goToStep}
            />

            {user && inCreationFlow ? (
              <div className="mb-6">
                <StudioCreditBalance balance={creditBalance} />
              </div>
            ) : null}

            {!user && currentStep >= STEP_DETAILS ? (
              <StudioAuthGate
                onBackToTiers={() => goToStep(STEP_PHOTO)}
                backLabel="← Back to photo upload"
              />
            ) : (
              <>
            {currentStep === STEP_PHOTO ? (
              <div className="grid gap-4">
                <input
                  id="studio-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handlePhotoFileSelect(e.target.files?.[0] || null);
                    e.target.value = "";
                  }}
                />
                {photoStepError ? (
                  <p className="text-sm text-rose-300">{photoStepError}</p>
                ) : null}
                {!imageFile ? (
                  <label
                    htmlFor="studio-photo-upload"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      handleDropFile(e);
                      setPhotoStepError("");
                    }}
                    className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                      dragActive
                        ? "border-neonBlue/70 bg-neonBlue/10"
                        : photoStepError
                          ? "border-rose-500/50 bg-rose-500/5"
                          : "border-white/20 bg-cardBg2 hover:border-neonBlue/40"
                    }`}
                  >
                    <p className="text-sm text-slate-200">Drag & drop player photo</p>
                    <p className="text-xs text-slate-400">or click to choose an image</p>
                  </label>
                ) : (
                  <>
                    <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-white/15 bg-zinc-900/70 p-4 sm:min-h-[300px]">
                      <img
                        src={imagePreviewUrl}
                        alt="Upload preview"
                        className="max-h-[min(480px,60vh)] w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                      <span className="text-emerald-300" aria-hidden>
                        ✓
                      </span>
                      <p className="text-sm text-emerald-100">
                        <span className="font-medium text-emerald-50">Photo uploaded</span>
                        <span className="text-emerald-200/90"> — {imageFile.name}</span>
                      </p>
                    </div>
                    <label
                      htmlFor="studio-photo-upload"
                      className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 sm:w-auto"
                    >
                      Replace Photo
                    </label>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    Continue to Player Details
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_DETAILS ? (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.playerName)}`}
                      placeholder="First Name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.playerName)}`}
                      placeholder="Last Name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                    {detailsShowErrors && detailsErrors.playerName ? (
                      <p className="mt-1 text-xs text-rose-300">{detailsErrors.playerName}</p>
                    ) : null}
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.playerName)}`}
                      placeholder="Display Name (optional — used as player name if set)"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.jerseyNumber)}`}
                      placeholder="Jersey Number *"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                    />
                    {detailsShowErrors && detailsErrors.jerseyNumber ? (
                      <p className="mt-1 text-xs text-rose-300">{detailsErrors.jerseyNumber}</p>
                    ) : null}
                  </div>
                  <div>
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.position)}`}
                      placeholder="Position *"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                    />
                    {detailsShowErrors && detailsErrors.position ? (
                      <p className="mt-1 text-xs text-rose-300">{detailsErrors.position}</p>
                    ) : null}
                  </div>
                  <div>
                    <input
                      type="number"
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.gradYear)}`}
                      placeholder="Grad Year *"
                      value={gradYear}
                      onChange={(e) => setGradYear(e.target.value)}
                    />
                    {detailsShowErrors && detailsErrors.gradYear ? (
                      <p className="mt-1 text-xs text-rose-300">{detailsErrors.gradYear}</p>
                    ) : null}
                  </div>
                  <div>
                    <input
                      className={`min-h-[44px] w-full rounded-xl border bg-cardBg2 px-3 py-2.5 ${fieldErrorClass(detailsShowErrors && detailsErrors.teamName)}`}
                      placeholder="Team Name *"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                    {detailsShowErrors && detailsErrors.teamName ? (
                      <p className="mt-1 text-xs text-rose-300">{detailsErrors.teamName}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    Continue to Tier Selection
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_TIER ? (
              <div className="grid gap-4">
                {tierStepError ? (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {tierStepError}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { value: "rookie", ...TIER_UI.rookie },
                    { value: "all_star", ...TIER_UI.all_star },
                    { value: "legends", ...TIER_UI.legends },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setOrderTier(opt.value);
                        setTierStepError("");
                      }}
                      className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
                        orderTier === opt.value
                          ? opt.active
                          : tierStepError
                            ? `${opt.card} ring-1 ring-rose-500/40`
                            : opt.card
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_38%)] opacity-35 transition-opacity group-hover:opacity-55" />
                      <p className="font-medium text-white">{opt.label}</p>
                      <p className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${opt.pill}`}>
                        {opt.sub}
                      </p>
                      <p className="mt-2 text-xs text-slate-200/90">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    Continue to Theme Selection
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_THEME ? (
              <div className="grid gap-4">
                {themeStepError ? (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                    {themeStepError}
                  </p>
                ) : null}
                <ThemeLibraryPicker
                  categories={themeCategories}
                  loading={themesLoading}
                  error={themesError}
                  onRetry={fetchThemes}
                  value={specialTheme}
                  onChange={(id) => {
                    setSpecialTheme(id);
                    setThemeStepError("");
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    Continue to Card Type
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_CARD_TYPE ? (
              <div className="grid gap-4">
                <CardTypeStep
                  value={cardType}
                  onChange={(type) => {
                    setCardType(type);
                    if (type === "standard") setSelectedMotionId("");
                  }}
                  animatedUpgradePrice={generationPricing?.animated_upgrade_price ?? 10}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    {isAnimatedCardType ? "Continue to Motion Selection" : "Continue to Review"}
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_MOTION && isAnimatedCardType ? (
              <div className="grid gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Choose Your Player&apos;s Motion</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Select how your player moves in the animation
                  </p>
                </div>
                <MotionSelectionGrid
                  value={selectedMotionId}
                  onChange={(id) => {
                    setSelectedMotionId(id);
                    setMotionStepError("");
                  }}
                  error={motionStepError}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!canAdvanceFromStep}
                    onClick={tryAdvanceStep}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_REVIEW && reviewSubPhase === "setup" ? (
              <div className="grid gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-white">Review & Generate</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Confirm your choices. Your first preview is free — additional previews and copies use credits.
                  </p>
                  {pricingError ? (
                    <p className="mt-2 text-sm text-rose-300">{pricingError}</p>
                  ) : null}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-cardBg2 p-3 sm:p-4">
                    <p className="text-sm font-medium text-white">Delivery Contact</p>
                    <p className="mt-1 text-xs text-slate-400">
                      These details are attached to the order for fulfillment and delivery.
                    </p>
                    <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-300">
                      Customer Name
                    </label>
                    <input
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2.5"
                    />
                    <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-slate-300">
                      Customer Email
                    </label>
                    <input
                      value={orderCustomerEmail}
                      onChange={(e) => setOrderCustomerEmail(e.target.value)}
                      placeholder="Enter customer email"
                      className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-cardBg px-3 py-2.5"
                    />
                  </div>
                  <GenerationCostSummary
                    playerName={playerDisplayName}
                    teamName={teamName}
                    position={position}
                    jerseyNumber={jerseyNumber}
                    gradYear={gradYear}
                    tierLabel={selectedTierLabel}
                    themeLabel={specialTheme ? selectedThemeLabel : ""}
                    isAnimated={isAnimatedCardType}
                    motionName={motionDisplayName}
                    copyQuantity={copyQuantity}
                    pricing={generationPricing}
                    creditBalance={creditBalance}
                    phase="pre-generate"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateFirstPreview}
                    disabled={
                      !canCreateOrder ||
                      !generationPricing ||
                      (isAnimatedCardType && !canAffordFirstGenerate) ||
                      Boolean(orderActionKey)
                    }
                    className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-neonTeal px-6 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 sm:flex-none"
                  >
                    {orderActionKey === "generate-first"
                      ? "Generating..."
                      : isAnimatedCardType
                        ? `Generate My Card — ${formatMoney(firstGenerateDue)}`
                        : "Generate My Card — Free Preview"}
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_REVIEW && reviewSubPhase === "generate" ? (
              <div className="grid gap-6">
                {!isGenerating ? (
                  <>
                    <GenerationCostSummary
                      playerName={playerDisplayName}
                      teamName={teamName}
                      position={position}
                      jerseyNumber={jerseyNumber}
                      gradYear={gradYear}
                      tierLabel={selectedTierLabel}
                      themeLabel={specialTheme ? selectedThemeLabel : ""}
                      isAnimated={isAnimatedCardType}
                      motionName={motionDisplayName}
                      copyQuantity={copyQuantity}
                      pricing={generationPricing}
                      creditBalance={creditBalance}
                      phase="pre-generate"
                    />

                    {activePreviewCount > 0 ? (
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                        <p className="font-medium text-cyan-50">This is your free preview.</p>
                        <p className="mt-1 text-xs text-cyan-100/90">
                          Regenerate for {formatMoney(additionalPreviewCost)} per attempt if you&apos;d like a different
                          result. Only the card you choose will be added to your collection.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {isGenerating ? (
                  <PreviewGenerationLoading tierLabel={selectedTierLabel} tierTheme={tierTheme} />
                ) : previewCards.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleGenerateFirstPreview}
                    disabled={Boolean(orderActionKey)}
                    className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-white disabled:opacity-50 ${tierTheme.loading}`}
                  >
                    {isAnimatedCardType
                      ? `Generate My Card — ${formatMoney(firstGenerateDue)}`
                      : "Generate My Card — Free Preview"}
                  </button>
                ) : (
                  <>
                    {previewCards.length > 1 ? (
                      <div className="rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-center">
                        <p className="text-base font-semibold text-white">
                          Pick your favorite — only the card you choose will be added to your collection
                        </p>
                      </div>
                    ) : null}

                    {!previewConfigureOpen ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {previewCards.map((preview, idx) => (
                          <div
                            key={`${preview.image_url}-${idx}`}
                            className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                              selectedPreviewUrl === preview.image_url
                                ? `${tierTheme.active} shadow-glowBlue`
                                : tierTheme.card
                            }`}
                          >
                            <img
                              src={toApiUrl(preview.image_url)}
                              alt={`Preview ${idx + 1}`}
                              className="block aspect-[2/3] h-auto w-full object-contain bg-black/20"
                            />
                            <div className="space-y-2 bg-cardBg2 p-3">
                              <p className="text-xs text-slate-400">
                                <span className={`rounded-full border px-1.5 py-0.5 ${tierTheme.pill}`}>
                                  {tierTheme.sub}
                                </span>{" "}
                                Preview {idx + 1}
                              </p>
                              {previewCards.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPreviewUrl(preview.image_url);
                                    setPreviewConfigureOpen(true);
                                  }}
                                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950"
                                >
                                  Choose This Card
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPreviewUrl(preview.image_url);
                                    setPreviewConfigureOpen(true);
                                  }}
                                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-semibold text-slate-950"
                                >
                                  Add This Card to My Collection
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {previewConfigureOpen ? (
                      <div className="rounded-2xl border border-neonTeal/30 bg-cardBg2 p-4 sm:p-6">
                        <p className="text-center text-sm font-medium text-white">Confirm your card</p>
                        <div className="mx-auto mt-4 max-w-xs overflow-hidden rounded-xl border border-white/10">
                          <img
                            src={toApiUrl(selectedPreviewUrl || generatedCardUrl)}
                            alt="Selected preview"
                            className="block w-full object-contain"
                          />
                        </div>
                        <GenerationCostSummary
                          playerName={playerDisplayName}
                          teamName={teamName}
                          position={position}
                          jerseyNumber={jerseyNumber}
                          gradYear={gradYear}
                          tierLabel={selectedTierLabel}
                          themeLabel={specialTheme ? selectedThemeLabel : ""}
                          isAnimated={isAnimatedCardType}
                          motionName={motionDisplayName}
                          copyQuantity={copyQuantity}
                          pricing={generationPricing}
                          creditBalance={creditBalance}
                          phase="confirm"
                          showBalance
                        />
                        <QuantitySelector
                          disabled={addCollectionLoading}
                          loading={addCollectionLoading}
                          copyPricingTiers={copyPricingTiers}
                          value={copyQuantity}
                          onChange={setCopyQuantity}
                          onConfirm={handleConfirmAddToCollection}
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewConfigureOpen(false)}
                          className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-200"
                        >
                          ← Back to previews
                        </button>
                      </div>
                    ) : null}

                    {!previewConfigureOpen && previewCards.length === 1 ? (
                      <div className="text-center">
                        <p className="text-sm text-slate-400">
                          Not happy with it? Generate another preview for {formatMoney(additionalPreviewCost)}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canAffordRegenerate) {
                              setError(
                                `You need ${formatMoney(additionalPreviewCost)} to generate another preview.`
                              );
                              return;
                            }
                            setShowRegenerateConfirm(true);
                          }}
                          disabled={isPreviewLimitReached || Boolean(orderActionKey)}
                          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-5 py-2 text-sm font-medium text-slate-100 disabled:opacity-50"
                        >
                          Try Again — {formatMoney(additionalPreviewCost)}
                        </button>
                      </div>
                    ) : null}

                    {!previewConfigureOpen && previewCards.length > 1 && !isPreviewLimitReached ? (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canAffordRegenerate) {
                              setError(
                                `You need ${formatMoney(additionalPreviewCost)} to generate another preview.`
                              );
                              return;
                            }
                            setShowRegenerateConfirm(true);
                          }}
                          disabled={Boolean(orderActionKey)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-5 py-2 text-sm font-medium text-slate-100 disabled:opacity-50"
                        >
                          Generate Another Preview — {formatMoney(additionalPreviewCost)}
                        </button>
                      </div>
                    ) : null}

                    {!canAffordRegenerate && activePreviewCount > 0 ? (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <p>
                          You need {formatMoney(additionalPreviewCost)} to generate another preview.
                        </p>
                        <p className="mt-1">Your balance: {formatMoney(creditBalance)}</p>
                        <a
                          href="/credits"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950"
                        >
                          Add Credits
                        </a>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {currentStep === STEP_REVIEW && reviewSubPhase === "approve" ? (
              <div className="grid gap-6">
                {savedCardDetail ? (
                  <PostGenerationPanel
                    detail={savedCardDetail}
                    onViewCollection={() => navigate("/my-collection")}
                    isLoggedIn={Boolean(user)}
                    showQuantityFlow={false}
                    token={token || ""}
                    onRefreshDetail={refreshSavedCardDetail}
                    onCardsUpdated={fetchMyCards}
                    copyPricingTiers={copyPricingTiers}
                  />
                ) : null}
                {!isAnimatedCardType ? (
                <div className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-4">
                  <p className="text-base font-semibold text-emerald-100">Card Delivered</p>
                  <p className="mt-1 text-sm text-emerald-50/90">
                    Your final card has been approved and delivered automatically.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={deliveredCardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100"
                    >
                      View Final Card
                    </a>
                    <a
                      href={deliveredCardUrl}
                      download
                      className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100"
                    >
                      Download Card
                    </a>
                  </div>
                </div>
                ) : (
                <div className="rounded-xl border border-violet-300/35 bg-violet-400/10 p-4">
                  <p className="text-base font-semibold text-violet-100">Animated Card Ready</p>
                  <p className="mt-1 text-sm text-violet-50/90">
                    Your animated card is live in your collection.
                  </p>
                </div>
                )}
              </div>
            ) : null}
              </>
            )}
          </section>
        )}

        <FeaturedCard imageUrl={generatedCardFullUrl} tier={generatedTier} loading={isGenerating} />
        {user ? <CardGallery cards={cards} /> : null}
      </main>

      {showRegenerateConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl shadow-black/50 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Generate another preview?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Generate another preview for {formatMoney(additionalPreviewCost)}?
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Your balance: <span className="font-semibold text-neonTeal">{formatMoney(creditBalance)}</span>
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="min-h-[42px] rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePreviewForCurrentOrder}
                disabled={!canAffordRegenerate}
                className="min-h-[42px] rounded-lg bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {`Generate — ${formatMoney(additionalPreviewCost)}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AppFooter />
    </div>
  );
}
