import { describe, expect, it } from 'vitest';
import {
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
