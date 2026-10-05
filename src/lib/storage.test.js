import { describe, expect, it, vi } from 'vitest';
import { HISTORY_LIMIT, RECENT_LIMIT } from './constants';
import {
  addHistory,
  addRecent,
  normalizeHistory,
  normalizeRecent,
  readJSON,
  removeHistory,
  removeRecent,
  sanitizeCity,
  writeJSON,
} from './storage';

const city = (name, extra = {}) => ({ name, country: 'XX', state: '', lat: 1, lon: 2, ...extra });

describe('readJSON / writeJSON', () => {
  it('round-trips a value', () => {
    writeJSON('k', { a: 1 });
    expect(readJSON('k', null)).toEqual({ a: 1 });
  });

  it('falls back on missing keys and on corrupted JSON instead of throwing', () => {
    expect(readJSON('missing', 'fallback')).toBe('fallback');
    localStorage.setItem('bad', '{not json');
    expect(readJSON('bad', [])).toEqual([]);
  });

  it('swallows a storage quota error on write', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeJSON('k', 1)).not.toThrow();
    spy.mockRestore();
  });
});

describe('normalizeRecent', () => {
  it('lifts legacy string entries to the full city shape', () => {
    expect(normalizeRecent(['Paris'])).toEqual([
      { name: 'Paris', country: '', state: '', lat: null, lon: null },
    ]);
  });

  it('returns an empty list for non-arrays and drops junk entries', () => {
    expect(normalizeRecent({ nope: true })).toEqual([]);
    expect(normalizeRecent([null, 42, city('Oslo')])).toEqual([city('Oslo')]);
  });
});

describe('addRecent / removeRecent', () => {
  it('puts the newest first and de-duplicates by name regardless of case', () => {
    const next = addRecent([city('Paris'), city('Oslo')], city('paris', { country: 'FR' }));
    expect(next.map((c) => c.name)).toEqual(['paris', 'Oslo']);
  });

  it('caps the list', () => {
    let list = [];
    for (let i = 0; i < RECENT_LIMIT + 3; i++) list = addRecent(list, city(`City${i}`));
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0].name).toBe(`City${RECENT_LIMIT + 2}`);
  });

  it('removes one chip by name', () => {
    expect(removeRecent([city('Paris'), city('Oslo')], 'PARIS').map((c) => c.name)).toEqual(['Oslo']);
  });
});

describe('addHistory / removeHistory', () => {
  it('stamps each entry and keeps the newest first', () => {
    const history = addHistory(addHistory([], city('Paris'), 100), city('Oslo'), 200);
    expect(history.map((e) => e.timestamp)).toEqual([200, 100]);
  });

  it('keeps repeat searches as separate log entries', () => {
    const history = addHistory(addHistory([], city('Paris'), 1), city('Paris'), 2);
    expect(history).toHaveLength(2);
  });

  it('keeps timestamps unique when records land in the same millisecond, so delete removes exactly one', () => {
    const history = addHistory(addHistory([], city('Paris'), 500), city('Oslo'), 500);
    expect(new Set(history.map((e) => e.timestamp)).size).toBe(2);
    expect(removeHistory(history, history[0].timestamp)).toHaveLength(1);
  });

  it('caps the log', () => {
    let history = [];
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) history = addHistory(history, city('A'), i);
    expect(history).toHaveLength(HISTORY_LIMIT);
  });

  it('deletes by timestamp', () => {
    const history = addHistory(addHistory([], city('Paris'), 1), city('Oslo'), 2);
    expect(removeHistory(history, 1).map((e) => e.name)).toEqual(['Oslo']);
  });
});

describe('sanitizeCity (hostile localStorage data)', () => {
  it('keeps only known keys, so injected fields never reach state', () => {
    const clean = sanitizeCity({
      ...city('Paris'),
      country: 'FR',
      evil: '<img onerror=x>',
      __proto__: { x: 1 },
    });
    expect(Object.keys(clean).sort()).toEqual(['country', 'lat', 'lon', 'name', 'state']);
  });

  it('rejects entries without a usable string name', () => {
    expect(sanitizeCity(null)).toBeNull();
    expect(sanitizeCity({ name: 42 })).toBeNull();
    expect(sanitizeCity({ name: '   ' })).toBeNull();
    expect(sanitizeCity('Paris')).toBeNull();
  });

  it('replaces non-string text fields instead of letting objects become React children', () => {
    expect(sanitizeCity({ name: 'Paris', country: { a: 1 }, state: 7 })).toMatchObject({
      country: '',
      state: '',
    });
  });

  it('caps text length and range-checks coordinates', () => {
    const clean = sanitizeCity({ name: 'x'.repeat(500), lat: 91, lon: NaN });
    expect(clean.name).toHaveLength(120);
    expect(clean.lat).toBeNull();
    expect(clean.lon).toBeNull();
    expect(sanitizeCity({ name: 'Oslo', lat: -90, lon: 180 })).toMatchObject({ lat: -90, lon: 180 });
  });
});

describe('normalizeHistory', () => {
  it('drops non-arrays and entries without a numeric timestamp', () => {
    expect(normalizeHistory('nope')).toEqual([]);
    const raw = [{ ...city('Paris'), timestamp: 5 }, { ...city('Oslo'), timestamp: '5' }, null, [1]];
    expect(normalizeHistory(raw).map((e) => e.name)).toEqual(['Paris']);
  });

  it('caps the stored log', () => {
    const raw = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => ({ ...city('A'), timestamp: i }));
    expect(normalizeHistory(raw)).toHaveLength(HISTORY_LIMIT);
  });
});
