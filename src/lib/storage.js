import { HISTORY_LIMIT, RECENT_LIMIT } from './constants';
import { normalize } from './cities';

// localStorage can throw (private mode, quota) and hold junk from older versions, so every read
// degrades to a fallback instead of breaking app start-up.
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the in-memory state still works for this session.
  }
}

export function readString(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // See writeJSON.
  }
}

const MAX_TEXT = 120;
const cleanText = (v) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : '');
const cleanCoord = (v, limit) => (Number.isFinite(v) && Math.abs(v) <= limit ? v : null);

/**
 * Rebuilds a stored city from untrusted JSON: only known keys survive, with strict types, so a
 * hand-edited or corrupted entry can never crash a renderer (objects as React children, .trim()
 * on a number) or smuggle extra fields into state. Returns null when there is no usable name.
 */
export function sanitizeCity(entry) {
  if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !entry.name.trim()) {
    return null;
  }
  return {
    name: cleanText(entry.name),
    country: cleanText(entry.country),
    state: cleanText(entry.state),
    lat: cleanCoord(entry.lat, 90),
    lon: cleanCoord(entry.lon, 180),
  };
}

/** Older builds stored recent searches as bare strings; lift them to the full city shape. */
export function normalizeRecent(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => sanitizeCity(typeof entry === 'string' ? { name: entry } : entry))
    .filter(Boolean)
    .slice(0, RECENT_LIMIT);
}

/** Stored search history, rebuilt entry by entry; entries without a numeric timestamp are dropped. */
export function normalizeHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const city = sanitizeCity(entry);
      return city && Number.isFinite(entry.timestamp) ? { ...city, timestamp: entry.timestamp } : null;
    })
    .filter(Boolean)
    .slice(0, HISTORY_LIMIT);
}

/** Newest first, one chip per city name, capped. */
export function addRecent(recent, city) {
  const rest = recent.filter((c) => normalize(c.name) !== normalize(city.name));
  return [
    { name: city.name, country: city.country ?? '', state: city.state ?? '', lat: city.lat, lon: city.lon },
    ...rest,
  ].slice(0, RECENT_LIMIT);
}

export const removeRecent = (recent, name) => recent.filter((c) => normalize(c.name) !== normalize(name));

/** Newest first, capped so storage cannot grow without bound. */
/** Timestamps double as row keys and delete handles, so they are kept strictly increasing even for same-millisecond records. */
export function addHistory(history, city, timestamp = Date.now()) {
  const latest = history[0]?.timestamp ?? 0;
  const entry = {
    name: city.name,
    country: city.country ?? '',
    state: city.state ?? '',
    lat: city.lat,
    lon: city.lon,
    timestamp: timestamp > latest ? timestamp : latest + 1,
  };
  return [entry, ...history].slice(0, HISTORY_LIMIT);
}

export const removeHistory = (history, timestamp) => history.filter((e) => e.timestamp !== timestamp);
