import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { deferred, GEO, geoHit, httpError, mockFetch } from '../../test/utils';
import { useCitySearch } from './useCitySearch';

function setup(routes = {}) {
  const fetchMock = mockFetch(routes);
  const onResolve = vi.fn();
  const hook = renderHook(() => useCitySearch({ onResolve, userCoords: null }));
  const search = (text) => act(() => hook.result.current.search(text));
  return { ...fetchMock, onResolve, search, result: hook.result };
}

describe('useCitySearch', () => {
  it('asks for a city name when the input is blank, without touching the network', async () => {
    const { search, result, calls, onResolve } = setup({ [GEO]: [] });

    await search('   ');

    expect(result.current.error).toEqual({ key: 'errorEnterCity' });
    expect(calls).toHaveLength(0);
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('resolves a well-known city from built-in coordinates with no network call', async () => {
    const { search, result, calls, onResolve } = setup({ [GEO]: [] });

    await search('dubai');

    expect(calls).toHaveLength(0);
    expect(onResolve).toHaveBeenCalledOnce();
    expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ name: 'Dubai', country: 'AE' }));
    expect(result.current.status).toBe('idle');
  });

  it('looks up "City, CC" with one exact lookup and resolves the first hit', async () => {
    const hit = geoHit({ name: 'Paris', country: 'US', state: 'Texas', lat: 33.66, lon: -95.55 });
    const { search, callsTo, onResolve } = setup({ [GEO]: [hit] });

    await search('Paris, US');

    expect(callsTo(GEO)).toHaveLength(1);
    expect(callsTo(GEO)[0].params).toMatchObject({ q: 'Paris,US', limit: '1' });
    expect(onResolve).toHaveBeenCalledWith({
      name: 'Paris',
      country: 'US',
      state: 'Texas',
      lat: 33.66,
      lon: -95.55,
    });
  });

  it('resolves directly when the geocoder returns a single match', async () => {
    const { search, result, callsTo, onResolve } = setup({
      [GEO]: [geoHit({ name: 'Reykjavik', country: 'IS', state: '' })],
    });

    await search('Reykjavik');

    expect(callsTo(GEO)[0].params).toMatchObject({ q: 'Reykjavik', limit: '5' });
    expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ name: 'Reykjavik', country: 'IS' }));
    expect(result.current.status).toBe('idle');
  });

  it('returns exact-name matches ahead of partial ones when several cities match', async () => {
    const { search, result, onResolve } = setup({
      [GEO]: [
        geoHit({ name: 'Springfield Gardens', country: 'US', lat: 40.66, lon: -73.76 }),
        geoHit({ name: 'Springfield', country: 'US', state: 'Illinois', lat: 39.8, lon: -89.64 }),
        geoHit({ name: 'Springfield', country: 'GB', state: 'England', lat: 51.7, lon: 0.48 }),
      ],
    });

    await search('Springfield');

    expect(onResolve).not.toHaveBeenCalled();
    expect(result.current.status).toBe('choose');
    expect(result.current.choices.map((c) => `${c.name}|${c.country}`)).toEqual([
      'Springfield|US',
      'Springfield|GB',
      'Springfield Gardens|US',
    ]);
  });

  it('reports the searched text when no city matches', async () => {
    const { search, result, onResolve } = setup({ [GEO]: [] });

    await search('Atlantis');

    expect(result.current.error).toEqual({ key: 'errorCityNotFound', args: ['Atlantis'] });
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('reports city and country when an explicit "City, CC" lookup finds nothing', async () => {
    const { search, result } = setup({ [GEO]: [] });

    await search('Atlantis, XX');

    expect(result.current.error).toEqual({
      key: 'errorCityCountryNotFound',
      args: ['Atlantis', 'XX'],
    });
  });

  it('tells the user the API key is invalid on a 401', async () => {
    const { search, result, onResolve } = setup({ [GEO]: () => httpError(401) });

    await search('Reykjavik');

    expect(result.current.error.key).toBe('errorInvalidApiKey');
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('shows a generic lookup error when the network request fails', async () => {
    const { search, result } = setup({
      [GEO]: () => {
        throw new TypeError('Failed to fetch');
      },
    });

    await search('Reykjavik');

    expect(result.current.error).toEqual({ key: 'errorGeocodeFailed', args: [] });
  });

  it('never lets a slow, superseded search overwrite the newer one', async () => {
    const slow = deferred();
    const { search, result, onResolve } = setup({
      [GEO]: ({ params }) =>
        params.q === 'Slowtown' ? slow.promise : [geoHit({ name: 'Quickville', country: 'US' })],
    });

    // Fire the slow search without awaiting it, then supersede it.
    let first;
    act(() => {
      first = result.current.search('Slowtown');
    });
    await search('Quickville');
    await waitFor(() => expect(onResolve).toHaveBeenCalledTimes(1));

    // The stale response arrives late.
    slow.resolve([geoHit({ name: 'Slowtown', country: 'US' })]);
    await act(() => first);

    expect(onResolve).toHaveBeenCalledOnce();
    expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ name: 'Quickville' }));
    expect(result.current.status).toBe('idle');
  });
});
