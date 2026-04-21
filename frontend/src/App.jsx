import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8765";

function App() {
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [tier, setTier] = useState("base");
  const [generatedCardUrl, setGeneratedCardUrl] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const canCreatePlayer = name.trim() && team.trim() && imageFile && !loading;
  const canGenerate = playerId && !loading;

  const generatedCardFullUrl = useMemo(() => {
    if (!generatedCardUrl) return "";
    return `${API_BASE}${generatedCardUrl}`;
  }, [generatedCardUrl]);

  async function fetchCards() {
    const res = await fetch(`${API_BASE}/cards`);
    if (!res.ok) {
      throw new Error("Failed to load cards.");
    }
    const data = await res.json();
    setCards(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    fetchCards().catch(() => {
      setMessage("Could not load cards yet.");
    });
  }, []);

  async function handleCreatePlayer(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const uploadRes = await fetch(`${API_BASE}/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        throw new Error("Image upload failed.");
      }
      const uploadData = await uploadRes.json();

      const playerRes = await fetch(`${API_BASE}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          team: team.trim(),
          age: 18,
          image_url: uploadData.url,
        }),
      });
      if (!playerRes.ok) {
        const detail = await playerRes.text();
        throw new Error(`Player creation failed. ${detail}`);
      }
      const playerData = await playerRes.json();

      setPlayerId(playerData.id);
      setMessage(`Player created (id: ${playerData.id}).`);
      await fetchCards();
    } catch (err) {
      setMessage(err.message || "Error creating player.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCard() {
    if (!playerId) return;
    setLoading(true);
    setMessage("");
    setGeneratedCardUrl("");

    try {
      const res = await fetch(
        `${API_BASE}/generate-card/${playerId}?use_ai=true&tier=${tier}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Card generation failed.");
      }

      setGeneratedCardUrl(data.url || "");
      setMessage(`Card generated. Style: ${data.style || data.generation || "unknown"}`);
      await fetchCards();
    } catch (err) {
      setMessage(err.message || "Error generating card.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Player Card App</h1>
      <div className="status-banner">
        Frontend loaded. Backend target: <code>{API_BASE}</code>
      </div>

      <section>
        <h2>Create Player</h2>
        <form onSubmit={handleCreatePlayer}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label>
            Team
            <input value={team} onChange={(e) => setTeam(e.target.value)} />
          </label>

          <label>
            Player Image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </label>

          <button type="submit" disabled={!canCreatePlayer}>
            {loading ? "Working..." : "Create Player"}
          </button>
        </form>
      </section>

      <section>
        <h2>Generate Card</h2>
        <p>Current player id: {playerId ?? "none"}</p>
        <label>
          Tier
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="base">Base</option>
            <option value="rare">Rare</option>
            <option value="legendary">Legendary</option>
          </select>
        </label>
        <button type="button" disabled={!canGenerate} onClick={handleGenerateCard}>
          {loading ? "Working..." : "Generate Card"}
        </button>
      </section>

      {message ? <p>{message}</p> : null}

      {generatedCardFullUrl ? (
        <section>
          <h2>Latest Generated Card</h2>
          <img src={generatedCardFullUrl} alt="Generated player card" />
        </section>
      ) : null}

      <section>
        <h2>All Generated Cards</h2>
        <div className="card-grid">
          {cards.map((card) => (
            <article key={card.id} className="card-item">
              <img src={`${API_BASE}${card.image_url}`} alt={`Card ${card.id}`} />
              <p>Card #{card.id}</p>
              <p>Player #{card.player_id}</p>
              <p>{card.style}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
