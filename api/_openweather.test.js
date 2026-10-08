import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxyOpenWeather } from './_openweather.js';

const KEY = 'test-key-0123456789';
const call = (query, key = KEY) => proxyOpenWeather(new URLSearchParams(query), key);

function stubUpstream(status = 200, body = { ok: true }) {
  const fetchStub = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

afterEach(() => vi.unstubAllGlobals());

describe('proxyOpenWeather', () => {
  it('forwards an allowed request with the key added server-side', async () => {
    const fetchStub = stubUpstream();
    const res = await call('endpoint=weather&lat=51.5&lon=-0.12&units=metric');

    const upstream = fetchStub.mock.calls[0][0];
    expect(upstream.origin + upstream.pathname).toBe('https://api.openweathermap.org/data/2.5/weather');
    expect(upstream.searchParams.get('appid')).toBe(KEY);
    expect(res.status).toBe(200);
    expect(res.headers['Cache-Control']).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=300');
    expect(res.body).not.toContain(KEY);
  });

  it.each([
    ['an unknown endpoint', 'endpoint=onecall&lat=1&lon=1'],
    ['no endpoint', 'lat=1&lon=1'],
    ['a parameter outside the allowlist', 'endpoint=weather&lat=1&lon=1&appid=mine'],
    ['a missing required parameter', 'endpoint=forecast&lat=1'],
    ['an out-of-range coordinate', 'endpoint=weather&lat=91&lon=1'],
    ['a repeated parameter', 'endpoint=geocode&q=Paris&q=Rome'],
    ['an oversized limit', 'endpoint=geocode&q=Paris&limit=50'],
  ])('rejects %s with 400 without calling upstream', async (_, query) => {
    const fetchStub = stubUpstream();
    const res = await call(query);
    expect(res.status).toBe(400);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('passes upstream errors through uncached', async () => {
    stubUpstream(401, { cod: 401, message: 'Invalid API key' });
    const res = await call('endpoint=geocode&q=Paris&limit=5');
    expect(res.status).toBe(401);
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('answers 401 when the server has no key, without calling upstream', async () => {
    const fetchStub = stubUpstream();
    const res = await call('endpoint=weather&lat=1&lon=1', '');
    expect(res.status).toBe(401);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('hides network failures behind a generic 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(`fetch failed for appid=${KEY}`)));
    const res = await call('endpoint=forecast&lat=1&lon=1');
    expect(res.status).toBe(502);
    expect(res.body).not.toContain(KEY);
  });
});
