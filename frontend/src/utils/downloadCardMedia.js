import html2canvas from "html2canvas";
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

/** Pick metadata used for download filenames (styled capture is always PNG). */
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

export function buildCardDownloadFilename(card, extension = "png") {
  const target = getCardDownloadTarget(card);
  const ext = (extension || target?.extension || "png").replace(/^\./, "");
  const name = sanitizeFilenamePart(target?.playerName ?? card?.player_name ?? card?.playerName);
  const id = target?.cardId ?? card?.card_id ?? card?.cardId ?? "card";
  return `${name}-${id}.${ext}`;
}

export function isMobileDownloadDevice() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function resolveCaptureElement(card, { captureElement, captureRef } = {}) {
  if (captureElement) return captureElement;
  if (captureRef?.current) return captureRef.current;
  const cardId = card?.card_id || card?.cardId;
  if (cardId) {
    const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(cardId) : cardId;
    return document.querySelector(`[data-card-capture-id="${escaped}"]`);
  }
  return document.querySelector(".card-display-container");
}

/** Swap cloned videos for still frames using live video elements (never touches displayed DOM). */
function replaceClonedVideosWithFrames(cardElement, clonedElement, clonedDoc) {
  const liveVideos = Array.from(cardElement.querySelectorAll("video"));
  const clonedVideos = Array.from(clonedElement.querySelectorAll("video"));

  clonedVideos.forEach((clonedVideo, index) => {
    const liveVideo = liveVideos[index];
    if (!liveVideo || liveVideo.readyState < 2 || !liveVideo.videoWidth) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = liveVideo.videoWidth;
      canvas.height = liveVideo.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(liveVideo, 0, 0);

      const img = clonedDoc.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.className = clonedVideo.className;
      img.style.cssText = clonedVideo.style.cssText;
      const computed = window.getComputedStyle(clonedVideo);
      img.style.width = clonedVideo.style.width || computed.width;
      img.style.height = clonedVideo.style.height || computed.height;
      img.style.objectFit = computed.objectFit || "cover";
      img.style.objectPosition = computed.objectPosition || "center";
      clonedVideo.parentNode?.replaceChild(img, clonedVideo);
    } catch (error) {
      console.warn("Video frame capture failed:", error);
    }
  });
}

function fallbackDownload(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

async function fetchProxiedCardImageBlob(card, token) {
  const cardId = card?.card_id || card?.cardId;
  if (!cardId || !token) return null;

  try {
    const proxyResponse = await fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/image-proxy`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (proxyResponse.ok) {
      return proxyResponse.blob();
    }
  } catch (error) {
    console.warn("Proxy fetch failed:", error);
  }
  return null;
}

/**
 * Capture the styled card DOM as PNG and download or share natively on mobile.
 * Never modifies displayed image elements — proxy blob URLs are applied in onclone only.
 * @returns {Promise<{ method: 'share' | 'download' | 'cancelled' }>}
 */
export async function downloadCardMedia(card, { captureElement, captureRef, token } = {}) {
  const cardElement = resolveCaptureElement(card, { captureElement, captureRef });
  if (!cardElement) {
    throw new Error("Card element not found");
  }

  const cardId = card?.card_id || card?.cardId;
  let blobImageUrl = null;
  let imageBlob = null;

  try {
    imageBlob = await fetchProxiedCardImageBlob(card, token);
    if (imageBlob) {
      blobImageUrl = URL.createObjectURL(imageBlob);
    }

    const canvas = await html2canvas(cardElement, {
      useCORS: false,
      allowTaint: true,
      backgroundColor: "#0A0A0A",
      scale: 2,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc, clonedElement) => {
        const selector = cardId
          ? `[data-card-capture-id="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(cardId) : cardId}"]`
          : ".card-display-container";
        const clonedCard = clonedDoc.querySelector(selector) || clonedElement;
        if (clonedCard) {
          clonedCard.style.transform = "none";
        }

        replaceClonedVideosWithFrames(cardElement, clonedElement, clonedDoc);

        if (blobImageUrl) {
          clonedElement.querySelectorAll("img").forEach((img) => {
            if (img.src && img.src.includes("r2.dev")) {
              img.src = blobImageUrl;
              img.crossOrigin = "anonymous";
            }
          });
        }
      },
    });

    const filename = buildCardDownloadFilename(card, "png");
    const playerName = card?.player_name || card?.playerName || "Player";

    return await new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image"));
          return;
        }

        const isMobile = isMobileDownloadDevice();
        if (
          isMobile &&
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          typeof File !== "undefined"
        ) {
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `${playerName} — Prospect Legends`,
                text: "Check out my Prospect Legends card!",
                files: [file],
              });
              resolve({ method: "share" });
              return;
            } catch (shareError) {
              if (shareError?.name === "AbortError") {
                resolve({ method: "cancelled" });
                return;
              }
            }
          }
        }

        fallbackDownload(blob, filename);
        resolve({ method: "download" });
      }, "image/png", 1.0);
    });
  } finally {
    if (blobImageUrl) {
      URL.revokeObjectURL(blobImageUrl);
    }
  }
}
