import { API_BASE_URL } from "../config/api";
import { isAnimatedCard } from "./animationCard";
import { highlightVideoUrl, isHighlightCard } from "./highlightCard";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov"]);

function sanitizeFilenamePart(value) {
  return (
    String(value || "Player")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "Player"
  );
}

function inferExtensionFromUrl(url) {
  const path = String(url || "").split("?")[0];
  const match = path.match(/\.(\w+)$/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  if (ext === "jpeg") return "jpg";
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

/** Pick the best media URL and extension for a card download. */
export function getCardDownloadTarget(card) {
  if (!card) return null;

  const cardId = card.card_id || card.cardId || "card";
  const playerName = card.player_name || card.playerName || "Player";

  if (isHighlightCard(card)) {
    const url = highlightVideoUrl(card);
    if (url) {
      return {
        url,
        extension: inferExtensionFromUrl(url) || "mp4",
        cardId,
        playerName,
      };
    }
  }

  if (isAnimatedCard(card)) {
    const url = card.animated_video_url ?? card.animatedVideoUrl;
    if (url) {
      return {
        url,
        extension: inferExtensionFromUrl(url) || "mp4",
        cardId,
        playerName,
      };
    }
  }

  const imageUrl = card.image_url ?? card.imageUrl;
  if (!imageUrl) return null;

  return {
    url: imageUrl,
    extension: inferExtensionFromUrl(imageUrl) || "png",
    cardId,
    playerName,
  };
}

export function buildCardDownloadFilename(card, extension) {
  const target = getCardDownloadTarget(card);
  const ext = (extension || target?.extension || "png").replace(/^\./, "");
  const name = sanitizeFilenamePart(target?.playerName ?? card?.player_name ?? card?.playerName);
  const id = target?.cardId ?? card?.card_id ?? card?.cardId ?? "card";
  return `${name}-${id}.${ext}`;
}

function filenameFromContentDisposition(header) {
  if (!header) return null;
  const match = header.match(/filename="([^"]+)"/);
  return match?.[1] || null;
}

function triggerBlobDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/** Download card media via backend proxy (works on mobile; avoids R2 CORS). */
export async function downloadCardMedia(card, token) {
  const cardId = card?.card_id || card?.cardId;
  if (!cardId) {
    throw new Error("No downloadable media for this card.");
  }
  if (!token) {
    throw new Error("Authentication required.");
  }

  const response = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status}).`);
  }

  const blob = await response.blob();
  const target = getCardDownloadTarget(card);
  const filename =
    filenameFromContentDisposition(response.headers.get("Content-Disposition")) ||
    buildCardDownloadFilename(card, target?.extension);

  triggerBlobDownload(blob, filename);
}
