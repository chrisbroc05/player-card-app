import React, { useMemo } from "react";
import { CARD_ASPECT_CLASS } from "../utils/cardTemplate";
import { playerNameFromForm, POSITION_OPTIONS } from "../utils/playerDetails";
import RarityBadge from "./RarityBadge";
import { shouldShowRarityBadge } from "../utils/rarityStyles";

function positionLabel(code) {
  const match = POSITION_OPTIONS.find((o) => o.value === code);
  return match?.label || code || "";
}

function tierBorderColor(tier) {
  if (!tier) return "rgba(201, 168, 76, 0.3)";
  const t = String(tier).toLowerCase().replace(/-/g, "_");
  if (t === "legends" || t === "legendary") return "rgba(147, 51, 234, 0.8)";
  if (t === "allstar" || t === "all_star" || t === "rare") return "rgba(201, 168, 76, 0.8)";
  if (t === "rookie") return "rgba(192, 192, 192, 0.8)";
  return "rgba(201, 168, 76, 0.3)";
}

export default function StudioLivePreview({
  firstName = "",
  lastName = "",
  displayName = "",
  position = "",
  jerseyNumber = "",
  teamName = "",
  tier = "",
  photoUrl = "",
  rarity = "",
}) {
  const playerName = playerNameFromForm(firstName, lastName, displayName);
  const hasName = playerName.length >= 2;
  const posText = useMemo(() => positionLabel(position), [position]);
  const hasPosition = Boolean(posText);
  const showRarity = rarity && shouldShowRarityBadge(rarity);

  return (
    <div className="studio-live-preview-wrap">
      <div
        className={`studio-live-preview-card card-shell ${CARD_ASPECT_CLASS}`}
        style={{ borderColor: tierBorderColor(tier) }}
      >
        <div className="studio-live-preview-card__media card-shell__media card-image-area">
          <div className="card-image-area__stack card-player-vignette relative h-full w-full overflow-hidden">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="studio-live-preview-card__photo"
              />
            ) : (
              <div className="studio-live-preview-card__photo-placeholder">
                <span className="studio-live-preview-card__photo-icon" aria-hidden>
                  📷
                </span>
                <p>Your photo goes here</p>
              </div>
            )}
            <div className="studio-live-preview-card__photo-fade" aria-hidden />
            <div className="card-player-inner-border pointer-events-none absolute inset-0" aria-hidden />
            {showRarity ? (
              <div className="card-rarity-badge-slot">
                <RarityBadge rarity={rarity} size="thumb" />
              </div>
            ) : null}
            {jerseyNumber.trim() ? (
              <span className="studio-live-preview-card__jersey">#{jerseyNumber.trim()}</span>
            ) : null}
          </div>
        </div>

        <div className="studio-live-preview-card__banner card-shell__banner">
          <p
            className={`studio-live-preview-card__name${
              hasName ? "" : " studio-live-preview-card__name--placeholder"
            }`}
          >
            {hasName ? playerName : "Player Name"}
          </p>
          <p
            className={`studio-live-preview-card__position${
              hasPosition ? "" : " studio-live-preview-card__position--placeholder"
            }`}
          >
            {hasPosition ? posText : "Position"}
          </p>
          {teamName.trim() ? (
            <p className="studio-live-preview-card__team">{teamName.trim()}</p>
          ) : null}
        </div>
      </div>
      <p className="studio-live-preview__disclaimer">
        Live Preview — Layout matches your final card. AI will enhance the artwork.
      </p>
    </div>
  );
}
