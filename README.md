# Weather Dashboard

A weather dashboard that lets you search any city and see its current conditions, a 5-day forecast, and an interactive world map of live weather — all with animated, time-of-day-aware backgrounds. Built with plain HTML, CSS, and JavaScript, using the OpenWeatherMap API and Leaflet/OpenStreetMap for the map.

## Features

- Search bar to look up weather by city name, with autocomplete suggestions that highlight and prioritize cities you've searched before
- Current weather card: temperature, condition, humidity, "feels like" temperature, local date/time, and a day/night indicator for the searched city
- °C/°F unit toggle
- 5-day forecast row below the current weather, showing each day's name, a condition emoji (rain gets its own 🌧️ icon rather than a generic cloud), description, and high/low temperature in your selected unit
- Location-aware search: with your permission, sorts city matches and autocomplete suggestions by distance from you, closest first (falls back to the default order if location access is denied or unavailable)
- Recent Searches chips: your last 7 searched cities, one click to reload, each individually removable with an ×
- Popular Cities chips: 10 major world cities, one click to load their weather
- **Explore Weather map**: an interactive Leaflet/OpenStreetMap world map with a pin for every one of the 115 curated popular cities plus every city in your full search history (not just the 7 recent chips) — pins are color-coded by temperature (red/orange/yellow/blue/purple) and show a weather emoji; click any pin to load that city's weather. Searching a city flies the map to it with a highlight pulse. Marker weather is cached for 10 minutes and fetched in throttled batches to stay within the free API's rate limit
- Dedicated History tab: a full, timestamped log of every search, with filtering, per-entry delete, and "Clear All" (with confirmation) — clearing history also removes its map pins, but the 115 popular-city pins always stay
- Animated, weather-and-time-aware background: gradient + particle effects that match the actual condition (rain, snow, thunderstorm, fog, heat shimmer, drifting clouds) for the searched city. A sun or moon rises in the upper right based on that city's real local time, regardless of weather condition; clouds drift translucently in front of the sun
- Multi-language UI: English, Spanish, Chinese (Simplified), Hindi, and Arabic, with weather condition text translated too; your choice is remembered. The layout stays left-to-right in every language (including Arabic) — only the text translates, so switching languages never flips the page
- Modern UI with a gradient background and glassmorphism cards throughout
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
4. Open `index.html` in your browser (or serve the folder with a local dev server). Leaflet's JS/CSS load from a CDN, so no build step or package install is needed.

## Usage

Type a city name into the search bar and press **Search** (or hit Enter). The dashboard will display the current weather for that city, along with a 5-day forecast underneath (scroll the forecast row horizontally on smaller screens), or show an error message if the city can't be found. Use the unit toggle in the header to switch between °C and °F.

If you allow location access when prompted, ambiguous searches (city selection list and autocomplete suggestions) are sorted by distance from your current location, closest first. Denying or ignoring the prompt has no effect on functionality — results just aren't distance-sorted.

Click a chip under **Recent** or **🌍 Popular Cities** to reload that city's weather instantly; remove a recent chip with its ×. Scroll down to **🌍 Explore Weather** to browse a world map of pins — click any pin for a quick reading and click again (or click through) to load it as your current search; the map flies to and highlights whatever city you search from the main bar.

Switch to the **History** tab to see every past search with its timestamp, filter it by city, delete individual entries, clear it all, or click an entry to reload that city's weather. Use the language dropdown in the header to switch the UI (and weather condition text) between English, Spanish, Chinese, Hindi, and Arabic — your choice is saved for next time.

## Files

- `index.html` – page structure and markup
- `style.css` – styling, layout, gradient theme, and weather/map visual effects
- `script.js` – search handling, API calls, history/recents, the Explore Weather map, and background effects
- `config.example.js` – template for your API key config (copy to `config.js`)
- `config.js` – your actual API key (gitignored, not committed)
- `README.md` – this file
