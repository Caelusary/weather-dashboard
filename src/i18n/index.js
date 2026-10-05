import { CONDITION_TRANSLATIONS, TRANSLATIONS } from './translations';

/** Looks up a UI string, falling back to English. Function values take interpolation args. */
export function translate(language, key, ...args) {
  const entry = TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

/** OpenWeatherMap returns English condition text; unknown phrases fall back to it unchanged. */
export function translateCondition(language, description) {
  if (language === 'en') return description;
  return CONDITION_TRANSLATIONS[description.toLowerCase()]?.[language] ?? description;
}
