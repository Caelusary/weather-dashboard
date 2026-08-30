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
- **Explore Weather map**: an interactive Leaflet/OpenStreetMap world map with a pin for each of the 10 Popular Cities plus every city in your full search history (not just the 7 recent chips) — pins are color-coded by temperature (red/orange/yellow/blue/purple) and show a weather emoji; click any pin to load that city's weather. Searching a city flies the map to it with a highlight pulse. Marker weather is cached for 10 minutes and fetched in throttled batches to stay within the free API's rate limit
- Dedicated History tab: a full, timestamped log of every search, with filtering, per-entry delete, and "Clear All" (with confirmation) — clearing history also removes the map pins it added, but the 10 Popular Cities pins always stay
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

## Notable decisions

- **Stale responses can't clobber a newer search.** Each search mints a `requestId`; if a slower, older fetch resolves after a newer one has already started, its result is dropped instead of overwriting the UI ([script.js:61-63](script.js#L61-L63), [script.js:520-522](script.js#L520-L522)).
- **Popular-city name matches are disambiguated by rank, not just distance.** A plain query like "Dubai" is checked against the curated `POPULAR_CITIES` list first so it resolves to the well-known city rather than an obscure same-named town the geocoding API also returns ([script.js:436-444](script.js#L436-L444)).
- **Arabic stays left-to-right on purpose.** The UI translates Arabic text but doesn't mirror the layout — the icons and controls weren't built for RTL, so flipping `dir` would look like a broken layout rather than a localized one ([script.js:303-305](script.js#L303-L305)).
- **The Explore Weather map is throttled, not viewport-filtered.** Every city in your history gets a pin (not just what's currently panned into view — at zoom 2 that'd leave most pins never loaded), so instead the map fetches cached pins immediately and batches everything else in small groups with a pause between batches to stay under OpenWeatherMap's free-tier rate limit ([script.js:1139-1155](script.js#L1139-L1155)). Its Leaflet init and first fetch batch are also deferred behind an `IntersectionObserver` so a page load that never scrolls that far skips the cost entirely ([script.js:350-364](script.js#L350-L364)).
- **Marker weather is cached per unit.** The cache key includes °C/°F so toggling units can't show a stale reading fetched in the other unit ([script.js:1039-1040](script.js#L1039-L1040)).
- **Geocoding results are HTML-escaped before rendering.** City/state/country names come from OpenWeatherMap's geocoding endpoint, which is backed by community-editable place data — it's treated as untrusted before going into `innerHTML` ([script.js:424-426](script.js#L424-L426)).
- **The production API key never touches the repo.** Locally it lives in gitignored `config.js`; in CI, the GitHub Pages deploy workflow generates `config.js` from a repository secret at build time ([.github/workflows/deploy.yml:26-27](.github/workflows/deploy.yml#L26-L27)).

## Known limitations

- The API key still ends up in the deployed static files — there's no backend to keep it server-side, so anyone can read it via view-source on the live site. Acceptable for a free-tier hobby key, not for anything higher-stakes.
- No automated tests.
- All state — recent searches, full history, unit/language prefs, map weather cache — lives in `localStorage`. Nothing syncs across browsers or devices, and clearing site data wipes it.
- Map tiles are fetched straight from OpenStreetMap's public tile server with no fallback if it's slow or unreachable.
- A search history large enough to add many uncached map pins means the first Explore Weather load after that still takes several batched round-trips (see Notable Decisions) before every pin resolves.

## Files

- `index.html` – page structure and markup
- `style.css` – styling, layout, gradient theme, and weather/map visual effects
- `script.js` – search handling, API calls, history/recents, the Explore Weather map, and background effects
- `config.example.js` – template for your API key config (copy to `config.js`)
- `config.js` – your actual API key (gitignored, not committed)
- `README.md` – this file
