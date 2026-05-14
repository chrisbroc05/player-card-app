/** Client-side admin JWT checks for routing only; API enforces auth. */

export function parseAdminJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    if (payload.role !== "admin") return null;
    if (payload.exp != null && Number(payload.exp) * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdminTokenValid(token) {
  return parseAdminJwtPayload(token) != null;
}
