const CACHE_DURATION_MS = 60000;

/** @type {Record<string, { time: number, data: unknown }>} */
const store = {};

export function getCollectionCache(key) {
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_DURATION_MS) {
    delete store[key];
    return null;
  }
  return entry.data;
}

export function setCollectionCache(key, data) {
  store[key] = { time: Date.now(), data };
}

export function invalidateCollectionCache(key) {
  if (key) delete store[key];
  else Object.keys(store).forEach((k) => delete store[k]);
}
