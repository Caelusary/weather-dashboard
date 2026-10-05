export const API_BASE = 'https://api.openweathermap.org';

export const RECENT_LIMIT = 7;
export const HISTORY_LIMIT = 200;

export const STORAGE_KEYS = {
  unit: 'unit',
  language: 'language',
  recent: 'recentCities',
  history: 'searchHistory',
  lastCity: 'lastCity',
};

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-US' },
  { code: 'es', label: 'Español', short: 'ES', locale: 'es-ES' },
  { code: 'zh', label: '中文', short: 'ZH', locale: 'zh-CN' },
  { code: 'hi', label: 'हिन्दी', short: 'HI', locale: 'hi-IN' },
  { code: 'ar', label: 'العربية', short: 'AR', locale: 'ar-SA' },
];

// Coordinates are hardcoded (rather than geocoded on load) so the map pins for this fixed list
// don't cost an extra API round-trip on every visit.
export const POPULAR_CITIES = [
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437 },
  { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
];
