# Weather Dashboard

A simple weather dashboard that lets you search for a city and see its current temperature, weather condition, and humidity. Built with plain HTML, CSS, and JavaScript, using the OpenWeatherMap API.

## Features

- Search bar to look up weather by city name
- Displays temperature, weather condition, humidity, and "feels like" temperature
- Modern UI with a gradient background and glassmorphism card
- Error handling for invalid city names and API issues

## Setup

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api).
2. Copy `config.example.js` to `config.js`:
   ```
   cp config.example.js config.js
   ```
3. Open `config.js` and set your key:
   ```js
   const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
   ```
   `config.js` is gitignored, so your key stays local and is never committed.
4. Open `index.html` in your browser (or serve the folder with a local dev server).

## Usage

Type a city name into the search bar and press **Search** (or hit Enter). The dashboard will display the current weather for that city, or show an error message if the city can't be found.

## Files

- `index.html` – page structure and markup
- `style.css` – styling, layout, and gradient theme
- `script.js` – search handling, API calls, and error handling
- `config.example.js` – template for your API key config (copy to `config.js`)
- `config.js` – your actual API key (gitignored, not committed)
- `README.md` – this file
