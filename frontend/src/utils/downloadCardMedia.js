import html2canvas from "html2canvas";
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

/** Replace playing videos with a still frame so html2canvas captures the current frame. */
function snapshotVideosForCapture(root) {
  const restores = [];
  root.querySelectorAll("video").forEach((video) => {
    try {
      if (video.readyState < 2 || !video.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      img.className = video.className;
      img.style.cssText = video.style.cssText;
      const computed = window.getComputedStyle(video);
      img.style.width = video.style.width || computed.width;
      img.style.height = video.style.height || computed.height;
      img.style.objectFit = computed.objectFit || "cover";
      img.style.objectPosition = computed.objectPosition || "center";
      const parent = video.parentNode;
      if (!parent) return;
      parent.insertBefore(img, video);
      video.style.visibility = "hidden";
      restores.push(() => {
        video.style.visibility = "";
        img.remove();
      });
    } catch (error) {
      console.warn("Video snapshot failed:", error);
    }
  });
  return () => restores.forEach((fn) => fn());
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

/**
 * Capture the styled card DOM as PNG and download or share natively on mobile.
 * @returns {Promise<{ method: 'share' | 'download' | 'cancelled' }>}
 */
export async function downloadCardMedia(card, { captureElement, captureRef } = {}) {
  const cardElement = resolveCaptureElement(card, { captureElement, captureRef });
  if (!cardElement) {
    throw new Error("Card element not found");
  }

  const restoreVideos = snapshotVideosForCapture(cardElement);

  try {
    const cardId = card?.card_id || card?.cardId;
    const canvas = await html2canvas(cardElement, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      scale: 2,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const selector = cardId
          ? `[data-card-capture-id="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(cardId) : cardId}"]`
          : ".card-display-container";
        const clonedCard = clonedDoc.querySelector(selector);
        if (clonedCard) {
          clonedCard.style.transform = "none";
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
        if (isMobile && typeof navigator.share === "function" && typeof File !== "undefined") {
          try {
            const file = new File([blob], filename, { type: "image/png" });
            await navigator.share({
              title: `${playerName} — Prospect Legends`,
              text: "Check out my Prospect Legends card!",
              files: [file],
            });
            resolve({ method: "share" });
          } catch (shareError) {
            if (shareError?.name === "AbortError") {
              resolve({ method: "cancelled" });
              return;
            }
            fallbackDownload(blob, filename);
            resolve({ method: "download" });
          }
        } else {
          fallbackDownload(blob, filename);
          resolve({ method: "download" });
        }
      }, "image/png", 1.0);
    });
  } finally {
    restoreVideos();
  }
}
