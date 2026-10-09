import { useMemo, useState, useSyncExternalStore } from 'react';
import './background.css';
import { isWeakDevice } from '../../lib/device';
import { MOON_CRATERS, PARTICLE_KIND_BY_THEME, SUN_BEAMS, THEMES, generateParticles } from './effects';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// Just under the 640px breakpoint, so "viewport width < 640px" also holds for fractional widths.
const SMALL_SCREEN_QUERY = '(max-width: 639.98px)';

const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const noopSubscribe = () => () => {};

// Tiny matchMedia hook. useSyncExternalStore keeps it tear-free and handles
// listener cleanup; environments without matchMedia (jsdom) read as "no match".
function useMediaQuery(query) {
  const subscribe = useMemo(() => {
    if (!hasMatchMedia) return noopSubscribe;
    return (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    };
  }, [query]);

  return useSyncExternalStore(
    subscribe,
    () => hasMatchMedia && window.matchMedia(query).matches,
    () => false,
  );
}

// A hidden tab still runs CSS animations on some browsers; pausing them saves the battery.
const subscribeVisibility = (callback) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};
const useDocumentHidden = () =>
  useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === 'hidden',
    () => false,
  );

// Read once: core count and memory do not change while the page is open.
const WEAK_DEVICE = isWeakDevice();

// The sun gets pulsing, slowly rotating beams; the moon gets craters. Under
// reduced motion only the bare disc is drawn.
function Celestial({ isNight, animated }) {
  if (isNight) {
    return (
      <div className="celestial">
        <div className="moon-core">
          {MOON_CRATERS.map(({ top, left, size }) => (
            <span key={top + left} className="moon-crater" style={{ top, left, width: size, height: size }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="celestial">
      {animated ? (
        <div className="celestial__spin">
          {/* Beams come first so the disc paints over their bases and only the tips show. */}
          {SUN_BEAMS.map(({ length, rotation, delay }) => (
            <span
              key={rotation}
              className="sun-beam"
              style={{ height: length, transform: `rotate(${rotation}deg)`, animationDelay: `${delay}s` }}
            />
          ))}
          <div className="sun-core" />
        </div>
      ) : (
        <div className="sun-core" />
      )}
    </div>
  );
}

// Descriptors never reorder within a theme, so the index is a stable key.
function Particles({ kind, items }) {
  switch (kind) {
    case 'snow':
      return items.map((p, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.size}rem`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          ❄
        </span>
      ));
    case 'rain':
      return items.map((p, i) => (
        <span
          key={i}
          className="raindrop"
          style={{ left: `${p.left}%`, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
        />
      ));
    case 'ember':
      return items.map((p, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            '--drift': `${p.drift}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ));
    case 'star':
      return items.map((p, i) => (
        <span
          key={i}
          className="star"
          style={{
            top: `${p.top}%`,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            '--twinkle-min': p.twinkleMin,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ));
    case 'cloud':
      return items.map((p, i) => (
        <span
          key={i}
          className="drift-cloud"
          style={{
            top: `${p.top}%`,
            '--cloud-scale': p.scale,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ));
    default:
      return null;
  }
}

/**
 * Fixed full-viewport weather backdrop: a crossfading gradient plus the sun or
 * moon and per-theme particles. Sits behind all app content.
 */
export default function WeatherBackground({ theme = 'default', isNight = false }) {
  const themeKey = THEMES.includes(theme) ? theme : 'default';
  // Weak devices get the same still sky as reduced motion: gradient and a bare sun or moon.
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY) || WEAK_DEVICE;
  const hidden = useDocumentHidden();
  const isSmallScreen = useMediaQuery(SMALL_SCREEN_QUERY);

  // Two layers take turns being the visible one. When the theme changes, the
  // hidden layer receives the new gradient and fades in while the other fades
  // out. Adjusting state during render (instead of in an effect) avoids a
  // frame showing the old theme.
  const [layers, setLayers] = useState({ themes: [themeKey, themeKey], active: 0 });
  if (layers.themes[layers.active] !== themeKey) {
    const incoming = 1 - layers.active;
    const themes = [...layers.themes];
    themes[incoming] = themeKey;
    setLayers({ themes, active: incoming });
  }

  // Particle descriptors depend only on theme and density, so unrelated
  // re-renders (and day/night flips within a theme) keep the same particles.
  const kind = PARTICLE_KIND_BY_THEME[themeKey];
  const density = isSmallScreen ? 0.5 : 1;
  const particles = useMemo(
    () => (reducedMotion ? [] : generateParticles(themeKey, { density })),
    [themeKey, density, reducedMotion],
  );

  return (
    <div className={`weather-bg${hidden ? ' weather-bg--paused' : ''}`} aria-hidden="true">
      {layers.themes.map((layerTheme, i) => (
        <div
          key={i}
          className={`bg-layer theme-${layerTheme}${i === layers.active ? ' bg-layer--visible' : ''}`}
        />
      ))}
      <div className="weather-effects">
        {/* Celestial body first so clouds drift in front of it. */}
        <Celestial key={isNight ? 'moon' : 'sun'} isNight={isNight} animated={!reducedMotion} />
        <Particles kind={kind} items={particles} />
      </div>
    </div>
  );
}
