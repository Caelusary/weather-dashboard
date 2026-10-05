import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, STORAGE_KEYS } from '../lib/constants';
import { readString, writeString } from '../lib/storage';
import { UNITS } from '../lib/units';
import { translate, translateCondition } from '../i18n';
import { SettingsContext } from './settingsContext';

const initialUnit = () =>
  readString(STORAGE_KEYS.unit, UNITS.metric) === UNITS.imperial ? UNITS.imperial : UNITS.metric;
const initialLanguage = () => {
  const stored = readString(STORAGE_KEYS.language, 'en');
  return LANGUAGES.some((l) => l.code === stored) ? stored : 'en';
};

export function SettingsProvider({ children }) {
  const [unit, setUnitState] = useState(initialUnit);
  const [language, setLanguageState] = useState(initialLanguage);

  const setUnit = useCallback((next) => {
    setUnitState(next);
    writeString(STORAGE_KEYS.unit, next);
  }, []);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    writeString(STORAGE_KEYS.language, next);
  }, []);

  // Layout stays left-to-right in every language (Arabic included): the UI translates text only,
  // so switching language never flips the page. `lang` still updates for screen readers.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      unit,
      language,
      locale: LANGUAGES.find((l) => l.code === language).locale,
      t: (key, ...args) => translate(language, key, ...args),
      condition: (description) => translateCondition(language, description),
      setUnit,
      setLanguage,
    }),
    [unit, language, setUnit, setLanguage],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}
