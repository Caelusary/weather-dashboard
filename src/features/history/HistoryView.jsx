import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/csr/MapPin';
import { Trash } from '@phosphor-icons/react/dist/csr/Trash';
import { X } from '@phosphor-icons/react/dist/csr/X';
import { useState } from 'react';
import { cityLabel, normalize } from '../../lib/cities';
import { usePlaces } from '../../providers/placesContext';
import { useSettings } from '../../providers/settingsContext';

// On devices that can hover, the delete control stays out of the way until the row is hovered or
// focused. Touch devices cannot hover, so there it is always visible.
const REVEAL_ON_HOVER =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100';

/** Full timestamped log of searches: filter, jump back to a city, delete one, or clear everything. */
export default function HistoryView({ onSelect }) {
  const { t, locale } = useSettings();
  const { history, removeHistory, clear } = usePlaces();
  const [filter, setFilter] = useState('');
  const [confirming, setConfirming] = useState(false);

  const wanted = normalize(filter);
  const visible = wanted ? history.filter((entry) => normalize(cityLabel(entry)).includes(wanted)) : history;

  return (
    <section aria-labelledby="history-heading" className="mx-auto max-w-3xl pt-6">
      <div className="flex items-center justify-between gap-4">
        <h1 id="history-heading" className="on-sky text-3xl font-semibold tracking-tight">
          {t('tabHistory')}
        </h1>
        {!confirming && (
          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => setConfirming(true)}
            title={t('clearHistoryTitle')}
            className="glass pressable inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"
          >
            <Trash size={16} aria-hidden />
            {t('clearAllHistory')}
          </button>
        )}
      </div>

      {confirming && (
        <div
          role="alert"
          className="glass enter mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-3"
        >
          <span className="text-sm">{t('clearHistoryConfirm')}</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="pressable min-h-10 rounded-full px-4 text-sm font-semibold hover:bg-white/10"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                clear();
                setConfirming(false);
              }}
              className="pressable min-h-10 rounded-full bg-danger px-4 text-sm font-semibold text-ink-950 hover:brightness-110"
            >
              {t('confirmClear')}
            </button>
          </span>
        </div>
      )}

      <div className="relative mt-6">
        <label htmlFor="history-filter" className="sr-only">
          {t('historySearchPlaceholder')}
        </label>
        <MagnifyingGlass
          size={20}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-5 z-10 -translate-y-1/2 text-fg-muted"
        />
        <input
          id="history-filter"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={t('historySearchPlaceholder')}
          autoComplete="off"
          className="glass min-h-12 w-full rounded-full pr-5 pl-13 placeholder:text-fg-muted focus-visible:border-accent/70 focus-visible:outline-none"
        />
      </div>

      {visible.length === 0 ? (
        <p className="on-sky mt-16 text-center text-[1.2rem] font-semibold text-white/90">
          {history.length === 0 ? t('noHistoryYet') : t('noHistoryMatch')}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((entry) => {
            const label = cityLabel(entry);
            return (
              <li key={entry.timestamp} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  className="glass flex min-h-16 w-full items-center gap-4 rounded-2xl py-3 pr-16 pl-4 text-left transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:-translate-y-px hover:bg-white/12 focus-visible:outline-offset-2 active:translate-y-0 active:scale-[0.99]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-accent">
                    <MapPin size={20} weight="fill" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{label}</span>
                    <span className="block text-sm text-fg-muted">
                      {new Date(entry.timestamp).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${t('deleteEntryTitle')}: ${label}`}
                  onClick={() => removeHistory(entry.timestamp)}
                  className={`pressable absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full text-fg-muted transition-opacity duration-150 hover:bg-white/15 hover:text-fg focus-visible:opacity-100 ${REVEAL_ON_HOVER}`}
                >
                  <X size={18} weight="bold" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
