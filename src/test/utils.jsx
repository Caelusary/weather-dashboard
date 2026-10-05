import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import App from '../App';
import { PlacesProvider } from '../providers/PlacesProvider';
import { SettingsProvider } from '../providers/SettingsProvider';

// Every test that stubs fetch gets it removed again, so one test's routes never leak into the next.
afterEach(() => {
  vi.unstubAllGlobals();
});

/** 2026-01-15 12:00:00 UTC. Pin the clock here (vi.setSystemTime) so forecast grouping is stable. */
export const FIXED_NOW = Date.UTC(2026, 0, 15, 12, 0, 0);

/** Fresh client per test; no retries so a failed request surfaces immediately. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

/** Renders `ui` (the whole app by default) inside the same providers main.jsx uses. */
export function renderApp(ui = <App />, { queryClient = createTestQueryClient() } = {}) {
  const user = userEvent.setup();
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <PlacesProvider>{children}</PlacesProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
  return { user, queryClient, ...render(ui, { wrapper: Wrapper }) };
}

// ---------------------------------------------------------------------------------------------
// fetch stub
// ---------------------------------------------------------------------------------------------

export const GEO = '/geo/1.0/direct';
export const WEATHER = '/data/2.5/weather';
export const FORECAST = '/data/2.5/forecast';

export const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A response with an error status, e.g. httpError(401) for a bad API key. */
export const httpError = (status) => jsonResponse({ cod: status, message: 'error' }, status);

/**
 * Stubs global fetch. `routes` maps a URL path to either a body or a handler
 * `({ url, params, signal }) => body | Response | Promise<...>`. A handler may throw to simulate a
 * network failure. Honors AbortSignal like the real fetch, and records every call.
 *
 * Returns `{ calls, callsTo(path) }`; each call is `{ path, params, url }`. A request to a path
 * with no route fails loudly instead of silently passing.
 */
export function mockFetch(routes) {
  const calls = [];

  const fetchStub = vi.fn(async (input, init = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const params = Object.fromEntries(url.searchParams);
    calls.push({ path: url.pathname, params, url: url.href });

    const route = routes[url.pathname];
    if (route === undefined) throw new Error(`mockFetch: no route for ${url.pathname}`);

    const signal = init.signal;
    const abortError = () => new DOMException('The operation was aborted.', 'AbortError');
    if (signal?.aborted) throw abortError();

    const pending = Promise.resolve(typeof route === 'function' ? route({ url, params, signal }) : route);
    const aborted = new Promise((_, reject) => {
      signal?.addEventListener('abort', () => reject(abortError()), { once: true });
    });

    const result = await Promise.race([pending, aborted]);
    return result instanceof Response ? result : jsonResponse(result);
  });

  vi.stubGlobal('fetch', fetchStub);
  return { calls, callsTo: (path) => calls.filter((call) => call.path === path) };
}

/** A promise you resolve by hand, for holding a response back until the test says so. */
export function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// ---------------------------------------------------------------------------------------------
// OpenWeatherMap fixtures
// ---------------------------------------------------------------------------------------------

/** A geocoding hit. */
export const geoHit = (overrides = {}) => ({
  name: 'London',
  country: 'GB',
  state: 'England',
  lat: 51.5073,
  lon: -0.1276,
  ...overrides,
});

/** /data/2.5/weather payload (metric). 21.6 degrees C displays as 22 C / 71 F. */
export function weatherPayload({
  name = 'London',
  country = 'GB',
  temp = 21.6,
  main = 'Clear',
  description = 'clear sky',
  icon = '01d',
  timezone = 0,
  now = FIXED_NOW,
  lat = 51.5074,
  lon = -0.1278,
} = {}) {
  const dt = Math.floor(now / 1000);
  return {
    coord: { lat, lon },
    weather: [{ id: 800, main, description, icon }],
    main: { temp, feels_like: temp - 1, humidity: 55, pressure: 1015 },
    visibility: 10000,
    wind: { speed: 3.5 },
    clouds: { all: 10 },
    dt,
    sys: { country, sunrise: dt - 6 * 3600, sunset: dt + 6 * 3600 },
    timezone,
    name,
    cod: 200,
  };
}

const THREE_HOURS = 3 * 3600;
const DAY = 24 * 3600;

/**
 * /data/2.5/forecast payload: a couple of entries for the rest of today (which the app drops)
 * followed by `days` full days of eight 3-hourly slots, starting at local midnight tomorrow.
 * Each day swings `base - 3` (morning) to `base + 3` (afternoon).
 */
export function forecastPayload({
  now = FIXED_NOW,
  timezone = 0,
  days = 5,
  baseTemps = [10, 12, 14, 16, 18],
  main = 'Clouds',
  description = 'scattered clouds',
  icon = '03d',
} = {}) {
  const nowSec = Math.floor(now / 1000);
  const tomorrowMidnight = Math.floor((nowSec + timezone) / DAY) * DAY + DAY - timezone;
  const slot = (dt, temp) => ({
    dt,
    main: { temp, feels_like: temp, humidity: 60, pressure: 1012 },
    weather: [{ id: 802, main, description, icon }],
  });

  const list = [slot(nowSec + THREE_HOURS, 9), slot(nowSec + 2 * THREE_HOURS, 8)];
  for (let day = 0; day < days; day += 1) {
    const base = baseTemps[day % baseTemps.length];
    for (let i = 0; i < 8; i += 1) {
      list.push(slot(tomorrowMidnight + day * DAY + i * THREE_HOURS, i < 4 ? base - 3 : base + 3));
    }
  }
  return { cod: '200', cnt: list.length, list, city: { name: 'London', country: 'GB', timezone } };
}
