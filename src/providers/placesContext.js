import { createContext, useContext } from 'react';

/**
 * Everything remembered about where the user has looked:
 * { recent, history, record(city), removeRecent(name), removeHistory(timestamp), clear() }
 * `recent` is the capped chip list, `history` the full timestamped log.
 */
export const PlacesContext = createContext(null);

export function usePlaces() {
  const value = useContext(PlacesContext);
  if (!value) throw new Error('usePlaces must be used inside <PlacesProvider>');
  return value;
}
