# Cloudbase

A weather app: current conditions, a five day forecast, a world map of live conditions and a search history, in five languages. Built with React 19, Vite, Tailwind CSS 4, TanStack Query and Leaflet. There is no backend: the browser calls the OpenWeatherMap API directly, so the whole app is static files.

## Running locally

You need Node 20.19 or newer (`.nvmrc` pins 22) and a free [OpenWeatherMap API key](https://openweathermap.org/api).

```bash
npm install
```

```bash
cp .env.example .env.local
```

Set `VITE_OPENWEATHER_API_KEY` in `.env.local` (it is gitignored), then:

```bash
npm run dev
```

| Script            | What it does                                               |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Vite dev server with hot reload                            |
| `npm run build`   | Production build into `dist/`                              |
| `npm run preview` | Serves the production build locally                        |
| `npm test`        | Runs the Vitest suite once (`npm run test:watch` to watch) |
| `npm run lint`    | ESLint over the whole project                              |
| `npm run format`  | Prettier over the whole project                            |

## What is in it

The active view lives in the URL hash, so each one is linkable and works on a static host.

| View    | Hash        | Contents                                                                                                                                                                                                                                                                      |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weather | `#/`        | The current reading set directly on the animated sky, advice, a five day forecast (today plus four days, each with a labelled high and low) and a details panel. The forecast and every individual detail have an (i) button that explains, in plain language, what the number means, what today's value implies and a practical tip. Focusing the search box offers recent and popular cities |
| Explore | `#/explore` | Leaflet map with a temperature-coloured pin for every popular city and every city in your history                                                                                                                                                                             |
| History | `#/history` | Timestamped log of searches with filtering, per-entry delete and a confirmed clear-all                                                                                                                                                                                        |

The °C/°F toggle, the language (English, Spanish, Chinese, Hindi, Arabic) and the last city you looked at are remembered in `localStorage`. The background is a weather and time-of-day scene (rain, snow, fog, heat, stars, a sun or moon) driven by the city's real local time.

Pure logic lives in [src/lib](src/lib) and is covered by tests. Each feature owns its components and hooks under [src/features](src/features); shared state (settings, search history) sits in [src/providers](src/providers).

## Notable decisions

- **The API is always queried in metric and converted for display.** Switching °C/°F, mph/km/h or miles/km never refetches and never shows a stale value, and one cached response serves both units ([src/lib/api.js:30](src/lib/api.js#L30), [src/lib/units.js](src/lib/units.js)).
- **The card shows the city you picked, not the station the API names.** OpenWeatherMap resolves coordinates to the nearest weather station, so Tokyo's coordinates come back labelled "Horinouchi" ([src/features/weather/Hero.jsx:26](src/features/weather/Hero.jsx#L26)).
- **A newer search always wins.** Each search aborts the previous one, so a slow stale response can never replace a newer result ([src/features/search/useCitySearch.js:36](src/features/search/useCitySearch.js#L36)).
- **Day or night comes from the API's sunrise and sunset**, with a fixed 06:00 to 20:00 window as the fallback, and every clock time is read in the city's own timezone rather than the browser's ([src/lib/weather.js:12](src/lib/weather.js#L12)).
- **The map is throttled, cached and loaded on demand.** Leaflet is a separate chunk fetched only when you open Explore ([src/features/explore/ExploreView.jsx:8](src/features/explore/ExploreView.jsx#L8)). Pins load in batches of four with a pause between batches, and results are cached for ten minutes, to stay under the free tier's 60 calls per minute ([src/features/map/mapWeather.js:14](src/features/map/mapWeather.js#L14)).
- **Location is requested on first use of the search box, not on page load**, so the permission prompt appears when the reason for it is obvious. Without it, results simply are not sorted by distance ([src/hooks/useUserCoords.js](src/hooks/useUserCoords.js)).
- **Arabic stays left-to-right.** The UI translates text but does not mirror the layout, so switching language never flips the page ([src/providers/SettingsProvider.jsx:29](src/providers/SettingsProvider.jsx#L29)).
- **OpenStreetMap tiles are darkened with a CSS filter.** The dark CARTO tile sets now require an API key, so the map uses the plain OpenStreetMap tiles inverted in the browser ([src/features/map/map.css:19](src/features/map/map.css#L19)).
- **Stored data is treated as untrusted.** Search history, recent chips and the last city are rebuilt field by field when read back (known keys only, strict types, capped length, range-checked coordinates), so a corrupted or hand-edited `localStorage` cannot crash a render ([src/lib/storage.js](src/lib/storage.js)). Production builds also carry a Content-Security-Policy that allows only this origin, the OpenWeatherMap API and OpenStreetMap tiles ([vite.config.js:20](vite.config.js#L20)).
- **Phones get their own layout.** A bottom tab bar, a compact language picker and stacked weather details replace the desktop header and two-column grid.

## Deployment

Pushing to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml): install, lint, test, build, then publish `dist/` to GitHub Pages. The repository secret `OPENWEATHER_API_KEY` is passed to the build as `VITE_OPENWEATHER_API_KEY`. Pull requests run [.github/workflows/ci.yml](.github/workflows/ci.yml), which does the same checks without deploying.

## Tests

`npm test` runs 182 tests across 13 files. They cover the pure logic (city ranking, day grouping for the forecast, unit conversion, storage migration and caps, the suggestion and theme rules), the search hook including aborted requests, the map's cache and batching, the background particle generators, and the main user journeys with the network stubbed.

## Known limitations

- The API key is compiled into the public JavaScript. A static site has nowhere to hide it, so use a key you can revoke, restricted to the site's domain if your plan allows it.
- Search history, recent chips, settings and the map cache live in `localStorage`. Nothing syncs between browsers or devices, and clearing site data erases it.
- Map tiles come straight from OpenStreetMap's public tile server and Leaflet's popups depend on it. There is no fallback if it is slow or down, and heavy use would need a tile provider with a key.
- Weather advice text is a fixed set of rules (storm, snow, freezing, rain, low visibility, heat, bedtime, clear night, then temperature bands), not a forecast-aware recommendation.
- Condition descriptions are translated from a fixed table of the phrases OpenWeatherMap returns in English. An unlisted phrase shows in English.
- The first load of a very large history still takes several batched rounds to fill every map pin, because of the rate-limit batching described above.
