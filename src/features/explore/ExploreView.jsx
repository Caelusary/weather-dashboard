import { lazy, Suspense, useMemo } from 'react';
import { POPULAR_CITIES } from '../../lib/constants';
import { cityKey } from '../../lib/cities';
import { usePlaces } from '../../providers/placesContext';
import { useSettings } from '../../providers/settingsContext';

// Leaflet is the heaviest dependency and only this tab needs it, so it loads on first visit.
const ExploreMap = lazy(() => import('../map/ExploreMap'));

const MAP_HEIGHT = 'h-[min(68dvh,640px)] min-h-[360px]';

/** Popular cities plus everything in the search history, one pin per city. */
export default function ExploreView({ selected, onSelect }) {
  const { t } = useSettings();
  const { history } = usePlaces();

  const cities = useMemo(() => {
    const seen = new Set();
    return [...POPULAR_CITIES, ...history].filter((city) => {
      if (city.lat == null || city.lon == null) return false;
      const key = cityKey(city);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [history]);

  const focus = selected ? { lat: selected.lat, lon: selected.lon, key: cityKey(selected) } : null;

  return (
    <section aria-labelledby="explore-heading" className="space-y-6 pt-6">
      <h1 id="explore-heading" className="on-sky text-3xl font-semibold tracking-tight">
        {t('exploreTitle')}
      </h1>
      <Suspense fallback={<div className={`card animate-pulse ${MAP_HEIGHT}`} aria-busy="true" />}>
        <ExploreMap cities={cities} focus={focus} onSelectCity={onSelect} className={MAP_HEIGHT} />
      </Suspense>
    </section>
  );
}
