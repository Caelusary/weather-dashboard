import { useCallback, useState } from 'react';

/**
 * Best-effort geolocation, requested on demand (first time the search box is used) rather than on
 * page load, so the permission prompt appears when the reason for it is obvious. `coords` stays
 * null if unsupported, denied or timed out, and callers simply skip distance sorting.
 */
export function useUserCoords() {
  const [coords, setCoords] = useState(null);
  const [asked, setAsked] = useState(false);

  const request = useCallback(() => {
    if (asked || !('geolocation' in navigator)) return;
    setAsked(true);
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => setCoords(null),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }, [asked]);

  return { coords, request };
}
