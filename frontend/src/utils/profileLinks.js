/** Profile URL helpers — slug matches backend profile_slug.py */

export function profileSlug(displayName) {
  const raw = String(displayName || "")
    .trim()
    .toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "user";
}

export function profilePath(displayName) {
  return `/profile/${encodeURIComponent(profileSlug(displayName))}`;
}

export function isOwnProfilePath(pathname, displayName) {
  if (!pathname || !displayName) return false;
  const match = pathname.match(/^\/profile\/([^/]+)/);
  if (!match) return false;
  try {
    return profileSlug(decodeURIComponent(match[1])) === profileSlug(displayName);
  } catch {
    return profileSlug(match[1]) === profileSlug(displayName);
  }
}
