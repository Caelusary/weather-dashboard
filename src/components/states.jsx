import { ArrowClockwise } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import { CloudSlash } from '@phosphor-icons/react/dist/csr/CloudSlash';
import { GlobeHemisphereWest } from '@phosphor-icons/react/dist/csr/GlobeHemisphereWest';
import { isInvalidKey } from '../lib/api';
import { POPULAR_CITIES } from '../lib/constants';
import { useSettings } from '../providers/settingsContext';

/** Placeholder shaped like the hero and the two panels, so nothing jumps when data lands. */
export function WeatherSkeleton() {
  const { t } = useSettings();

  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">{t('loading')}</span>
      <div className="flex flex-col items-center pt-8 pb-10 sm:pt-10 sm:pb-12">
        <div className="h-9 w-56 rounded-full bg-white/15" />
        <div className="mt-3 h-5 w-44 rounded-full bg-white/10" />
        <div className="mt-4 h-24 w-44 rounded-3xl bg-white/15 sm:h-28" />
        <div className="mt-4 h-6 w-40 rounded-full bg-white/10" />
        <div className="mt-8 h-12 w-80 max-w-full rounded-full bg-white/10" />
      </div>
      <div className="space-y-6">
        <div className="glass h-48 rounded-[1.25rem]" />
        <div className="glass h-56 rounded-[1.25rem]" />
      </div>
    </div>
  );
}

/** Failed weather request. A bad API key is called out separately: retrying will not help. */
export function WeatherError({ error, onRetry }) {
  const { t } = useSettings();
  const invalidKey = isInvalidKey(error);

  return (
    <div
      role="alert"
      className="glass mx-auto flex max-w-lg rounded-[1.25rem] flex-col items-center gap-4 px-6 py-12 text-center"
    >
      <CloudSlash size={48} weight="duotone" aria-hidden className="text-danger" />
      <p className="max-w-md text-fg-muted">{t(invalidKey ? 'errorInvalidApiKey' : 'errorWeatherGeneric')}</p>
      {!invalidKey && (
        <button
          type="button"
          onClick={onRetry}
          className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-accent-ink hover:brightness-110"
        >
          <ArrowClockwise size={18} weight="bold" aria-hidden />
          {t('retry')}
        </button>
      )}
    </div>
  );
}

/** First visit: nothing selected yet. The sky stays the backdrop; a few cities to start from. */
export function EmptyState({ onSelect }) {
  const { t } = useSettings();

  return (
    <section className="on-sky flex flex-col items-center py-16 text-center sm:py-24">
      <GlobeHemisphereWest size={64} weight="duotone" aria-hidden className="text-white" />
      <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t('emptyTitle')}</h2>
      <p className="mt-2 text-[1.2rem] font-semibold text-white/90">{t('emptyBody')}</p>
      <ul className="mt-8 flex max-w-2xl flex-wrap justify-center gap-2.5 [text-shadow:none]">
        {POPULAR_CITIES.slice(0, 6).map((city) => (
          <li key={city.name}>
            <button
              type="button"
              onClick={() => onSelect(city)}
              className="glass pressable min-h-11 rounded-full px-5 font-medium hover:bg-white/15"
            >
              {city.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
