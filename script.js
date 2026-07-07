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
const exploreMapEl = document.getElementById('explore-map');
const exploreMapLoading = document.getElementById('explore-map-loading');

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

const RECENT_CHIP_LIMIT = 7;
const POPULAR_CHIP_LIMIT = 10;

// Coordinates are hardcoded (rather than geocoded on load) so the map's
// pins for this fixed list don't cost an extra API round-trip each visit.
const POPULAR_CITIES = [
  { name: 'London', country: 'GB', lat: 51.5074, lon: -0.1278 },
  { name: 'New York', country: 'US', lat: 40.7128, lon: -74.0060 },
  { name: 'Tokyo', country: 'JP', lat: 35.6762, lon: 139.6503 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Mumbai', country: 'IN', lat: 19.0760, lon: 72.8777 },
  { name: 'Los Angeles', country: 'US', lat: 34.0522, lon: -118.2437 },
  { name: 'Berlin', country: 'DE', lat: 52.5200, lon: 13.4050 },

  // Beyond this point: a much larger set of major world cities, added so
  // the Explore Weather map shows broad global coverage. Only the first
  // POPULAR_CHIP_LIMIT entries above render as "Popular Cities" chips —
  // renderPopularCities() slices the array, but the map (getMapCities())
  // uses the whole thing.
  { name: 'Toronto', country: 'CA', lat: 43.6532, lon: -79.3832 },
  { name: 'Chicago', country: 'US', lat: 41.8781, lon: -87.6298 },
  { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332 },
  { name: 'Vancouver', country: 'CA', lat: 49.2827, lon: -123.1207 },
  { name: 'Miami', country: 'US', lat: 25.7617, lon: -80.1918 },
  { name: 'San Francisco', country: 'US', lat: 37.7749, lon: -122.4194 },
  { name: 'Houston', country: 'US', lat: 29.7604, lon: -95.3698 },
  { name: 'Montreal', country: 'CA', lat: 45.5019, lon: -73.5674 },
  { name: 'Boston', country: 'US', lat: 42.3601, lon: -71.0589 },
  { name: 'Seattle', country: 'US', lat: 47.6062, lon: -122.3321 },

  { name: 'Sao Paulo', country: 'BR', lat: -23.5505, lon: -46.6333 },
  { name: 'Rio de Janeiro', country: 'BR', lat: -22.9068, lon: -43.1729 },
  { name: 'Buenos Aires', country: 'AR', lat: -34.6037, lon: -58.3816 },
  { name: 'Lima', country: 'PE', lat: -12.0464, lon: -77.0428 },
  { name: 'Bogota', country: 'CO', lat: 4.7110, lon: -74.0721 },
  { name: 'Santiago', country: 'CL', lat: -33.4489, lon: -70.6693 },
  { name: 'Caracas', country: 'VE', lat: 10.4806, lon: -66.9036 },
  { name: 'Quito', country: 'EC', lat: -0.1807, lon: -78.4678 },
  { name: 'Montevideo', country: 'UY', lat: -34.9011, lon: -56.1645 },
  { name: 'La Paz', country: 'BO', lat: -16.5000, lon: -68.1500 },

  { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964 },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041 },
  { name: 'Vienna', country: 'AT', lat: 48.2082, lon: 16.3738 },
  { name: 'Barcelona', country: 'ES', lat: 41.3851, lon: 2.1734 },
  { name: 'Moscow', country: 'RU', lat: 55.7558, lon: 37.6173 },
  { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784 },
  { name: 'Athens', country: 'GR', lat: 37.9838, lon: 23.7275 },
  { name: 'Warsaw', country: 'PL', lat: 52.2297, lon: 21.0122 },
  { name: 'Prague', country: 'CZ', lat: 50.0755, lon: 14.4378 },
  { name: 'Lisbon', country: 'PT', lat: 38.7223, lon: -9.1393 },
  { name: 'Dublin', country: 'IE', lat: 53.3498, lon: -6.2603 },
  { name: 'Stockholm', country: 'SE', lat: 59.3293, lon: 18.0686 },
  { name: 'Oslo', country: 'NO', lat: 59.9139, lon: 10.7522 },
  { name: 'Copenhagen', country: 'DK', lat: 55.6761, lon: 12.5683 },
  { name: 'Helsinki', country: 'FI', lat: 60.1699, lon: 24.9384 },
  { name: 'Brussels', country: 'BE', lat: 50.8503, lon: 4.3517 },
  { name: 'Zurich', country: 'CH', lat: 47.3769, lon: 8.5417 },
  { name: 'Budapest', country: 'HU', lat: 47.4979, lon: 19.0402 },
  { name: 'Bucharest', country: 'RO', lat: 44.4268, lon: 26.1025 },
  { name: 'Kyiv', country: 'UA', lat: 50.4501, lon: 30.5234 },
  { name: 'Milan', country: 'IT', lat: 45.4642, lon: 9.1900 },
  { name: 'Munich', country: 'DE', lat: 48.1351, lon: 11.5820 },
  { name: 'Hamburg', country: 'DE', lat: 53.5511, lon: 9.9937 },
  { name: 'Edinburgh', country: 'GB', lat: 55.9533, lon: -3.1883 },
  { name: 'Manchester', country: 'GB', lat: 53.4808, lon: -2.2426 },

  { name: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753 },
  { name: 'Doha', country: 'QA', lat: 25.2854, lon: 51.5310 },
  { name: 'Abu Dhabi', country: 'AE', lat: 24.4539, lon: 54.3773 },
  { name: 'Tel Aviv', country: 'IL', lat: 32.0853, lon: 34.7818 },
  { name: 'Amman', country: 'JO', lat: 31.9454, lon: 35.9284 },
  { name: 'Beirut', country: 'LB', lat: 33.8938, lon: 35.5018 },
  { name: 'Baghdad', country: 'IQ', lat: 33.3152, lon: 44.3661 },
  { name: 'Tehran', country: 'IR', lat: 35.6892, lon: 51.3890 },
  { name: 'Kuwait City', country: 'KW', lat: 29.3759, lon: 47.9774 },
  { name: 'Muscat', country: 'OM', lat: 23.5880, lon: 58.3829 },

  { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
  { name: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792 },
  { name: 'Nairobi', country: 'KE', lat: -1.2921, lon: 36.8219 },
  { name: 'Johannesburg', country: 'ZA', lat: -26.2041, lon: 28.0473 },
  { name: 'Cape Town', country: 'ZA', lat: -33.9249, lon: 18.4241 },
  { name: 'Casablanca', country: 'MA', lat: 33.5731, lon: -7.5898 },
  { name: 'Addis Ababa', country: 'ET', lat: 9.0300, lon: 38.7400 },
  { name: 'Accra', country: 'GH', lat: 5.6037, lon: -0.1870 },
  { name: 'Tunis', country: 'TN', lat: 36.8065, lon: 10.1815 },
  { name: 'Algiers', country: 'DZ', lat: 36.7538, lon: 3.0588 },
  { name: 'Kinshasa', country: 'CD', lat: -4.4419, lon: 15.2663 },
  { name: 'Dakar', country: 'SN', lat: 14.7167, lon: -17.4677 },

  { name: 'Delhi', country: 'IN', lat: 28.7041, lon: 77.1025 },
  { name: 'Bangalore', country: 'IN', lat: 12.9716, lon: 77.5946 },
  { name: 'Kolkata', country: 'IN', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', country: 'IN', lat: 13.0827, lon: 80.2707 },
  { name: 'Karachi', country: 'PK', lat: 24.8607, lon: 67.0011 },
  { name: 'Lahore', country: 'PK', lat: 31.5497, lon: 74.3436 },
  { name: 'Dhaka', country: 'BD', lat: 23.8103, lon: 90.4125 },
  { name: 'Colombo', country: 'LK', lat: 6.9271, lon: 79.8612 },
  { name: 'Kathmandu', country: 'NP', lat: 27.7172, lon: 85.3240 },
  { name: 'Islamabad', country: 'PK', lat: 33.6844, lon: 73.0479 },

  { name: 'Beijing', country: 'CN', lat: 39.9042, lon: 116.4074 },
  { name: 'Shanghai', country: 'CN', lat: 31.2304, lon: 121.4737 },
  { name: 'Hong Kong', country: 'HK', lat: 22.3193, lon: 114.1694 },
  { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.9780 },
  { name: 'Osaka', country: 'JP', lat: 34.6937, lon: 135.5023 },
  { name: 'Taipei', country: 'TW', lat: 25.0330, lon: 121.5654 },
  { name: 'Guangzhou', country: 'CN', lat: 23.1291, lon: 113.2644 },
  { name: 'Shenzhen', country: 'CN', lat: 22.5431, lon: 114.0579 },
  { name: 'Busan', country: 'KR', lat: 35.1796, lon: 129.0756 },
  { name: 'Ulaanbaatar', country: 'MN', lat: 47.8864, lon: 106.9057 },

  { name: 'Bangkok', country: 'TH', lat: 13.7563, lon: 100.5018 },
  { name: 'Jakarta', country: 'ID', lat: -6.2088, lon: 106.8456 },
  { name: 'Manila', country: 'PH', lat: 14.5995, lon: 120.9842 },
  { name: 'Kuala Lumpur', country: 'MY', lat: 3.1390, lon: 101.6869 },
  { name: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lon: 106.6297 },
  { name: 'Hanoi', country: 'VN', lat: 21.0278, lon: 105.8342 },
  { name: 'Phnom Penh', country: 'KH', lat: 11.5564, lon: 104.9282 },
  { name: 'Yangon', country: 'MM', lat: 16.8409, lon: 96.1735 },
  { name: 'Bandar Seri Begawan', country: 'BN', lat: 4.9031, lon: 114.9398 },
  { name: 'Vientiane', country: 'LA', lat: 17.9757, lon: 102.6331 },

  { name: 'Melbourne', country: 'AU', lat: -37.8136, lon: 144.9631 },
  { name: 'Brisbane', country: 'AU', lat: -27.4698, lon: 153.0251 },
  { name: 'Perth', country: 'AU', lat: -31.9505, lon: 115.8605 },
  { name: 'Auckland', country: 'NZ', lat: -36.8485, lon: 174.7633 },
  { name: 'Wellington', country: 'NZ', lat: -41.2865, lon: 174.7762 },
  { name: 'Suva', country: 'FJ', lat: -18.1416, lon: 178.4419 },
  { name: 'Port Moresby', country: 'PG', lat: -9.4438, lon: 147.1803 }
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
  initExploreMap();
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

  loadMapMarkers();
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
  recent = recent.slice(0, RECENT_CHIP_LIMIT);
  localStorage.setItem('recentCities', JSON.stringify(recent));
  renderRecentSearches();
}

// Removes one city from the recent-searches chips without touching the
// full search history log.
function removeRecentSearch(cityName) {
  const recent = getRecentCities().filter(c => normalizeForMatch(c.name) !== normalizeForMatch(cityName));
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
    <span class="recent-item">
      <span class="recent-item__label">${escapeHtml(city.name)}</span>
      <button type="button" class="recent-item__remove" aria-label="Remove ${escapeHtml(city.name)}">×</button>
    </span>
  `).join('');

  recentList.querySelectorAll('.recent-item').forEach((el, i) => {
    el.querySelector('.recent-item__label').addEventListener('click', () => {
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

    el.querySelector('.recent-item__remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeRecentSearch(recent[i].name);
    });
  });
}

function renderPopularCities() {
  popularList.innerHTML = POPULAR_CITIES.slice(0, POPULAR_CHIP_LIMIT).map(city => `
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

// Explore Weather map (Leaflet). Markers cover POPULAR_CITIES plus any
// city with saved lat/lon in recent searches. Marker weather is fetched
// lazily per visible viewport and cached in localStorage for 10 minutes,
// so panning/zooming and repeat visits don't re-hit the API needlessly.
let exploreMap = null;
let mapMarkers = new Map();
let mapHighlightMarker = null;

const MAP_WEATHER_CACHE_KEY = 'mapWeatherCache';
const MAP_CACHE_TTL_MS = 10 * 60 * 1000;

function initExploreMap() {
  if (typeof L === 'undefined' || !exploreMapEl) return;

  exploreMap = L.map(exploreMapEl, { scrollWheelZoom: true }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
  }).addTo(exploreMap);

  loadMapMarkers();
  exploreMap.on('moveend', debounce(() => loadMapMarkers(), 500));
}

// Popular cities + every searched city in the full history log (not the
// capped 7-entry "recent" chips — those are a separate, smaller UI list
// and no longer drive map pins), deduped by name so a popular city that's
// also been searched doesn't get two pins.
function getMapCities() {
  const seen = new Set();
  const cities = [];

  POPULAR_CITIES.forEach(city => {
    const key = normalizeForMatch(city.name);
    if (seen.has(key)) return;
    seen.add(key);
    cities.push(city);
  });

  getSearchHistory().forEach(city => {
    if (city.lat == null || city.lon == null) return;
    const key = normalizeForMatch(city.name);
    if (seen.has(key)) return;
    seen.add(key);
    cities.push(city);
  });

  return cities;
}

function getMapWeatherCache() {
  try {
    const raw = JSON.parse(localStorage.getItem(MAP_WEATHER_CACHE_KEY));
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function readMapWeatherCache(key) {
  const entry = getMapWeatherCache()[key];
  if (!entry || Date.now() - entry.cachedAt > MAP_CACHE_TTL_MS) return null;
  return entry.data;
}

function writeMapWeatherCache(key, data) {
  const cache = getMapWeatherCache();
  cache[key] = { data, cachedAt: Date.now() };
  localStorage.setItem(MAP_WEATHER_CACHE_KEY, JSON.stringify(cache));
}

// Cache key includes the unit so toggling °C/°F doesn't show a stale
// cached reading in the wrong unit.
async function fetchMapMarkerWeather(city) {
  const cacheKey = `${city.lat.toFixed(2)},${city.lon.toFixed(2)}_${currentUnit}`;
  const cached = readMapWeatherCache(cacheKey);
  if (cached) return cached;

  const url = `${API_URL}?lat=${city.lat}&lon=${city.lon}&units=${currentUnit}&appid=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Map marker weather fetch failed');

  const data = await response.json();
  writeMapWeatherCache(cacheKey, data);
  return data;
}

function tempToMarkerColor(tempC) {
  if (tempC >= 30) return '#e63946';
  if (tempC >= 20) return '#f4a261';
  if (tempC >= 10) return '#f4d35e';
  if (tempC >= 0) return '#4a9fd8';
  return '#9b5de5';
}

function buildMarkerIcon(color, emoji) {
  return L.divIcon({
    className: 'map-marker',
    html: `<span class="map-marker__pin" style="background:${color}">${emoji}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30]
  });
}

function buildMarkerPopup(city, data) {
  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
  const temp = Math.round(data.main.temp);
  const emoji = getForecastIcon(data);
  return `
    <div class="map-popup">
      <strong>${escapeHtml(city.name)}</strong>
      <div class="map-popup__reading">${emoji} ${temp}${unitSymbol}</div>
    </div>
  `;
}

function buildMarkerFallbackPopup(city) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(city.name)}</strong>
      <div class="map-popup__reading">⚠️ Weather unavailable</div>
    </div>
  `;
}

function attachMarkerClickHandler(marker, city) {
  marker.on('click', () => {
    input.value = city.name;
    currentCityState = '';
    recordCitySearch({ name: city.name, country: city.country || '', state: '', lat: city.lat, lon: city.lon });
    fetchWeatherByCoords(city.lat, city.lon);
  });
}

function mapWeatherCacheKey(city) {
  return `${city.lat.toFixed(2)},${city.lon.toFixed(2)}_${currentUnit}`;
}

async function renderOneMarker(city) {
  const key = normalizeForMatch(city.name);
  let marker = mapMarkers.get(key);

  try {
    const data = await fetchMapMarkerWeather(city);
    const tempC = currentUnit === 'metric' ? data.main.temp : (data.main.temp - 32) * 5 / 9;
    const icon = buildMarkerIcon(tempToMarkerColor(tempC), getForecastIcon(data));

    if (marker) {
      marker.setIcon(icon);
      marker.setPopupContent(buildMarkerPopup(city, data));
    } else {
      marker = L.marker([city.lat, city.lon], { icon }).addTo(exploreMap);
      marker.bindPopup(buildMarkerPopup(city, data));
      attachMarkerClickHandler(marker, city);
      mapMarkers.set(key, marker);
    }
  } catch {
    const icon = buildMarkerIcon('#7a7a8a', '⚠️');
    if (marker) {
      marker.setIcon(icon);
      marker.setPopupContent(buildMarkerFallbackPopup(city));
    } else {
      marker = L.marker([city.lat, city.lon], { icon }).addTo(exploreMap);
      marker.bindPopup(buildMarkerFallbackPopup(city));
      attachMarkerClickHandler(marker, city);
      mapMarkers.set(key, marker);
    }
  }
}

// The curated city list is large enough (100+) that fetching it all at
// once on first load would blow past OpenWeatherMap's free-tier rate
// limit. Cached markers (already fetched within MAP_CACHE_TTL_MS) render
// immediately in parallel; anything new is throttled in small batches
// with a pause between them so sustained request volume stays well under
// the 60-calls/minute cap, leaving headroom for the user's own searches.
const MAP_FETCH_BATCH_SIZE = 4;
const MAP_FETCH_BATCH_DELAY_MS = 5000;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Deliberately not filtered to the current viewport: with 100+ curated
// cities and a narrow app-width map (not a full-page map), zoom 2 only
// shows a fraction of the world's longitude at a time, so viewport-only
// fetching would leave most pins never loaded until manually panned to.
// Every city gets a pin; the batching above is what protects the rate
// limit instead. Still called on moveend (debounced) so a newly recorded
// recent search — added after a search-triggered flyTo — gets its pin.
async function loadMapMarkers() {
  if (!exploreMap) return;

  const cities = getMapCities();
  if (cities.length === 0) return;

  const cached = cities.filter(city => readMapWeatherCache(mapWeatherCacheKey(city)));
  const uncached = cities.filter(city => !readMapWeatherCache(mapWeatherCacheKey(city)));

  await Promise.all(cached.map(renderOneMarker));

  if (uncached.length === 0) return;
  exploreMapLoading.classList.remove('hidden');

  for (let i = 0; i < uncached.length; i += MAP_FETCH_BATCH_SIZE) {
    const batch = uncached.slice(i, i + MAP_FETCH_BATCH_SIZE);
    await Promise.all(batch.map(renderOneMarker));
    if (i + MAP_FETCH_BATCH_SIZE < uncached.length) await wait(MAP_FETCH_BATCH_DELAY_MS);
  }

  exploreMapLoading.classList.add('hidden');
}

// Called when the history log is cleared: since history is now the only
// source of non-popular pins, wiping it should wipe those pins from the
// live map too — POPULAR_CITIES markers are left alone.
function clearNonPopularMapMarkers() {
  if (!exploreMap) return;

  const popularKeys = new Set(POPULAR_CITIES.map(city => normalizeForMatch(city.name)));
  mapMarkers.forEach((marker, key) => {
    if (popularKeys.has(key)) return;
    exploreMap.removeLayer(marker);
    mapMarkers.delete(key);
  });
}

// Flies to a searched/clicked city and drops a brief pulse ring on it —
// covers both the "search bar" and "map marker click" entry points since
// both funnel through renderWeather().
function panMapToCity(lat, lon) {
  if (!exploreMap) return;

  exploreMap.flyTo([lat, lon], Math.max(exploreMap.getZoom(), 5), { duration: 1.2 });

  if (mapHighlightMarker) exploreMap.removeLayer(mapHighlightMarker);
  const icon = L.divIcon({
    className: 'map-highlight',
    html: '<span class="map-highlight__ring"></span>',
    iconSize: [46, 46],
    iconAnchor: [23, 23]
  });
  mapHighlightMarker = L.marker([lat, lon], { icon, interactive: false, zIndexOffset: 1000 }).addTo(exploreMap);

  setTimeout(() => {
    if (mapHighlightMarker) {
      exploreMap.removeLayer(mapHighlightMarker);
      mapHighlightMarker = null;
    }
  }, 2000);
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
  localStorage.removeItem('recentCities');
  renderHistory();
  renderRecentSearches();
  clearNonPopularMapMarkers();
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

  applyWeatherTheme(resolveWeatherTheme(data), data.weather[0].icon.endsWith('n'));
  panMapToCity(data.coord.lat, data.coord.lon);
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
function applyWeatherTheme(themeKey, isNight) {
  const incoming = activeBgLayer === 'a' ? bgLayerB : bgLayerA;
  const outgoing = activeBgLayer === 'a' ? bgLayerA : bgLayerB;

  incoming.className = `bg-layer theme-${themeKey}`;

  requestAnimationFrame(() => {
    incoming.classList.add('bg-layer--visible');
    outgoing.classList.remove('bg-layer--visible');
  });

  activeBgLayer = activeBgLayer === 'a' ? 'b' : 'a';
  renderWeatherEffects(themeKey, isNight);
}

function clearWeatherEffects() {
  weatherEffects.innerHTML = '';
}

// Builds the sun or moon: a beam/crater ring plus a solid disc on top, all
// anchored to the fixed .celestial spot (see CSS) so both bodies share the
// same "rises in the upper right" position.
function buildCelestialBody(kind) {
  const wrap = document.createElement('div');
  wrap.className = `celestial celestial--${kind}`;

  if (kind === 'sun') {
    // Beams go in first so the disc, appended last, paints over their
    // bases and only their outer tips show past the edge.
    const lengths = [70, 52, 70, 52, 70, 52, 70, 52, 70, 52, 70, 52];
    lengths.forEach((length, i) => {
      const beam = document.createElement('span');
      beam.className = 'sun-beam';
      beam.style.height = `${length}px`;
      beam.style.transform = `rotate(${i * 30}deg)`;
      beam.style.animationDelay = `${i * 0.15}s`;
      wrap.appendChild(beam);
    });

    const core = document.createElement('div');
    core.className = 'sun-core';
    wrap.appendChild(core);
  } else {
    const core = document.createElement('div');
    core.className = 'moon-core';

    [
      { top: '18%', left: '26%', size: 16 },
      { top: '52%', left: '58%', size: 22 },
      { top: '72%', left: '24%', size: 11 },
    ].forEach(({ top, left, size }) => {
      const crater = document.createElement('span');
      crater.className = 'moon-crater';
      crater.style.top = top;
      crater.style.left = left;
      crater.style.width = `${size}px`;
      crater.style.height = `${size}px`;
      core.appendChild(crater);
    });

    wrap.appendChild(core);
  }

  return wrap;
}

// Subtle floating particles for a few themes; other themes stay clean.
function renderWeatherEffects(themeKey, isNight) {
  clearWeatherEffects();
  // Built off-DOM and attached with one appendChild instead of one
  // insertion per particle (up to 70 for the night theme).
  const fragment = document.createDocumentFragment();

  // Every city gets a sun or moon based on its own local time, regardless
  // of weather condition — added first so rain/snow/clouds drift in front
  // of it rather than the other way around.
  fragment.appendChild(buildCelestialBody(isNight ? 'moon' : 'sun'));

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
    // Clouds are appended after the sun/moon added above, so they drift in
    // front of it — combined with the clouds' own translucency, that's
    // what makes a passing cloud look like it's filtering the sunlight.
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