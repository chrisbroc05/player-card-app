import React, { useEffect, useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import AppFooter from "./components/AppFooter";
import PlayerFormCard from "./components/PlayerFormCard";
import FeaturedCard from "./components/FeaturedCard";
import CardGallery from "./components/CardGallery";
import OrdersDashboard from "./components/OrdersDashboard";
import { API_BASE_URL, toApiUrl } from "./config/api";

function App() {
  const [workspace, setWorkspace] = useState("customer");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [position, setPosition] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [teamName, setTeamName] = useState("");
  const [battingHand, setBattingHand] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [generatedTier, setGeneratedTier] = useState("base");
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [cards, setCards] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState({});
  const [orderCustomerName, setOrderCustomerName] = useState("Test User");
  const [orderCustomerEmail, setOrderCustomerEmail] = useState("test@email.com");
  const [orderTier, setOrderTier] = useState("all_star");
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orderActionKey, setOrderActionKey] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreatePlayer = Boolean(
    firstName.trim() &&
      (lastName.trim() || displayName.trim()) &&
      jerseyNumber.trim() &&
      position.trim() &&
      gradYear &&
      teamName.trim() &&
      imageFile &&
      !isCreating &&
      !isGenerating
  );
  const canCreateOrder = Boolean(
    currentPlayer &&
      orderCustomerName.trim() &&
      orderCustomerEmail.trim() &&
      !isCreating &&
      !isGenerating
  );
  const generatedCardFullUrl = useMemo(
    () => toApiUrl(generatedCardUrl),
    [generatedCardUrl]
  );
  const activeOrder = useMemo(
    () => orders.find((order) => order.id === currentOrderId) || null,
    [orders, currentOrderId]
  );
  const activePreviewCount = Number(activeOrder?.preview_count ?? 0);
  const activePreviewLimit = Number(activeOrder?.preview_limit ?? 3);
  const remainingPreviews = Math.max(0, activePreviewLimit - activePreviewCount);
  const isPreviewLimitReached = Boolean(activeOrder && activePreviewCount >= activePreviewLimit);

  async function fetchCards() {
    const res = await fetch(`${API_BASE_URL}/cards`);
    if (!res.ok) {
      throw new Error("Failed to load generated cards.");
    }
    const data = await res.json();
    setCards(Array.isArray(data) ? data : []);
  }

  async function fetchOrders() {
    const res = await fetch(`${API_BASE_URL}/orders`);
    if (!res.ok) {
      throw new Error("Failed to load orders.");
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setOrders(list);

    // Keep a default selected status per order row.
    setOrderStatusDrafts((prev) => {
      const next = { ...prev };
      for (const order of list) {
        if (!next[order.id]) next[order.id] = order.status;
      }
      return next;
    });
  }

  useEffect(() => {
    Promise.all([fetchCards(), fetchOrders()]).catch((err) => {
      setError(err.message || "Could not load cards.");
    });
  }, []);

  async function handleCreatePlayer(e) {
    e.preventDefault();
    setIsCreating(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch(`${API_BASE_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        throw new Error("Image upload failed.");
      }
      const uploadData = await uploadRes.json();

      const playerRes = await fetch(`${API_BASE_URL}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim() || "N/A",
          display_name: displayName.trim() || null,
          jersey_number: jerseyNumber.trim(),
          position: position.trim(),
          grad_year: Number(gradYear),
          team_name: teamName.trim(),
          batting_hand: battingHand || null,
          image_url: uploadData.url,
        }),
      });
      if (!playerRes.ok) {
        const detail = await playerRes.text();
        throw new Error(`Player creation failed. ${detail}`);
      }
      const playerData = await playerRes.json();

      setPlayerId(playerData.id);
      setCurrentPlayer(playerData);
      setMessage(`Player created. Ready to generate cards (Player #${playerData.id}).`);
      await Promise.all([fetchCards(), fetchOrders()]);
    } catch (err) {
      setError(err.message || "Error creating player.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateOrderStatus(orderId) {
    const status = orderStatusDrafts[orderId];
    if (!status) return;

    setOrderActionKey(`status-${orderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to update order status.");
      }
      setMessage(`Order #${orderId} updated to ${data.status}.`);
      await fetchOrders();
    } catch (err) {
      setError(err.message || "Failed to update order status.");
    } finally {
      setOrderActionKey("");
    }
  }

  async function handleGenerateForOrder(orderId) {
    setOrderActionKey(`generate-${orderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/generate-card`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to generate order card.");
      }
      setGeneratedCardUrl(data.image_url || "");
      setGeneratedTier(data.tier || "base");
      setMessage(`Generated card for order #${orderId}.`);
      await Promise.all([fetchCards(), fetchOrders()]);
    } catch (err) {
      setError(err.message || "Failed to generate order card.");
    } finally {
      setOrderActionKey("");
    }
  }

  async function handleGeneratePreviewForCurrentOrder() {
    if (!currentOrderId) {
      setError("Create an order first, then generate a preview.");
      return;
    }
    if (isPreviewLimitReached) {
      setError("You’ve reached your preview limit");
      return;
    }
    await handleGenerateForOrder(currentOrderId);
  }

  async function handleDeliverOrder(orderId) {
    setOrderActionKey(`deliver-${orderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}/deliver`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to deliver order.");
      }
      if (data.final_card_url) {
        setGeneratedCardUrl(data.final_card_url);
      }
      setMessage(`Order #${orderId} marked as delivered.`);
      await Promise.all([fetchCards(), fetchOrders()]);
    } catch (err) {
      setError(err.message || "Failed to deliver order.");
    } finally {
      setOrderActionKey("");
    }
  }

  async function handleCreateOrderFromCurrentPlayer() {
    if (!currentPlayer) {
      setError("Create a player first so we have player data for the order.");
      return;
    }

    setOrderActionKey("create-order");
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: orderCustomerName.trim(),
          customer_email: orderCustomerEmail.trim(),
          player_first_name: currentPlayer.first_name,
          player_last_name: currentPlayer.last_name,
          player_display_name: currentPlayer.display_name ?? null,
          player_jersey_number: currentPlayer.jersey_number,
          player_position: currentPlayer.position,
          player_grad_year: currentPlayer.grad_year,
          player_team_name: currentPlayer.team_name,
          player_batting_hand: currentPlayer.batting_hand ?? null,
          player_image_url: currentPlayer.image_url,
          tier: orderTier,
          add_ons: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to create order.");
      }
      setCurrentOrderId(data.id);
      setMessage(`Order #${data.id} created.`);
      await fetchOrders();
    } catch (err) {
      setError(err.message || "Failed to create order.");
    } finally {
      setOrderActionKey("");
    }
  }

  async function handleApprovePreviewForCurrentOrder() {
    if (!currentOrderId) {
      setError("Create an order first, then approve a preview.");
      return;
    }
    setOrderActionKey(`approve-${currentOrderId}`);
    setMessage("");
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${currentOrderId}/approve-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: generatedCardUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to approve preview.");
      }
      setMessage(
        `Preview approved for order #${currentOrderId}. Sent to Admin Fulfillment for review.`
      );
      await fetchOrders();
      setWorkspace("admin");
    } catch (err) {
      setError(err.message || "Failed to approve preview.");
    } finally {
      setOrderActionKey("");
    }
  }

  function handleOpenCompleteOrderModal() {
    if (!currentOrderId) {
      setError("Create an order first, then complete the order.");
      return;
    }
    if (!generatedCardUrl) {
      setError("Generate a preview first, then complete the order.");
      return;
    }
    setShowCompleteModal(true);
  }

  return (
    <div className="min-h-screen bg-appBg text-slate-100">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-white/10 bg-cardBg p-3 shadow-xl shadow-black/30 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Workflow Workspace</h2>
              <p className="text-xs text-slate-400">
                Switch between customer checkout actions and admin fulfillment actions.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-white/15 bg-cardBg2 p-1">
              <button
                type="button"
                onClick={() => setWorkspace("customer")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  workspace === "customer"
                    ? "bg-neonBlue/25 text-neonBlue"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Customer Checkout
              </button>
              <button
                type="button"
                onClick={() => setWorkspace("admin")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  workspace === "admin"
                    ? "bg-neonPurple/25 text-violet-200"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Admin Fulfillment
              </button>
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

        {workspace === "customer" ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <PlayerFormCard
                firstName={firstName}
                lastName={lastName}
                displayName={displayName}
                jerseyNumber={jerseyNumber}
                position={position}
                gradYear={gradYear}
                teamName={teamName}
                battingHand={battingHand}
                imageFile={imageFile}
                setFirstName={setFirstName}
                setLastName={setLastName}
                setDisplayName={setDisplayName}
                setJerseyNumber={setJerseyNumber}
                setPosition={setPosition}
                setGradYear={setGradYear}
                setTeamName={setTeamName}
                setBattingHand={setBattingHand}
                setImageFile={setImageFile}
                onSubmit={handleCreatePlayer}
                disabled={!canCreatePlayer}
                loading={isCreating}
              />

              <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
                <h2 className="text-lg font-semibold text-white">Create Order</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Submit an order for the current player. This creates the job for fulfillment.
                </p>
                <div className="mt-5 grid gap-3">
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-slate-200">Customer Name</span>
                    <input
                      value={orderCustomerName}
                      onChange={(e) => setOrderCustomerName(e.target.value)}
                      className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-slate-200">Customer Email</span>
                    <input
                      value={orderCustomerEmail}
                      onChange={(e) => setOrderCustomerEmail(e.target.value)}
                      className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonBlue focus:ring-2 focus:ring-neonBlue/30"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-slate-200">Order Tier</span>
                    <select
                      value={orderTier}
                      onChange={(e) => setOrderTier(e.target.value)}
                      className="rounded-xl border border-white/15 bg-cardBg2 px-3 py-2 text-slate-100 outline-none transition focus:border-neonPurple focus:ring-2 focus:ring-neonPurple/30"
                    >
                      <option value="rookie">rookie</option>
                      <option value="all_star">all_star</option>
                      <option value="legends">legends</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateOrderFromCurrentPlayer}
                    disabled={!canCreateOrder || Boolean(orderActionKey)}
                    className="mt-1 inline-flex items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {orderActionKey === "create-order" ? "Creating Order..." : "Create Order"}
                  </button>
                  <p className="text-xs text-slate-400">
                    Current Player ID: <span className="text-slate-200">{playerId ?? "None yet"}</span>
                  </p>
                </div>
              </section>
            </section>

            <section className="rounded-2xl border border-white/10 bg-cardBg p-5 shadow-xl shadow-black/30 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Customer Preview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Generate order-linked previews, then approve one to send to admin for final review.
              </p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-xl border border-white/10 bg-cardBg2 px-3 py-2 text-sm text-slate-300">
                  Active Order ID: <span className="font-medium text-white">{currentOrderId ?? "None yet"}</span>
                </div>
                {activeOrder ? (
                  <div className="rounded-xl border border-white/10 bg-cardBg2 px-3 py-2 text-sm text-slate-300">
                    You have <span className="font-medium text-white">{remainingPreviews}</span> of{" "}
                    <span className="font-medium text-white">{activePreviewLimit}</span> previews remaining
                  </div>
                ) : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleGeneratePreviewForCurrentOrder}
                    disabled={!currentOrderId || Boolean(orderActionKey) || isPreviewLimitReached}
                    className="inline-flex items-center justify-center rounded-xl bg-neonPurple px-4 py-2.5 text-sm font-medium text-white shadow-glowPurple transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {orderActionKey === `generate-${currentOrderId}`
                      ? "Generating preview..."
                      : "Generate Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCompleteOrderModal}
                    disabled={!currentOrderId || Boolean(orderActionKey)}
                    className="inline-flex items-center justify-center rounded-xl bg-neonTeal px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {orderActionKey === `approve-${currentOrderId}`
                      ? "Approving..."
                      : "Complete Order"}
                  </button>
                </div>
                {isPreviewLimitReached ? (
                  <p className="text-xs text-amber-200">You’ve reached your preview limit</p>
                ) : null}
                <p className="text-xs text-slate-400">
                  Preview generation uses the order tier. Completing the order marks selected preview and moves to
                  <code> awaiting_review</code>.
                </p>
              </div>
            </section>
          </>
        ) : (
          <OrdersDashboard
            orders={orders}
            orderStatusDrafts={orderStatusDrafts}
            setOrderStatusDrafts={setOrderStatusDrafts}
            onUpdateStatus={handleUpdateOrderStatus}
            onDeliver={handleDeliverOrder}
            activeActionKey={orderActionKey}
          />
        )}

        <FeaturedCard
          imageUrl={generatedCardFullUrl}
          tier={generatedTier}
          loading={isGenerating}
        />

        <CardGallery cards={cards} />

        {workspace === "customer" ? (
          <section className="rounded-2xl border border-white/10 bg-cardBg p-4 text-sm text-slate-300 sm:p-5">
            <p className="font-medium text-white">Customer sequence</p>
            <p className="mt-1">Create player profile → Create order → wait for fulfillment updates.</p>
          </section>
        ) : null}
      </main>

      {showCompleteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-cardBg p-5 shadow-2xl shadow-black/50 sm:p-6">
            <h3 className="text-lg font-semibold text-white">Complete Order</h3>
            <p className="mt-1 text-sm text-slate-300">
              Confirm your selected preview and send this order to admin review.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr]">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-cardBg2">
                {generatedCardFullUrl ? (
                  <img src={generatedCardFullUrl} alt="Selected preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-44 items-center justify-center text-xs text-slate-500">No preview</div>
                )}
              </div>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-400">Order ID:</span>{" "}
                  <span className="font-medium text-white">{currentOrderId ?? "—"}</span>
                </p>
                <p>
                  <span className="text-slate-400">Customer:</span>{" "}
                  <span className="font-medium text-white">{orderCustomerName || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-400">Email:</span>{" "}
                  <span className="font-medium text-white">{orderCustomerEmail || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-400">Tier:</span>{" "}
                  <span className="font-medium text-white">{activeOrder?.tier || orderTier}</span>
                </p>
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                  After completion, this order moves to admin review. Expected delivery after approval: 1-2 business
                  days.
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
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
                className="rounded-lg bg-neonTeal px-3 py-2 text-sm font-medium text-slate-950 hover:brightness-110 disabled:opacity-50"
              >
                Confirm & Send to Review
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AppFooter />
    </div>
  );
}

export default App;
