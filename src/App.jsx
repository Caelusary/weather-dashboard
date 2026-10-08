import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import { BottomNav } from './components/Navigation';
import { EmptyState, WeatherError, WeatherSkeleton } from './components/states';
import ExploreView from './features/explore/ExploreView';
import WeatherBackground from './features/background/WeatherBackground';
import HistoryView from './features/history/HistoryView';
import SearchBox from './features/search/SearchBox';
import Details from './features/weather/Details';
import Forecast from './features/weather/Forecast';
import Hero from './features/weather/Hero';
import { useWeatherData } from './features/weather/useWeatherData';
import { useHashRoute } from './hooks/useHashRoute';
import { useUserCoords } from './hooks/useUserCoords';
import { cityKey, toCity } from './lib/cities';
import { STORAGE_KEYS } from './lib/constants';
import { readJSON, sanitizeCity, writeJSON } from './lib/storage';
import { formatTemp } from './lib/units';
import { resolveTheme } from './lib/weather';
import { usePlaces } from './providers/placesContext';
import { useSettings } from './providers/settingsContext';

const loadLastCity = () => {
  const city = sanitizeCity(readJSON(STORAGE_KEYS.lastCity, null));
  return city && city.lat != null && city.lon != null ? city : null;
};

export default function App() {
  const [view, navigate] = useHashRoute();
  const { unit, t } = useSettings();
  const { recent, record } = usePlaces();
  const { coords, request: requestCoords } = useUserCoords();
  const [selected, setSelected] = useState(loadLastCity);
  const { weather, forecast } = useWeatherData(selected);

  // Every way of choosing a city (search, quick pick, history, map pin) funnels through here.
  const select = useCallback(
    (city) => {
      const next = toCity(city);
      setSelected(next);
      writeJSON(STORAGE_KEYS.lastCity, next);
      record(next);
      navigate('weather');
    },
    [record, navigate],
  );

  const data = weather.data;
  const theme = useMemo(() => (data ? resolveTheme(data) : 'default'), [data]);
  const isNight = data ? data.weather[0].icon.endsWith('n') : false;

  useEffect(() => {
    document.title = data
      ? `${formatTemp(data.main.temp, unit, { withUnit: true })} ${selected?.name ?? data.name} | Cloudbase`
      : 'Cloudbase';
  }, [data, unit, selected?.name]);

  return (
    <>
      <WeatherBackground theme={theme} isNight={isNight} />
      {/* A soft wash over the sky: darker at the top and bottom where small UI sits, lighter in the
          middle so the scene shows through behind the reading. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1] bg-[linear-gradient(to_bottom,rgb(5_8_20/0.5)_0%,rgb(5_8_20/0.38)_30%,rgb(5_8_20/0.3)_55%,rgb(5_8_20/0.55)_100%)]"
      />
      <Header view={view} />

      <main className="mx-auto max-w-6xl px-5 pb-32 sm:px-8 md:pb-20">
        {view === 'weather' && (
          <div key="weather" className="enter">
            <h1 className="sr-only">Cloudbase</h1>
            <div className="mx-auto mt-2 max-w-xl">
              <SearchBox
                key={selected ? cityKey(selected) : 'empty'}
                initialQuery={selected?.name ?? ''}
                recent={recent}
                userCoords={coords}
                requestCoords={requestCoords}
                onSelect={select}
              />
            </div>

            {!selected && <EmptyState onSelect={select} />}
            {selected && weather.isPending && <WeatherSkeleton />}
            {selected && weather.isError && (
              <div className="mt-12">
                <WeatherError error={weather.error} onRetry={() => weather.refetch()} />
              </div>
            )}
            {data && (
              // Keyed by city so picking another one replays the entrance instead of swapping numbers in place.
              <div key={cityKey(selected)} className="enter-stagger space-y-6">
                <Hero data={data} city={selected} />
                {forecast.data && <Forecast forecast={forecast.data} current={data} />}
                {!forecast.data && forecast.isPending && (
                  <p role="status" className="on-sky px-1 text-fg-muted">
                    {t('forecastLoading')}
                  </p>
                )}
                {/* The forecast fails on its own; say so instead of silently dropping the section. */}
                {!forecast.data && forecast.isError && (
                  <div
                    role="alert"
                    className="glass flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] px-5 py-4"
                  >
                    <p className="text-fg-muted">{t('errorWeatherGeneric')}</p>
                    <button
                      type="button"
                      onClick={() => forecast.refetch()}
                      className="pressable inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink hover:brightness-110"
                    >
                      {t('retry')}
                    </button>
                  </div>
                )}
                <Details data={data} />
              </div>
            )}
          </div>
        )}

        {view === 'explore' && (
          <div key="explore" className="enter">
            <ExploreView selected={selected} onSelect={select} />
          </div>
        )}
        {view === 'history' && (
          <div key="history" className="enter">
            <HistoryView onSelect={select} />
          </div>
        )}
      </main>

      <BottomNav view={view} />
    </>
  );
}
