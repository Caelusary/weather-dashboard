import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { geocode } from '../../lib/api';
import { normalize, sortCityResults, toCity } from '../../lib/cities';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const MIN_QUERY_LENGTH = 2;

/**
 * Autocomplete: debounced geocoding, cached per query so retyping a prefix is free. Results are
 * ranked (known cities first, then nearest) and anything the user searched before floats to the top.
 */
export function useCitySuggestions(query, { recent, userCoords }) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = debounced.length >= MIN_QUERY_LENGTH;

  const { data, isFetching } = useQuery({
    queryKey: ['suggest', debounced.toLowerCase()],
    queryFn: ({ signal }) => geocode(debounced, { limit: 8, signal }),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const suggestions = useMemo(() => {
    if (!enabled || !data) return [];
    const recentNames = new Set(recent.map((r) => normalize(r.name)));
    const ranked = sortCityResults(data.map(toCity), debounced, userCoords).map((city) => ({
      ...city,
      isRecent: recentNames.has(normalize(city.name)),
    }));
    // Array.prototype.sort is stable, so this only lifts recents without disturbing relevance order.
    return ranked.sort((a, b) => Number(b.isRecent) - Number(a.isRecent));
  }, [enabled, data, recent, debounced, userCoords]);

  return { suggestions, isFetching: enabled && isFetching };
}
