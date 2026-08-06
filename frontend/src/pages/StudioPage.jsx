import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import FeaturedCard from "../components/FeaturedCard";
import CardImage from "../components/CardImage";
import CardGallery from "../components/CardGallery";
import PostGenerationPanel from "../components/PostGenerationPanel";
import StudioAuthGate from "../components/StudioAuthGate";
import StudioCreditBalance from "../components/StudioCreditBalance";
import GenerationCostSummary from "../components/GenerationCostSummary";
import GenerationCapNotice, { GenerationDailyUsageHint } from "../components/GenerationCapNotice";
import ThemeLibraryPicker from "../components/ThemeLibraryPicker";
import CardTypeStep from "../components/CardTypeStep";
import HighlightCardPreview from "../components/HighlightCardPreview";
import ExpandableCardView from "../components/ExpandableCardView";
import { buildHighlightPreviewCard } from "../utils/highlightCard";
import HighlightVideoStep from "../components/HighlightVideoStep";
import HighlightProcessingScreen from "../components/HighlightProcessingScreen";
import QuantitySelector from "../components/QuantitySelector";
import ActionCategoryStep from "../components/ActionCategoryStep";
import MotionSelectionGrid from "../components/MotionSelectionGrid";
import AnimationLoadingScreen from "../components/AnimationLoadingScreen";
import PendingCardResumePrompt from "../components/PendingCardResumePrompt";
import AnimateCardConfirmModal from "../components/AnimateCardConfirmModal";
import AnimatedCardChoiceModal from "../components/AnimatedCardChoiceModal";
import AnimatedQuantityModal from "../components/AnimatedQuantityModal";
import CardCreationExperience from "../components/CardCreationExperience";
import StartOverConfirmModal, { StartOverButton } from "../components/StartOverConfirmModal";
import AnimatedFlowExplainer from "../components/AnimatedFlowExplainer";
import AnimatedAiDisclaimer from "../components/AnimatedAiDisclaimer";
import { motionLabel } from "../constants/animationMotions";
import {
  getActionCategory,
  isSingleMotionCategory,
  motionIdsForActionCategory,
} from "../constants/actionCategories";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useFeatures } from "../context/FeatureContext";
import { useNewCardCelebration } from "../context/NewCardCelebrationContext";
import { fetchGenerationPrice } from "../utils/cardPricing";
import { copyChargeForQuantity, normalizeCopyTiers } from "../utils/copyPricing";
import { formatMoney } from "../utils/marketplace";
import { creditTopUpShortfallMessage } from "../utils/credits";
import {
  fetchGenerationUsage,
  generationCapBlocked,
  generationUsageFromPayload,
} from "../utils/generationUsage";
import { scrollAfterPaint } from "../utils/smoothScroll";
import { cleanupFailedHighlightCard, uploadHighlightClip } from "../utils/uploadHighlightClip";
import { captureVideoFrameAsFile } from "../utils/highlightVideo";

const STEP_DETAILS = 1;
const STEP_TIER = 2;
const STEP_THEME = 3;
const STEP_CARD_TYPE = 4;
const STEP_UPLOAD = 5;
const STEP_ACTION = 6;
const STEP_MOTION = 7;
const STEP_HIGHLIGHT_VIDEO = 8;
const STEP_REVIEW = 9;
const TOTAL_WIZARD_STEPS = 9;

const WIZARD_STEP_LABELS = {
  [STEP_DETAILS]: "Player Details",
  [STEP_TIER]: "Choose Tier",
  [STEP_THEME]: "Choose Theme",
  [STEP_CARD_TYPE]: "Choose Card Type",
  [STEP_UPLOAD]: "Upload",
  [STEP_ACTION]: "Tag Your Action",
  [STEP_MOTION]: "Choose Motion",
  [STEP_HIGHLIGHT_VIDEO]: "Trim Highlight",
  [STEP_REVIEW]: "Review & Generate",
};

function wizardStepLabel(step, cardType) {
  if (step === STEP_UPLOAD) {
    return cardType === "highlight" ? "Upload Video" : "Upload Photo";
  }
  return WIZARD_STEP_LABELS[step] || "";
}

const ANIMATED_FLOW_STAGE = {
  IDLE: "idle",
  GENERATING_STATIC: "generating_static",
  CHOICE: "choice",
  QUANTITY: "quantity",
  STARTING_ANIMATION: "starting_animation",
  ANIMATING: "animating",
};

function isAnimatedOnlyStep(step) {
  return step === STEP_ACTION || step === STEP_MOTION;
}

function isHighlightOnlyStep(step) {
  return step === STEP_HIGHLIGHT_VIDEO;
}

function getNextWizardStep(step, cardType) {
  const isAnimated = cardType === "animated";
  const isHighlight = cardType === "highlight";
  if (step === STEP_DETAILS) return STEP_TIER;
  if (step === STEP_TIER) return STEP_THEME;
  if (step === STEP_THEME) return STEP_CARD_TYPE;
  if (step === STEP_CARD_TYPE) return STEP_UPLOAD;
  if (step === STEP_UPLOAD) {
    if (isAnimated) return STEP_ACTION;
    if (isHighlight) return STEP_HIGHLIGHT_VIDEO;
    return STEP_REVIEW;
  }
  if (step === STEP_ACTION) return STEP_MOTION;
  if (step === STEP_MOTION) return STEP_REVIEW;
  if (step === STEP_HIGHLIGHT_VIDEO) return STEP_REVIEW;
  return Math.min(step + 1, STEP_REVIEW);
}

function getPrevWizardStep(step, cardType, actionCategory = "") {
  const isAnimated = cardType === "animated";
  const isHighlight = cardType === "highlight";
  if (step === STEP_REVIEW) {
    if (isHighlight) return STEP_HIGHLIGHT_VIDEO;
    if (isAnimated) {
      if (isSingleMotionCategory(actionCategory)) return STEP_ACTION;
      return STEP_MOTION;
    }
    return STEP_UPLOAD;
  }
  if (step === STEP_HIGHLIGHT_VIDEO) return STEP_UPLOAD;
  if (step === STEP_MOTION) return STEP_ACTION;
  if (step === STEP_ACTION) return STEP_UPLOAD;
  if (step === STEP_UPLOAD) return STEP_CARD_TYPE;
  if (step === STEP_CARD_TYPE) return STEP_THEME;
  if (step === STEP_THEME) return STEP_TIER;
  if (step === STEP_TIER) return STEP_DETAILS;
  return Math.max(step - 1, STEP_DETAILS);
}

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


function fieldErrorClass(hasError) {
  return hasError ? "border-rose-500/60 ring-1 ring-rose-500/30" : "border-white/15";
}

function WizardProgress({ currentStep, isAnimated, isHighlight, cardType, onGoToStep }) {
  const progressPct = Math.round((currentStep / TOTAL_WIZARD_STEPS) * 100);
  const currentLabel = wizardStepLabel(currentStep, cardType);
  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-cardBg2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Step {currentStep} of {TOTAL_WIZARD_STEPS}
        </p>
        <p className="text-sm font-semibold text-white">{currentLabel}</p>
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
          if (isAnimatedOnlyStep(step) && !isAnimated) return null;
          if (isHighlightOnlyStep(step) && !isHighlight) return null;
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
              <span className="hidden sm:inline">{wizardStepLabel(step, cardType)}</span>
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

export default function StudioPage() {
  const navigate = useNavigate();
  const { token, user, initializing, refreshUser } = useAuth();
  const { showCelebration } = useNewCardCelebration();
  const { highlightCardPrice } = useFeatures();
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
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);

  const [playerId, setPlayerId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [generatedTier, setGeneratedTier] = useState("base");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState("");

  const [cards, setCards] = useState([]);
  const [orders, setOrders] = useState([]);

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
  const [actionCategory, setActionCategory] = useState("");
  const [motionStepMode, setMotionStepMode] = useState("select");
  const [actionStepError, setActionStepError] = useState("");
  const [motionStepError, setMotionStepError] = useState("");
  const [reviewSubPhase, setReviewSubPhase] = useState("setup");
  const [photoStepError, setPhotoStepError] = useState("");
  const [detailsErrors, setDetailsErrors] = useState({});
  const [detailsShowErrors, setDetailsShowErrors] = useState(false);
  const [tierStepError, setTierStepError] = useState("");
  const [themeStepError, setThemeStepError] = useState("");
  const [animationLoadingCardId, setAnimationLoadingCardId] = useState(null);
  const [animationFailed, setAnimationFailed] = useState(false);
  const [animationConfirmed, setAnimationConfirmed] = useState(false);
  const [generationPricing, setGenerationPricing] = useState(null);
  const [pricingError, setPricingError] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showAnimateConfirm, setShowAnimateConfirm] = useState(false);
  const [showAnimatedFlowExplainer, setShowAnimatedFlowExplainer] = useState(false);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [startOverBusy, setStartOverBusy] = useState(false);
  const [packOpeningActive, setPackOpeningActive] = useState(false);
  const [previewConfigureOpen, setPreviewConfigureOpen] = useState(false);
  const [animatedFlowStage, setAnimatedFlowStage] = useState(ANIMATED_FLOW_STAGE.IDLE);
  const [animatedSaveStaticFlow, setAnimatedSaveStaticFlow] = useState(false);
  const [latestGeneratedPreview, setLatestGeneratedPreview] = useState(null);
  const [previewPollCardId, setPreviewPollCardId] = useState("");
  const [addCollectionLoading, setAddCollectionLoading] = useState(false);
  const [copyQuantity, setCopyQuantity] = useState(1);
  const [pendingSession, setPendingSession] = useState(null);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingActionLoading, setPendingActionLoading] = useState(false);
  const [highlightClipDraft, setHighlightClipDraft] = useState(null);
  const [highlightUploadProgress, setHighlightUploadProgress] = useState(0);
  const [highlightUploadState, setHighlightUploadState] = useState("idle"); // idle | uploading | processing | done | error
  const [highlightUploadError, setHighlightUploadError] = useState("");
  const [highlightProcessingCardId, setHighlightProcessingCardId] = useState("");
  const [highlightProcessingCard, setHighlightProcessingCard] = useState(null);
  const [generationUsage, setGenerationUsage] = useState(null);

  const generationCap = useMemo(() => generationCapBlocked(generationUsage), [generationUsage]);

  const loadGenerationUsage = useCallback(async () => {
    if (!token) {
      setGenerationUsage(null);
      return;
    }
    const usage = await fetchGenerationUsage(token);
    setGenerationUsage(usage);
  }, [token]);

  const wizardPanelRef = useRef(null);
  const generationFocusRef = useRef(null);
  const configureFocusRef = useRef(null);
  const approveFocusRef = useRef(null);
  const animationFocusRef = useRef(null);
  const regenerateModalRef = useRef(null);
  const prevStepRef = useRef(currentStep);
  const prevGeneratingRef = useRef(false);
  const prevReviewSubPhaseRef = useRef(reviewSubPhase);
  const prevPreviewConfigureRef = useRef(false);
  const prevAnimationLoadingRef = useRef(null);
  const animatedChoiceShownForRef = useRef("");
  const animatedFlowStageRef = useRef(ANIMATED_FLOW_STAGE.IDLE);
  const animationConfirmedRef = useRef(false);
  const previewPollGenerationRef = useRef(0);

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
  const imagePreviewUrl = useMemo(() => {
    if (uploadedPhotoUrl) return uploadedPhotoUrl;
    return imageFile ? URL.createObjectURL(imageFile) : "";
  }, [imageFile, uploadedPhotoUrl]);
  const generatedCardFullUrl = useMemo(() => toApiUrl(generatedCardUrl), [generatedCardUrl]);
  const playerDisplayName = playerNameFromForm(firstName, lastName, displayName);
  const isAnimatedCardType = cardType === "animated";
  const isHighlightCardType = cardType === "highlight";

  function previewToDisplayCard(preview) {
    return {
      card_id: preview.card_id,
      player_name: preview.player_name || playerDisplayName,
      team_name: preview.team_name || teamName,
      position,
      jersey_number: jerseyNumber,
      grad_year: gradYear,
      tier: orderTier || preview.tier || "rookie",
      theme: specialTheme,
      special_theme: specialTheme,
      image_url: preview.image_url,
      edition_number: preview.edition_number || 1,
      print_run: preview.print_run || 1,
      is_highlight: isHighlightCardType || preview.is_highlight,
      highlight_video_url:
        savedCardDetail?.highlight_video_url ||
        (isHighlightCardType && highlightClipDraft?.objectUrl ? highlightClipDraft.objectUrl : undefined),
      highlight_trim_start: savedCardDetail?.highlight_trim_start ?? highlightClipDraft?.trimStart ?? 0,
      highlight_trim_end: savedCardDetail?.highlight_trim_end ?? highlightClipDraft?.trimEnd ?? null,
      highlight_status:
        savedCardDetail?.highlight_status ||
        (isHighlightCardType && highlightClipDraft?.confirmed ? "preview" : undefined),
    };
  }

  const activeOrder = useMemo(
    () => orders.find((order) => order.id === currentOrderId) || null,
    [orders, currentOrderId]
  );
  const previewCards = activeOrder?.generated_cards || [];

  const wizardPreviewCard = useMemo(() => {
    const imageUrl =
      generatedCardUrl ||
      selectedPreviewUrl ||
      uploadedPhotoUrl ||
      imagePreviewUrl ||
      "";
    return {
      player_name: playerDisplayName,
      team_name: teamName,
      position,
      jersey_number: jerseyNumber,
      grad_year: gradYear,
      tier: orderTier || "rookie",
      theme: specialTheme,
      special_theme: specialTheme,
      image_url: imageUrl,
      edition_number: 1,
      print_run: 1,
    };
  }, [
    generatedCardUrl,
    selectedPreviewUrl,
    uploadedPhotoUrl,
    imagePreviewUrl,
    playerDisplayName,
    teamName,
    position,
    jerseyNumber,
    gradYear,
    orderTier,
    specialTheme,
  ]);

  const highlightRevealCardId = useMemo(() => {
    if (!isHighlightCardType) return "";
    return (
      previewPollCardId ||
      previewCards[previewCards.length - 1]?.card_id ||
      savedCardDetail?.card_id ||
      ""
    );
  }, [isHighlightCardType, previewPollCardId, previewCards, savedCardDetail?.card_id]);

  const handleHighlightVideoReady = useCallback((data) => {
    if (!data?.highlight_video_url) return;
    setSavedCardDetail((prev) => ({
      ...(prev && typeof prev === "object" ? prev : {}),
      ...data,
      highlight_video_url: data.highlight_video_url,
      is_highlight: true,
      highlight_status: data.highlight_status || "completed",
    }));
  }, []);

  const featuredDisplayCard = useMemo(() => {
    if (savedCardDetail) {
      if (
        isHighlightCardType &&
        !savedCardDetail.highlight_video_url &&
        highlightClipDraft?.objectUrl
      ) {
        return {
          ...savedCardDetail,
          is_highlight: true,
          highlight_video_url: highlightClipDraft.objectUrl,
          highlight_trim_start: highlightClipDraft.trimStart ?? 0,
          highlight_trim_end: highlightClipDraft.trimEnd ?? null,
        };
      }
      return savedCardDetail;
    }
    const sel =
      previewCards.find((p) => p.image_url === (selectedPreviewUrl || generatedCardUrl)) ||
      previewCards[previewCards.length - 1];
    if (!sel && !generatedCardUrl) return null;
    const highlightVideoUrl =
      savedCardDetail?.highlight_video_url ||
      (isHighlightCardType && highlightClipDraft?.objectUrl ? highlightClipDraft.objectUrl : undefined);
    return {
      card_id: sel?.card_id,
      player_name: sel?.player_name || playerDisplayName,
      team_name: sel?.team_name || teamName,
      position,
      jersey_number: jerseyNumber,
      grad_year: gradYear,
      tier: orderTier || sel?.tier || generatedTier || "rookie",
      theme: specialTheme,
      special_theme: specialTheme,
      image_url: sel?.image_url || generatedCardUrl,
      edition_number: sel?.edition_number || 1,
      print_run: sel?.print_run || 1,
      is_highlight: isHighlightCardType || Boolean(highlightVideoUrl),
      highlight_video_url: highlightVideoUrl,
      highlight_status:
        savedCardDetail?.highlight_status ||
        (highlightVideoUrl && highlightVideoUrl.startsWith("http") ? "completed" : undefined),
      highlight_trim_start:
        savedCardDetail?.highlight_trim_start ?? highlightClipDraft?.trimStart ?? 0,
      highlight_trim_end:
        savedCardDetail?.highlight_trim_end ?? highlightClipDraft?.trimEnd ?? null,
    };
  }, [
    savedCardDetail,
    previewCards,
    selectedPreviewUrl,
    generatedCardUrl,
    playerDisplayName,
    teamName,
    position,
    jerseyNumber,
    gradYear,
    orderTier,
    generatedTier,
    specialTheme,
    isHighlightCardType,
    highlightClipDraft?.objectUrl,
    highlightClipDraft?.trimStart,
    highlightClipDraft?.trimEnd,
  ]);

  const animatedModalPreviewCard = useMemo(() => {
    if (featuredDisplayCard?.image_url) {
      return {
        ...featuredDisplayCard,
        tier: orderTier || featuredDisplayCard.tier || "rookie",
        theme: specialTheme || featuredDisplayCard.theme,
        special_theme: specialTheme || featuredDisplayCard.special_theme,
      };
    }
    return wizardPreviewCard;
  }, [featuredDisplayCard, wizardPreviewCard, orderTier, specialTheme]);

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

  const highlightPreviewExpandCard = useMemo(() => {
    if (!isHighlightCardType || !highlightClipDraft?.confirmed) return null;
    return buildHighlightPreviewCard({
      playerName: playerDisplayName,
      teamName,
      position,
      jerseyNumber,
      gradYear,
      tier: orderTier,
      theme: specialTheme,
      trimStart: highlightClipDraft.trimStart ?? 0,
      trimEnd: highlightClipDraft.trimEnd ?? null,
      objectUrl: highlightClipDraft.objectUrl,
    });
  }, [
    isHighlightCardType,
    highlightClipDraft,
    playerDisplayName,
    teamName,
    position,
    jerseyNumber,
    gradYear,
    orderTier,
    specialTheme,
  ]);

  const creditBalance = Number(user?.credit_balance ?? 0);
  const animatedUpgradeCost = Number(generationPricing?.animated_upgrade_price ?? 10);
  const additionalPreviewCost = Number(generationPricing?.additional_preview_price ?? 0);
  const copyPricingTiers = useMemo(
    () => normalizeCopyTiers(generationPricing?.copy_pricing_tiers),
    [generationPricing?.copy_pricing_tiers]
  );
  const firstGenerateDue = 0;
  const canAffordFirstGenerate = true;
  const canAffordRegenerate = creditBalance >= additionalPreviewCost;
  const regenerateShortfall = Math.max(0, additionalPreviewCost - creditBalance);
  const firstGenerateShortfall = Math.max(0, firstGenerateDue - creditBalance);
  const motionDisplayName = isAnimatedCardType && selectedMotionId ? motionLabel(selectedMotionId) : "";
  const inCreationFlow = currentStep >= STEP_DETAILS && currentStep <= STEP_REVIEW;
  const animatedChoiceModalOpen =
    animatedFlowStage === ANIMATED_FLOW_STAGE.CHOICE &&
    !animationConfirmed &&
    !animationLoadingCardId;
  const showAnimatedQuantityModal =
    animatedFlowStage === ANIMATED_FLOW_STAGE.QUANTITY && !animationConfirmed;

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
      [STEP_DETAILS]: detailsValidation.valid,
      [STEP_TIER]: Boolean(orderTier),
      [STEP_THEME]: Boolean(specialTheme),
      [STEP_CARD_TYPE]: Boolean(cardType),
      [STEP_UPLOAD]: isHighlightCardType
        ? Boolean(highlightClipDraft?.file)
        : Boolean(uploadedPhotoUrl) && !photoUploading,
      [STEP_ACTION]: !isAnimatedCardType || Boolean(actionCategory),
      [STEP_MOTION]: !isAnimatedCardType || Boolean(selectedMotionId),
      [STEP_HIGHLIGHT_VIDEO]: isHighlightCardType && Boolean(highlightClipDraft?.confirmed),
      [STEP_REVIEW]: true,
    }),
    [
      detailsValidation.valid,
      orderTier,
      specialTheme,
      cardType,
      imageFile,
      uploadedPhotoUrl,
      photoUploading,
      actionCategory,
      selectedMotionId,
      isAnimatedCardType,
      isHighlightCardType,
      highlightClipDraft?.file,
      highlightClipDraft?.confirmed,
    ]
  );

  const canAdvanceFromStep = stepComplete[currentStep] ?? false;

  const canCreateOrder = Boolean(
    currentStep === STEP_REVIEW &&
      reviewSubPhase === "setup" &&
      !isCreating &&
      !isGenerating
  );

  function goToStep(step) {
    if (step > currentStep) return;
    setCurrentStep(step);
  }

  function selectActionCategory(categoryId) {
    setActionCategory(categoryId);
    setActionStepError("");
  }

  function handleActionCategoryContinue() {
    if (!actionCategory) {
      setActionStepError("Please select the action shown in your photo");
      return;
    }
    setActionStepError("");
    const motionIds = motionIdsForActionCategory(actionCategory);
    if (motionIds.length === 1) {
      setSelectedMotionId(motionIds[0]);
      setMotionStepMode("confirm");
      setCurrentStep(STEP_REVIEW);
    } else {
      setSelectedMotionId("");
      setMotionStepMode("select");
      setCurrentStep(STEP_MOTION);
    }
  }

  function clearUploadState() {
    if (highlightClipDraft?.objectUrl) URL.revokeObjectURL(highlightClipDraft.objectUrl);
    setHighlightClipDraft(null);
    setImageFile(null);
    setUploadedPhotoUrl("");
    setPhotoUploading(false);
    setPhotoStepError("");
    setHighlightUploadState("idle");
    setHighlightUploadProgress(0);
    setHighlightUploadError("");
  }

  function tryAdvanceStep() {
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
      setCurrentStep(STEP_UPLOAD);
      return;
    }
    if (currentStep === STEP_UPLOAD) {
      if (!isHighlightCardType) {
        if (!uploadedPhotoUrl || photoUploading) {
          setPhotoStepError("Please upload a player photo to continue");
          return;
        }
        setPhotoStepError("");
      }
      setCurrentStep(getNextWizardStep(STEP_UPLOAD, cardType));
      return;
    }
    if (currentStep === STEP_ACTION) {
      handleActionCategoryContinue();
      return;
    }
    if (currentStep === STEP_MOTION) {
      if (!selectedMotionId) {
        setMotionStepError("Please select a motion for your animated card");
        return;
      }
      setMotionStepError("");
      setCurrentStep(STEP_REVIEW);
      return;
    }
  }

  function goBackStep() {
    setCurrentStep(getPrevWizardStep(currentStep, cardType, actionCategory));
  }

  useEffect(() => {
    if (!isHighlightCardType) {
      setHighlightClipDraft(null);
      setHighlightUploadState("idle");
      setHighlightUploadProgress(0);
      setHighlightUploadError("");
    }
  }, [isHighlightCardType]);

  useEffect(() => {
    if (!token) {
      setGenerationUsage(null);
      return;
    }
    loadGenerationUsage();
  }, [token, loadGenerationUsage]);

  useEffect(() => {
    if (!isAnimatedCardType && isAnimatedOnlyStep(currentStep)) {
      setCurrentStep(STEP_REVIEW);
    }
    if (!isHighlightCardType && isHighlightOnlyStep(currentStep)) {
      setCurrentStep(STEP_REVIEW);
    }
  }, [isAnimatedCardType, isHighlightCardType, currentStep]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;
    scrollAfterPaint(wizardPanelRef.current);
  }, [currentStep]);

  useEffect(() => {
    if (prevReviewSubPhaseRef.current === reviewSubPhase) return;
    prevReviewSubPhaseRef.current = reviewSubPhase;
    if (reviewSubPhase === "generate") {
      scrollAfterPaint(generationFocusRef.current);
    }
  }, [reviewSubPhase]);

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current;
    prevGeneratingRef.current = isGenerating;
    if (isGenerating || packOpeningActive) {
      scrollAfterPaint(generationFocusRef.current);
      return;
    }
    if (wasGenerating && previewCards.length > 0) {
      scrollAfterPaint(generationFocusRef.current);
    }
  }, [isGenerating, packOpeningActive, previewCards.length]);

  useEffect(() => {
    if (previewConfigureOpen && !prevPreviewConfigureRef.current) {
      scrollAfterPaint(configureFocusRef.current);
    }
    prevPreviewConfigureRef.current = previewConfigureOpen;
  }, [previewConfigureOpen]);

  useEffect(() => {
    if (reviewSubPhase === "approve") {
      scrollAfterPaint(approveFocusRef.current);
    }
  }, [reviewSubPhase, savedCardDetail?.card_id]);

  useEffect(() => {
    if (animationLoadingCardId && animationLoadingCardId !== prevAnimationLoadingRef.current) {
      scrollAfterPaint(animationFocusRef.current);
    }
    prevAnimationLoadingRef.current = animationLoadingCardId;
  }, [animationLoadingCardId]);

  useEffect(() => {
    animationConfirmedRef.current = animationConfirmed;
  }, [animationConfirmed]);

  useEffect(() => {
    animatedFlowStageRef.current = animatedFlowStage;
    console.log("[AnimatedFlow] stage changed:", animatedFlowStage);
    if (animatedFlowStage === ANIMATED_FLOW_STAGE.ANIMATING) {
      console.log("Step: showing loading screen");
    }
  }, [animatedFlowStage]);

  useEffect(() => {
    if (animationFailed) {
      scrollAfterPaint(animationFocusRef.current);
    }
  }, [animationFailed]);

  useEffect(() => {
    if (showRegenerateConfirm) {
      scrollAfterPaint(regenerateModalRef.current, { block: "center" });
    }
  }, [showRegenerateConfirm]);

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

  const tryOpenAnimatedChoiceModal = useCallback(() => {
    if (
      !isAnimatedCardType ||
      animatedFlowStage !== ANIMATED_FLOW_STAGE.GENERATING_STATIC ||
      animatedSaveStaticFlow ||
      animationLoadingCardId ||
      animationConfirmedRef.current ||
      previewConfigureOpen ||
      reviewSubPhase !== "generate"
    ) {
      return;
    }

    const preview =
      latestGeneratedPreview ||
      (previewCards.length ? previewCards[previewCards.length - 1] : null);
    if (!preview?.image_url) return;

    const key = String(preview.image_url);
    if (animatedChoiceShownForRef.current === key) return;

    animatedChoiceShownForRef.current = key;
    console.log("[AnimatedFlow] static generation complete, opening choice modal");
    setSelectedPreviewUrl(preview.image_url);
    setGeneratedCardUrl(preview.image_url);
    setPackOpeningActive(false);
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
    console.log("[AnimatedFlow] choice modal state applied");
  }, [
    isAnimatedCardType,
    animatedFlowStage,
    animatedSaveStaticFlow,
    animationLoadingCardId,
    previewConfigureOpen,
    reviewSubPhase,
    latestGeneratedPreview,
    previewCards,
  ]);

  useEffect(() => {
    if (initializing || !token) return;
    fetchPendingSession().then((session) => {
      if (session?.previews?.length) setShowPendingPrompt(true);
    });
  }, [initializing, token, fetchPendingSession]);

  useEffect(() => {
    if (!isAnimatedCardType) return;
    tryOpenAnimatedChoiceModal();
  }, [
    isAnimatedCardType,
    animatedFlowStage,
    latestGeneratedPreview,
    previewCards,
    tryOpenAnimatedChoiceModal,
  ]);

  useEffect(() => {
    if (!previewPollCardId || !token || !isAnimatedCardType) return undefined;
    if (animatedFlowStage !== ANIMATED_FLOW_STAGE.GENERATING_STATIC) return undefined;
    if (latestGeneratedPreview?.image_url) return undefined;

    let cancelled = false;
    const generation = previewPollGenerationRef.current + 1;
    previewPollGenerationRef.current = generation;
    const poll = async () => {
      try {
        console.log(`[AnimatedFlow] polling static preview card_id=${previewPollCardId} generation=${generation}`);
        const res = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(previewPollCardId)}`, {
          headers: { ...authHeaders(token) },
        });
        if (!res.ok || cancelled) return;
        const card = await res.json().catch(() => null);
        console.log("[AnimatedFlow] poll response received", {
          cardId: previewPollCardId,
          generation,
          hasImage: Boolean(card?.image_url),
          animationStatus: card?.animation_status || null,
        });
        if (cancelled || !card?.image_url) return;
        if (generation !== previewPollGenerationRef.current) return;
        console.log("[AnimatedFlow] static card image ready, applying modal state");
        setLatestGeneratedPreview({
          card_id: card.card_id,
          image_url: card.image_url,
        });
        setSelectedPreviewUrl(card.image_url);
        setGeneratedCardUrl(card.image_url);
        if (animatedFlowStageRef.current === ANIMATED_FLOW_STAGE.GENERATING_STATIC) {
          setPackOpeningActive(false);
          setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
          console.log("[AnimatedFlow] choice modal state update queued from poll completion");
        }
      } catch {
        /* retry on next interval */
      }
    };

    poll();
    const iv = window.setInterval(poll, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [previewPollCardId, token, isAnimatedCardType, latestGeneratedPreview?.image_url, animatedFlowStage]);

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
    setOrderTier(draft.tier || "");
    setCardType(draft.card_type || "standard");
    setSpecialTheme(draft.special_theme || "");
    setSelectedMotionId(draft.selected_motion_id || "");
    setActionCategory(draft.action_category || "");
    if (draft.action_category && draft.selected_motion_id) {
      setMotionStepMode(isSingleMotionCategory(draft.action_category) ? "confirm" : "select");
    }
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
      setAnimatedSaveStaticFlow(false);
      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
      animatedChoiceShownForRef.current = "";
      dismissPendingPrompt();
      setMessage("Welcome back — your preview is ready. No additional credits were charged.");
      await fetchOrders();
      if ((pendingSession.draft?.card_type || "standard") === "animated" && previewUrl) {
        animatedChoiceShownForRef.current = "";
        setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
      }
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

  function resetWizardToStart() {
    setCurrentStep(STEP_DETAILS);
    setFirstName("");
    setLastName("");
    setDisplayName("");
    setJerseyNumber("");
    setPosition("");
    setGradYear("");
    setTeamName("");
    setImageFile(null);
    setUploadedPhotoUrl("");
    setPhotoUploading(false);
    setPlayerId(null);
    setCurrentPlayer(null);
    setCurrentOrderId(null);
    setGeneratedCardUrl("");
    setGeneratedTier("base");
    setSelectedPreviewUrl("");
    setSavedCardDetail(null);
    setOrderTier("");
    setSpecialTheme("");
    setCardType("standard");
    setSelectedMotionId("");
    setActionCategory("");
    setMotionStepMode("select");
    setReviewSubPhase("setup");
    setPreviewConfigureOpen(false);
    setPackOpeningActive(false);
    setIsGenerating(false);
    setOrderActionKey("");
    setLatestGeneratedPreview(null);
    setPreviewPollCardId("");
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
    setAnimatedSaveStaticFlow(false);
    animatedChoiceShownForRef.current = "";
    setHighlightClipDraft(null);
    setHighlightUploadState("idle");
    setHighlightUploadProgress(0);
    setHighlightUploadError("");
    setHighlightProcessingCardId("");
    setHighlightProcessingCard(null);
    setCopyQuantity(1);
    setAnimationLoadingCardId(null);
    setAnimationFailed(false);
    setAnimationConfirmed(false);
    setPhotoStepError("");
    setActionStepError("");
    setMotionStepError("");
    setDetailsErrors({});
    setDetailsShowErrors(false);
    setTierStepError("");
    setThemeStepError("");
    setMessage("");
    setError("");
    setShowStartOverConfirm(false);
    setShowRegenerateConfirm(false);
  }

  async function handleStartOverConfirm() {
    setStartOverBusy(true);
    setError("");
    try {
      const sessionId = activeOrder?.preview_session_id || pendingSession?.preview_session_id;
      if (sessionId && token) {
        await fetch(
          `${API_BASE_URL}/cards/pending?preview_session_id=${encodeURIComponent(sessionId)}`,
          { method: "DELETE", headers: { ...authHeaders(token) } }
        );
      }
      resetWizardToStart();
      await fetchOrders();
    } catch {
      resetWizardToStart();
    } finally {
      setStartOverBusy(false);
    }
  }

  useEffect(() => {
    if (reviewSubPhase === "approve" && savedCardDetail?.animated_video_url) return;
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
  }, [selectedPreviewUrl, previewCards, reviewSubPhase, savedCardDetail?.animated_video_url]);

  useEffect(() => {
    if (currentStep !== STEP_REVIEW || reviewSubPhase !== "approve" || !activeOrder?.final_card_url) return;
    if (savedCardDetail?.animated_video_url) return;
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
    const list = Array.isArray(data) ? data : [];
    setCards(list);
    return list;
  }

  async function fetchOrders() {
    if (!token) {
      setOrders([]);
      return [];
    }
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        headers: { ...authHeaders(token) },
      });
      if (!res.ok) {
        setOrders([]);
        return [];
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrders(list);
      return list;
    } catch {
      setOrders([]);
      return [];
    }
  }

  useEffect(() => {
    if (initializing) return;
    fetchMyCards().catch((err) => {
      setError(err.message || "Could not load data.");
    });
    fetchOrders();
  }, [token, initializing]);

  async function createPlayerFromCurrentForm() {
    let imageUrl = uploadedPhotoUrl;

    if (!imageUrl) {
      let fileToUpload = imageFile;
      if (!fileToUpload && isHighlightCardType && highlightClipDraft?.objectUrl) {
        fileToUpload = await captureVideoFrameAsFile(
          highlightClipDraft.objectUrl,
          highlightClipDraft.trimStart ?? 0
        );
      }
      if (!fileToUpload) throw new Error("Player photo is required.");

      const formData = new FormData();
      formData.append("file", fileToUpload);
      const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: { ...authHeaders(token) },
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(formatApiError(uploadData?.detail, "Image upload failed."));
      }
      imageUrl = uploadData.url;
      setUploadedPhotoUrl(imageUrl);
    }

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
        image_url: imageUrl,
      }),
    });
    if (!playerRes.ok) {
      const detail = await playerRes.text();
      throw new Error(`Player creation failed. ${detail}`);
    }
    return playerRes.json();
  }

  async function uploadHighlightForCard(cardId, { skipCelebration = false } = {}) {
    if (!isHighlightCardType || !highlightClipDraft?.confirmed || !highlightClipDraft?.file || !token) return;
    setHighlightUploadState("uploading");
    setHighlightUploadProgress(0);
    setHighlightUploadError("");
    try {
      const uploadedCard = await uploadHighlightClip({
        token,
        cardId,
        file: highlightClipDraft.file,
        trimStart: highlightClipDraft.trimStart ?? 0,
        trimEnd: highlightClipDraft.trimEnd ?? 0,
        onProgress: (pct) => setHighlightUploadProgress(pct),
      });
      setHighlightUploadState("done");
      await refreshUser(token);
      const detail =
        uploadedCard?.highlight_status === "completed"
          ? uploadedCard
          : await fetchCardDetailById(cardId);
      setHighlightProcessingCardId("");
      setHighlightProcessingCard(null);
      if (!skipCelebration) {
        await showCelebration({
          card: detail,
          source: "created",
          showAnimateUpsell: false,
        });
      }
      return detail;
    } catch (err) {
      if (err.generationCap) {
        setGenerationUsage(err.generationCap);
        setHighlightUploadState("idle");
        setHighlightUploadError("");
        return;
      }
      setHighlightUploadState("error");
      setHighlightUploadError(
        err.message || "Something went wrong saving your highlight. Please try again."
      );
      throw err;
    }
  }

  async function retryHighlightUpload() {
    const sel = previewCards.find((p) => p.image_url === (selectedPreviewUrl || generatedCardUrl));
    const cardId = sel?.card_id;
    if (!cardId) {
      setHighlightUploadError("Select a preview card before retrying.");
      return;
    }
    setError("");
    try {
      await uploadHighlightForCard(cardId, { skipCelebration: true });
      setMessage("Highlight video saved. You can add the card to your collection.");
    } catch {
      /* uploadHighlightForCard sets highlightUploadError */
    }
  }

  async function handleHighlightProcessingComplete() {
    const cardId = highlightProcessingCardId;
    if (!cardId) return;
    try {
      const detail = await fetchCardDetailById(cardId);
      setHighlightProcessingCardId("");
      setHighlightProcessingCard(null);
      setHighlightUploadState("done");
      await refreshUser(token);
      await showCelebration({
        card: detail,
        source: "created",
        showAnimateUpsell: false,
      });
    } catch (err) {
      setError(err.message || "Could not load your highlight card.");
    }
  }

  function handleHighlightProcessingFailed() {
    setHighlightProcessingCardId("");
    setHighlightProcessingCard(null);
    setHighlightUploadState("error");
    setHighlightUploadError(
      "Your highlight video could not be processed. Your $5.00 has been refunded to your credit balance."
    );
    setError(
      "Your highlight video could not be processed. Your $5.00 has been refunded to your credit balance."
    );
    refreshUser(token);
  }

  async function handleGenerateForOrder(orderId) {
    if (isAnimatedCardType) {
      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.GENERATING_STATIC);
    } else {
      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
    }
    setPackOpeningActive(true);
    setIsGenerating(true);
    setOrderActionKey(`generate-${orderId}`);
    setMessage("");
    setError("");
    setPreviewConfigureOpen(false);
    setAnimatedSaveStaticFlow(false);
    animatedChoiceShownForRef.current = "";
    setLatestGeneratedPreview(null);
    setPreviewPollCardId("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/generate-card`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      const data = await res.json();
      if (res.status === 429) {
        const usage = generationUsageFromPayload(data);
        if (usage) setGenerationUsage(usage);
        setPackOpeningActive(false);
        setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
        return;
      }
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Failed to generate order card."));
      const preview = {
        card_id: data.card_id,
        image_url: data.image_url,
        tier: data.tier,
      };
      setLatestGeneratedPreview(preview.image_url ? preview : null);
      setPreviewPollCardId(data.card_id || "");
      setGeneratedCardUrl(data.image_url || "");
      setSelectedPreviewUrl(data.image_url || "");
      setGeneratedTier(data.tier || "base");
      setMessage(`Preview generated for order #${orderId}.`);
      await Promise.all([fetchMyCards(), fetchOrders(), refreshUser(token), loadGenerationUsage()]);
      if (isHighlightCardType && data.card_id && highlightClipDraft?.confirmed) {
        void uploadHighlightForCard(data.card_id, { skipCelebration: true }).then((detail) => {
          if (detail?.highlight_video_url) setSavedCardDetail(detail);
        });
      }
    } catch (err) {
      setPackOpeningActive(false);
      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
      setError(err.message || "Failed to generate order card.");
    } finally {
      setIsGenerating(false);
      setOrderActionKey("");
    }
  }

  function handlePackOpeningComplete() {
    setPackOpeningActive(false);
    if (!isAnimatedCardType) return;
    if (animatedFlowStageRef.current !== ANIMATED_FLOW_STAGE.GENERATING_STATIC) return;
    console.log("[AnimatedFlow] pack opening completed, checking for immediate choice modal");
    tryOpenAnimatedChoiceModal();
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
        action_category: actionCategory || null,
        add_ons: [],
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) throw new Error(formatApiError(orderData?.detail, "Failed to create order."));
    setCurrentOrderId(orderData.id);
    await fetchOrders();
    return orderData.id;
  }

  function requestGenerateFirstPreview() {
    if (isAnimatedCardType) {
      setShowAnimateConfirm(true);
      return;
    }
    handleGenerateFirstPreview();
  }

  function handleAnimatedChoiceAnimate() {
    console.log("Step: animate button clicked");
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.QUANTITY);
  }

  function handleCloseAnimatedQuantity() {
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
  }

  function handleAnimatedChoiceSaveStatic() {
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
    setAnimatedSaveStaticFlow(true);
    setPreviewConfigureOpen(true);
    setCopyQuantity(1);
  }

  function handleCloseAnimateConfirm() {
    setShowAnimateConfirm(false);
  }

  async function handleApproveAndAnimate(quantity = 1) {
    console.log("Step: quantity selected", quantity);
    if (!currentOrderId) return setError("Create an order first.");
    if (!selectedPreviewUrl && !generatedCardUrl) return setError("Select a preview first.");
    if (!selectedMotionId) return setError("Select a motion before animating.");

    const sel =
      previewCards.find((p) => p.image_url === (selectedPreviewUrl || generatedCardUrl)) ||
      latestGeneratedPreview;
    const cardId = sel?.card_id;
    if (!cardId) {
      setError("Could not find the selected preview card.");
      return;
    }

    console.log("Step: charge confirmed");
    setAnimationConfirmed(true);
    setAnimationFailed(false);
    setAnimationLoadingCardId(cardId);
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.ANIMATING);
    setAddCollectionLoading(true);
    setOrderActionKey(`approve-animate-${currentOrderId}`);
    setMessage("");
    setError("");
    console.log("Step: showing loading screen", { cardId });

    try {
      console.log("Step: animation starting", { cardId, motionId: selectedMotionId, quantity });
      const animRes = await fetch(
        `${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/start-studio-animation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({
            motion_id: selectedMotionId,
            action_category: actionCategory || null,
            quantity,
          }),
        }
      );
      const animData = await animRes.json().catch(() => ({}));
      if (animRes.status === 429) {
        const usage = generationUsageFromPayload(animData);
        if (usage) setGenerationUsage(usage);
        setAnimationLoadingCardId(null);
        setAnimationConfirmed(false);
        setAnimatedFlowStage(ANIMATED_FLOW_STAGE.QUANTITY);
        return;
      }
      if (!animRes.ok) {
        throw new Error(formatApiError(animData?.detail, "Could not start animation."));
      }

      console.log("Step: animation API accepted", animData);
      await Promise.all([fetchOrders(), refreshUser(token)]);
      setPendingSession(null);
      setShowPendingPrompt(false);
      setLatestGeneratedPreview(null);
      setPreviewPollCardId("");
    } catch (err) {
      console.error("Animation start failed:", err);
      setAnimationFailed(true);
      setError(err.message || "Failed to start animation.");
    } finally {
      setAddCollectionLoading(false);
      setOrderActionKey("");
    }
  }

  async function handleGenerateFirstPreview() {
    if (isHighlightCardType && highlightClipDraft?.confirmed) {
      setIsCreating(true);
      setOrderActionKey("generate-first");
      setMessage("");
      setError("");
      try {
        const orderId = await ensureOrderForGeneration();
        if (!previewCards.length) {
          await handleGenerateForOrder(orderId);
        }
        setReviewSubPhase("generate");
        setPreviewConfigureOpen(false);
      } catch (err) {
        setError(err.message || "Failed to start highlight preview.");
      } finally {
        setIsCreating(false);
        setOrderActionKey("");
      }
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
    const highlightDue = isHighlightCardType
      ? Number(generationPricing?.highlight_card_price ?? highlightCardPrice ?? 5)
      : 0;
    const { extra: extraCopies, total: extraCost } = copyChargeForQuantity(quantity, 1, copyPricingTiers);
    const totalDue = extraCost + (isHighlightCardType ? highlightDue : 0);
    if (totalDue > creditBalance) {
      if (isHighlightCardType && highlightDue > 0 && creditBalance < highlightDue) {
        setError(`You need ${formatMoney(highlightDue)} in credits for the highlight upgrade.`);
      } else {
        setError(`You need ${formatMoney(extraCost)} in credits for ${extraCopies} additional ${extraCopies === 1 ? "copy" : "copies"}.`);
      }
      return;
    }
    setAddCollectionLoading(true);
    setOrderActionKey(`approve-${currentOrderId}`);
    setMessage("");
    setError("");
    let cardId = null;
    let approved = false;
    try {
      const sel = previewCards.find((p) => p.image_url === (selectedPreviewUrl || generatedCardUrl));
      cardId = sel?.card_id || null;

      if (isHighlightCardType && cardId && highlightClipDraft?.confirmed) {
        const alreadyUploaded =
          highlightUploadState === "done" ||
          (savedCardDetail?.card_id === cardId && savedCardDetail?.highlight_video_url);
        if (!alreadyUploaded) {
          await uploadHighlightForCard(cardId, { skipCelebration: true });
        }
      }

      const res = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/approve-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(token) },
        body: JSON.stringify({ image_url: selectedPreviewUrl || generatedCardUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Failed to add card to collection."));
      approved = true;
      if (data.final_card_url) setGeneratedCardUrl(data.final_card_url);

      let addedCardDetail = null;
      if (cardId) addedCardDetail = await fetchCardDetailById(cardId);

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
      await Promise.all([fetchMyCards(), fetchOrders(), refreshUser(token)]);
      setPendingSession(null);
      setShowPendingPrompt(false);
      setReviewSubPhase("approve");
      setPreviewConfigureOpen(false);
      setAnimatedSaveStaticFlow(false);

      if (cardId && addedCardDetail) {
        await showCelebration({
          card: addedCardDetail,
          source: "created",
          showAnimateUpsell: !isHighlightCardType,
        });
      }
    } catch (err) {
      if (isHighlightCardType && cardId && approved) {
        try {
          await cleanupFailedHighlightCard({ token, cardId });
          await Promise.all([fetchMyCards(), refreshUser(token)]);
        } catch {
          /* best-effort cleanup if approve succeeded but a later step failed */
        }
      }
      const highlightMsg =
        err.message || "Something went wrong saving your highlight. Please try again.";
      if (isHighlightCardType) {
        setHighlightUploadState("error");
        setHighlightUploadError(highlightMsg);
        setError(highlightMsg);
      } else {
        setError(err.message || "Failed to add card to collection.");
      }
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
      body: JSON.stringify({ motion_id: selectedMotionId, action_category: actionCategory || null }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(formatApiError(data?.detail, "Could not start animation."));
    setAnimationFailed(false);
    setAnimationLoadingCardId(cardId);
  }

  async function handleAnimationComplete(completedData) {
    const cardId = animationLoadingCardId;
    try {
      if (currentOrderId && cardId) {
        const res = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/approve-preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders(token) },
          body: JSON.stringify({ image_url: selectedPreviewUrl || generatedCardUrl || null }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(formatApiError(data?.detail, "Could not add card to your collection."));
        }
      }

      if (cardId) {
        let detail = completedData?.animated_video_url
          ? { ...completedData, is_animated: true }
          : await fetchCardDetailById(cardId);
        if (detail?.animated_video_url && !detail.is_animated) {
          detail = { ...detail, is_animated: true };
        }
        setSavedCardDetail(detail);
      }
    } catch (err) {
      setError(err.message || "Could not finalize your animated card.");
      setAnimationLoadingCardId(null);
      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
      return completedData;
    }

    setAnimationLoadingCardId(null);
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.IDLE);
    setAnimationFailed(false);
    setReviewSubPhase("approve");
    setCurrentStep(STEP_REVIEW);
    setMessage("Your animated card has been added to your collection.");
    await Promise.all([fetchMyCards(), fetchOrders(), refreshUser(token)]);
    return completedData;
  }

  const handleAnimationFailed = useCallback(() => {
    setAnimationFailed(true);
  }, []);

  const handleAnimationRetry = useCallback(async () => {
    if (!animationLoadingCardId) return;
    setAnimationFailed(false);
    setAnimatedFlowStage(ANIMATED_FLOW_STAGE.ANIMATING);
    await startCardAnimation(animationLoadingCardId);
  }, [animationLoadingCardId, selectedMotionId, actionCategory, token]);

  async function handlePhotoFileSelect(file) {
    if (!file) return;
    const type = (file.type || "").toLowerCase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    const acceptedExt = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);
    if (!acceptedTypes.has(type) && !acceptedExt.has(ext)) {
      setPhotoStepError("Please choose a JPG, PNG, WebP, or HEIC image");
      return;
    }
    if (!token) {
      setPhotoStepError("Please sign in before uploading a photo.");
      return;
    }

    setImageFile(file);
    setUploadedPhotoUrl("");
    setPhotoStepError("");
    setError("");
    setPhotoUploading(true);
    setMessage("Uploading your photo...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        headers: { ...authHeaders(token) },
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(formatApiError(uploadData?.detail, "Photo upload failed."));
      }
      if (!uploadData?.url) {
        throw new Error("Photo upload did not return a URL.");
      }
      setUploadedPhotoUrl(uploadData.url);
      setMessage(`Photo uploaded: ${file.name}`);
    } catch (err) {
      setImageFile(null);
      setUploadedPhotoUrl("");
      setPhotoStepError(err.message || "Photo upload failed.");
      setError(err.message || "Photo upload failed.");
    } finally {
      setPhotoUploading(false);
    }
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

        {animationLoadingCardId ? (
          <section
            ref={animationFocusRef}
            className="scroll-focus-target animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6"
          >
            <AnimationLoadingScreen
              cardId={animationLoadingCardId}
              token={token}
              tier={orderTier}
              theme={specialTheme ? selectedThemeLabel : ""}
              playerName={playerDisplayName}
              teamName={teamName}
              cardImageUrl={selectedPreviewUrl || generatedCardUrl}
              card={animatedModalPreviewCard}
              motionName={motionDisplayName}
              onAddToCollection={handleAnimationComplete}
              onFailed={handleAnimationFailed}
              onRetry={handleAnimationRetry}
              failureCreditMessage="Animation failed. Please contact support. No additional credits were charged for this animation attempt."
            />
          </section>
        ) : (
        <section
          ref={wizardPanelRef}
          className="scroll-focus-target animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6"
        >
            <WizardProgress
              currentStep={currentStep}
              isAnimated={isAnimatedCardType}
              isHighlight={isHighlightCardType}
              cardType={cardType}
              onGoToStep={goToStep}
            />

            {user && inCreationFlow ? (
              <div className="mb-6">
                <StudioCreditBalance balance={creditBalance} />
              </div>
            ) : null}

            {!user && currentStep >= STEP_DETAILS ? (
              <StudioAuthGate
                onBackToTiers={() => goToStep(STEP_DETAILS)}
                backLabel="← Back to player details"
              />
            ) : (
              <>
            {currentStep === STEP_UPLOAD ? (
              isHighlightCardType ? (
                <HighlightVideoStep
                  mode="upload"
                  highlightCardPrice={generationPricing?.highlight_card_price ?? highlightCardPrice}
                  tier={orderTier || "rookie"}
                  clipDraft={highlightClipDraft}
                  onVideoReady={(draft) => {
                    setHighlightClipDraft(draft);
                    setCurrentStep(STEP_HIGHLIGHT_VIDEO);
                  }}
                  onBack={goBackStep}
                />
              ) : (
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Upload your player photo</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose a clear photo of your player for the best card result
                    </p>
                  </div>
                  <input
                    id="studio-photo-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
                    className="hidden"
                    onChange={(e) => {
                      handlePhotoFileSelect(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                  {photoStepError ? (
                    <p className="text-sm text-rose-300">{photoStepError}</p>
                  ) : null}
                  {!imageFile && !uploadedPhotoUrl ? (
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
                      <p className="text-sm font-medium text-slate-200">Choose Photo</p>
                      <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP, or HEIC</p>
                    </label>
                  ) : (
                    <>
                      <div className="relative flex min-h-[240px] items-center justify-center rounded-xl border border-white/15 bg-zinc-900/70 p-4 sm:min-h-[300px]">
                        {photoUploading ? (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/50">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-neonBlue" />
                            <p className="mt-3 text-sm text-slate-200">Uploading to secure storage...</p>
                          </div>
                        ) : null}
                        {imagePreviewUrl ? (
                          <img
                            src={imagePreviewUrl}
                            alt="Upload preview"
                            className="max-h-[min(480px,60vh)] w-full object-contain"
                          />
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        <span className="text-emerald-300" aria-hidden>
                          ✓
                        </span>
                        <p className="text-sm text-emerald-100">
                          <span className="font-medium text-emerald-50">
                            {photoUploading ? "Uploading photo..." : "Photo uploaded"}
                          </span>
                          {imageFile?.name ? (
                            <span className="text-emerald-200/90"> — {imageFile.name}</span>
                          ) : null}
                        </p>
                      </div>
                      <label
                        htmlFor="studio-photo-upload"
                        className={`inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 sm:w-auto ${photoUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                      >
                        Choose Photo
                      </label>
                    </>
                  )}
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
                      {isAnimatedCardType ? "Continue to Action Tagging" : "Continue to Review"}
                    </button>
                  </div>
                </div>
              )
            ) : null}

            {currentStep === STEP_CARD_TYPE ? (
              <div className="grid gap-4">
                <CardTypeStep
                  value={cardType}
                  onChange={(type) => {
                    if (type !== cardType) clearUploadState();
                    setCardType(type);
                    if (type === "standard" || type === "highlight") {
                      setSelectedMotionId("");
                      setActionCategory("");
                      setMotionStepMode("select");
                    }
                  }}
                  highlightCardPrice={generationPricing?.highlight_card_price ?? highlightCardPrice}
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
                    Continue to Upload
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_ACTION && isAnimatedCardType ? (
              <div className="grid gap-4">
                <ActionCategoryStep
                  value={actionCategory}
                  onSelect={selectActionCategory}
                  onContinue={handleActionCategoryContinue}
                  error={actionStepError}
                  tier={orderTier || "rookie"}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
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

            {currentStep === STEP_HIGHLIGHT_VIDEO && isHighlightCardType ? (
              <HighlightVideoStep
                mode="trim"
                highlightCardPrice={generationPricing?.highlight_card_price ?? highlightCardPrice}
                tier={orderTier || "rookie"}
                clipDraft={highlightClipDraft}
                onClipConfirmed={(draft) => {
                  setHighlightClipDraft(draft);
                  setCurrentStep(STEP_REVIEW);
                }}
                onBack={goBackStep}
                onChooseDifferent={() => {
                  if (highlightClipDraft?.objectUrl) URL.revokeObjectURL(highlightClipDraft.objectUrl);
                  setHighlightClipDraft(null);
                  setCurrentStep(STEP_UPLOAD);
                }}
              />
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
                    Continue to Card Type Selection
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === STEP_MOTION && isAnimatedCardType ? (
              <div className="grid gap-4">
                {motionStepMode === "confirm" ? (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Your Animation</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Based on your {getActionCategory(actionCategory)?.label || "selected"} photo
                      </p>
                    </div>
                    <div className="rounded-2xl border border-violet-400/40 bg-violet-500/10 px-5 py-6 text-center">
                      <p className="text-sm text-violet-200/90">Your animation:</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {motionLabel(selectedMotionId)}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setMotionStepMode("select");
                          setSelectedMotionId("");
                          setCurrentStep(STEP_ACTION);
                        }}
                        className="mt-4 text-sm text-violet-200 underline-offset-2 hover:text-violet-100 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Choose Your Celebration</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Pick the motion that best matches your photo
                      </p>
                    </div>
                    <MotionSelectionGrid
                      value={selectedMotionId}
                      onChange={(id) => {
                        setSelectedMotionId(id);
                        setMotionStepError("");
                      }}
                      error={motionStepError}
                      motionIds={motionIdsForActionCategory(actionCategory)}
                    />
                  </>
                )}
                <AnimatedAiDisclaimer className="mt-1" />
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
                    {isHighlightCardType
                      ? "Preview your highlight card below — your first look is free before you add to collection."
                      : "Confirm your choices. Your first preview is free — additional previews and copies use credits."}
                  </p>
                  {pricingError ? (
                    <p className="mt-2 text-sm text-rose-300">{pricingError}</p>
                  ) : null}
                </div>
                {isHighlightCardType && highlightClipDraft?.confirmed ? (
                  <div className="grid gap-3">
                    <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-teal-300/90">
                      Your highlight preview
                    </p>
                    <ExpandableCardView
                      showHint
                      card={highlightPreviewExpandCard}
                      alt={`${playerDisplayName} highlight preview`}
                      localHighlightVideoUrl={highlightClipDraft.objectUrl}
                      highlightTrimStart={highlightClipDraft.trimStart ?? 0}
                      highlightTrimEnd={highlightClipDraft.trimEnd ?? null}
                    >
                      <HighlightCardPreview
                        playerName={playerDisplayName}
                        teamName={teamName}
                        position={position}
                        jerseyNumber={jerseyNumber}
                        gradYear={gradYear}
                        tier={orderTier}
                        theme={specialTheme}
                        clipDraft={highlightClipDraft}
                        variant="detail"
                        forcePlay
                      />
                    </ExpandableCardView>
                  </div>
                ) : null}
                <GenerationCostSummary
                  playerName={playerDisplayName}
                  teamName={teamName}
                  position={position}
                  jerseyNumber={jerseyNumber}
                  gradYear={gradYear}
                  tierLabel={selectedTierLabel}
                  themeLabel={specialTheme ? selectedThemeLabel : ""}
                  isAnimated={isAnimatedCardType}
                  isHighlight={isHighlightCardType}
                  motionName={motionDisplayName}
                  copyQuantity={copyQuantity}
                  pricing={generationPricing}
                  creditBalance={creditBalance}
                  phase="pre-generate"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goBackStep}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back
                  </button>
                  {generationCap.blocked ? (
                    <GenerationCapNotice
                      usage={generationUsage}
                      period={generationCap.period}
                      className="flex-1"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={requestGenerateFirstPreview}
                        disabled={!canCreateOrder || !generationPricing || Boolean(orderActionKey)}
                        className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-neonTeal px-6 py-3 text-base font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 sm:flex-none"
                      >
                        {orderActionKey === "generate-first"
                          ? "Generating..."
                          : isHighlightCardType
                            ? "Preview My Highlight Card — Free"
                            : "Generate My Card — Free Preview"}
                      </button>
                      <GenerationDailyUsageHint usage={generationUsage} className="w-full basis-full text-center sm:text-left" />
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {currentStep === STEP_REVIEW && reviewSubPhase === "generate" ? (
              <div ref={generationFocusRef} className="scroll-focus-target grid gap-6">
                {generationCap.blocked ? (
                  <GenerationCapNotice usage={generationUsage} period={generationCap.period} />
                ) : null}
                {packOpeningActive ? (
                  <CardCreationExperience
                    active={packOpeningActive}
                    cardType={
                      isHighlightCardType ? "highlight" : isAnimatedCardType ? "animated" : "standard"
                    }
                    tier={orderTier}
                    theme={specialTheme ? selectedThemeLabel : "Default (no theme)"}
                    playerName={playerDisplayName}
                    teamName={teamName}
                    generationComplete={!isGenerating && Boolean(generatedCardUrl || selectedPreviewUrl)}
                    cardImageUrl={generatedCardUrl || selectedPreviewUrl}
                    card={featuredDisplayCard}
                    highlightCardId={highlightRevealCardId}
                    token={token || ""}
                    onHighlightVideoReady={handleHighlightVideoReady}
                    onRevealComplete={handlePackOpeningComplete}
                  />
                ) : null}
                {isHighlightCardType && highlightUploadState !== "idle" ? (
                  <div className="rounded-xl border border-teal-500/35 bg-teal-500/10 px-4 py-3">
                    {highlightUploadState === "uploading" ? (
                      <>
                        <p className="text-sm font-medium text-teal-100">Uploading your highlight clip...</p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-teal-400 transition-all"
                            style={{ width: `${Math.round(highlightUploadProgress * 100)}%` }}
                          />
                        </div>
                      </>
                    ) : null}
                    {highlightUploadState === "processing" ? (
                      <p className="text-sm font-medium text-teal-100">Processing your clip...</p>
                    ) : null}
                    {highlightUploadState === "done" ? (
                      <p className="text-sm font-medium text-teal-100">Highlight clip uploaded.</p>
                    ) : null}
                    {highlightUploadState === "error" ? (
                      <div className="grid gap-3">
                        <p className="text-sm text-rose-200">
                          {highlightUploadError ||
                            "Something went wrong saving your highlight. Please try again."}
                        </p>
                        <button
                          type="button"
                          onClick={retryHighlightUpload}
                          disabled={Boolean(orderActionKey)}
                          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 disabled:opacity-50"
                        >
                          Retry highlight upload
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {!packOpeningActive && (
                  <>
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
                  isHighlight={isHighlightCardType}
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

                {previewCards.length === 0 ? (
                  generationCap.blocked ? (
                    <GenerationCapNotice usage={generationUsage} period={generationCap.period} />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={requestGenerateFirstPreview}
                        disabled={Boolean(orderActionKey)}
                        className={`inline-flex min-h-[52px] w-full items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-white disabled:opacity-50 ${tierTheme.loading}`}
                      >
                        {"Generate My Card — Free Preview"}
                      </button>
                      <GenerationDailyUsageHint usage={generationUsage} className="mt-2 text-center" />
                    </>
                  )
                ) : (
                  <>
                    {previewCards.length > 1 ? (
                      <div className="rounded-xl border border-white/10 bg-cardBg2 px-4 py-3 text-center">
                        <p className="text-base font-semibold text-white">
                          {isAnimatedCardType
                            ? "Pick your favorite — we'll animate the one you choose"
                            : "Pick your favorite — only the card you choose will be added to your collection"}
                        </p>
                      </div>
                    ) : null}

                    {(!previewConfigureOpen || (isAnimatedCardType && !animatedSaveStaticFlow)) &&
                    (!isAnimatedCardType || previewCards.length > 1 || !animatedChoiceModalOpen) ? (
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
                            {isHighlightCardType && highlightClipDraft?.confirmed ? (
                              <ExpandableCardView
                                showHint
                                card={highlightPreviewExpandCard}
                                alt={`Preview ${idx + 1}`}
                                localHighlightVideoUrl={highlightClipDraft.objectUrl}
                                highlightTrimStart={highlightClipDraft.trimStart ?? 0}
                                highlightTrimEnd={highlightClipDraft.trimEnd ?? null}
                              >
                                <HighlightCardPreview
                                  playerName={playerDisplayName}
                                  teamName={teamName}
                                  position={position}
                                  jerseyNumber={jerseyNumber}
                                  gradYear={gradYear}
                                  tier={orderTier}
                                  theme={specialTheme}
                                  clipDraft={highlightClipDraft}
                                  forcePlay
                                />
                              </ExpandableCardView>
                            ) : (
                              <ExpandableCardView
                                showHint
                                card={previewToDisplayCard(preview)}
                                alt={`Preview ${idx + 1}`}
                              >
                                <CardImage
                                  card={previewToDisplayCard(preview)}
                                  alt={`Preview ${idx + 1}`}
                                  showInfoBanner
                                  playOnHover={isHighlightCardType}
                                  forcePlay={isHighlightCardType}
                                />
                              </ExpandableCardView>
                            )}
                            <div className="space-y-2 bg-cardBg2 p-3">
                              <p className="text-xs text-slate-400">
                                <span className={`rounded-full border px-1.5 py-0.5 ${tierTheme.pill}`}>
                                  {tierTheme.sub}
                                </span>{" "}
                                Preview {idx + 1}
                              </p>
                              {isAnimatedCardType ? (
                                previewCards.length > 1 || !animatedChoiceModalOpen ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPreviewUrl(preview.image_url);
                                      setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
                                    }}
                                    className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 py-2 text-sm font-semibold text-slate-950"
                                  >
                                    Choose This Card
                                  </button>
                                ) : null
                              ) : previewCards.length > 1 ? (
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

                    {previewConfigureOpen && (!isAnimatedCardType || animatedSaveStaticFlow) ? (
                      <div
                        ref={configureFocusRef}
                        className="scroll-focus-target rounded-2xl border border-violet-400/30 bg-cardBg2 p-4 sm:p-6"
                      >
                        <p className="text-center text-sm font-medium text-white">Confirm your card</p>
                        <div className="mx-auto mt-4 max-w-xs">
                          {isHighlightCardType && highlightClipDraft?.confirmed ? (
                            <ExpandableCardView
                              showHint
                              card={highlightPreviewExpandCard}
                              alt="Selected preview"
                              localHighlightVideoUrl={highlightClipDraft.objectUrl}
                              highlightTrimStart={highlightClipDraft.trimStart ?? 0}
                              highlightTrimEnd={highlightClipDraft.trimEnd ?? null}
                            >
                              <HighlightCardPreview
                                playerName={playerDisplayName}
                                teamName={teamName}
                                position={position}
                                jerseyNumber={jerseyNumber}
                                gradYear={gradYear}
                                tier={orderTier}
                                theme={specialTheme}
                                clipDraft={highlightClipDraft}
                                forcePlay
                              />
                            </ExpandableCardView>
                          ) : (
                            <ExpandableCardView
                              showHint
                              card={
                                featuredDisplayCard || {
                                  image_url: selectedPreviewUrl || generatedCardUrl,
                                  player_name: playerDisplayName,
                                  team_name: teamName,
                                  position,
                                  jersey_number: jerseyNumber,
                                  grad_year: gradYear,
                                  tier: orderTier || "rookie",
                                  theme: specialTheme,
                                  special_theme: specialTheme,
                                }
                              }
                              alt="Selected preview"
                            >
                              <CardImage
                                card={
                                  featuredDisplayCard || {
                                    image_url: selectedPreviewUrl || generatedCardUrl,
                                    player_name: playerDisplayName,
                                    team_name: teamName,
                                    position,
                                    jersey_number: jerseyNumber,
                                    grad_year: gradYear,
                                    tier: orderTier || "rookie",
                                    theme: specialTheme,
                                  }
                                }
                                alt="Selected preview"
                                showInfoBanner
                              />
                            </ExpandableCardView>
                          )}
                        </div>
                        <GenerationCostSummary
                          playerName={playerDisplayName}
                          teamName={teamName}
                          position={position}
                          jerseyNumber={jerseyNumber}
                          gradYear={gradYear}
                          tierLabel={selectedTierLabel}
                          themeLabel={specialTheme ? selectedThemeLabel : ""}
                          isAnimated={false}
                          isHighlight={isHighlightCardType}
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
                          confirmLabel="Add to Collection"
                          loadingLabel="Creating your cards..."
                          heading="How many copies do you want?"
                          subheading="Order multiple copies to trade with teammates and friends."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewConfigureOpen(false);
                            setAnimatedSaveStaticFlow(false);
                            if (isAnimatedCardType) {
                              setAnimatedFlowStage(ANIMATED_FLOW_STAGE.CHOICE);
                            }
                          }}
                          className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-200"
                        >
                          ← Back
                        </button>
                        <div className="mt-4 flex justify-center">
                          <StartOverButton
                            onClick={() => setShowStartOverConfirm(true)}
                            disabled={startOverBusy || addCollectionLoading || Boolean(orderActionKey)}
                          />
                        </div>
                      </div>
                    ) : null}

                    {previewCards.length > 0 &&
                    !packOpeningActive &&
                    !isGenerating &&
                    !previewConfigureOpen &&
                    reviewSubPhase === "generate" ? (
                      <div className="flex justify-center pt-1">
                        <StartOverButton
                          onClick={() => setShowStartOverConfirm(true)}
                          disabled={startOverBusy || Boolean(orderActionKey)}
                        />
                      </div>
                    ) : null}

                    {!previewConfigureOpen && !animatedSaveStaticFlow && previewCards.length === 1 ? (
                      <div className="text-center">
                        {generationCap.blocked ? (
                          <GenerationCapNotice usage={generationUsage} period={generationCap.period} className="text-left" />
                        ) : (
                          <>
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
                            <GenerationDailyUsageHint usage={generationUsage} className="mt-2" />
                          </>
                        )}
                      </div>
                    ) : null}

                    {!previewConfigureOpen && !animatedSaveStaticFlow && previewCards.length > 1 && !isPreviewLimitReached ? (
                      <div className="text-center">
                        {generationCap.blocked ? (
                          <GenerationCapNotice usage={generationUsage} period={generationCap.period} className="text-left" />
                        ) : (
                          <>
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
                            <GenerationDailyUsageHint usage={generationUsage} className="mt-2" />
                          </>
                        )}
                      </div>
                    ) : null}

                    {!canAffordRegenerate && activePreviewCount > 0 ? (
                      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <p>{creditTopUpShortfallMessage(Math.max(0, additionalPreviewCost - creditBalance))}</p>
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
                  </>
                )}
              </div>
            ) : null}

            {currentStep === STEP_REVIEW && reviewSubPhase === "approve" ? (
              <div ref={approveFocusRef} className="scroll-focus-target grid gap-6">
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

        <FeaturedCard
          card={featuredDisplayCard}
          loading={isGenerating && !packOpeningActive}
        />
        {user ? <CardGallery cards={cards} /> : null}
      </main>

      <StartOverConfirmModal
        open={showStartOverConfirm}
        onClose={() => setShowStartOverConfirm(false)}
        onConfirm={handleStartOverConfirm}
        busy={startOverBusy}
      />

      {showRegenerateConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4">
          <div
            ref={regenerateModalRef}
            className="scroll-focus-target w-full max-w-md rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl shadow-black/50 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-white">Generate another preview?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Generate another preview for {formatMoney(additionalPreviewCost)}?
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Your balance: <span className="font-semibold text-neonTeal">{formatMoney(creditBalance)}</span>
            </p>
            {generationCap.blocked ? (
              <GenerationCapNotice
                usage={generationUsage}
                period={generationCap.period}
                className="mt-4"
              />
            ) : (
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
            )}
          </div>
        </div>
      ) : null}

      <AnimatedCardChoiceModal
        open={animatedChoiceModalOpen}
        previewImageUrl={selectedPreviewUrl || generatedCardUrl}
        previewCard={animatedModalPreviewCard}
        previewAlt={playerDisplayName || "Your card"}
        onAnimate={handleAnimatedChoiceAnimate}
        onSaveStatic={handleAnimatedChoiceSaveStatic}
        busy={addCollectionLoading || Boolean(orderActionKey)}
      />

      <AnimatedQuantityModal
        open={showAnimatedQuantityModal}
        onClose={handleCloseAnimatedQuantity}
        onConfirm={handleApproveAndAnimate}
        busy={addCollectionLoading || Boolean(orderActionKey)}
        generationPricing={generationPricing}
        creditBalance={creditBalance}
        previewImageUrl={toApiUrl(selectedPreviewUrl || generatedCardUrl)}
        previewCard={animatedModalPreviewCard}
        previewAlt={playerDisplayName || "Your card"}
      />

      <AnimateCardConfirmModal
        open={showAnimateConfirm}
        onClose={handleCloseAnimateConfirm}
        onConfirm={() => {
          setShowAnimateConfirm(false);
          setShowAnimatedFlowExplainer(true);
        }}
        busy={addCollectionLoading || Boolean(orderActionKey)}
        card={wizardPreviewCard}
        previewImageUrl={uploadedPhotoUrl || imagePreviewUrl}
        previewAlt={playerDisplayName || "Your photo"}
        motionName={motionDisplayName}
        cost={animatedUpgradeCost}
        creditBalance={creditBalance}
        showAiDisclaimer
        intentOnly
      />

      <AnimatedFlowExplainer
        open={showAnimatedFlowExplainer}
        motionName={motionDisplayName}
        onContinue={() => {
          setShowAnimatedFlowExplainer(false);
          handleGenerateFirstPreview();
        }}
      />

      {highlightProcessingCardId ? (
        <HighlightProcessingScreen
          card={highlightProcessingCard}
          cardId={highlightProcessingCardId}
          token={token}
          onCompleted={handleHighlightProcessingComplete}
          onFailed={handleHighlightProcessingFailed}
        />
      ) : null}

      <AppFooter />
    </div>
  );
}
