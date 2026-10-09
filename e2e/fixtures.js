// Fake OpenWeatherMap payloads, shaped like the real responses but trimmed to the fields the app
// reads. Times are built around "now" so today/tomorrow and day/night logic behave as in real use.
// The city sits at UTC+0 so local clock times in assertions are easy to reason about.

const HOUR = 3600;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export const REYKJAVIK = { name: 'Reykjavik', lat: 64.1466, lon: -21.9426, country: 'IS' };

export function geocodeHits(city = REYKJAVIK) {
  return [{ ...city, local_names: { en: city.name } }];
}

export function currentWeather({ temp = 10 } = {}) {
  const now = nowSeconds();
  return {
    coord: { lat: REYKJAVIK.lat, lon: REYKJAVIK.lon },
    weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
    main: { temp, feels_like: temp - 3, temp_min: temp - 2, temp_max: temp + 3, pressure: 1008, humidity: 81 },
    visibility: 10000,
    wind: { speed: 6.2, deg: 220 },
    clouds: { all: 75 },
    dt: now,
    // Daytime whatever the test clock says: sunrise four hours ago, sunset in six.
    sys: { country: 'IS', sunrise: now - 4 * HOUR, sunset: now + 6 * HOUR },
    timezone: 0,
    name: 'Reykjavik',
  };
}

/** 40 three-hour slots (five days), with a dry, mild window and wetter spells around it. */
export function forecast() {
  const start = Math.ceil(nowSeconds() / (3 * HOUR)) * 3 * HOUR;
  const list = Array.from({ length: 40 }, (_, i) => {
    const dt = start + i * 3 * HOUR;
    const hour = new Date(dt * 1000).getUTCHours();
    const temp = 8 + 6 * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    const pop = [0.7, 0.55, 0.1, 0.05, 0.3, 0.8, 0.6, 0.4][i % 8];
    const wet = pop >= 0.5;
    return {
      dt,
      main: { temp, feels_like: temp - 2, temp_min: temp - 1, temp_max: temp + 1, pressure: 1010, humidity: 70 },
      weather: [
        wet
          ? { id: 500, main: 'Rain', description: 'light rain', icon: '10d' }
          : { id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' },
      ],
      clouds: { all: wet ? 90 : 40 },
      wind: { speed: 4 + (i % 3), deg: 200 },
      pop,
    };
  });
  return { list, city: { name: 'Reykjavik', country: 'IS', timezone: 0, sunrise: 0, sunset: 0 } };
}

// A 1x1 transparent PNG stands in for every map tile.
export const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
