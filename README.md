# Weather Dashboard

A simple weather dashboard that lets you search for a city and see its current temperature, weather condition, and humidity. Built with plain HTML, CSS, and JavaScript, using the OpenWeatherMap API.

## Features

- Search bar to look up weather by city name
- Displays temperature, weather condition, humidity, and "feels like" temperature
- 5-day forecast card row below the current weather, showing each day's name, icon, condition, and high/low temperature in your selected unit
- Location-aware search: with your permission, sorts city matches and autocomplete suggestions by distance from you, closest first (falls back to the default order if location access is denied or unavailable)
- Autocomplete suggestions highlight and prioritize cities you've searched before
- Dedicated History tab: a full, timestamped log of every search, with filtering, per-entry delete, "Clear All" (with confirmation), and click-to-reload
- Multi-language UI: English, Spanish, Chinese (Simplified), Hindi, and Arabic, with weather condition text translated too; your choice is remembered
- Modern UI with a gradient background, glassmorphism card, and weather-based animated backgrounds (rain, snow, embers, drifting clouds, etc.)
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

Type a city name into the search bar and press **Search** (or hit Enter). The dashboard will display the current weather for that city, along with a 5-day forecast underneath (scroll the forecast row horizontally on smaller screens), or show an error message if the city can't be found.

If you allow location access when prompted, ambiguous searches (city selection list and autocomplete suggestions) are sorted by distance from your current location, closest first. Denying or ignoring the prompt has no effect on functionality — results just aren't distance-sorted.

Switch to the **History** tab to see every past search with its timestamp, filter it by city, delete individual entries, clear it all, or click an entry to reload that city's weather. Use the language dropdown in the header to switch the UI (and weather condition text) between English, Spanish, Chinese, Hindi, and Arabic — your choice is saved for next time.

## Files

- `index.html` – page structure and markup
- `style.css` – styling, layout, and gradient theme
- `script.js` – search handling, API calls, and error handling
- `config.example.js` – template for your API key config (copy to `config.js`)
- `config.js` – your actual API key (gitignored, not committed)
- `README.md` – this file
