import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAP_BATCH_DELAY_MS,
  MAP_CACHE_KEY,
  MAP_CACHE_TTL_MS,
  chunk,
  getFreshEntry,
  readCache,
  runBatches,
  splitCached,
  tempToMarkerColor,
  writeCacheEntry,
} from './mapWeather';

const weather = (temp = 20) => ({
  main: { temp },
  weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }],
});
const city = (name, country = 'XX') => ({ name, country, lat: 1, lon: 2 });
const NOW = 1_000_000;

beforeEach(() => localStorage.clear());

describe('cache TTL', () => {
  const cache = { 'a|XX': { data: weather(), fetchedAt: NOW } };

  it('serves an entry younger than the TTL', () => {
    expect(getFreshEntry(cache, 'a|XX', NOW + MAP_CACHE_TTL_MS - 1)).toEqual(weather());
  });

  it('expires an entry at exactly the TTL', () => {
    expect(getFreshEntry(cache, 'a|XX', NOW + MAP_CACHE_TTL_MS)).toBeNull();
  });

  it('treats an entry from the future (clock moved back) as stale', () => {
    expect(getFreshEntry(cache, 'a|XX', NOW - 1)).toBeNull();
  });

  it('rejects entries whose payload is malformed', () => {
    const bad = { 'a|XX': { data: { main: {} }, fetchedAt: NOW }, 'b|XX': { data: weather() } };
    expect(getFreshEntry(bad, 'a|XX', NOW)).toBeNull();
    expect(getFreshEntry(bad, 'b|XX', NOW)).toBeNull();
    expect(getFreshEntry(bad, 'missing', NOW)).toBeNull();
  });

  it('drops expired entries when writing a new one', () => {
    writeCacheEntry('old|XX', weather(), NOW);
    writeCacheEntry('new|XX', weather(5), NOW + MAP_CACHE_TTL_MS + 1);
    expect(Object.keys(readCache())).toEqual(['new|XX']);
  });
});

describe('corrupted cache', () => {
  it('returns an empty cache for invalid JSON', () => {
    localStorage.setItem(MAP_CACHE_KEY, '{not json');
    expect(readCache()).toEqual({});
  });

  it.each(['null', '[]', '"text"', '42'])('returns an empty cache for wrong shape %s', (raw) => {
    localStorage.setItem(MAP_CACHE_KEY, raw);
    expect(readCache()).toEqual({});
  });

  it('can still write after reading junk', () => {
    localStorage.setItem(MAP_CACHE_KEY, '{not json');
    writeCacheEntry('a|XX', weather(), NOW);
    expect(Object.keys(readCache())).toEqual(['a|XX']);
  });
});

describe('splitCached', () => {
  it('separates fresh cached cities from the ones that need a fetch', () => {
    const cache = {
      'london|GB': { data: weather(12), fetchedAt: NOW },
      'paris|FR': { data: weather(14), fetchedAt: NOW - MAP_CACHE_TTL_MS },
    };
    const { cached, uncached } = splitCached(
      [city('London', 'GB'), city('Paris', 'FR'), city('Tokyo', 'JP')],
      cache,
      NOW,
    );
    expect(cached.map((c) => c.city.name)).toEqual(['London']);
    expect(cached[0].data.main.temp).toBe(12);
    expect(uncached.map((c) => c.name)).toEqual(['Paris', 'Tokyo']);
  });
});

describe('chunk', () => {
  it('splits into fixed-size groups with a short tail', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 4)).toEqual([]);
  });
});

describe('runBatches', () => {
  const cities = Array.from({ length: 9 }, (_, i) => city(`c${i}`));
  const fetcher = vi.fn(async () => weather());

  beforeEach(() => fetcher.mockClear());

  it('fetches in batches of 4 and waits between batches but not after the last', async () => {
    const order = [];
    const wait = vi.fn(async () => order.push('wait'));
    const tracked = vi.fn(async (c) => {
      order.push(c.name);
      return weather();
    });
    const onResult = vi.fn();

    await runBatches(cities, { fetcher: tracked, wait, onResult });

    expect(tracked).toHaveBeenCalledTimes(9);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(MAP_BATCH_DELAY_MS);
    expect(order).toEqual(['c0', 'c1', 'c2', 'c3', 'wait', 'c4', 'c5', 'c6', 'c7', 'wait', 'c8']);
    expect(onResult).toHaveBeenCalledTimes(9);
  });

  it('does not wait when everything fits in one batch', async () => {
    const wait = vi.fn();
    await runBatches(cities.slice(0, 4), { fetcher, wait, onResult: vi.fn() });
    expect(wait).not.toHaveBeenCalled();
  });

  it('does nothing for an empty list', async () => {
    const wait = vi.fn();
    await runBatches([], { fetcher, wait, onResult: vi.fn() });
    expect(fetcher).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });

  it('reports a failed city as an error without sinking its batch', async () => {
    const flaky = vi.fn(async (c) => {
      if (c.name === 'c1') throw new Error('nope');
      return weather();
    });
    const results = {};
    await runBatches(cities.slice(0, 3), {
      fetcher: flaky,
      wait: vi.fn(),
      onResult: (c, outcome) => {
        results[c.name] = outcome;
      },
    });
    expect(results.c0.data).toBeDefined();
    expect(results.c1.error).toBeInstanceOf(Error);
    expect(results.c2.data).toBeDefined();
  });

  it('stops without further fetches or callbacks once aborted', async () => {
    const controller = new AbortController();
    const onResult = vi.fn();
    const wait = vi.fn(async () => controller.abort());

    await runBatches(cities, { fetcher, wait, onResult, signal: controller.signal });

    // The first batch lands, the wait aborts, and the second batch is never requested.
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(onResult).toHaveBeenCalledTimes(4);
  });

  it('drops results that settle after an abort', async () => {
    const controller = new AbortController();
    const onResult = vi.fn();
    const slow = vi.fn(async () => {
      controller.abort();
      return weather();
    });
    await runBatches(cities, { fetcher: slow, wait: vi.fn(), onResult, signal: controller.signal });
    expect(onResult).not.toHaveBeenCalled();
  });
});

describe('tempToMarkerColor', () => {
  it.each([
    [40, '#e63946'],
    [30, '#e63946'],
    [29.9, '#f4a261'],
    [20, '#f4a261'],
    [19.9, '#f4d35e'],
    [10, '#f4d35e'],
    [9.9, '#4a9fd8'],
    [0, '#4a9fd8'],
    [-0.1, '#9b5de5'],
    [-30, '#9b5de5'],
  ])('%s C -> %s', (temp, color) => {
    expect(tempToMarkerColor(temp)).toBe(color);
  });
});
