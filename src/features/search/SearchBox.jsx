import { CircleNotch } from '@phosphor-icons/react/dist/csr/CircleNotch';
import { Clock } from '@phosphor-icons/react/dist/csr/Clock';
import { GlobeHemisphereWest } from '@phosphor-icons/react/dist/csr/GlobeHemisphereWest';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { MapPin } from '@phosphor-icons/react/dist/csr/MapPin';
import { WarningCircle } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Fragment, useId, useState } from 'react';
import { cityLabel, normalize } from '../../lib/cities';
import { POPULAR_CITIES } from '../../lib/constants';
import { useSettings } from '../../providers/settingsContext';
import { useCitySearch } from './useCitySearch';
import { useCitySuggestions } from './useCitySuggestions';

const GROUP_ICONS = { recent: Clock, popular: GlobeHemisphereWest };

/** Recent searches first, then popular cities that are not already listed. */
function quickPicks(recent) {
  const recentWithCoords = recent.filter((c) => c.lat != null && c.lon != null);
  const seen = new Set(recentWithCoords.map((c) => normalize(c.name)));
  return [
    ...recentWithCoords.map((c) => ({ ...c, group: 'recent' })),
    ...POPULAR_CITIES.filter((c) => !seen.has(normalize(c.name))).map((c) => ({ ...c, group: 'popular' })),
  ];
}

/**
 * Search field with autocomplete, following the ARIA combobox pattern: DOM focus never leaves the
 * input, the highlighted option is announced through aria-activedescendant, and arrow keys, Enter
 * and Escape do what a keyboard user expects.
 *
 * Focusing the box before typing offers recent and popular cities, so those shortcuts live where
 * they are needed instead of taking space on the page.
 *
 * Remount it with a new `key` to reset the text when the selected city changes elsewhere.
 */
export default function SearchBox({ initialQuery = '', recent, userCoords, requestCoords, onSelect }) {
  const { t } = useSettings();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // A remounted box (new city selected, page reload) starts with text already in it; only fetch
  // suggestions once the user actually types.
  const [typed, setTyped] = useState(false);

  const search = useCitySearch({ onResolve: onSelect, userCoords });
  const { suggestions } = useCitySuggestions(typed ? query : '', { recent, userCoords });

  const choosing = search.status === 'choose';
  const browsing = !choosing && (!typed || query.trim() === '');
  const options = choosing ? search.choices : browsing ? quickPicks(recent) : suggestions;
  const open = options.length > 0 && (choosing || (focused && !dismissed));

  function pick(city) {
    setQuery(city.name);
    setTyped(false);
    setDismissed(true);
    setActiveIndex(-1);
    search.reset();
    onSelect(city);
  }

  function submit(event) {
    event.preventDefault();
    if (open && activeIndex >= 0) {
      pick(options[activeIndex]);
      return;
    }
    setDismissed(true);
    search.search(query);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setDismissed(true);
      setActiveIndex(-1);
      return;
    }
    if (!options.length || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    setDismissed(false);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    // Up from "nothing highlighted" lands on the last option, as the ARIA combobox pattern expects.
    setActiveIndex((index) =>
      index === -1 && step === -1 ? options.length - 1 : (index + step + options.length) % options.length,
    );
  }

  const pending = search.status === 'pending';
  const error = search.error ? t(search.error.key, ...(search.error.args ?? [])) : null;
  const groupTitle = { recent: t('recentLabel').replace(/:$/, ''), popular: t('popularCitiesTitle') };

  return (
    <form onSubmit={submit} role="search" className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        {t('searchPlaceholder')}
      </label>
      <MagnifyingGlass
        size={20}
        aria-hidden
        className="pointer-events-none absolute top-7 left-5 z-10 -translate-y-1/2 text-fg-muted"
      />
      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${listId}-error` : undefined}
        autoComplete="off"
        autoCapitalize="words"
        enterKeyHint="search"
        spellCheck={false}
        value={query}
        placeholder={t('searchPlaceholder')}
        onChange={(event) => {
          setQuery(event.target.value);
          setTyped(true);
          setDismissed(false);
          setActiveIndex(-1);
          if (search.status !== 'idle') search.reset();
        }}
        onFocus={(event) => {
          setFocused(true);
          setDismissed(false);
          // Select the current city name so typing replaces it in one go.
          event.target.select();
          requestCoords?.();
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        className="glass min-h-14 w-full rounded-full pr-28 pl-13 text-base placeholder:text-fg-muted focus-visible:border-accent/70 focus-visible:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="pressable absolute top-1.5 right-1.5 inline-flex h-11 min-w-22 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink hover:brightness-110 disabled:opacity-80"
      >
        {/* The label stays in the DOM while pending so the button never changes width. */}
        <span className={pending ? 'invisible' : undefined}>{t('searchButton')}</span>
        {pending && <CircleNotch size={18} className="absolute animate-spin" aria-hidden />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[1.25rem] border border-line bg-ink-900 shadow-2xl">
          {choosing && <p className="px-5 pt-4 pb-1 text-sm text-fg-muted">{t('multipleCitiesFound')}</p>}
          <ul
            id={listId}
            role="listbox"
            aria-label={t('searchPlaceholder')}
            className="max-h-80 overflow-y-auto py-2"
          >
            {options.map((city, index) => {
              const GroupIcon = GROUP_ICONS[city.group];
              const startsGroup = city.group && city.group !== options[index - 1]?.group;
              return (
                <Fragment
                  key={`${city.group ?? 'hit'}-${city.name}-${city.state}-${city.country}-${city.lat}`}
                >
                  {startsGroup && (
                    <li
                      role="presentation"
                      className="flex items-center gap-2 px-5 pt-3 pb-1 text-xs font-semibold tracking-wide text-fg-subtle"
                    >
                      <GroupIcon size={14} aria-hidden />
                      {groupTitle[city.group]}
                    </li>
                  )}
                  <li
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    // mousedown would blur the input and close the list before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(city)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 px-5 ${
                      index === activeIndex ? 'bg-white/12' : 'hover:bg-white/8'
                    }`}
                  >
                    <MapPin size={18} aria-hidden className="shrink-0 text-fg-subtle" />
                    <span className="min-w-0 flex-1 truncate">{cityLabel(city)}</span>
                    {city.isRecent && (
                      <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                        <Clock size={14} aria-hidden />
                        {t('recentBadge')}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <p
          id={`${listId}-error`}
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-2xl border border-danger/30 bg-ink-900/90 px-4 py-3 text-sm text-danger"
        >
          <WarningCircle size={20} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
