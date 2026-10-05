import { useCallback, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../lib/constants';
import {
  addHistory,
  addRecent,
  normalizeHistory,
  normalizeRecent,
  readJSON,
  removeHistory as dropHistory,
  removeRecent as dropRecent,
  writeJSON,
} from '../lib/storage';
import { PlacesContext } from './placesContext';

const loadHistory = () => normalizeHistory(readJSON(STORAGE_KEYS.history, []));

export function PlacesProvider({ children }) {
  const [recent, setRecent] = useState(() => normalizeRecent(readJSON(STORAGE_KEYS.recent, [])));
  const [history, setHistory] = useState(loadHistory);

  const record = useCallback((city) => {
    setRecent((prev) => {
      const next = addRecent(prev, city);
      writeJSON(STORAGE_KEYS.recent, next);
      return next;
    });
    setHistory((prev) => {
      const next = addHistory(prev, city);
      writeJSON(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  const removeRecent = useCallback((name) => {
    setRecent((prev) => {
      const next = dropRecent(prev, name);
      writeJSON(STORAGE_KEYS.recent, next);
      return next;
    });
  }, []);

  const removeHistory = useCallback((timestamp) => {
    setHistory((prev) => {
      const next = dropHistory(prev, timestamp);
      writeJSON(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  // Clearing history also clears the recent chips, as before: both are "what I searched".
  const clear = useCallback(() => {
    setRecent([]);
    setHistory([]);
    writeJSON(STORAGE_KEYS.recent, []);
    writeJSON(STORAGE_KEYS.history, []);
  }, []);

  const value = useMemo(
    () => ({ recent, history, record, removeRecent, removeHistory, clear }),
    [recent, history, record, removeRecent, removeHistory, clear],
  );

  return <PlacesContext value={value}>{children}</PlacesContext>;
}
