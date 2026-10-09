import { CaretDown } from '@phosphor-icons/react/dist/csr/CaretDown';
import { Translate } from '@phosphor-icons/react/dist/csr/Translate';
import { LANGUAGES } from '../lib/constants';
import { useSettings } from '../providers/settingsContext';

/**
 * A native select on purpose: best a11y, best mobile picker, zero extra JS. On phones it collapses
 * to an icon button (the text is made transparent, the picker still opens natively) so the header
 * never overflows.
 */
export default function LanguageSelect() {
  const { language, setLanguage, t } = useSettings();

  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">{t('languageLabel')}</span>
      <Translate
        size={18}
        aria-hidden
        className="pointer-events-none absolute left-3 z-10 text-fg-muted max-sm:left-1/2 max-sm:-translate-x-1/2"
      />
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        className="pressable min-h-11 cursor-pointer appearance-none glass rounded-full py-1 pr-9 pl-9 text-sm font-semibold hover:bg-white/10 max-sm:w-11 max-sm:px-0 max-sm:text-transparent"
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code} className="bg-ink-900 text-fg">
            {label}
          </option>
        ))}
      </select>
      <CaretDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute right-3 z-10 text-fg-muted max-sm:hidden"
      />
    </label>
  );
}
