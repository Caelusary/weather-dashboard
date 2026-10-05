import { POPULAR_CITIES } from './constants';

export const normalize = (str) => str.trim().toLowerCase();

/** "Paris, FR" -> { name, country }. Returns null for a plain name. */
export function parseCityInput(input) {
  const parts = input.split(',').map((s) => s.trim());
  if (parts.length < 2) return null;
  return { name: parts[0], country: parts[parts.length - 1] };
}

/** A plain query naming a well-known city ("Dubai") resolves straight to its known country. */
export function findPopularCity(name) {
  const wanted = normalize(name);
  return POPULAR_CITIES.find((c) => normalize(c.name) === wanted) ?? null;
}

const toRadians = (deg) => (deg * Math.PI) / 180;

/** Haversine distance in km. */
export function distanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// 0 = exact match on a known popular city, 1 = exact name only, 2 = everything else.
function rank(city, queryName) {
  if (normalize(city.name) !== queryName) return 2;
  const popular = findPopularCity(queryName);
  return popular && city.country === popular.country ? 0 : 1;
}

/** Sorts by rank, then by distance from the user within a tier (when location is known). */
export function sortCityResults(cities, query, userCoords = null) {
  const queryName = normalize(parseCityInput(query)?.name ?? query);

  return [...cities].sort((a, b) => {
    const diff = rank(a, queryName) - rank(b, queryName);
    if (diff !== 0) return diff;
    if (!userCoords) return 0;
    return distanceKm(userCoords, a) - distanceKm(userCoords, b);
  });
}

/** "Austin, Texas, US" */
export function cityLabel(city) {
  return [city.name, city.state, city.country].filter(Boolean).join(', ');
}

/** Normalizes a geocoding hit to the shape the app stores everywhere. */
export function toCity(raw) {
  return {
    name: raw.name,
    country: raw.country ?? '',
    state: raw.state ?? '',
    lat: raw.lat,
    lon: raw.lon,
  };
}

export const cityKey = (city) => `${normalize(city.name)}|${city.country ?? ''}`;
