import { createContext, useContext } from 'react';

/**
 * { unit, language, locale, t, condition, setUnit, setLanguage }
 * `t(key, ...args)` translates a UI string, `condition(description)` an API condition phrase.
 */
export const SettingsContext = createContext(null);

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside <SettingsProvider>');
  return value;
}
