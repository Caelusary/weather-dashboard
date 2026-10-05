import { useCallback, useSyncExternalStore } from 'react';

export const VIEWS = ['weather', 'explore', 'history'];

function parse() {
  const view = window.location.hash.replace(/^#\/?/, '');
  return VIEWS.includes(view) ? view : 'weather';
}

function subscribe(callback) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

/**
 * The active view lives in the URL hash, so tabs are linkable, survive a reload and work with the
 * back button on a static host (GitHub Pages cannot rewrite paths).
 */
export function useHashRoute() {
  const view = useSyncExternalStore(subscribe, parse, () => 'weather');

  const navigate = useCallback((next) => {
    window.location.hash = next === 'weather' ? '' : `/${next}`;
  }, []);

  return [view, navigate];
}
