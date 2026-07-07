// API_KEY comes from config.js (gitignored) — see config.example.js for setup.
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';

const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const suggestionsContainer = document.getElementById('suggestions');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const loading = document.getElementById('loading');
const unitToggle = document.getElementById('unit-toggle');
const recentList = document.getElementById('recent-list');
const popularList = document.getElementById('popular-list');

const tabWeatherBtn = document.getElementById('tab-weather');
const tabHistoryBtn = document.getElementById('tab-history');
const weatherView = document.getElementById('weather-view');
const historyView = document.getElementById('history-view');
const historySearchInput = document.getElementById('history-search');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyListEl = document.getElementById('history-list');

const languageSelect = document.getElementById('language-select');
const appTitleLine1El = document.getElementById('app-title-line1');
const appTitleLine2El = document.getElementById('app-title-line2');
const searchButtonEl = document.getElementById('search-button');
const recentLabelEl = document.getElementById('recent-label');
const humidityLabelEl = document.getElementById('humidity-label');
const feelsLikeLabelEl = document.getElementById('feels-like-label');
const popularCitiesTitleEl = document.getElementById('popular-cities-title');
const forecastSection = document.getElementById('forecast');
const forecastTitleEl = document.getElementById('forecast-title');
const forecastListEl = document.getElementById('forecast-list');
const forecastLoading = document.getElementById('forecast-loading');

const cityName = document.getElementById('city-name');
const cityDatetime = document.getElementById('city-datetime');
const condition = document.getElementById('condition');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const feelsLike = document.getElementById('feels-like');
const weatherIcon = document.getElementById('weather-icon');

const bgLayerA = document.getElementById('bg-layer-a');
const bgLayerB = document.getElementById('bg-layer-b');
const weatherEffects = document.getElementById('weather-effects');

let currentUnit = localStorage.getItem('unit') || 'metric';
let currentCity = '';
let currentCityData = null;
// Tracked separately because renderWeather overwrites currentCityData with
// the API's bare {lat, lon}, which would otherwise drop this.
let currentCityState = '';
let userCoords = null;
let activeBgLayer = 'a';
// Bumped at the start of each search; fetch functions drop their response
// if a newer search has started by the time it resolves (see requestId
// params below), so a slow/out-of-order response can't overwrite the UI.
let latestWeatherRequestId = 0;
let currentLanguage = localStorage.getItem('language') || 'en';
// Last rendered weather/forecast payloads, kept only so a language change
// can retranslate/re-render without an extra API call.
let lastWeatherData = null;
let lastForecastData = null;

const POPULAR_CITIES = [
  { name: 'London', country: 'GB' },
  { name: 'New York', country: 'US' },
  { name: 'Tokyo', country: 'JP' },
  { name: 'Paris', country: 'FR' },
  { name: 'Sydney', country: 'AU' },
  { name: 'Dubai', country: 'AE' },
  { name: 'Singapore', country: 'SG' },
  { name: 'Mumbai', country: 'IN' }
];

// Values needing interpolation (e.g. a city name) are functions, not strings.
const TRANSLATIONS = {
  en: {
    appTitleLine1: '🌤️ Weather',
    appTitleLine2: 'Dashboard',
    tabWeather: '🌤️ Weather',
    tabHistory: '📜 History',
    searchPlaceholder: 'Enter a city name...',
    searchButton: 'Search',
    recentLabel: '🕒 Recent:',
    noRecentSearches: 'No recent searches',
    humidityLabel: '💧 Humidity',
    feelsLikeLabel: '🌡️ Feels Like',
    popularCitiesTitle: '🌍 Popular Cities',
    forecastTitle: '📅 5-Day Forecast',
    forecastLoading: 'Loading forecast...',
    loading: 'Loading...',
    historySearchPlaceholder: 'Filter history by city...',
    clearAllHistory: '🗑️ Clear All',
    clearHistoryTitle: 'Clear all history',
    clearHistoryConfirm: 'Clear all search history? This cannot be undone.',
    noHistoryYet: 'No search history yet.',
    noHistoryMatch: 'No entries match your filter.',
    deleteEntryTitle: 'Delete entry',
    unitToggleTitle: 'Toggle temperature unit',
    languageLabel: 'Select language',
    multipleCitiesFound: 'Multiple cities found. Please select one:',
    errorEnterCity: 'Please enter a city name.',
    errorCityNotFound: (city) => `City "${city}" was not found. Check the spelling and try again.`,
    errorGeocodeFailed: 'Could not find the city. Please check the spelling.',
    errorGeocodeGeneric: 'Something went wrong while fetching the city data.',
    errorInvalidApiKey: 'Invalid API key. Add your OpenWeatherMap API key in config.js.',
    errorWeatherGeneric: 'Something went wrong while fetching the weather data.',
    errorCityCountryNotFound: (city, country) => `City "${city}, ${country}" was not found.`,
    errorCityCountryFailed: (city, country) => `Could not find city "${city}, ${country}".`
  },
  es: {
    appTitleLine1: '🌤️ Clima',
    appTitleLine2: 'Dashboard',
    tabWeather: '🌤️ Clima',
    tabHistory: '📜 Historial',
    searchPlaceholder: 'Introduce el nombre de una ciudad...',
    searchButton: 'Buscar',
    recentLabel: '🕒 Recientes:',
    noRecentSearches: 'Sin búsquedas recientes',
    humidityLabel: '💧 Humedad',
    feelsLikeLabel: '🌡️ Sensación Térmica',
    popularCitiesTitle: '🌍 Ciudades Populares',
    forecastTitle: '📅 Pronóstico de 5 Días',
    forecastLoading: 'Cargando pronóstico...',
    loading: 'Cargando...',
    historySearchPlaceholder: 'Filtrar historial por ciudad...',
    clearAllHistory: '🗑️ Borrar Todo',
    clearHistoryTitle: 'Borrar todo el historial',
    clearHistoryConfirm: '¿Borrar todo el historial de búsquedas? Esta acción no se puede deshacer.',
    noHistoryYet: 'Aún no hay historial de búsquedas.',
    noHistoryMatch: 'Ningún resultado coincide con tu filtro.',
    deleteEntryTitle: 'Eliminar entrada',
    unitToggleTitle: 'Cambiar unidad de temperatura',
    languageLabel: 'Seleccionar idioma',
    multipleCitiesFound: 'Se encontraron varias ciudades. Por favor selecciona una:',
    errorEnterCity: 'Por favor introduce el nombre de una ciudad.',
    errorCityNotFound: (city) => `No se encontró la ciudad "${city}". Verifica la ortografía e intenta de nuevo.`,
    errorGeocodeFailed: 'No se pudo encontrar la ciudad. Verifica la ortografía.',
    errorGeocodeGeneric: 'Ocurrió un error al buscar los datos de la ciudad.',
    errorInvalidApiKey: 'Clave de API inválida. Agrega tu clave de OpenWeatherMap en config.js.',
    errorWeatherGeneric: 'Ocurrió un error al obtener los datos del clima.',
    errorCityCountryNotFound: (city, country) => `No se encontró la ciudad "${city}, ${country}".`,
    errorCityCountryFailed: (city, country) => `No se pudo encontrar la ciudad "${city}, ${country}".`
  },
  zh: {
    appTitleLine1: '🌤️ 天气',
    appTitleLine2: '仪表盘',
    tabWeather: '🌤️ 天气',
    tabHistory: '📜 历史记录',
    searchPlaceholder: '输入城市名称...',
    searchButton: '搜索',
    recentLabel: '🕒 最近:',
    noRecentSearches: '暂无最近搜索',
    humidityLabel: '💧 湿度',
    feelsLikeLabel: '🌡️ 体感温度',
    popularCitiesTitle: '🌍 热门城市',
    forecastTitle: '📅 5天预报',
    forecastLoading: '正在加载预报...',
    loading: '加载中...',
    historySearchPlaceholder: '按城市筛选历史记录...',
    clearAllHistory: '🗑️ 清除全部',
    clearHistoryTitle: '清除所有历史记录',
    clearHistoryConfirm: '确定要清除所有搜索历史吗？此操作无法撤销。',
    noHistoryYet: '暂无搜索历史。',
    noHistoryMatch: '没有符合筛选条件的记录。',
    deleteEntryTitle: '删除记录',
    unitToggleTitle: '切换温度单位',
    languageLabel: '选择语言',
    multipleCitiesFound: '找到多个匹配城市，请选择一个：',
    errorEnterCity: '请输入城市名称。',
    errorCityNotFound: (city) => `未找到城市"${city}"。请检查拼写后重试。`,
    errorGeocodeFailed: '未能找到该城市，请检查拼写。',
    errorGeocodeGeneric: '获取城市数据时出错。',
    errorInvalidApiKey: 'API密钥无效。请在 config.js 中添加你的 OpenWeatherMap API 密钥。',
    errorWeatherGeneric: '获取天气数据时出错。',
    errorCityCountryNotFound: (city, country) => `未找到城市"${city}, ${country}"。`,
    errorCityCountryFailed: (city, country) => `无法找到城市"${city}, ${country}"。`
  },
  hi: {
    appTitleLine1: '🌤️ मौसम',
    appTitleLine2: 'डैशबोर्ड',
    tabWeather: '🌤️ मौसम',
    tabHistory: '📜 इतिहास',
    searchPlaceholder: 'शहर का नाम दर्ज करें...',
    searchButton: 'खोजें',
    recentLabel: '🕒 हाल की:',
    noRecentSearches: 'कोई हाल की खोज नहीं',
    humidityLabel: '💧 आर्द्रता',
    feelsLikeLabel: '🌡️ महसूस होता है',
    popularCitiesTitle: '🌍 लोकप्रिय शहर',
    forecastTitle: '📅 5-दिन का पूर्वानुमान',
    forecastLoading: 'पूर्वानुमान लोड हो रहा है...',
    loading: 'लोड हो रहा है...',
    historySearchPlaceholder: 'शहर के अनुसार इतिहास फ़िल्टर करें...',
    clearAllHistory: '🗑️ सभी हटाएं',
    clearHistoryTitle: 'सभी इतिहास हटाएं',
    clearHistoryConfirm: 'क्या सारा खोज इतिहास हटाना है? इसे पूर्ववत नहीं किया जा सकता।',
    noHistoryYet: 'अभी तक कोई खोज इतिहास नहीं है।',
    noHistoryMatch: 'आपके फ़िल्टर से कोई प्रविष्टि मेल नहीं खाती।',
    deleteEntryTitle: 'प्रविष्टि हटाएं',
    unitToggleTitle: 'तापमान इकाई बदलें',
    languageLabel: 'भाषा चुनें',
    multipleCitiesFound: 'कई शहर मिले। कृपया एक चुनें:',
    errorEnterCity: 'कृपया शहर का नाम दर्ज करें।',
    errorCityNotFound: (city) => `शहर "${city}" नहीं मिला। वर्तनी जांचें और पुनः प्रयास करें।`,
    errorGeocodeFailed: 'शहर नहीं मिल सका। कृपया वर्तनी जांचें।',
    errorGeocodeGeneric: 'शहर डेटा प्राप्त करते समय कुछ गलत हो गया।',
    errorInvalidApiKey: 'अमान्य API कुंजी। config.js में अपनी OpenWeatherMap API कुंजी जोड़ें।',
    errorWeatherGeneric: 'मौसम डेटा प्राप्त करते समय कुछ गलत हो गया।',
    errorCityCountryNotFound: (city, country) => `शहर "${city}, ${country}" नहीं मिला।`,
    errorCityCountryFailed: (city, country) => `शहर "${city}, ${country}" नहीं मिल सका।`
  },
  ar: {
    appTitleLine1: '🌤️ لوحة',
    appTitleLine2: 'الطقس',
    tabWeather: '🌤️ الطقس',
    tabHistory: '📜 السجل',
    searchPlaceholder: 'أدخل اسم المدينة...',
    searchButton: 'بحث',
    recentLabel: '🕒 الأخيرة:',
    noRecentSearches: 'لا توجد عمليات بحث حديثة',
    humidityLabel: '💧 الرطوبة',
    feelsLikeLabel: '🌡️ الإحساس الحراري',
    popularCitiesTitle: '🌍 المدن الشائعة',
    forecastTitle: '📅 توقعات 5 أيام',
    forecastLoading: 'جارٍ تحميل التوقعات...',
    loading: 'جارٍ التحميل...',
    historySearchPlaceholder: 'تصفية السجل حسب المدينة...',
    clearAllHistory: '🗑️ مسح الكل',
    clearHistoryTitle: 'مسح كل السجل',
    clearHistoryConfirm: 'هل تريد مسح كل سجل البحث؟ لا يمكن التراجع عن هذا الإجراء.',
    noHistoryYet: 'لا يوجد سجل بحث بعد.',
    noHistoryMatch: 'لا توجد نتائج مطابقة لعامل التصفية.',
    deleteEntryTitle: 'حذف الإدخال',
    unitToggleTitle: 'تبديل وحدة الحرارة',
    languageLabel: 'اختر اللغة',
    multipleCitiesFound: 'تم العثور على عدة مدن. الرجاء اختيار واحدة:',
    errorEnterCity: 'الرجاء إدخال اسم مدينة.',
    errorCityNotFound: (city) => `لم يتم العثور على المدينة "${city}". تحقق من الإملاء وحاول مرة أخرى.`,
    errorGeocodeFailed: 'تعذر العثور على المدينة. تحقق من الإملاء.',
    errorGeocodeGeneric: 'حدث خطأ أثناء جلب بيانات المدينة.',
    errorInvalidApiKey: 'مفتاح API غير صالح. أضف مفتاح OpenWeatherMap الخاص بك في config.js.',
    errorWeatherGeneric: 'حدث خطأ أثناء جلب بيانات الطقس.',
    errorCityCountryNotFound: (city, country) => `لم يتم العثور على المدينة "${city}, ${country}".`,
    errorCityCountryFailed: (city, country) => `تعذر العثور على المدينة "${city}, ${country}".`
  }
};

// OWM always returns condition text in English; anything missing here
// falls back to the original English string.
const WEATHER_CONDITION_TRANSLATIONS = {
  'clear sky': { es: 'cielo despejado', zh: '晴朗', hi: 'साफ़ आसमान', ar: 'سماء صافية' },
  'few clouds': { es: 'algo de nubes', zh: '少云', hi: 'हल्के बादल', ar: 'غيوم قليلة' },
  'scattered clouds': { es: 'nubes dispersas', zh: '多云', hi: 'बिखरे बादल', ar: 'غيوم متفرقة' },
  'broken clouds': { es: 'nubes rotas', zh: '多云转阴', hi: 'घने बादल', ar: 'غيوم متكسرة' },
  'overcast clouds': { es: 'cielo nublado', zh: '阴天', hi: 'घटाटोप बादल', ar: 'غيوم كثيفة' },
  'light rain': { es: 'lluvia ligera', zh: '小雨', hi: 'हल्की बारिश', ar: 'مطر خفيف' },
  'moderate rain': { es: 'lluvia moderada', zh: '中雨', hi: 'मध्यम बारिश', ar: 'مطر معتدل' },
  'heavy intensity rain': { es: 'lluvia intensa', zh: '大雨', hi: 'भारी बारिश', ar: 'مطر غزير' },
  'rain': { es: 'lluvia', zh: '雨', hi: 'बारिश', ar: 'مطر' },
  'shower rain': { es: 'chubascos', zh: '阵雨', hi: 'बौछारें', ar: 'زخات مطر' },
  'drizzle': { es: 'llovizna', zh: '毛毛雨', hi: 'बूंदाबांदी', ar: 'رذاذ' },
  'thunderstorm': { es: 'tormenta eléctrica', zh: '雷暴', hi: 'आंधी-तूफान', ar: 'عاصفة رعدية' },
  'thunderstorm with rain': { es: 'tormenta con lluvia', zh: '雷阵雨', hi: 'बारिश के साथ आंधी', ar: 'عاصفة رعدية مع مطر' },
  'snow': { es: 'nieve', zh: '雪', hi: 'बर्फ़बारी', ar: 'ثلج' },
  'light snow': { es: 'nieve ligera', zh: '小雪', hi: 'हल्की बर्फ़बारी', ar: 'ثلج خفيف' },
  'mist': { es: 'neblina', zh: '薄雾', hi: 'धुंध', ar: 'ضباب خفيف' },
  'fog': { es: 'niebla', zh: '雾', hi: 'कोहरा', ar: 'ضباب' },
  'haze': { es: 'bruma', zh: '霾', hi: 'धुंधलापन', ar: 'شبورة' },
  'smoke': { es: 'humo', zh: '烟雾', hi: 'धुआं', ar: 'دخان' },
  'dust': { es: 'polvo', zh: '浮尘', hi: 'धूल', ar: 'غبار' },
  'tornado': { es: 'tornado', zh: '龙卷风', hi: 'बवंडर', ar: 'إعصار' },
  'squalls': { es: 'ráfagas de viento', zh: '狂风', hi: 'तेज़ आंधी', ar: 'عواصف' }
};

function t(key, ...args) {
  const entry = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key];
  return typeof entry === 'function' ? entry(...args) : entry;
}

function translateCondition(description) {
  if (currentLanguage === 'en') return description;
  const entry = WEATHER_CONDITION_TRANSLATIONS[description.toLowerCase()];
  return entry?.[currentLanguage] ?? description;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  // Layout intentionally stays LTR even for Arabic — only text translates.
  // This app's iconography/controls aren't mirrored for a real RTL layout,
  // so flipping `dir` would look like a broken layout, not a localized one.
  languageSelect.value = currentLanguage;

  appTitleLine1El.textContent = t('appTitleLine1');
  appTitleLine2El.textContent = t('appTitleLine2');
  tabWeatherBtn.textContent = t('tabWeather');
  tabHistoryBtn.textContent = t('tabHistory');
  input.placeholder = t('searchPlaceholder');
  searchButtonEl.textContent = t('searchButton');
  recentLabelEl.textContent = t('recentLabel');
  humidityLabelEl.textContent = t('humidityLabel');
  feelsLikeLabelEl.textContent = t('feelsLikeLabel');
  popularCitiesTitleEl.textContent = t('popularCitiesTitle');
  forecastTitleEl.textContent = t('forecastTitle');
  forecastLoading.textContent = t('forecastLoading');
  loading.textContent = t('loading');
  historySearchInput.placeholder = t('historySearchPlaceholder');
  clearHistoryBtn.textContent = t('clearAllHistory');
  clearHistoryBtn.title = t('clearHistoryTitle');
  unitToggle.title = t('unitToggleTitle');
  languageSelect.title = t('languageLabel');

  renderRecentSearches();
  if (!historyView.classList.contains('hidden')) renderHistory();
  if (lastWeatherData) {
    condition.textContent = translateCondition(lastWeatherData.weather[0].description);
    cityDatetime.textContent = formatCityDateTime(lastWeatherData);
  }
  if (lastForecastData) renderForecast(lastForecastData);
}

languageSelect.addEventListener('change', () => {
  currentLanguage = languageSelect.value;
  localStorage.setItem('language', currentLanguage);
  applyTranslations();
});

document.addEventListener('DOMContentLoaded', () => {
  updateUnitToggleText();
  applyTranslations();
  renderPopularCities();
  requestUserLocation();
});

function switchView(view) {
  const isWeather = view === 'weather';
  weatherView.classList.toggle('hidden', !isWeather);
  historyView.classList.toggle('hidden', isWeather);
  tabWeatherBtn.classList.toggle('tab-btn--active', isWeather);
  tabHistoryBtn.classList.toggle('tab-btn--active', !isWeather);
  tabWeatherBtn.setAttribute('aria-selected', String(isWeather));
  tabHistoryBtn.setAttribute('aria-selected', String(!isWeather));
  if (!isWeather) renderHistory();
}

tabWeatherBtn.addEventListener('click', () => switchView('weather'));
tabHistoryBtn.addEventListener('click', () => switchView('history'));

// Geolocation: best-effort — leaves userCoords null (no sorting) if
// unsupported, denied, or the request times out.
function requestUserLocation() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userCoords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
    },
    () => {
      userCoords = null;
    },
    { timeout: 10000 }
  );
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Haversine distance in km between userCoords and a given point.
function distanceFromUser(lat, lon) {
  if (!userCoords) return null;

  const R = 6371;
  const dLat = toRadians(lat - userCoords.lat);
  const dLon = toRadians(lon - userCoords.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(userCoords.lat)) * Math.cos(toRadians(lat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeForMatch(str) {
  return str.trim().toLowerCase();
}

// Escapes API-sourced text (city/state/country names, condition text)
// before it's interpolated into innerHTML — the geocoding endpoint is
// backed by community-editable place-name data, so it isn't safe as-is.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Matches a plain query against POPULAR_CITIES so well-known cities (e.g.
// "Dubai") outrank obscure same-named towns the geocoding API also returns.
function findPopularCity(name) {
  const normalized = normalizeForMatch(name);
  return POPULAR_CITIES.find(c => normalizeForMatch(c.name) === normalized) || null;
}

// 0 = exact match on a known POPULAR_CITIES entry, 1 = exact name match
// only, 2 = everything else.
function cityRank(city, queryName) {
  const nameExact = normalizeForMatch(city.name) === queryName;
  if (!nameExact) return 2;

  const popularMatch = findPopularCity(queryName);
  if (popularMatch && city.country === popularMatch.country) return 0;
  return 1;
}

// Sorts by rank (see cityRank), then by distance from the user within a tier.
function sortCityResults(cities, query) {
  const queryName = normalizeForMatch(parseCityInput(query)?.name ?? query);

  return [...cities].sort((a, b) => {
    const rankDiff = cityRank(a, queryName) - cityRank(b, queryName);
    if (rankDiff !== 0) return rankDiff;

    if (!userCoords) return 0;
    return distanceFromUser(a.lat, a.lon) - distanceFromUser(b.lat, b.lon);
  });
}

unitToggle.addEventListener('click', () => {
  currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
  localStorage.setItem('unit', currentUnit);
  updateUnitToggleText();

  if (currentCityData) {
    fetchWeatherByCoords(currentCityData.lat, currentCityData.lon);
  } else if (currentCity) {
    fetchWeather(currentCity);
  }
});

function updateUnitToggleText() {
  unitToggle.textContent = currentUnit === 'metric' ? '°C' : '°F';
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (!city) {
    showError(t('errorEnterCity'));
    return;
  }

  const cityMatch = parseCityInput(city);
  if (cityMatch) {
    fetchWeatherByCity(cityMatch.name, cityMatch.country);
  } else {
    fetchWeather(city);
  }
  suggestionsContainer.classList.add('hidden');
});

function parseCityInput(input) {
  const parts = input.split(',').map(s => s.trim());
  if (parts.length >= 2) {
    return {
      name: parts[0],
      country: parts[parts.length - 1]
    };
  }
  return null;
}

// Blocks duplicate click/Enter during an in-flight request, and exposes
// the busy state to assistive tech via aria-busy.
function setSearchPending(isPending) {
  searchButtonEl.disabled = isPending;
  searchButtonEl.setAttribute('aria-busy', String(isPending));
}

// requestId is minted at the moment the user acts (see latestWeatherRequestId
// above) so a stale response from an abandoned search gets dropped instead
// of overwriting the UI.
async function fetchWeather(city, requestId = ++latestWeatherRequestId) {
  // A plain query naming a well-known city (e.g. "Dubai") resolves directly
  // against its known country, skipping the ambiguous multi-result path.
  if (!parseCityInput(city)) {
    const popularMatch = findPopularCity(city);
    if (popularMatch) {
      await fetchWeatherByCity(popularMatch.name, popularMatch.country, requestId);
      return;
    }
  }

  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');
  setSearchPending(true);

  try {
    const geoUrl = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (requestId !== latestWeatherRequestId) return;

    if (!geoResponse.ok) {
      // Distinguish an invalid/missing API key (401) from a genuine
      // not-found, since the generic message is misleading otherwise.
      failWithError(geoResponse.status === 401 ? t('errorInvalidApiKey') : t('errorGeocodeFailed'));
      return;
    }

    const cities = await geoResponse.json();
    if (requestId !== latestWeatherRequestId) return;

    if (cities.length === 0) {
      failWithError(t('errorCityNotFound', city));
      return;
    }

    if (cities.length === 1) {
      const cityData = cities[0];
      setCurrentCity(cityData);
      recordCitySearch(cityData);
      await fetchWeatherByCoords(cityData.lat, cityData.lon, requestId);
    } else {
      loading.classList.add('hidden');
      setSearchPending(false);
      showCitySelection(sortCityResults(cities, city));
    }
  } catch {
    if (requestId !== latestWeatherRequestId) return;
    failWithError(t('errorGeocodeGeneric'));
  }
}

async function fetchWeatherByCoords(lat, lon, requestId = ++latestWeatherRequestId) {
  hideError();
  weatherCard.classList.add('hidden');
  forecastSection.classList.add('hidden');
  loading.classList.remove('hidden');
  setSearchPending(true);

  // Not awaited: weather and forecast only need lat/lon, so firing both in
  // parallel removes a full round-trip from the critical path. Forecast
  // manages its own loading state independently of this function's.
  fetchForecast(lat, lon, requestId);

  try {
    const url = `${API_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (requestId !== latestWeatherRequestId) return;

    if (!response.ok) {
      failWithError(response.status === 401 ? t('errorInvalidApiKey') : t('errorWeatherGeneric'));
      return;
    }

    const data = await response.json();
    if (requestId !== latestWeatherRequestId) return;
    renderWeather(data);
    loading.classList.add('hidden');
    setSearchPending(false);
  } catch {
    if (requestId !== latestWeatherRequestId) return;
    failWithError(t('errorWeatherGeneric'));
  }
}

// Fails silently (just hides its own loading state) since the forecast is
// supplementary — a failure here shouldn't disrupt the current-weather view.
async function fetchForecast(lat, lon, requestId) {
  forecastSection.classList.add('hidden');
  forecastLoading.classList.remove('hidden');

  try {
    const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const response = await fetch(url);
    if (requestId !== latestWeatherRequestId) return;
    if (!response.ok) {
      forecastLoading.classList.add('hidden');
      return;
    }

    const data = await response.json();
    if (requestId !== latestWeatherRequestId) return;
    renderForecast(data);
  } catch {
    forecastLoading.classList.add('hidden');
  }
}

const FORECAST_DAY_LOCALES = { en: 'en-US', es: 'es-ES', zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA' };

function getForecastIcon(entry) {
  const isNight = entry.weather[0].icon.endsWith('n');
  switch (entry.weather[0].main) {
    case 'Thunderstorm': return '⛈️';
    case 'Drizzle': return '🌦️';
    case 'Rain': return '🌧️';
    case 'Snow': return '🌨️';
    case 'Mist': case 'Smoke': case 'Haze': case 'Fog':
    case 'Dust': case 'Sand': case 'Ash': return '🌫️';
    case 'Squall': case 'Tornado': return '🌪️';
    case 'Clear': return isNight ? '🌙' : '☀️';
    case 'Clouds': return isNight ? '☁️' : '🌤️';
    default: return '🌤️';
  }
}

// Groups 3-hour entries into calendar days using the city's own timezone
// (not the browser's): add the offset to the UTC timestamp, then read UTC
// getters back off it as if they were local fields.
function groupForecastByDay(data) {
  const tzOffset = data.city.timezone;
  // Computed from the real current time, not the forecast list's first
  // entry, so the strip always shows the next 5 days, not today-plus-4.
  const cityNow = new Date(Date.now() + tzOffset * 1000);
  const todayKey = `${cityNow.getUTCFullYear()}-${cityNow.getUTCMonth()}-${cityNow.getUTCDate()}`;
  const days = new Map();

  data.list.forEach(entry => {
    const localDate = new Date((entry.dt + tzOffset) * 1000);
    const key = `${localDate.getUTCFullYear()}-${localDate.getUTCMonth()}-${localDate.getUTCDate()}`;
    if (key === todayKey) return;

    if (!days.has(key)) days.set(key, { date: localDate, entries: [] });
    days.get(key).entries.push({ ...entry, localHour: localDate.getUTCHours() });
  });

  return [...days.values()].slice(0, 5);
}

function renderForecast(data) {
  lastForecastData = data;

  const days = groupForecastByDay(data);
  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
  const locale = FORECAST_DAY_LOCALES[currentLanguage] || 'en-US';

  forecastListEl.innerHTML = days.map(day => {
    const temps = day.entries.map(e => e.main.temp);
    const high = Math.round(Math.max(...temps));
    const low = Math.round(Math.min(...temps));
    // Closest entry to 13:00 local time stands in as the day's icon/condition.
    const midday = day.entries.reduce((closest, entry) =>
      Math.abs(entry.localHour - 13) < Math.abs(closest.localHour - 13) ? entry : closest
    );
    const dayName = day.date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
    const description = translateCondition(midday.weather[0].description);
    const icon = getForecastIcon(midday);

    return `
      <div class="forecast__card">
        <span class="forecast__day">${dayName}</span>
        <span class="forecast__icon" role="img" aria-label="${escapeHtml(description)}">${icon}</span>
        <span class="forecast__condition">${escapeHtml(description)}</span>
        <span class="forecast__temps"><span class="forecast__high">${high}${unitSymbol}</span> / <span class="forecast__low">${low}${unitSymbol}</span></span>
      </div>
    `;
  }).join('');

  forecastLoading.classList.add('hidden');
  forecastSection.classList.remove('hidden');
}

async function fetchWeatherByCity(city, country, requestId = ++latestWeatherRequestId) {
  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');
  setSearchPending(true);

  try {
    const geoUrl = `${GEO_URL}?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (requestId !== latestWeatherRequestId) return;

    // Without this check, a 401/429/5xx (JSON error body, not an array)
    // fell through to `cities[0]` as undefined and threw inside
    // setCurrentCity instead of showing a real error message.
    if (!geoResponse.ok) {
      failWithError(geoResponse.status === 401 ? t('errorInvalidApiKey') : t('errorCityCountryFailed', city, country));
      return;
    }

    const cities = await geoResponse.json();
    if (requestId !== latestWeatherRequestId) return;

    if (cities.length === 0) {
      failWithError(t('errorCityCountryNotFound', city, country));
      return;
    }

    const cityData = cities[0];
    setCurrentCity(cityData);
    recordCitySearch(cityData);
    await fetchWeatherByCoords(cityData.lat, cityData.lon, requestId);
  } catch {
    if (requestId !== latestWeatherRequestId) return;
    failWithError(t('errorCityCountryFailed', city, country));
  }
}

function showCitySelection(cities) {
  const message = t('multipleCitiesFound');

  const errorDiv = errorMessage;
  errorDiv.classList.remove('hidden');
  errorDiv.innerHTML = `
    <div class="city-select__message">${message}</div>
    <div class="city-select__list">
      ${cities.map((city) => `
        <button type="button" class="city-select-btn">
          ${escapeHtml(city.name)}${city.state ? `, ${escapeHtml(city.state)}` : ''} (${escapeHtml(city.country)})
        </button>
      `).join('')}
    </div>
  `;

  // Closes over the original `cities` objects instead of round-tripping
  // through data-* attributes.
  document.querySelectorAll('.city-select-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const city = cities[i];
      setCurrentCity(city);
      input.value = city.name;
      recordCitySearch(city);
      fetchWeatherByCoords(city.lat, city.lon);
      errorMessage.classList.add('hidden');
    });
  });
}

input.addEventListener('input', debounce(async () => {
  const query = input.value.trim();
  if (query.length < 2) {
    suggestionsContainer.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    return;
  }
  const suggestions = await getCitySuggestions(query);
  renderSuggestions(suggestions);
}, 300));

input.addEventListener('blur', (event) => {
  // Skip closing if focus is moving into the suggestions list itself (e.g.
  // Tab onto a suggestion) — otherwise it'd vanish out from under the item
  // the user just tabbed onto.
  if (event.relatedTarget && suggestionsContainer.contains(event.relatedTarget)) return;
  setTimeout(() => {
    suggestionsContainer.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
  }, 200);
});

// Closes the list once focus leaves it for anything but the input (which
// has its own blur handler above).
suggestionsContainer.addEventListener('focusout', (event) => {
  if (event.relatedTarget === input || suggestionsContainer.contains(event.relatedTarget)) return;
  suggestionsContainer.classList.add('hidden');
  input.setAttribute('aria-expanded', 'false');
});

async function getCitySuggestions(query) {
  try {
    const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=8&appid=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const recentCities = getRecentCities();
    const suggestions = data.map(city => ({
      name: city.name,
      country: city.country,
      state: city.state || '',
      lat: city.lat,
      lon: city.lon,
      isRecent: recentCities.some(r => normalizeForMatch(r.name) === normalizeForMatch(city.name))
    }));
    // Stable re-sort floats recent searches to the top without disturbing
    // sortCityResults' relevance/distance order otherwise.
    return sortCityResults(suggestions, query)
      .sort((a, b) => Number(b.isRecent) - Number(a.isRecent));
  } catch {
    return [];
  }
}

function renderSuggestions(suggestions) {
  if (suggestions.length === 0) {
    suggestionsContainer.classList.add('hidden');
    return;
  }

  suggestionsContainer.innerHTML = suggestions.map(s => {
    const display = s.state
      ? `${escapeHtml(s.name)}, ${escapeHtml(s.state)}, ${escapeHtml(s.country)}`
      : `${escapeHtml(s.name)}, ${escapeHtml(s.country)}`;
    return `
      <div class="suggestions__item" role="option" tabindex="0">
        ${display}${s.isRecent ? '<span style="margin-left: 0.5rem; font-size: 0.75rem; opacity: 0.65;">🕒 Recent</span>' : ''}
      </div>
    `;
  }).join('');

  suggestionsContainer.classList.remove('hidden');
  input.setAttribute('aria-expanded', 'true');

  const chooseSuggestion = (i) => {
    const s = suggestions[i];
    input.value = s.name;
    setCurrentCity(s);
    recordCitySearch(s);
    fetchWeatherByCoords(s.lat, s.lon);
    suggestionsContainer.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
  };

  suggestionsContainer.querySelectorAll('.suggestions__item').forEach((el, i) => {
    el.addEventListener('click', () => chooseSuggestion(i));
    // role="option" divs aren't natively keyboard-operable, so without this
    // Tab+Enter can't pick a suggestion at all.
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        chooseSuggestion(i);
      }
    });
  });
}

// Entries are full city records (not just names), so clicking a chip
// reloads weather directly by coordinates instead of re-geocoding.
function getRecentCities() {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem('recentCities'));
    if (!Array.isArray(raw)) raw = [];
  } catch {
    // Called during DOMContentLoaded — an uncaught error here would
    // silently break app init, so corrupted JSON must not throw.
    raw = [];
  }
  // Migrates old plain-string entries into the richer shape.
  return raw.map(entry => typeof entry === 'string'
    ? { name: entry, country: '', state: '', lat: null, lon: null }
    : entry
  );
}

function saveRecentSearch(cityData) {
  let recent = getRecentCities();
  recent = recent.filter(c => normalizeForMatch(c.name) !== normalizeForMatch(cityData.name));
  recent.unshift({
    name: cityData.name,
    country: cityData.country || '',
    state: cityData.state || '',
    lat: cityData.lat,
    lon: cityData.lon
  });
  recent = recent.slice(0, 5);
  localStorage.setItem('recentCities', JSON.stringify(recent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = getRecentCities();
  if (recent.length === 0) {
    recentList.innerHTML = `<span style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">${t('noRecentSearches')}</span>`;
    return;
  }

  recentList.innerHTML = recent.map(city => `
    <span class="recent-item">${escapeHtml(city.name)}</span>
  `).join('');

  recentList.querySelectorAll('.recent-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      const city = recent[i];
      input.value = city.name;
      if (city.lat != null && city.lon != null) {
        setCurrentCity(city);
        fetchWeatherByCoords(city.lat, city.lon);
      } else {
        // Legacy entry saved before lat/lon were tracked.
        currentCity = city.name;
        fetchWeather(city.name);
      }
    });
  });
}

function renderPopularCities() {
  popularList.innerHTML = POPULAR_CITIES.map(city => `
    <span class="popular-item" data-city="${city.name}" data-country="${city.country}">${city.name}</span>
  `).join('');

  popularList.querySelectorAll('.popular-item').forEach(el => {
    el.addEventListener('click', () => {
      const city = el.dataset.city;
      const country = el.dataset.country;
      input.value = city;
      currentCity = city;
      // fetchWeatherByCity saves history/recent entries itself once resolved.
      fetchWeatherByCity(city, country);
    });
  });
}

// Search History (full log, unlike the capped 5-entry "recent" chips above)
const HISTORY_KEY = 'searchHistory';
const HISTORY_LIMIT = 200;

function getSearchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Treat corrupted JSON as empty history rather than throwing for callers.
    return [];
  }
}

// Capped at HISTORY_LIMIT so localStorage can't grow unbounded.
function saveSearchHistory(cityData) {
  const history = getSearchHistory();
  history.unshift({
    name: cityData.name,
    country: cityData.country,
    state: cityData.state || '',
    lat: cityData.lat,
    lon: cityData.lon,
    timestamp: Date.now()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  if (!historyView.classList.contains('hidden')) renderHistory();
}

function deleteHistoryEntry(timestamp) {
  const history = getSearchHistory().filter(entry => entry.timestamp !== timestamp);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function formatHistoryTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function historyEntryLabel(entry) {
  const parts = [entry.name];
  if (entry.state) parts.push(entry.state);
  parts.push(entry.country);
  return parts.join(', ');
}

function renderHistory() {
  const fullHistory = getSearchHistory();
  const filter = normalizeForMatch(historySearchInput.value);
  const history = filter
    ? fullHistory.filter(entry => normalizeForMatch(historyEntryLabel(entry)).includes(filter))
    : fullHistory;

  if (history.length === 0) {
    historyListEl.innerHTML = `<div class="history__empty">${
      fullHistory.length === 0 ? t('noHistoryYet') : t('noHistoryMatch')
    }</div>`;
    return;
  }

  historyListEl.innerHTML = history.map(entry => `
    <div class="history__entry" data-timestamp="${entry.timestamp}">
      <div class="history__entry-info">
        <span class="history__entry-city">${escapeHtml(historyEntryLabel(entry))}</span>
        <span class="history__entry-time">${formatHistoryTimestamp(entry.timestamp)}</span>
      </div>
      <button class="history__entry-delete" title="${t('deleteEntryTitle')}" aria-label="${t('deleteEntryTitle')}">❌</button>
    </div>
  `).join('');

  historyListEl.querySelectorAll('.history__entry').forEach(el => {
    el.addEventListener('click', (event) => {
      if (event.target.closest('.history__entry-delete')) return;

      const timestamp = Number(el.dataset.timestamp);
      const entry = getSearchHistory().find(h => h.timestamp === timestamp);
      if (!entry) return;

      input.value = historyEntryLabel(entry);
      setCurrentCity(entry);
      switchView('weather');
      fetchWeatherByCoords(entry.lat, entry.lon);
    });

    el.querySelector('.history__entry-delete').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteHistoryEntry(Number(el.dataset.timestamp));
    });
  });
}

// Debounced: each keystroke would otherwise re-parse up to 200 history
// entries from localStorage and rebuild the whole list.
historySearchInput.addEventListener('input', debounce(() => renderHistory(), 150));

clearHistoryBtn.addEventListener('click', () => {
  if (getSearchHistory().length === 0) return;
  if (!window.confirm(t('clearHistoryConfirm'))) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// Uses the API's own timezone offset, independent of the browser's local time.
function isDaytimeAt(data) {
  const localHour = new Date((data.dt + data.timezone) * 1000).getUTCHours();
  return localHour >= 6 && localHour < 20;
}

// Place names are always shown as the API returns them and never
// translated — only UI labels and condition text are localized.
function formatCityFullName(data) {
  const parts = [data.name];
  if (currentCityState) parts.push(currentCityState);
  parts.push(data.sys.country);
  return parts.join(', ');
}

// Same local-time trick as isDaytimeAt, formatted in the current UI language.
function formatCityDateTime(data) {
  const localDate = new Date((data.dt + data.timezone) * 1000);
  const locale = FORECAST_DAY_LOCALES[currentLanguage] || 'en-US';
  const datePart = localDate.toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  });
  const timePart = localDate.toLocaleTimeString(locale, {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC'
  });
  return `🕒 ${datePart} | ${timePart}`;
}

function renderWeather(data) {
  lastWeatherData = data;
  const dayNightIcon = isDaytimeAt(data) ? '☀️' : '🌙';
  cityName.textContent = `${dayNightIcon} ${formatCityFullName(data)}`;
  cityDatetime.textContent = formatCityDateTime(data);
  condition.textContent = translateCondition(data.weather[0].description);

  const temp = Math.round(data.main.temp);
  const feelsLikeTemp = Math.round(data.main.feels_like);
  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

  temperature.textContent = `${temp}${unitSymbol}`;
  humidity.textContent = `${data.main.humidity}%`;
  feelsLike.textContent = `${feelsLikeTemp}${unitSymbol}`;

  const iconCode = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  weatherIcon.alt = translateCondition(data.weather[0].description);

  weatherCard.classList.remove('hidden');

  currentCityData = {
    lat: data.coord.lat,
    lon: data.coord.lon
  };

  applyWeatherTheme(resolveWeatherTheme(data));
}

const ATMOSPHERE_CONDITIONS = ['Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado'];

// Precipitation/atmosphere conditions always win; a calm sky falls back to
// night/hot/cold/clear/clouds by time of day and temperature (in Celsius,
// regardless of the display unit).
function resolveWeatherTheme(data) {
  const main = data.weather[0].main;
  const isNight = data.weather[0].icon.endsWith('n');
  const tempC = currentUnit === 'metric' ? data.main.temp : (data.main.temp - 32) * 5 / 9;

  if (main === 'Thunderstorm') return 'thunderstorm';
  if (main === 'Snow') return 'snow';
  if (main === 'Rain' || main === 'Drizzle') return 'rain';
  if (ATMOSPHERE_CONDITIONS.includes(main)) return 'fog';

  if (isNight) return 'night';
  if (tempC >= 30) return 'hot';
  if (tempC <= 5) return 'cold';
  return main === 'Clear' ? 'clear' : 'clouds';
}

// Crossfades by fading in the hidden layer and fading out the visible one.
function applyWeatherTheme(themeKey) {
  const incoming = activeBgLayer === 'a' ? bgLayerB : bgLayerA;
  const outgoing = activeBgLayer === 'a' ? bgLayerA : bgLayerB;

  incoming.className = `bg-layer theme-${themeKey}`;

  requestAnimationFrame(() => {
    incoming.classList.add('bg-layer--visible');
    outgoing.classList.remove('bg-layer--visible');
  });

  activeBgLayer = activeBgLayer === 'a' ? 'b' : 'a';
  renderWeatherEffects(themeKey);
}

function clearWeatherEffects() {
  weatherEffects.innerHTML = '';
}

// Subtle floating particles for a few themes; other themes stay clean.
function renderWeatherEffects(themeKey) {
  clearWeatherEffects();
  // Built off-DOM and attached with one appendChild instead of one
  // insertion per particle (up to 70 for the night theme).
  const fragment = document.createDocumentFragment();

  if (themeKey === 'snow') {
    for (let i = 0; i < 40; i++) {
      const flake = document.createElement('span');
      flake.className = 'snowflake';
      flake.textContent = '❄';
      flake.style.left = `${Math.random() * 100}%`;
      flake.style.fontSize = `${0.5 + Math.random() * 1}rem`;
      flake.style.opacity = `${0.4 + Math.random() * 0.6}`;
      flake.style.animationDuration = `${8 + Math.random() * 6}s`;
      flake.style.animationDelay = `${Math.random() * 8}s`;
      fragment.appendChild(flake);
    }
  } else if (themeKey === 'rain' || themeKey === 'thunderstorm') {
    for (let i = 0; i < 50; i++) {
      const drop = document.createElement('span');
      drop.className = 'raindrop';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDuration = `${0.6 + Math.random() * 0.5}s`;
      drop.style.animationDelay = `${-Math.random() * 2}s`;
      fragment.appendChild(drop);
    }
  } else if (themeKey === 'clear') {
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('span');
      ray.className = 'sun-ray';
      ray.style.transform = `rotate(${i * (360 / 8)}deg)`;
      ray.style.animationDelay = `${i * 0.2}s`;
      fragment.appendChild(ray);
    }
  } else if (themeKey === 'hot') {
    for (let i = 0; i < 16; i++) {
      const ember = document.createElement('span');
      ember.className = 'ember';
      const size = 3 + Math.random() * 4;
      ember.style.left = `${Math.random() * 100}%`;
      ember.style.width = `${size}px`;
      ember.style.height = `${size}px`;
      ember.style.setProperty('--drift', `${(Math.random() * 40 - 20).toFixed(0)}px`);
      ember.style.animationDuration = `${5 + Math.random() * 4}s`;
      ember.style.animationDelay = `${Math.random() * 6}s`;
      fragment.appendChild(ember);
    }
  } else if (themeKey === 'night') {
    for (let i = 0; i < 70; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      const size = Math.random() < 0.85 ? 1 + Math.random() : 2 + Math.random();
      star.style.top = `${Math.random() * 100}%`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty('--twinkle-min', `${0.15 + Math.random() * 0.25}`);
      star.style.animationDuration = `${2 + Math.random() * 3}s`;
      star.style.animationDelay = `${-Math.random() * 5}s`;
      fragment.appendChild(star);
    }
  } else if (themeKey === 'clouds') {
    for (let i = 0; i < 5; i++) {
      const cloud = document.createElement('span');
      cloud.className = 'drift-cloud';
      const scale = 0.6 + Math.random() * 0.7;
      cloud.style.top = `${5 + Math.random() * 40}%`;
      cloud.style.setProperty('--cloud-scale', scale);
      cloud.style.opacity = `${0.15 + Math.random() * 0.2}`;
      cloud.style.animationDuration = `${45 + Math.random() * 30}s`;
      cloud.style.animationDelay = `${-Math.random() * 60}s`;
      fragment.appendChild(cloud);
    }
  }

  weatherEffects.appendChild(fragment);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  weatherCard.classList.add('hidden');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

// Combines showError + loading teardown since every fetch failure needs both.
function failWithError(message) {
  showError(message);
  loading.classList.add('hidden');
  setSearchPending(false);
}

// Normalizes to the bare {lat, lon} shape — see currentCityState above.
function setCurrentCity(cityData) {
  currentCityData = { lat: cityData.lat, lon: cityData.lon };
  currentCityState = cityData.state || '';
}

function recordCitySearch(cityData) {
  saveSearchHistory(cityData);
  saveRecentSearch(cityData);
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}