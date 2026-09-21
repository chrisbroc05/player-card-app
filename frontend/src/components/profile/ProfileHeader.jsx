import React, { useEffect, useState } from "react";
import {
  formatLastLogin,
  formatSessionDuration,
  getLastLoginTimestamp,
  getProfileInitials,
  getSessionStartTimestamp,
} from "../../utils/profileSession";

export default function ProfileHeader({ displayName, handle }) {
  const [lastLoginLabel, setLastLoginLabel] = useState(() =>
    formatLastLogin(getLastLoginTimestamp())
  );
  const [sessionLabel, setSessionLabel] = useState(() =>
    formatSessionDuration(getSessionStartTimestamp())
  );

  useEffect(() => {
    const tick = () => {
      setLastLoginLabel(formatLastLogin(getLastLoginTimestamp()));
      setSessionLabel(formatSessionDuration(getSessionStartTimestamp()));
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  const initials = getProfileInitials(displayName);

  return (
    <section className="profile-header">
      <div className="profile-header__avatar" aria-hidden>
        {initials}
      </div>
      <div className="profile-header__info">
        <h1 className="profile-header__name">{displayName}</h1>
        {handle ? <p className="profile-header__handle">@{handle}</p> : null}
        <p className="profile-header__meta">{lastLoginLabel}</p>
        <p className="profile-header__meta">{sessionLabel}</p>
      </div>
    </section>
  );
}
