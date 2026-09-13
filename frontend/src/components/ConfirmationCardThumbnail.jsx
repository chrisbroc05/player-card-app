import React from "react";
import { toApiUrl } from "../config/api";

/** Fixed 120×168 (5:7) card preview for listing confirmation popups. */
export default function ConfirmationCardThumbnail({ card, className = "" }) {
  const imageUrl = card?.image_url;

  return (
    <div className={`confirmation-card-thumbnail${className ? ` ${className}` : ""}`}>
      {imageUrl ? (
        <img
          src={toApiUrl(imageUrl)}
          alt={card?.player_name || "Card"}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="confirmation-card-thumbnail__placeholder" aria-hidden />
      )}
    </div>
  );
}
