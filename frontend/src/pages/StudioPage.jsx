import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import FeaturedCard from "../components/FeaturedCard";
import CardGallery from "../components/CardGallery";
import PostGenerationPanel from "../components/PostGenerationPanel";
import StudioAuthGate from "../components/StudioAuthGate";
import ThemeLibraryPicker from "../components/ThemeLibraryPicker";
import { API_BASE_URL, authHeaders, toApiUrl } from "../config/api";
import { useAuth } from "../context/AuthContext";

const STEPS = [
  "Choose Tier",
  "Player Details",
  "Upload Photo",
  "Choose Theme",
  "Generate Preview",
  "Approve Card",
];

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

function stepChipClass(step, currentStep) {
  if (step < currentStep) return "border-neonTeal/50 bg-neonTeal/20 text-teal-100";
  if (step === currentStep) return "border-neonBlue/60 bg-neonBlue/20 text-neonBlue";
  return "border-white/15 bg-cardBg2 text-slate-300";
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
  const { token, user, initializing } = useAuth();
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
  const [orderTier, setOrderTier] = useState("all_star");
  const [specialTheme, setSpecialTheme] = useState("");

  const [themeCategories, setThemeCategories] = useState([]);
  const [themesLoading, setThemesLoading] = useState(true);
  const [themesError, setThemesError] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orderActionKey, setOrderActionKey] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savedCardDetail, setSavedCardDetail] = useState(null);

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

  const canGoStep2 = Boolean(orderTier);
  const canGoStep3 = Boolean(
    firstName.trim() &&
      (lastName.trim() || displayName.trim()) &&
      jerseyNumber.trim() &&
      position.trim() &&
      gradYear &&
      teamName.trim()
  );
  const canGoStep4 = Boolean(imageFile);
  const canCreateOrder = Boolean(
    currentStep >= 4 &&
      orderCustomerName.trim() &&
      orderCustomerEmail.trim() &&
      !isCreating &&
      !isGenerating
  );

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  useEffect(() => {
    if (!previewCards.length) return;
    const currentExists = previewCards.some((p) => p.image_url === selectedPreviewUrl);
    if (!selectedPreviewUrl || !currentExists) {
      setSelectedPreviewUrl(previewCards[previewCards.length - 1].image_url);
    }
  }, [previewCards, selectedPreviewUrl]);

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
    if (currentStep !== 6 || !activeOrder?.final_card_url) return;
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
  }, [currentStep, activeOrder]);

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
    setOrderStatusDrafts((prev) => {
      const next = { ...prev };
      for (const order of list) {
        if (!next[order.id]) next[order.id] = order.status;
      }
      return next;
    });
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

  async function handleCreatePlayerAndOrder() {
    setIsCreating(true);
    setOrderActionKey("create-order");
    setMessage("");
    setError("");
    try {
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
          special_theme: specialTheme || null,
          add_ons: [],
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(formatApiError(orderData?.detail, "Failed to create order."));

      setCurrentOrderId(orderData.id);
      setMessage(`Order #${orderData.id} created. Generate your previews next.`);
      await Promise.all([fetchMyCards(), fetchOrders()]);
      setCurrentStep(5);
    } catch (err) {
      setError(err.message || "Failed to create order.");
    } finally {
      setIsCreating(false);
      setOrderActionKey("");
    }
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
      await Promise.all([fetchMyCards(), fetchOrders()]);
    } catch (err) {
      setError(err.message || "Failed to generate order card.");
    } finally {
      setIsGenerating(false);
      setOrderActionKey("");
    }
  }

  async function handleGeneratePreviewForCurrentOrder() {
    if (!currentOrderId) return setError("Create an order first.");
    if (isPreviewLimitReached) return setError("You’ve reached your preview limit");
    await handleGenerateForOrder(currentOrderId);
  }

  async function handleApprovePreviewForCurrentOrder() {
    if (!currentOrderId) return setError("Create an order first.");
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
      if (!res.ok) throw new Error(formatApiError(data?.detail, "Failed to approve preview."));
      if (data.final_card_url) setGeneratedCardUrl(data.final_card_url);
      setMessage(`Order #${currentOrderId} completed and delivered.`);
      await fetchOrders();
      setCurrentStep(6);
    } catch (err) {
      setError(err.message || "Failed to approve preview.");
    } finally {
      setOrderActionKey("");
    }
  }

  function handleOpenCompleteOrderModal() {
    if (!currentOrderId) return setError("Create an order first.");
    if (!selectedPreviewUrl && !generatedCardUrl) return setError("Generate and select a preview first.");
    setShowCompleteModal(true);
  }

  function handleDropFile(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setMessage("Photo added.");
      setError("");
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-appBg text-slate-100">
      <AppHeader />

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

        <section className="animate-fadeUp rounded-2xl border border-white/10 bg-cardBg p-4 shadow-xl shadow-black/30 sm:p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {STEPS.map((label, i) => {
                const step = i + 1;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCurrentStep(step)}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition ${stepChipClass(
                      step,
                      currentStep
                    )}`}
                  >
                    {step}. {label}
                  </button>
                );
              })}
            </div>

            {!user && currentStep >= 2 ? (
              <StudioAuthGate onBackToTiers={() => setCurrentStep(1)} />
            ) : (
              <>
            {currentStep === 1 ? (
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
                      setCurrentStep(2);
                    }}
                    className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
                      orderTier === opt.value
                        ? opt.active
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
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5"
                    placeholder="Display Name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5"
                    placeholder="Jersey Number"
                    value={jerseyNumber}
                    onChange={(e) => setJerseyNumber(e.target.value)}
                  />
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5"
                    placeholder="Position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                  <input
                    type="number"
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 sm:col-span-2"
                    placeholder="Grad Year"
                    value={gradYear}
                    onChange={(e) => setGradYear(e.target.value)}
                  />
                  <input
                    className="min-h-[44px] rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 sm:col-span-2"
                    placeholder="Team Name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back to Tier
                  </button>
                  <button
                    type="button"
                    disabled={!canGoStep3}
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:opacity-50"
                  >
                    Continue to Photo Upload
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="grid gap-4">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDropFile}
                  className={`flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                    dragActive
                      ? "border-neonBlue/70 bg-neonBlue/10"
                      : "border-white/20 bg-cardBg2 hover:border-neonBlue/40"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-slate-200">Drag & drop player photo</p>
                  <p className="text-xs text-slate-400">or click to choose an image</p>
                </label>
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Upload preview"
                    className="max-h-72 w-full rounded-xl border border-white/15 object-cover sm:max-h-96"
                  />
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back to Player Details
                  </button>
                  <button
                    type="button"
                    disabled={!canGoStep4}
                    onClick={() => setCurrentStep(4)}
                    className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonBlue px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:opacity-50"
                  >
                    Continue to Theme
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div className="grid gap-8">
                <ThemeLibraryPicker
                  categories={themeCategories}
                  loading={themesLoading}
                  error={themesError}
                  onRetry={fetchThemes}
                  value={specialTheme}
                  onChange={setSpecialTheme}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-cardBg2 p-3">
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
                  <div className="rounded-xl border border-white/10 bg-cardBg2 p-4 text-sm text-slate-300">
                    <p className="font-medium text-white">Selection Summary</p>
                    <p className="mt-2">
                      Tier: {selectedTierLabel}{" "}
                      <span className="text-slate-400">({selectedTierRarityLabel})</span>
                    </p>
                    <p>Theme: {selectedThemeLabel}</p>
                    <p>Player: {displayName || `${firstName} ${lastName}`.trim() || "TBD"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePlayerAndOrder}
                    disabled={!canCreateOrder}
                    className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-medium text-slate-950 disabled:opacity-50"
                  >
                    {orderActionKey === "create-order" ? "Creating Player & Order..." : "Create Player & Order"}
                  </button>
                </div>
              </div>
            ) : null}

            {currentStep === 5 ? (
              <div className="grid gap-4">
                <div className="rounded-xl border border-white/10 bg-cardBg2 p-3 text-sm text-slate-300">
                  Active Order ID: <span className="font-medium text-white">{currentOrderId ?? "None yet"}</span> ·{" "}
                  Remaining previews:{" "}
                  <span className="font-medium text-white">
                    {remainingPreviews}/{activePreviewLimit}
                  </span>
                </div>
                <div className={`rounded-xl border p-3 text-xs text-slate-200 ${tierTheme.preview}`}>
                  <p className="font-medium tracking-wide text-white">
                    {tierTheme.label} {tierTheme.sub} Presentation
                  </p>
                  <p className="mt-1 text-slate-300">
                    {tierTheme.desc} Framing, glow, and accents are tuned to this rarity tier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePreviewForCurrentOrder}
                  disabled={!currentOrderId || isPreviewLimitReached || Boolean(orderActionKey)}
                  className={`inline-flex min-h-[46px] w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all sm:w-auto disabled:opacity-50 ${tierTheme.loading}`}
                >
                  {orderActionKey === `generate-${currentOrderId}` ? "Generating..." : "Generate Card Preview"}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100 sm:w-auto"
                >
                  Back to Theme & Details
                </button>
                {isGenerating ? (
                  <div className={`rounded-xl border px-3 py-2 ${tierTheme.loading}`}>
                    <div className="mb-2 flex items-center gap-2 text-xs text-violet-100">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-violet-300" />
                      Minting your {selectedTierLabel} preview...
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-neonBlue via-neonPurple to-neonTeal" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-200/90">Applying rarity framing, effects, and finish...</p>
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {previewCards.map((preview, idx) => (
                    <button
                      key={`${preview.image_url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedPreviewUrl(preview.image_url)}
                      className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-300 ${
                        selectedPreviewUrl === preview.image_url
                          ? `${tierTheme.active} shadow-glowBlue`
                          : `${tierTheme.card} hover:translate-y-[-1px]`
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.2),transparent_35%)] opacity-30 group-hover:opacity-50 sm:block" />
                      <img
                        src={toApiUrl(preview.image_url)}
                        alt={`Preview ${idx + 1}`}
                        className="block aspect-[2/3] h-auto w-full object-contain"
                      />
                      <div className="bg-cardBg2 p-2 text-xs text-slate-300">
                        <span className={`rounded-full border px-1.5 py-0.5 ${tierTheme.pill}`}>{tierTheme.sub}</span>{" "}
                        Preview {idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
                {savedCardDetail && previewCards.length > 0 ? (
                  <PostGenerationPanel
                    detail={savedCardDetail}
                    onViewCollection={() => navigate("/my-collection")}
                    isLoggedIn={Boolean(user)}
                    showQuantityFlow={isOrderDelivered || currentStep >= 6}
                    token={token || ""}
                    onRefreshDetail={refreshSavedCardDetail}
                    onCardsUpdated={fetchMyCards}
                  />
                ) : null}
                <button
                  type="button"
                  onClick={handleOpenCompleteOrderModal}
                  disabled={!selectedPreviewUrl && !generatedCardUrl}
                  className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:opacity-50"
                >
                  Complete Order
                </button>
              </div>
            ) : null}

            {currentStep === 6 ? (
              <div className="grid gap-6">
                {savedCardDetail ? (
                  <PostGenerationPanel
                    detail={savedCardDetail}
                    onViewCollection={() => navigate("/my-collection")}
                    isLoggedIn={Boolean(user)}
                    showQuantityFlow={isOrderDelivered || currentStep >= 6}
                    token={token || ""}
                    onRefreshDetail={refreshSavedCardDetail}
                    onCardsUpdated={fetchMyCards}
                  />
                ) : null}
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
              </div>
            ) : null}
              </>
            )}
          </section>

        <FeaturedCard imageUrl={generatedCardFullUrl} tier={generatedTier} loading={isGenerating} />
        {user ? <CardGallery cards={cards} /> : null}
      </main>

      {showCompleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-cardBg p-4 shadow-2xl shadow-black/50 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Approve Final Card</h3>
            <p className="mt-1 text-sm text-slate-300">
              Confirm this preview as your final card and complete delivery.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr]">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-cardBg2">
                <img
                  src={toApiUrl(selectedPreviewUrl || generatedCardUrl)}
                  alt="Selected preview"
                  className="block h-auto w-full object-contain"
                />
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-400">Order ID:</span>{" "}
                  <span className="font-medium text-white">{currentOrderId ?? "—"}</span>
                </p>
                <p>
                  <span className="text-slate-400">Tier:</span>{" "}
                  <span className="font-medium text-white">
                    {selectedTierLabel} ({selectedTierRarityLabel})
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Theme:</span>{" "}
                  <span className="font-medium text-white">{selectedThemeLabel}</span>
                </p>
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                  After confirmation, the order is delivered automatically.
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="min-h-[42px] rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleApprovePreviewForCurrentOrder();
                  setShowCompleteModal(false);
                }}
                disabled={Boolean(orderActionKey)}
                className="min-h-[42px] rounded-lg bg-neonTeal px-3 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
              >
                Confirm & Complete Order
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AppFooter />
    </div>
  );
}
