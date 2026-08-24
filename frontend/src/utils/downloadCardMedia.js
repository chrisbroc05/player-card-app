import { API_BASE_URL } from "../config/api";
import { isAnimatedCard } from "./animationCard";
import { highlightVideoUrl, isHighlightCard } from "./highlightCard";
import {
  formatBannerEdition,
  tierPillLabel,
} from "./cardBannerStyles";
import { normalizeTierKey, resolveCardDisplayMeta } from "./cardTemplate";
import { hasAutoSignature, normalizeRarityKey, getSignatureLabel, getSignatureLabelColor } from "./rarityStyles";

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "mp4", "webm", "mov"]);

const CARD_WIDTH = 600;
const CARD_HEIGHT = 840;
const BANNER_HEIGHT = 200;
const IMAGE_HEIGHT = CARD_HEIGHT - BANNER_HEIGHT;
const BORDER_RADIUS = 20;
const BORDER_WIDTH = 4;

const TIER_COLORS = {
  rookie: {
    primary: "#3B6D11",
    secondary: "#1a3a1a",
    glow: "rgba(59,109,17,0.6)",
    text: "#7bc832",
    banner: ["#0d200d", "#1a3a1a"],
  },
  allstar: {
    primary: "#185FA5",
    secondary: "#0d1a2e",
    glow: "rgba(24,95,165,0.6)",
    text: "#4a9eff",
    banner: ["#060d1a", "#0d1a2e"],
  },
  legends: {
    primary: "#BA7517",
    secondary: "#1a1200",
    glow: "rgba(186,117,23,0.6)",
    text: "#f0d060",
    banner: ["#0d0900", "#1a1200"],
  },
};

const RARITY_BADGE_COLORS = {
  foil: ["#E8C56A", "#C9A84C", "#0A0A0A"],
  refractor: ["#85B7EB", "#4169E1", "#FFFFFF"],
  gold_auto: ["#FFD700", "#FFA500", "#0A0A0A"],
  one_of_one: ["#FF4444", "#CC0000", "#FFFFFF"],
  black_label: ["#333333", "#000000", "#FFD700"],
};

const RARITY_BADGE_LABELS = {
  foil: "FOIL",
  refractor: "REFRACTOR",
  gold_auto: "AUTO",
  one_of_one: "1 OF 1",
  black_label: "BLACK LABEL",
};

const TIER_IMAGE_BG = {
  rookie: "#0d200d",
  allstar: "#060d1a",
  legends: "#0d0900",
};

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

/** Pick metadata used for download filenames (canvas export is always PNG). */
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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBannerBackground(ctx, bannerY, colors) {
  const bannerGrad = ctx.createLinearGradient(0, bannerY, 0, CARD_HEIGHT);
  bannerGrad.addColorStop(0, colors.banner[0]);
  bannerGrad.addColorStop(1, colors.banner[1]);

  ctx.beginPath();
  ctx.moveTo(0, bannerY);
  ctx.lineTo(CARD_WIDTH, bannerY);
  ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - BORDER_RADIUS);
  ctx.quadraticCurveTo(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH - BORDER_RADIUS, CARD_HEIGHT);
  ctx.lineTo(BORDER_RADIUS, CARD_HEIGHT);
  ctx.quadraticCurveTo(0, CARD_HEIGHT, 0, CARD_HEIGHT - BORDER_RADIUS);
  ctx.closePath();
  ctx.fillStyle = bannerGrad;
  ctx.fill();
}

function drawContainImage(ctx, img, x, y, w, h) {
  const scale = Math.min(w / img.width, h / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = x + (w - sw) / 2;
  const sy = y + (h - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh);
}

async function ensureSignatureFontFamily() {
  if (typeof document === "undefined" || !document.fonts?.load) {
    return "Georgia, serif";
  }
  try {
    await document.fonts.load('36px "Dancing Script"');
    if (document.fonts.check('36px "Dancing Script"')) {
      return '"Dancing Script", cursive';
    }
  } catch {
    // fall through to serif fallback
  }
  return "Georgia, serif";
}

function drawRarityBadgeOnCanvas(ctx, rarity) {
  const key = normalizeRarityKey(rarity);
  if (key === "standard") return;

  const colors = RARITY_BADGE_COLORS[key];
  const label = RARITY_BADGE_LABELS[key];
  if (!colors || !label) return;

  ctx.font = '700 11px "Barlow Condensed", sans-serif';
  const badgeW = ctx.measureText(label).width + 16;
  const badgeH = 22;
  const badgeX = 8;
  const badgeY = 8;

  const badgeGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGrad.addColorStop(0, colors[0]);
  badgeGrad.addColorStop(1, colors[1]);

  ctx.fillStyle = badgeGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();

  ctx.fillStyle = colors[2];
  ctx.textAlign = "left";
  ctx.fillText(label, badgeX + 8, badgeY + 15);
  ctx.textAlign = "center";
}

async function drawAutoSignatureOnCanvas(ctx, playerName, rarity) {
  const signatureFontFamily = await ensureSignatureFontFamily();
  const isDancingScript = signatureFontFamily.includes("Dancing Script");
  const label = getSignatureLabel(rarity) || "CERTIFIED AUTO";
  const labelColor = getSignatureLabelColor(rarity);

  const sigGradient = ctx.createLinearGradient(0, IMAGE_HEIGHT - 80, 0, IMAGE_HEIGHT);
  sigGradient.addColorStop(0, "transparent");
  sigGradient.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = sigGradient;
  ctx.fillRect(0, IMAGE_HEIGHT - 80, CARD_WIDTH, 80);

  ctx.font = isDancingScript
    ? `700 36px ${signatureFontFamily}`
    : `italic 36px ${signatureFontFamily}`;
  ctx.fillStyle = "rgba(255,215,0,0.92)";
  ctx.textAlign = "right";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;

  const name = playerName || "Player";
  ctx.fillText(name, CARD_WIDTH - 20, IMAGE_HEIGHT - 24);

  ctx.font = '700 11px "Barlow Condensed", sans-serif';
  ctx.fillStyle = labelColor;
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "2px";
  }
  ctx.fillText(label, CARD_WIDTH - 20, IMAGE_HEIGHT - 8);
  if ("letterSpacing" in ctx) {
    ctx.letterSpacing = "0px";
  }

  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
}

async function loadImageFromBlob(blob) {
  const blobUrl = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = blobUrl;
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function loadVideoFrameFromElement(cardElement) {
  if (!cardElement) return null;
  const video = cardElement.querySelector("video");
  if (!video || video.readyState < 2 || !video.videoWidth) return null;

  try {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;
    const frameCtx = frameCanvas.getContext("2d");
    if (!frameCtx) return null;
    frameCtx.drawImage(video, 0, 0);
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = frameCanvas.toDataURL("image/png");
    });
  } catch (error) {
    console.warn("Video frame load failed:", error);
    return null;
  }
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

async function loadCardImageForDownload(card, token, captureRef) {
  const cardElement = captureRef?.current || null;
  const videoFrame = await loadVideoFrameFromElement(cardElement);
  if (videoFrame) return videoFrame;

  const imageBlob = await fetchProxiedCardImageBlob(card, token);
  if (imageBlob) {
    return loadImageFromBlob(imageBlob);
  }
  return null;
}

async function drawCardToCanvas(card, cardImage) {
  const meta = resolveCardDisplayMeta(card);
  if (!meta) {
    throw new Error("Card metadata unavailable");
  }

  const tierKey = normalizeTierKey(meta.tier);
  const colors = TIER_COLORS[tierKey] || TIER_COLORS.rookie;
  const imageBg = TIER_IMAGE_BG[tierKey] || TIER_IMAGE_BG.rookie;
  const centerLabel = meta.templateName || "\u00A0";
  const tierLabel = tierPillLabel(tierKey);
  const edition = formatBannerEdition(card.edition_number ?? card.editionNumber, card.print_run ?? card.printRun);
  const rarity = card.rarity || card.rarity_key || "standard";

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas not supported");
  }

  ctx.fillStyle = "#0A0A0A";
  roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, BORDER_RADIUS);
  ctx.fill();

  ctx.save();
  roundRect(
    ctx,
    BORDER_WIDTH,
    BORDER_WIDTH,
    CARD_WIDTH - BORDER_WIDTH * 2,
    IMAGE_HEIGHT - BORDER_WIDTH,
    BORDER_RADIUS - BORDER_WIDTH
  );
  ctx.clip();

  ctx.fillStyle = imageBg;
  ctx.fillRect(0, 0, CARD_WIDTH, IMAGE_HEIGHT);

  if (cardImage) {
    drawContainImage(ctx, cardImage, 0, 0, CARD_WIDTH, IMAGE_HEIGHT);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, IMAGE_HEIGHT);
    grad.addColorStop(0, colors.secondary);
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_WIDTH, IMAGE_HEIGHT);
  }

  drawRarityBadgeOnCanvas(ctx, rarity);

  if (hasAutoSignature(rarity)) {
    await drawAutoSignatureOnCanvas(ctx, meta.playerName, rarity);
  }

  ctx.restore();

  const bannerY = IMAGE_HEIGHT;
  drawBannerBackground(ctx, bannerY, colors);

  ctx.fillStyle = colors.primary;
  ctx.fillRect(0, bannerY, CARD_WIDTH, 3);

  ctx.textAlign = "center";
  ctx.fillStyle = tierKey === "legends" ? colors.text : "#FFFFFF";

  const playerName = meta.playerName.toUpperCase();
  let nameFontSize = 36;
  ctx.font = `800 ${nameFontSize}px "Barlow Condensed", sans-serif`;
  while (ctx.measureText(playerName).width > CARD_WIDTH - 60 && nameFontSize > 20) {
    nameFontSize -= 2;
    ctx.font = `800 ${nameFontSize}px "Barlow Condensed", sans-serif`;
  }
  ctx.fillText(playerName, CARD_WIDTH / 2, bannerY + 50);

  if (meta.team) {
    ctx.fillStyle = colors.text;
    ctx.font = `600 22px "Barlow Condensed", sans-serif`;
    ctx.fillText(meta.team.toUpperCase(), CARD_WIDTH / 2, bannerY + 82);
  }

  if (meta.statsLine) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `500 18px "Barlow Condensed", sans-serif`;
    ctx.fillText(meta.statsLine, CARD_WIDTH / 2, bannerY + 112);
  }

  const pillX = 20;
  const pillY = bannerY + 135;
  const pillW = 90;
  const pillH = 28;
  const pillR = 14;

  ctx.fillStyle = colors.secondary;
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = 1.5;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillR);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colors.text;
  ctx.font = `700 13px "Barlow Condensed", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(tierLabel, pillX + pillW / 2, pillY + 19);

  if (centerLabel.trim()) {
    ctx.textAlign = "center";
    ctx.fillStyle = colors.text;
    ctx.font = `500 13px "Barlow Condensed", sans-serif`;
    ctx.fillText(centerLabel, CARD_WIDTH / 2, pillY + 19);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = colors.text;
  ctx.font = `500 13px "Barlow Condensed", sans-serif`;
  ctx.fillText(edition, CARD_WIDTH - 20, pillY + 19);

  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = colors.primary;
  ctx.lineWidth = BORDER_WIDTH;
  roundRect(
    ctx,
    BORDER_WIDTH / 2,
    BORDER_WIDTH / 2,
    CARD_WIDTH - BORDER_WIDTH,
    CARD_HEIGHT - BORDER_WIDTH,
    BORDER_RADIUS
  );
  ctx.stroke();
  ctx.shadowBlur = 0;

  return canvas;
}

/**
 * Draw the complete card onto a canvas and download or share natively on mobile.
 * @returns {Promise<{ method: 'share' | 'download' | 'cancelled' }>}
 */
export async function downloadCardMedia(card, { captureRef, token } = {}) {
  if (!card?.card_id && !card?.cardId) {
    throw new Error("Card not found");
  }

  const cardImage = await loadCardImageForDownload(card, token, captureRef);
  const canvas = await drawCardToCanvas(card, cardImage);
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
}
