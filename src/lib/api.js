import { API_BASE } from './constants';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

/** Carries the HTTP status so callers can tell a bad key (401) from a plain miss. */
export class ApiError extends Error {
  constructor(status, message = `Request failed with ${status}`) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(path, params, signal) {
  const url = new URL(path, API_BASE);
  Object.entries({ ...params, appid: API_KEY }).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url, { signal });
  if (!response.ok) throw new ApiError(response.status);
  return response.json();
}

/** Up to `limit` places matching a free-text query ("Paris" or "Paris, FR"). */
export function geocode(query, { limit = 5, signal } = {}) {
  return request('/geo/1.0/direct', { q: query, limit }, signal);
}

/** Current conditions. Always metric: unit conversion happens at display time, so toggling is free. */
export function fetchWeather(lat, lon, { signal } = {}) {
  return request('/data/2.5/weather', { lat, lon, units: 'metric' }, signal);
}

/** 5 day / 3 hour forecast, metric. */
export function fetchForecast(lat, lon, { signal } = {}) {
  return request('/data/2.5/forecast', { lat, lon, units: 'metric' }, signal);
}

export const isInvalidKey = (error) => error instanceof ApiError && error.status === 401;
