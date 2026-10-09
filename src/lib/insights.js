// Plain-language readings of the numbers in the Details panel and the forecast. Each function
// returns a translation key (or a small object), never text, so every rule is testable on its own
// and the wording lives with the other translations. Inputs are metric (Celsius, m/s, metres).

/** Feels-like vs actual temperature. Within 2 degrees is "about the same". */
export function feelsKey(tempC, feelsC) {
  const diff = feelsC - tempC;
  if (Math.abs(diff) < 2) return 'feelsSame';
  return diff > 0 ? 'feelsWarmer' : 'feelsColder';
}

export const HUMIDITY_BANDS = { dry: 40, muggy: 70 };

export function humidityKey(percent) {
  if (percent < HUMIDITY_BANDS.dry) return 'humDry';
  if (percent <= HUMIDITY_BANDS.muggy) return 'humComfortable';
  return 'humMuggy';
}

/** Upper bounds in m/s for calm, light, breezy and strong (about 5, 20, 40 and 61 km/h). */
export const WIND_BANDS = [1.4, 5.6, 11.1, 16.9];
const WIND_KEYS = ['windCalm', 'windLight', 'windBreezy', 'windStrong', 'windGale'];

export function windKey(metersPerSecond) {
  const index = WIND_BANDS.findIndex((limit) => metersPerSecond < limit);
  return WIND_KEYS[index === -1 ? WIND_KEYS.length - 1 : index];
}

export function cloudsKey(percent) {
  if (percent <= 10) return 'cloudsClear';
  if (percent <= 50) return 'cloudsPartly';
  if (percent <= 85) return 'cloudsMostly';
  return 'cloudsOvercast';
}

export function visibilityKey(meters) {
  if (meters >= 10000) return 'visExcellent';
  if (meters >= 5000) return 'visGood';
  if (meters >= 1000) return 'visModerate';
  return 'visPoor';
}

/** Sea-level pressure. About 1013 hPa is average; lows bring weather, highs settle it. */
export function pressureKey(hPa) {
  if (hPa < 1000) return 'pressLow';
  if (hPa > 1020) return 'pressHigh';
  return 'pressNormal';
}

/** Daylight between sunrise and sunset, or null when either is missing (polar day or night). */
export function daylight(sunrise, sunset) {
  if (!sunrise || !sunset || sunset <= sunrise) return null;
  const minutes = Math.round((sunset - sunrise) / 60);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/**
 * The week at a glance from the forecast days: warmest high, coolest low, and the day rain is
 * most likely (null when no day reaches `rainThreshold`). Ties go to the earliest day.
 */
export function weekHighlights(days, rainThreshold = 0.2) {
  const pick = (better) => days.reduce((best, day) => (better(day, best) ? day : best));
  const warmest = pick((d, b) => d.high > b.high);
  const coolest = pick((d, b) => d.low < b.low);
  const wettest = pick((d, b) => d.pop > b.pop);
  return { warmest, coolest, wettest: wettest.pop >= rainThreshold ? wettest : null };
}

/**
 * The best 3-hour slot to be outdoors in the next 24 hours, from the forecast already fetched:
 * daylight only (08:00 to 19:00 local), then the lowest rain chance, then the mildest temperature,
 * with strong wind counting against a slot. Returns the forecast entry and
 * whether it falls today, or null when no daylight slot is left in the window.
 */
export function bestTimeOut(forecast, now = Date.now(), { comfortC = 20, windyMs = 8 } = {}) {
  const offset = forecast.city.timezone;
  const nowSeconds = now / 1000;
  const localDay = (seconds) => Math.floor((seconds + offset) / 86400);
  const score = (e) =>
    (e.pop ?? 0) * 100 + Math.abs(e.main.temp - comfortC) * 1.5 + Math.max(0, (e.wind?.speed ?? 0) - windyMs) * 3;

  let best = null;
  for (const entry of forecast.list) {
    if (entry.dt + 3 * 3600 <= nowSeconds || entry.dt > nowSeconds + 24 * 3600) continue;
    const hour = new Date((entry.dt + offset) * 1000).getUTCHours();
    if (hour < 8 || hour > 19) continue;
    if (!best || score(entry) < score(best)) best = entry;
  }
  if (!best) return null;
  return { entry: best, isToday: localDay(best.dt) === localDay(nowSeconds) };
}
