// Shared by the Vercel function (api/weather.js) and the Vite dev middleware (vite.config.js).
// The underscore keeps Vercel from deploying this file as its own function.

const UPSTREAM = 'https://api.openweathermap.org';

const MINUTE = 60;

const isLat = (v) => /^-?\d{1,2}(\.\d+)?$/.test(v) && Math.abs(Number(v)) <= 90;
const isLon = (v) => /^-?\d{1,3}(\.\d+)?$/.test(v) && Math.abs(Number(v)) <= 180;
const isUnits = (v) => v === 'metric' || v === 'imperial' || v === 'standard';
const isLimit = (v) => /^\d{1,2}$/.test(v) && Number(v) >= 1 && Number(v) <= 10;
const isQuery = (v) => v.trim().length > 0 && v.length <= 100;

const coords = { lat: isLat, lon: isLon, units: isUnits };

/**
 * The only upstream calls the app makes. `maxAge` (seconds) matches the client's staleTime for
 * that query, so the CDN serves repeats without spending OpenWeatherMap quota.
 */
const ENDPOINTS = {
  weather: { path: '/data/2.5/weather', params: coords, required: ['lat', 'lon'], maxAge: 5 * MINUTE },
  forecast: { path: '/data/2.5/forecast', params: coords, required: ['lat', 'lon'], maxAge: 15 * MINUTE },
  geocode: {
    path: '/geo/1.0/direct',
    params: { q: isQuery, limit: isLimit },
    required: ['q'],
    maxAge: 10 * MINUTE,
  },
};

const json = (status, body, cacheControl = 'no-store') => ({
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl },
  body: JSON.stringify(body),
});

const badRequest = (message) => json(400, { cod: 400, message });

/**
 * Validates `searchParams` against the allowlist, adds the key and forwards to OpenWeatherMap.
 * Resolves to `{ status, headers, body }`; upstream status codes pass straight through so the
 * client can still tell a bad key (401) from a plain miss. Never puts the key in a response.
 */
export async function proxyOpenWeather(searchParams, apiKey) {
  const endpoint = ENDPOINTS[searchParams.get('endpoint')];
  if (!endpoint) return badRequest('Unknown endpoint');

  const upstream = new URL(endpoint.path, UPSTREAM);
  for (const [name, value] of searchParams) {
    if (name === 'endpoint') continue;
    const valid = endpoint.params[name];
    if (!valid) return badRequest(`Unsupported parameter: ${name}`);
    if (upstream.searchParams.has(name) || !valid(value)) return badRequest(`Invalid parameter: ${name}`);
    upstream.searchParams.set(name, value);
  }
  const missing = endpoint.required.find((name) => !upstream.searchParams.has(name));
  if (missing) return badRequest(`Missing parameter: ${missing}`);

  // Same status OpenWeatherMap gives for a missing appid, so the UI shows its "add your key" message.
  if (!apiKey) return json(401, { cod: 401, message: 'API key is not configured on the server' });
  upstream.searchParams.set('appid', apiKey);

  let response;
  let body;
  try {
    response = await fetch(upstream, { headers: { Accept: 'application/json' } });
    body = await response.text();
  } catch {
    // The error could carry the request URL, and with it the key, so nothing from it is logged.
    return json(502, { cod: 502, message: 'Upstream request failed' });
  }

  const cacheControl = response.ok
    ? `public, max-age=0, s-maxage=${endpoint.maxAge}, stale-while-revalidate=${endpoint.maxAge}`
    : 'no-store';
  return {
    status: response.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cacheControl },
    body,
  };
}
