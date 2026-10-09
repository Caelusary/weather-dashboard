import { describe, expect, it } from 'vitest';
import {
  bestTimeOut,
  cloudsKey,
  daylight,
  feelsKey,
  humidityKey,
  pressureKey,
  visibilityKey,
  weekHighlights,
  windKey,
} from './insights';

describe('feelsKey', () => {
  it('treats a difference under 2 degrees as about the same', () => {
    expect(feelsKey(20, 21.9)).toBe('feelsSame');
    expect(feelsKey(20, 18.1)).toBe('feelsSame');
  });

  it('says warmer or colder beyond that', () => {
    expect(feelsKey(30, 36)).toBe('feelsWarmer');
    expect(feelsKey(5, 1)).toBe('feelsColder');
  });
});

describe('humidityKey', () => {
  it('splits at 40% and 70%, with both edges counted as comfortable', () => {
    expect(humidityKey(39)).toBe('humDry');
    expect(humidityKey(40)).toBe('humComfortable');
    expect(humidityKey(70)).toBe('humComfortable');
    expect(humidityKey(71)).toBe('humMuggy');
  });
});

describe('windKey', () => {
  it('maps m/s to calm, light, breezy, strong and gale', () => {
    expect(windKey(0)).toBe('windCalm');
    expect(windKey(1.4)).toBe('windLight');
    expect(windKey(8)).toBe('windBreezy');
    expect(windKey(15)).toBe('windStrong');
    expect(windKey(25)).toBe('windGale');
  });
});

describe('cloudsKey / visibilityKey / pressureKey', () => {
  it('grades cloud cover', () => {
    expect([5, 30, 70, 100].map(cloudsKey)).toEqual([
      'cloudsClear',
      'cloudsPartly',
      'cloudsMostly',
      'cloudsOvercast',
    ]);
  });

  it('grades visibility, with the 10 km cap as excellent', () => {
    expect([10000, 6000, 2000, 400].map(visibilityKey)).toEqual([
      'visExcellent',
      'visGood',
      'visModerate',
      'visPoor',
    ]);
  });

  it('flags low and high pressure around the 1013 hPa average', () => {
    expect([995, 1013, 1025].map(pressureKey)).toEqual(['pressLow', 'pressNormal', 'pressHigh']);
  });
});

describe('daylight', () => {
  it('measures sunrise to sunset in hours and minutes', () => {
    const sunrise = 1_791_000_000;
    expect(daylight(sunrise, sunrise + 11 * 3600 + 57 * 60)).toEqual({ hours: 11, minutes: 57 });
  });

  it('returns null when the sun does not rise or set', () => {
    expect(daylight(0, 0)).toBeNull();
    expect(daylight(undefined, 100)).toBeNull();
  });
});

describe('weekHighlights', () => {
  const day = (key, high, low, pop) => ({ key, high, low, pop });

  it('finds the warmest high, coolest low and wettest day', () => {
    const days = [day('a', 30, 20, 0), day('b', 34, 22, 0.6), day('c', 28, 18, 0.3)];
    const { warmest, coolest, wettest } = weekHighlights(days);
    expect([warmest.key, coolest.key, wettest.key]).toEqual(['b', 'c', 'b']);
  });

  it('reports no wettest day when nothing reaches the threshold', () => {
    expect(weekHighlights([day('a', 30, 20, 0.1), day('b', 31, 21, 0.15)]).wettest).toBeNull();
  });

  it('breaks ties toward the earliest day', () => {
    expect(weekHighlights([day('a', 30, 20, 0), day('b', 30, 20, 0)]).warmest.key).toBe('a');
  });
});

describe('bestTimeOut', () => {
  // 2026-06-01 06:00 UTC; the city sits at UTC+0 unless a test says otherwise.
  const NOW = Date.UTC(2026, 5, 1, 6);
  const at = (hour) => NOW / 1000 + (hour - 6) * 3600;
  const slot = (hour, { temp = 18, pop = 0, wind = 3 } = {}) => ({
    dt: at(hour),
    main: { temp },
    pop,
    wind: { speed: wind },
  });
  const forecast = (list, timezone = 0) => ({ city: { timezone }, list });

  it('prefers the driest daylight slot over a milder wet one', () => {
    const result = bestTimeOut(forecast([slot(9, { temp: 20, pop: 0.6 }), slot(12, { temp: 14, pop: 0 })]), NOW);
    expect(result.entry.dt).toBe(at(12));
    expect(result.isToday).toBe(true);
  });

  it('breaks a dry tie on temperature, and counts strong wind against a slot', () => {
    const list = [slot(9, { temp: 11 }), slot(12, { temp: 19, wind: 14 }), slot(15, { temp: 17 })];
    expect(bestTimeOut(forecast(list), NOW).entry.dt).toBe(at(15));
  });

  it('skips night slots and anything past the next 24 hours', () => {
    const evening = Date.UTC(2026, 5, 1, 20);
    const list = [slot(21), slot(27), slot(33, { pop: 0.3 }), slot(12 + 48)];
    const result = bestTimeOut(forecast(list), evening);
    expect(result.entry.dt).toBe(at(33));
    expect(result.isToday).toBe(false);
  });

  it('keeps a slot that is already under way', () => {
    expect(bestTimeOut(forecast([slot(5)]), NOW)).toBeNull();
    expect(bestTimeOut(forecast([slot(9)]), Date.UTC(2026, 5, 1, 10)).entry.dt).toBe(at(9));
  });

  it('reads hours in the city timezone', () => {
    // 22:00 UTC is 08:00 in UTC+10, so it counts as daylight there.
    expect(bestTimeOut(forecast([slot(22)], 10 * 3600), NOW).entry.dt).toBe(at(22));
    expect(bestTimeOut(forecast([slot(22)]), NOW)).toBeNull();
  });
});
