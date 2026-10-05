// Pure helpers over OpenWeatherMap's /weather payload. A city's "local time" is derived from the
// API's own timezone offset (seconds), never the browser's clock: add the offset to the UTC
// timestamp, then read UTC getters back as if they were local fields.

const ATMOSPHERE = ['Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado'];

export const cityLocalDate = (unixSeconds, timezoneOffset) => new Date((unixSeconds + timezoneOffset) * 1000);

/** Sunrise/sunset from the API when present; falls back to a fixed 06:00-20:00 window. */
export function isDaytimeAt(data) {
  const { sunrise, sunset } = data.sys ?? {};
  if (sunrise && sunset) return data.dt >= sunrise && data.dt < sunset;
  const hour = cityLocalDate(data.dt, data.timezone).getUTCHours();
  return hour >= 6 && hour < 20;
}

/** Late enough that "go stargazing" stops being realistic advice. */
export function isBedtimeAt(data) {
  const hour = cityLocalDate(data.dt, data.timezone).getUTCHours();
  return hour >= 23 || hour < 5;
}

const isNightIcon = (data) => data.weather[0].icon.endsWith('n');

/**
 * Background theme key. Precipitation and atmosphere conditions always win; a calm sky falls
 * back to night / hot / cold / clear / clouds. Temperature is Celsius (the API is queried metric).
 */
export function resolveTheme(data) {
  const { main } = data.weather[0];
  const tempC = data.main.temp;

  if (main === 'Thunderstorm') return 'thunderstorm';
  if (main === 'Snow') return 'snow';
  if (main === 'Rain' || main === 'Drizzle') return 'rain';
  if (ATMOSPHERE.includes(main)) return 'fog';

  if (isNightIcon(data)) return 'night';
  if (tempC >= 30) return 'hot';
  if (tempC <= 5) return 'cold';
  return main === 'Clear' ? 'clear' : 'clouds';
}

/**
 * Which piece of advice to show, as a translation key. Ranked most to least critical so
 * overlapping conditions (rain + freezing) surface the one that matters most:
 * storm > snow > freezing > rain > low visibility > heat > bedtime > clear night > warm > cool.
 */
export function suggestionKey(data) {
  const { main } = data.weather[0];
  const tempC = data.main.temp;
  const day = isDaytimeAt(data);

  if (main === 'Thunderstorm') return 'sugStorm';
  if (main === 'Snow') return 'sugSnow';
  if (tempC < 5) return 'sugFreezing';
  if (main === 'Rain' || main === 'Drizzle') return 'sugRain';
  if (ATMOSPHERE.includes(main)) return 'sugLowVisibility';
  if (tempC >= 30) return day ? 'sugScorching' : 'sugWarmNight';
  if (isBedtimeAt(data)) return 'sugBedtime';
  if (main === 'Clear' && !day) return 'sugClearNight';
  if (tempC >= 20) return day ? 'sugBeautifulDay' : 'sugPleasantEvening';
  if (tempC >= 10) return 'sugCool';
  return 'sugChilly';
}

/**
 * Icon kind for a condition entry (current weather or a forecast slot). The UI maps each kind to
 * an icon; keeping the decision here keeps it testable and shared by the card, forecast and map.
 */
export function conditionKind(entry) {
  const night = isNightIcon(entry);
  switch (entry.weather[0].main) {
    case 'Thunderstorm':
      return 'thunderstorm';
    case 'Drizzle':
      return 'drizzle';
    case 'Rain':
      return 'rain';
    case 'Snow':
      return 'snow';
    case 'Mist':
    case 'Smoke':
    case 'Haze':
    case 'Fog':
    case 'Dust':
    case 'Sand':
    case 'Ash':
      return 'fog';
    case 'Squall':
    case 'Tornado':
      return 'wind';
    case 'Clear':
      return night ? 'clear-night' : 'clear-day';
    case 'Clouds':
      return night ? 'clouds-night' : 'clouds-day';
    default:
      return 'clouds-day';
  }
}

/** Long date and time in the city's own timezone, formatted for the UI language. */
export function formatCityDateTime(data, locale) {
  const local = cityLocalDate(data.dt, data.timezone);
  return {
    date: local.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    time: local.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
  };
}

/** Clock time for a unix timestamp in the city's timezone (sunrise / sunset). */
export function formatCityClock(unixSeconds, timezoneOffset, locale) {
  return cityLocalDate(unixSeconds, timezoneOffset).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}
