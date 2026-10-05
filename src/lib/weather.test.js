import { describe, expect, it } from 'vitest';
import {
  conditionKind,
  formatCityClock,
  formatCityDateTime,
  isBedtimeAt,
  isDaytimeAt,
  resolveTheme,
  suggestionKey,
} from './weather';

// 2026-06-15 12:00:00 UTC
const NOON_UTC = Date.UTC(2026, 5, 15, 12, 0, 0) / 1000;

function payload({ main = 'Clear', icon = '01d', temp = 22, dt = NOON_UTC, timezone = 0, sys = {} } = {}) {
  return { dt, timezone, main: { temp }, weather: [{ main, icon, description: main.toLowerCase() }], sys };
}

describe('isDaytimeAt', () => {
  it('uses the API sunrise and sunset when provided', () => {
    const sys = { sunrise: NOON_UTC - 3600, sunset: NOON_UTC + 3600 };
    expect(isDaytimeAt(payload({ sys }))).toBe(true);
    expect(isDaytimeAt(payload({ sys, dt: NOON_UTC + 7200 }))).toBe(false);
  });

  it('falls back to 06:00-20:00 in the city timezone without sun times', () => {
    // 12:00 UTC at +10h is 22:00 locally, which is night.
    expect(isDaytimeAt(payload({ timezone: 10 * 3600 }))).toBe(false);
    expect(isDaytimeAt(payload({ timezone: 0 }))).toBe(true);
  });
});

describe('isBedtimeAt', () => {
  it('is true late at night and in the small hours, local to the city', () => {
    expect(isBedtimeAt(payload({ timezone: 11 * 3600 }))).toBe(true); // 23:00
    expect(isBedtimeAt(payload({ timezone: -8 * 3600 }))).toBe(true); // 04:00
    expect(isBedtimeAt(payload({ timezone: 0 }))).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('lets precipitation and atmosphere beat a calm-sky theme', () => {
    expect(resolveTheme(payload({ main: 'Thunderstorm', icon: '11n' }))).toBe('thunderstorm');
    expect(resolveTheme(payload({ main: 'Drizzle', icon: '09n' }))).toBe('rain');
    expect(resolveTheme(payload({ main: 'Haze' }))).toBe('fog');
  });

  it('falls back to night, hot, cold, clear, clouds in that order', () => {
    expect(resolveTheme(payload({ icon: '01n' }))).toBe('night');
    expect(resolveTheme(payload({ temp: 31 }))).toBe('hot');
    expect(resolveTheme(payload({ temp: 5 }))).toBe('cold');
    expect(resolveTheme(payload({ temp: 18 }))).toBe('clear');
    expect(resolveTheme(payload({ main: 'Clouds', icon: '03d', temp: 18 }))).toBe('clouds');
  });
});

describe('suggestionKey', () => {
  it('ranks a storm above freezing temperatures', () => {
    expect(suggestionKey(payload({ main: 'Thunderstorm', temp: -3 }))).toBe('sugStorm');
  });

  it('prefers freezing over rain', () => {
    expect(suggestionKey(payload({ main: 'Rain', temp: 2 }))).toBe('sugFreezing');
  });

  it('distinguishes a scorching day from a warm night', () => {
    const sys = { sunrise: NOON_UTC - 3600, sunset: NOON_UTC + 3600 };
    expect(suggestionKey(payload({ temp: 33, sys }))).toBe('sugScorching');
    expect(suggestionKey(payload({ temp: 33, sys, dt: NOON_UTC + 7200 }))).toBe('sugWarmNight');
  });

  it('suggests sleep at bedtime before anything gentler', () => {
    expect(suggestionKey(payload({ temp: 22, timezone: 11 * 3600 }))).toBe('sugBedtime');
  });

  it('grades mild weather by temperature', () => {
    expect(suggestionKey(payload({ temp: 24 }))).toBe('sugBeautifulDay');
    expect(suggestionKey(payload({ temp: 14 }))).toBe('sugCool');
    expect(suggestionKey(payload({ temp: 7 }))).toBe('sugChilly');
  });
});

describe('conditionKind', () => {
  it('splits clear and cloudy by day or night from the icon code', () => {
    expect(conditionKind(payload({ main: 'Clear', icon: '01d' }))).toBe('clear-day');
    expect(conditionKind(payload({ main: 'Clear', icon: '01n' }))).toBe('clear-night');
    expect(conditionKind(payload({ main: 'Clouds', icon: '04n' }))).toBe('clouds-night');
  });

  it('gives drizzle and rain different kinds, and groups atmosphere conditions', () => {
    expect(conditionKind(payload({ main: 'Drizzle' }))).toBe('drizzle');
    expect(conditionKind(payload({ main: 'Rain' }))).toBe('rain');
    expect(conditionKind(payload({ main: 'Smoke' }))).toBe('fog');
    expect(conditionKind(payload({ main: 'Tornado' }))).toBe('wind');
  });

  it('falls back to a cloud for unknown conditions', () => {
    expect(conditionKind(payload({ main: 'Mystery' }))).toBe('clouds-day');
  });
});

describe('city local time formatting', () => {
  it('formats in the city timezone, not the machine timezone', () => {
    const data = payload({ timezone: 9 * 3600 }); // 21:00 in Tokyo
    const { time, date } = formatCityDateTime(data, 'en-US');
    expect(time).toBe('9:00 PM');
    expect(date).toContain('Monday');
  });

  it('formats sunrise/sunset clock times in the city timezone', () => {
    expect(formatCityClock(NOON_UTC, 3600, 'en-US')).toBe('1:00 PM');
  });
});
