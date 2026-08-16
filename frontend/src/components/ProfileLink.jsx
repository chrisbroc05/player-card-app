import React from "react";
import { Link } from "react-router-dom";
import { profilePath } from "../utils/profileLinks";

export default function ProfileLink({ displayName, className = "", prefixAt = true, onClick }) {
  const name = String(displayName || "").trim();
  if (!name) return null;

  return (
    <Link to={profilePath(name)} className={className || "profile-link"} onClick={onClick}>
      {prefixAt ? `@${name}` : name}
    </Link>
  );
}
