// API_KEY comes from config.js (gitignored) — see config.example.js for setup.
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0/direct';

// DOM Elements
const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const suggestionsContainer = document.getElementById('suggestions');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const loading = document.getElementById('loading');
const unitToggle = document.getElementById('unit-toggle');
const recentList = document.getElementById('recent-list');
const popularList = document.getElementById('popular-list');

const cityName = document.getElementById('city-name');
const condition = document.getElementById('condition');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const feelsLike = document.getElementById('feels-like');
const weatherIcon = document.getElementById('weather-icon');

const bgLayerA = document.getElementById('bg-layer-a');
const bgLayerB = document.getElementById('bg-layer-b');
const weatherEffects = document.getElementById('weather-effects');

// State
let currentUnit = localStorage.getItem('unit') || 'metric';
let currentCity = '';
let currentCityData = null;
let userCoords = null;
let activeBgLayer = 'a';

// Popular cities (pre-populated with specific locations)
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateUnitToggleText();
  renderRecentSearches();
  renderPopularCities();
  requestUserLocation();
});

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

// Sorts cities whose name exactly matches the searched-for city name to the
// top (e.g. "Batangas City" itself ahead of unrelated partial matches), then
// by distance from the user within each group when location is known.
function sortCityResults(cities, query) {
  const queryName = normalizeForMatch(parseCityInput(query)?.name ?? query);

  return [...cities].sort((a, b) => {
    const aExact = normalizeForMatch(a.name) === queryName;
    const bExact = normalizeForMatch(b.name) === queryName;
    if (aExact !== bExact) return aExact ? -1 : 1;

    if (!userCoords) return 0;
    return distanceFromUser(a.lat, a.lon) - distanceFromUser(b.lat, b.lon);
  });
}

// Unit Toggle
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

// Search Form
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = input.value.trim();
  if (!city) {
    showError('Please enter a city name.');
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

// Fetch weather by city name
async function fetchWeather(city) {
  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const geoUrl = `${GEO_URL}?q=${encodeURIComponent(city)}&limit=5&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      showError('Could not find the city. Please check the spelling.');
      loading.classList.add('hidden');
      return;
    }

    const cities = await geoResponse.json();

    if (cities.length === 0) {
      showError(`City "${city}" was not found. Check the spelling and try again.`);
      loading.classList.add('hidden');
      return;
    }

    if (cities.length === 1) {
      const cityData = cities[0];
      currentCityData = cityData;
      await fetchWeatherByCoords(cityData.lat, cityData.lon);
    } else {
      loading.classList.add('hidden');
      showCitySelection(sortCityResults(cities, city));
    }
  } catch {
    showError('Something went wrong while fetching the city data.');
    loading.classList.add('hidden');
  }
}

// Fetch weather by coordinates
async function fetchWeatherByCoords(lat, lon) {
  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const url = `${API_URL}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        showError('Invalid API key. Add your OpenWeatherMap API key in config.js.');
      } else {
        showError('Something went wrong while fetching the weather data.');
      }
      loading.classList.add('hidden');
      return;
    }

    const data = await response.json();
    renderWeather(data);
    loading.classList.add('hidden');
  } catch {
    showError('Something went wrong while fetching the weather data.');
    loading.classList.add('hidden');
  }
}

// Fetch weather by city + country
async function fetchWeatherByCity(city, country) {
  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const geoUrl = `${GEO_URL}?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    const cities = await geoResponse.json();

    if (cities.length === 0) {
      showError(`City "${city}, ${country}" was not found.`);
      loading.classList.add('hidden');
      return;
    }

    const cityData = cities[0];
    currentCityData = cityData;
    await fetchWeatherByCoords(cityData.lat, cityData.lon);
  } catch {
    showError(`Could not find city "${city}, ${country}".`);
    loading.classList.add('hidden');
  }
}

// Show city selection when multiple matches exist
function showCitySelection(cities) {
  const message = 'Multiple cities found. Please select one:';

  const errorDiv = errorMessage;
  errorDiv.classList.remove('hidden');
  errorDiv.innerHTML = `
    <div style="margin-bottom: 0.5rem;">${message}</div>
    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
      ${cities.map((city) => `
        <button 
          class="city-select-btn" 
          data-lat="${city.lat}" 
          data-lon="${city.lon}"
          style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            width: 100%;
          "
          onmouseover="this.style.background='rgba(255,255,255,0.35)'"
          onmouseout="this.style.background='rgba(255,255,255,0.2)'"
        >
          ${city.name}${city.state ? `, ${city.state}` : ''} (${city.country})
        </button>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.city-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      currentCityData = { lat, lon };
      input.value = btn.textContent.split('(')[0].trim();
      fetchWeatherByCoords(lat, lon);
      errorMessage.classList.add('hidden');
    });
  });
}

// City Autocomplete
input.addEventListener('input', debounce(async () => {
  const query = input.value.trim();
  if (query.length < 2) {
    suggestionsContainer.classList.add('hidden');
    return;
  }
  const suggestions = await getCitySuggestions(query);
  renderSuggestions(suggestions);
}, 300));

input.addEventListener('blur', () => {
  setTimeout(() => suggestionsContainer.classList.add('hidden'), 200);
});

async function getCitySuggestions(query) {
  try {
    const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=8&appid=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    const suggestions = data.map(city => ({
      name: city.name,
      country: city.country,
      state: city.state || '',
      lat: city.lat,
      lon: city.lon,
      display: city.state ? `${city.name}, ${city.state}, ${city.country}` : `${city.name}, ${city.country}`
    }));
    return sortCityResults(suggestions, query);
  } catch {
    return [];
  }
}

function renderSuggestions(suggestions) {
  if (suggestions.length === 0) {
    suggestionsContainer.classList.add('hidden');
    return;
  }

  suggestionsContainer.innerHTML = suggestions.map(s => `
    <div class="suggestions__item" data-lat="${s.lat}" data-lon="${s.lon}" data-name="${s.name}">
      ${s.display}
    </div>
  `).join('');

  suggestionsContainer.classList.remove('hidden');

  suggestionsContainer.querySelectorAll('.suggestions__item').forEach(el => {
    el.addEventListener('click', () => {
      const lat = parseFloat(el.dataset.lat);
      const lon = parseFloat(el.dataset.lon);
      const name = el.dataset.name;
      input.value = name;
      currentCityData = { lat, lon };
      fetchWeatherByCoords(lat, lon);
      saveRecentSearch(name);
      suggestionsContainer.classList.add('hidden');
    });
  });
}

// Recent Searches
function saveRecentSearch(city) {
  let recent = JSON.parse(localStorage.getItem('recentCities')) || [];
  recent = recent.filter(c => c.toLowerCase() !== city.toLowerCase());
  recent.unshift(city);
  recent = recent.slice(0, 5);
  localStorage.setItem('recentCities', JSON.stringify(recent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = JSON.parse(localStorage.getItem('recentCities')) || [];
  if (recent.length === 0) {
    recentList.innerHTML = '<span style="color: rgba(255,255,255,0.5); font-size: 0.85rem;">No recent searches</span>';
    return;
  }

  recentList.innerHTML = recent.map(city => `
    <span class="recent-item" data-city="${city}">${city}</span>
  `).join('');

  recentList.querySelectorAll('.recent-item').forEach(el => {
    el.addEventListener('click', () => {
      const city = el.dataset.city;
      input.value = city;
      currentCity = city;
      fetchWeather(city);
    });
  });
}

// Popular Cities
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
      fetchWeatherByCity(city, country);
      saveRecentSearch(city);
    });
  });
}

// Render Weather
function renderWeather(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  condition.textContent = data.weather[0].description;

  const temp = Math.round(data.main.temp);
  const feelsLikeTemp = Math.round(data.main.feels_like);
  const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

  temperature.textContent = `${temp}${unitSymbol}`;
  humidity.textContent = `${data.main.humidity}%`;
  feelsLike.textContent = `${feelsLikeTemp}${unitSymbol}`;

  const iconCode = data.weather[0].icon;
  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  weatherIcon.alt = data.weather[0].description;

  weatherCard.classList.remove('hidden');

  currentCityData = {
    lat: data.coord.lat,
    lon: data.coord.lon
  };

  applyWeatherTheme(resolveWeatherTheme(data));
}

const ATMOSPHERE_CONDITIONS = ['Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado'];

// Maps live weather data to a background theme key. Dramatic precipitation
// or atmosphere conditions always win, since they already have their own
// distinct look; a calm clear/cloudy sky falls back to night/hot/cold/
// clear/clouds based on time of day (from the icon's day/night suffix)
// and temperature (converted to Celsius regardless of the display unit).
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

// Crossfades to the new theme by fading in the hidden background layer
// and fading out the currently visible one.
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
      weatherEffects.appendChild(flake);
    }
  } else if (themeKey === 'rain' || themeKey === 'thunderstorm') {
    for (let i = 0; i < 50; i++) {
      const drop = document.createElement('span');
      drop.className = 'raindrop';
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDuration = `${0.4 + Math.random() * 0.35}s`;
      drop.style.animationDelay = `${Math.random() * 2}s`;
      weatherEffects.appendChild(drop);
    }
  } else if (themeKey === 'clear' || themeKey === 'hot') {
    for (let i = 0; i < 8; i++) {
      const ray = document.createElement('span');
      ray.className = 'sun-ray';
      ray.style.transform = `rotate(${i * (360 / 8)}deg)`;
      ray.style.animationDelay = `${i * 0.2}s`;
      weatherEffects.appendChild(ray);
    }
  }
}

// Error Handling
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  weatherCard.classList.add('hidden');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

// Utility: Debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}