import { ClockCounterClockwise } from '@phosphor-icons/react/dist/csr/ClockCounterClockwise';
import { CloudSun } from '@phosphor-icons/react/dist/csr/CloudSun';
import { MapTrifold } from '@phosphor-icons/react/dist/csr/MapTrifold';
import { useSettings } from '../providers/settingsContext';

const ITEMS = [
  { view: 'weather', labelKey: 'tabWeather', Icon: CloudSun },
  { view: 'explore', labelKey: 'tabExplore', Icon: MapTrifold },
  { view: 'history', labelKey: 'tabHistory', Icon: ClockCounterClockwise },
];

const href = (view) => (view === 'weather' ? '#/' : `#/${view}`);

/** Top tabs on larger screens. Real links, so each view has its own URL. */
export function TopNav({ view }) {
  const { t } = useSettings();

  return (
    <nav aria-label="Views" className="glass hidden gap-1 rounded-full p-1 md:flex">
      {ITEMS.map(({ view: id, labelKey, Icon }) => {
        const active = id === view;
        return (
          <a
            key={id}
            href={href(id)}
            aria-current={active ? 'page' : undefined}
            className={`pressable inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
              active ? 'bg-white/15 text-fg' : 'text-fg-muted hover:bg-white/10 hover:text-fg'
            }`}
          >
            <Icon size={18} weight={active ? 'fill' : 'regular'} aria-hidden />
            {t(labelKey)}
          </a>
        );
      })}
    </nav>
  );
}

/** Phones get their own bottom tab bar (thumb reach) instead of a squeezed desktop header. */
export function BottomNav({ view }) {
  const { t } = useSettings();

  return (
    <nav
      aria-label="Views"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/97 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {ITEMS.map(({ view: id, labelKey, Icon }) => {
          const active = id === view;
          return (
            <li key={id}>
              <a
                href={href(id)}
                aria-current={active ? 'page' : undefined}
                className={`pressable flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  active ? 'text-accent' : 'text-fg-subtle'
                }`}
              >
                <Icon size={24} weight={active ? 'fill' : 'regular'} aria-hidden />
                {t(labelKey)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
