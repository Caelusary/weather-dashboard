// Pure logic behind the Explore map: cache, throttled fetching, pin colours. No React and no
// Leaflet in here so all of it can be unit tested without a DOM map.

import { cityKey } from '../../lib/cities';
import { readJSON, writeJSON } from '../../lib/storage';

// V2 on purpose: the legacy cache keyed entries by unit and stored unit-converted numbers, which
// would read back as wrong temperatures here. Entries now always hold metric API payloads.
export const MAP_CACHE_KEY = 'mapWeatherCacheV2';
export const MAP_CACHE_TTL_MS = 10 * 60 * 1000;

// OpenWeatherMap's free tier allows 60 calls/min and the user's own searches share that budget,
// so uncached pins trickle in 4 at a time with a pause rather than bursting.
export const MAP_BATCH_SIZE = 4;
export const MAP_BATCH_DELAY_MS = 5000;

export const MARKER_FALLBACK_COLOR = '#7a7a8a';

/** Pin colour for a temperature in Celsius. The unit toggle never changes a pin's colour. */
export function tempToMarkerColor(tempC) {
  if (tempC >= 30) return '#e63946';
  if (tempC >= 20) return '#f4a261';
  if (tempC >= 10) return '#f4d35e';
  if (tempC >= 0) return '#4a9fd8';
  return '#9b5de5';
}

/** Guards against a corrupted cache entry or odd API payload crashing a pin. */
export function isUsableWeather(data) {
  const condition = data?.weather?.[0];
  return (
    Number.isFinite(data?.main?.temp) &&
    typeof condition?.main === 'string' &&
    typeof condition?.icon === 'string' &&
    typeof condition?.description === 'string'
  );
}

/** The whole stored cache, or {} when it is missing, unparseable or the wrong shape. */
export function readCache() {
  const cache = readJSON(MAP_CACHE_KEY, {});
  return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
}

/** Cached payload for a key if it is still within the TTL and well formed, else null. */
export function getFreshEntry(cache, key, now = Date.now()) {
  const entry = cache[key];
  if (!entry || !Number.isFinite(entry.fetchedAt)) return null;
  // A negative age means the clock moved backwards; refetching is safer than trusting it.
  const age = now - entry.fetchedAt;
  if (age < 0 || age >= MAP_CACHE_TTL_MS) return null;
  return isUsableWeather(entry.data) ? entry.data : null;
}

/** Stores one payload and drops expired entries so the cache cannot grow without bound. */
export function writeCacheEntry(key, data, now = Date.now()) {
  const cache = readCache();
  const next = {};
  for (const [k, entry] of Object.entries(cache)) {
    if (getFreshEntry(cache, k, now)) next[k] = entry;
  }
  next[key] = { data, fetchedAt: now };
  writeJSON(MAP_CACHE_KEY, next);
}

/** Separates cities with a fresh cached payload (render now) from those that need a fetch. */
export function splitCached(cities, cache, now = Date.now()) {
  const cached = [];
  const uncached = [];
  for (const city of cities) {
    const data = getFreshEntry(cache, cityKey(city), now);
    if (data) cached.push({ city, data });
    else uncached.push(city);
  }
  return { cached, uncached };
}

export function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches `cities` in batches, in parallel within a batch, pausing between batches (never after
 * the last one). `onResult(city, { data } | { error })` fires per city as each batch settles.
 * Stops quietly once `signal` aborts so an unmounted caller never gets a late callback.
 */
export async function runBatches(
  cities,
  { fetcher, onResult, signal, wait = sleep, batchSize = MAP_BATCH_SIZE, delayMs = MAP_BATCH_DELAY_MS },
) {
  const batches = chunk(cities, batchSize);

  for (let i = 0; i < batches.length; i += 1) {
    if (signal?.aborted) return;

    const settled = await Promise.allSettled(batches[i].map((city) => fetcher(city, signal)));
    if (signal?.aborted) return;

    settled.forEach((outcome, index) => {
      const city = batches[i][index];
      if (outcome.status === 'fulfilled') onResult(city, { data: outcome.value });
      else onResult(city, { error: outcome.reason });
    });

    if (i < batches.length - 1) await wait(delayMs);
  }
}
