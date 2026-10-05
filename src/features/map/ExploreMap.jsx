import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudFog } from '@phosphor-icons/react/dist/csr/CloudFog';
import { CloudLightning } from '@phosphor-icons/react/dist/csr/CloudLightning';
import { CloudMoon } from '@phosphor-icons/react/dist/csr/CloudMoon';
import { CloudRain } from '@phosphor-icons/react/dist/csr/CloudRain';
import { CloudSnow } from '@phosphor-icons/react/dist/csr/CloudSnow';
import { CloudSun } from '@phosphor-icons/react/dist/csr/CloudSun';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { Moon } from '@phosphor-icons/react/dist/csr/Moon';
import { Sun } from '@phosphor-icons/react/dist/csr/Sun';
import { Warning } from '@phosphor-icons/react/dist/csr/Warning';
import { Wind } from '@phosphor-icons/react/dist/csr/Wind';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { fetchWeather } from '../../lib/api';
import { cityKey, cityLabel } from '../../lib/cities';
import { formatTemp } from '../../lib/units';
import { conditionKind } from '../../lib/weather';
import { useSettings } from '../../providers/settingsContext';
import {
  MARKER_FALLBACK_COLOR,
  isUsableWeather,
  readCache,
  runBatches,
  sleep,
  splitCached,
  tempToMarkerColor,
  writeCacheEntry,
} from './mapWeather';
import './map.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const WORLD_CENTER = [20, 0];
const FOCUS_ZOOM = 5;
const HIGHLIGHT_MS = 2000;

// One entry per `conditionKind()` value (see lib/weather.js).
const CONDITION_ICONS = {
  thunderstorm: CloudLightning,
  drizzle: Drop,
  rain: CloudRain,
  snow: CloudSnow,
  fog: CloudFog,
  wind: Wind,
  'clear-day': Sun,
  'clear-night': Moon,
  'clouds-day': CloudSun,
  'clouds-night': CloudMoon,
};

// Glyph markup per icon, rendered once at module load. react-dom/server's renderToStaticMarkup
// would add ~190 kB to this chunk; the client renderer is already in the main bundle. This runs
// outside any React render, so flushSync is safe here.
const GLYPH_ICONS = [...new Set([...Object.values(CONDITION_ICONS), Warning])];
const GLYPHS = (() => {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => {
    root.render(
      GLYPH_ICONS.map((Icon) => (
        <Icon key={Icon.displayName} size={16} weight="fill" color="#0d1428" aria-hidden="true" />
      )),
    );
  });
  const glyphs = new Map(GLYPH_ICONS.map((Icon, i) => [Icon, host.children[i].outerHTML]));
  root.unmount();
  return glyphs;
})();

const iconCache = new Map();

// Only divIcons are used so Leaflet's default marker PNGs (which bundlers cannot resolve from
// leaflet.css) are never requested. The glyph is dark ink because pins can be yellow.
// One divIcon per (colour, glyph) pair, shared by every marker that uses it.
function buildPinIcon(color, Icon) {
  const cacheKey = `${color}|${Icon.displayName}`;
  let icon = iconCache.get(cacheKey);
  if (!icon) {
    icon = L.divIcon({
      className: 'map-marker',
      html: `<span class="map-marker__pin" style="background:${color}">${GLYPHS.get(Icon)}</span>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -30],
    });
    iconCache.set(cacheKey, icon);
  }
  return icon;
}

const RING_ICON = L.divIcon({
  className: 'map-highlight',
  html: '<span class="map-highlight__ring"></span>',
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

const hasCoords = (city) => Number.isFinite(city?.lat) && Number.isFinite(city?.lon);

async function fetchAndCache(city, signal) {
  const data = await fetchWeather(city.lat, city.lon, { signal });
  // A payload we cannot render is treated like a failed request: grey pin, no poisoned cache.
  if (!isUsableWeather(data)) throw new Error('Unexpected weather payload');
  writeCacheEntry(cityKey(city), data);
  return data;
}

/**
 * Weather per city as { [cityKey]: { data } | { error } }. Cached cities land in one update, the
 * rest trickle in via throttled batches. A city that already has a result is never requested
 * again, so growing the list only costs calls for the newcomers.
 */
function useMapWeather(cities, signature) {
  const [results, setResults] = useState({});
  const settledRef = useRef(new Set());
  const citiesRef = useRef(cities);

  // The effect below must re-run on list *content* (signature), not on a new array identity,
  // otherwise a parent re-render would cancel in-flight batches. It reads the latest list here.
  useEffect(() => {
    citiesRef.current = cities;
  });

  useEffect(() => {
    const pending = citiesRef.current.filter((city) => !settledRef.current.has(cityKey(city)));
    if (pending.length === 0) return undefined;

    let cancelled = false;
    const controller = new AbortController();
    const { cached, uncached } = splitCached(pending, readCache());

    const record = (updates) => {
      if (cancelled) return;
      Object.keys(updates).forEach((key) => settledRef.current.add(key));
      setResults((prev) => ({ ...prev, ...updates }));
    };

    if (cached.length > 0) {
      record(Object.fromEntries(cached.map(({ city, data }) => [cityKey(city), { data }])));
    }

    runBatches(uncached, {
      fetcher: fetchAndCache,
      signal: controller.signal,
      wait: sleep,
      onResult: (city, outcome) => record({ [cityKey(city)]: outcome }),
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [signature]);

  return results;
}

function CityMarker({ city, outcome, onSelect }) {
  const { unit, t, condition } = useSettings();
  const map = useMap();
  const { data } = outcome;

  const color = data ? tempToMarkerColor(data.main.temp) : MARKER_FALLBACK_COLOR;
  const Icon = data ? (CONDITION_ICONS[conditionKind(data)] ?? CloudSun) : Warning;
  const icon = useMemo(() => buildPinIcon(color, Icon), [color, Icon]);
  const label = cityLabel(city);

  return (
    <Marker position={[city.lat, city.lon]} icon={icon} title={label} riseOnHover>
      <Popup>
        <div className="map-popup">
          <strong className="map-popup__title">{label}</strong>
          <p className="map-popup__reading">
            <Icon size={20} weight="fill" aria-hidden="true" className="map-popup__icon" />
            {data ? (
              <span>
                {formatTemp(data.main.temp, unit, { withUnit: true })}
                <span className="map-popup__sep" aria-hidden="true">
                  {' '}
                  &middot;{' '}
                </span>
                {condition(data.weather[0].description)}
              </span>
            ) : (
              <span>{t('mapUnavailable')}</span>
            )}
          </p>
          <button
            type="button"
            className="map-popup__action"
            onClick={() => {
              map.closePopup();
              onSelect?.(city);
            }}
          >
            {t('tabWeather')}
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

/** Flies to `focus` and flashes a ring there. Re-fires whenever `focus.key` changes. */
function FocusController({ focus }) {
  const map = useMap();
  const { key, lat, lon } = focus ?? {};

  useEffect(() => {
    if (key == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    map.flyTo([lat, lon], Math.max(map.getZoom(), FOCUS_ZOOM), { animate: !reduceMotion, duration: 1.2 });

    // Imperative on purpose: a short-lived decoration, not state worth a React render cycle.
    const ring = L.marker([lat, lon], {
      icon: RING_ICON,
      interactive: false,
      keyboard: false,
      zIndexOffset: 1000,
    }).addTo(map);
    const timer = setTimeout(() => ring.remove(), HIGHLIGHT_MS);

    return () => {
      clearTimeout(timer);
      ring.remove();
    };
  }, [map, key, lat, lon]);

  return null;
}

/**
 * Wheel zoom is off until the user engages with the map (click or focus) and off again when they
 * leave, so scrolling the page with the cursor over the map never gets trapped.
 */
function ScrollWheelGate() {
  const map = useMap();

  useEffect(() => {
    const el = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();

    el.addEventListener('click', enable);
    el.addEventListener('focusin', enable);
    el.addEventListener('mouseleave', disable);
    el.addEventListener('focusout', disable);

    return () => {
      el.removeEventListener('click', enable);
      el.removeEventListener('focusin', enable);
      el.removeEventListener('mouseleave', disable);
      el.removeEventListener('focusout', disable);
      map.scrollWheelZoom.disable();
    };
  }, [map]);

  return null;
}

/**
 * World map with a temperature-coloured pin per city.
 * `cities`: [{ name, country, state, lat, lon }] (deduped by the parent).
 * `focus`: { lat, lon, key } | null. A new `key` flies the map there and pulses a ring.
 * `onSelectCity(city)`: the popup's "Weather" button, so the parent can load that city.
 * `className`: sizing for the map box; it needs a height (default h-[420px]).
 */
export default function ExploreMap({ cities, focus = null, onSelectCity, className = 'h-[420px]' }) {
  const { t } = useSettings();

  const mappable = useMemo(() => {
    const seen = new Set();
    return cities.filter((city) => {
      if (!hasCoords(city)) return false;
      const key = cityKey(city);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [cities]);

  const signature = mappable.map((city) => `${cityKey(city)}@${city.lat},${city.lon}`).join(';');
  const results = useMapWeather(mappable, signature);
  const loading = mappable.some((city) => !results[cityKey(city)]);

  return (
    // `isolate` contains Leaflet's high z-index panes so they cannot paint over sticky page chrome.
    <div className={`relative isolate overflow-hidden rounded-[1rem] ${className}`}>
      <MapContainer
        center={WORLD_CENTER}
        zoom={2}
        minZoom={2}
        worldCopyJump
        scrollWheelZoom={false}
        className="explore-map h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} subdomains="abc" maxZoom={19} />
        <ScrollWheelGate />
        <FocusController focus={focus} />
        {mappable.map((city) => {
          const outcome = results[cityKey(city)];
          return outcome ? (
            <CityMarker key={cityKey(city)} city={city} outcome={outcome} onSelect={onSelectCity} />
          ) : null;
        })}
      </MapContainer>

      {loading && (
        <p role="status" className="map-loading">
          {t('mapLoading')}
        </p>
      )}
    </div>
  );
}
