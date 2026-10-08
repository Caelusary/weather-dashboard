import { API_PATH } from './constants';

/** Carries the HTTP status so callers can tell a bad key (401) from a plain miss. */
export class ApiError extends Error {
  constructor(status, message = `Request failed with ${status}`) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Calls the same-origin proxy, which adds the OpenWeatherMap key server-side. */
async function request(endpoint, params, signal) {
  const url = new URL(API_PATH, window.location.origin);
  Object.entries({ endpoint, ...params }).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}

/** Up to `limit` places matching a free-text query ("Paris" or "Paris, FR"). */
export function geocode(query, { limit = 5, signal } = {}) {
  return request('geocode', { q: query, limit }, signal);
}

/** Current conditions. Always metric: unit conversion happens at display time, so toggling is free. */
export function fetchWeather(lat, lon, { signal } = {}) {
  return request('weather', { lat, lon, units: 'metric' }, signal);
}

/** 5 day / 3 hour forecast, metric. */
export function fetchForecast(lat, lon, { signal } = {}) {
  return request('forecast', { lat, lon, units: 'metric' }, signal);
}

export const isInvalidKey = (error) => error instanceof ApiError && error.status === 401;
