const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const loading = document.getElementById('loading');

const cityName = document.getElementById('city-name');
const condition = document.getElementById('condition');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const feelsLike = document.getElementById('feels-like');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const city = input.value.trim();

  if (!city) {
    showError('Please enter a city name.');
    return;
  }

  fetchWeather(city);
});

async function fetchWeather(city) {
  hideError();
  weatherCard.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const url = `${API_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`City "${city}" was not found. Check the spelling and try again.`);
      }
      if (response.status === 401) {
        throw new Error('Invalid API key. Add your OpenWeatherMap API key in script.js.');
      }
      throw new Error('Something went wrong while fetching the weather data.');
    }

    const data = await response.json();
    renderWeather(data);
  } catch (error) {
    showError(error.message);
  } finally {
    loading.classList.add('hidden');
  }
}

function renderWeather(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  condition.textContent = data.weather[0].description;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;

  weatherCard.classList.remove('hidden');
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
