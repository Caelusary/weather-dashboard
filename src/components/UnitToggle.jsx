import { useSettings } from '../providers/settingsContext';
import { UNITS } from '../lib/units';

const OPTIONS = [
  { value: UNITS.metric, label: '°C' },
  { value: UNITS.imperial, label: '°F' },
];

/** Segmented control: both units are always visible, so there is no "what will this switch to?". */
export default function UnitToggle() {
  const { unit, setUnit, t } = useSettings();

  return (
    <div
      role="radiogroup"
      aria-label={t('unitToggleTitle')}
      className="inline-flex shrink-0 glass rounded-full p-0.5"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = unit === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setUnit(value)}
            className={`pressable min-h-9 min-w-11 rounded-full px-3 text-sm font-semibold ${
              active ? 'bg-accent text-accent-ink' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
