import { useCallback, useEffect, useRef, useState } from 'react';
import { geocode, isInvalidKey } from '../../lib/api';
import { findPopularCity, parseCityInput, sortCityResults, toCity } from '../../lib/cities';

const IDLE = { status: 'idle', error: null, choices: null };

/**
 * Turns the text in the search box into one resolved city, or a list to choose from.
 *
 *  - "Paris, FR" and plain names of well-known cities resolve with a single exact lookup.
 *  - One match resolves directly, several are returned as `choices`, none is an error.
 *
 * Errors are stored as { key, args } (not strings) so they re-translate when the language changes.
 * Each search aborts the previous one, so a slow stale response can never replace a newer result.
 */
export function useCitySearch({ onResolve, userCoords }) {
  const [state, setState] = useState(IDLE);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(IDLE);
  }, []);

  const search = useCallback(
    async (raw) => {
      const query = raw.trim();
      if (!query) {
        setState({ status: 'error', error: { key: 'errorEnterCity' }, choices: null });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: 'pending', error: null, choices: null });

      const explicit = parseCityInput(query);
      const popular = explicit ? null : findPopularCity(query);
      const exact = explicit ?? popular;

      try {
        if (popular) {
          // Known coordinates: no network round-trip needed to resolve it.
          setState(IDLE);
          onResolve(popular);
          return;
        }

        const q = exact ? `${exact.name},${exact.country}` : query;
        const hits = await geocode(q, { limit: exact ? 1 : 5, signal: controller.signal });
        if (controller.signal.aborted) return;

        if (hits.length === 0) {
          const key = exact ? 'errorCityCountryNotFound' : 'errorCityNotFound';
          const args = exact ? [exact.name, exact.country] : [query];
          setState({ status: 'error', error: { key, args }, choices: null });
          return;
        }

        if (hits.length === 1 || exact) {
          setState(IDLE);
          onResolve(toCity(hits[0]));
          return;
        }

        setState({
          status: 'choose',
          error: null,
          choices: sortCityResults(hits.map(toCity), query, userCoords),
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const key = isInvalidKey(error)
          ? 'errorInvalidApiKey'
          : exact
            ? 'errorCityCountryFailed'
            : 'errorGeocodeFailed';
        setState({
          status: 'error',
          error: { key, args: exact ? [exact.name, exact.country] : [] },
          choices: null,
        });
      }
    },
    [onResolve, userCoords],
  );

  return { ...state, search, reset };
}
