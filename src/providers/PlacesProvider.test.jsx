import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaces } from './placesContext';
import { PlacesProvider } from './PlacesProvider';

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
const paris = { name: 'Paris', country: 'FR', state: '', lat: 48.8566, lon: 2.3522 };
const tokyo = { name: 'Tokyo', country: 'JP', state: '', lat: 35.6762, lon: 139.6503 };

const stored = (key) => JSON.parse(localStorage.getItem(key));
const mount = () => renderHook(() => usePlaces(), { wrapper: PlacesProvider });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PlacesProvider', () => {
  it('records a city in both the recent chips and the history log, and persists them', () => {
    const { result } = mount();

    act(() => result.current.record(paris));

    expect(result.current.recent).toEqual([paris]);
    expect(result.current.history).toEqual([{ ...paris, timestamp: NOW }]);
    expect(stored('recentCities')).toEqual([paris]);
    expect(stored('searchHistory')).toEqual([{ ...paris, timestamp: NOW }]);
  });

  it('restores previously saved places when it mounts again', () => {
    const first = mount();
    act(() => first.result.current.record(paris));
    first.unmount();

    const second = mount();

    expect(second.result.current.recent).toEqual([paris]);
    expect(second.result.current.history).toHaveLength(1);
  });

  it('lifts legacy string-only recents to full city entries', () => {
    localStorage.setItem('recentCities', JSON.stringify(['Paris', 'London']));

    const { result } = mount();

    expect(result.current.recent).toEqual([
      { name: 'Paris', country: '', state: '', lat: null, lon: null },
      { name: 'London', country: '', state: '', lat: null, lon: null },
    ]);
  });

  it('saves migrated legacy recents in the new shape on the next change', () => {
    localStorage.setItem('recentCities', JSON.stringify(['London']));
    const { result } = mount();

    act(() => result.current.record(tokyo));

    expect(stored('recentCities')).toEqual([
      tokyo,
      { name: 'London', country: '', state: '', lat: null, lon: null },
    ]);
  });

  it('falls back to empty lists when saved JSON is corrupted', () => {
    localStorage.setItem('recentCities', '{not json');
    localStorage.setItem('searchHistory', 'also [broken');

    const { result } = mount();

    expect(result.current.recent).toEqual([]);
    expect(result.current.history).toEqual([]);
  });

  it('falls back to empty lists when saved JSON has the wrong shape', () => {
    localStorage.setItem('recentCities', JSON.stringify({ not: 'a list' }));
    localStorage.setItem('searchHistory', JSON.stringify('nope'));

    const { result } = mount();

    expect(result.current.recent).toEqual([]);
    expect(result.current.history).toEqual([]);
  });

  it('removes a single history entry by timestamp and persists the removal', () => {
    const { result } = mount();
    act(() => result.current.record(paris));
    vi.setSystemTime(NOW + 1000);
    act(() => result.current.record(tokyo));

    act(() => result.current.removeHistory(NOW));

    expect(result.current.history.map((e) => e.name)).toEqual(['Tokyo']);
    expect(stored('searchHistory').map((e) => e.name)).toEqual(['Tokyo']);
  });

  it('removes a recent chip by name and persists the removal', () => {
    const { result } = mount();
    act(() => result.current.record(paris));
    act(() => result.current.record(tokyo));

    act(() => result.current.removeRecent('paris'));

    expect(result.current.recent.map((c) => c.name)).toEqual(['Tokyo']);
    expect(stored('recentCities').map((c) => c.name)).toEqual(['Tokyo']);
  });

  it('clear() empties both lists in memory and in storage', () => {
    const { result } = mount();
    act(() => result.current.record(paris));
    act(() => result.current.record(tokyo));

    act(() => result.current.clear());

    expect(result.current.recent).toEqual([]);
    expect(result.current.history).toEqual([]);
    expect(stored('recentCities')).toEqual([]);
    expect(stored('searchHistory')).toEqual([]);
  });
});
