import { describe, expect, it } from 'vitest';
import { dailyForecast, groupForecastByDay, summarizeDay } from './forecast';

const at = (y, m, d, h) => Date.UTC(y, m - 1, d, h) / 1000;

function entry(dt, temp, main = 'Clear') {
  return { dt, main: { temp }, weather: [{ main, icon: '01d', description: 'clear sky' }] };
}

// "Now" is 10 Jun 2026 10:00 UTC. Slots cover today plus the next days, every 3 hours.
const NOW = at(2026, 6, 10, 10) * 1000;

function buildForecast(timezone = 0, days = 6) {
  const list = [];
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h += 3) list.push(entry(at(2026, 6, 10 + d, h), 10 + h / 3 + d));
  }
  return { city: { timezone }, list };
}

describe('groupForecastByDay', () => {
  it('drops today and returns the next days only', () => {
    const days = groupForecastByDay(buildForecast(), NOW);
    expect(days).toHaveLength(5);
    expect(days[0].key).toBe('2026-5-11');
  });

  it('caps the result at five days', () => {
    expect(groupForecastByDay(buildForecast(0, 8), NOW)).toHaveLength(5);
  });

  it('groups by the city calendar day, not UTC', () => {
    // At +10h, 20:00 UTC on the 10th is already 06:00 on the 11th locally.
    const forecast = {
      city: { timezone: 10 * 3600 },
      list: [entry(at(2026, 6, 10, 20), 15), entry(at(2026, 6, 10, 23), 16)],
    };
    const days = groupForecastByDay(forecast, NOW);
    expect(days[0].key).toBe('2026-5-11');
    expect(days[0].entries).toHaveLength(2);
  });

  it('returns an empty list when the forecast has only today', () => {
    const today = { city: { timezone: 0 }, list: [entry(at(2026, 6, 10, 12), 20)] };
    expect(groupForecastByDay(today, NOW)).toEqual([]);
  });
});

describe('summarizeDay', () => {
  it('reports the day high and low', () => {
    const day = {
      entries: [entry(1, 12), entry(2, 21), entry(3, 9)].map((e, i) => ({ ...e, localHour: i * 6 })),
    };
    const { high, low } = summarizeDay(day);
    expect(high).toBe(21);
    expect(low).toBe(9);
  });

  it('uses the slot closest to 13:00 local as the day condition', () => {
    const entries = [
      { ...entry(1, 10, 'Rain'), localHour: 3 },
      { ...entry(2, 15, 'Clear'), localHour: 12 },
      { ...entry(3, 12, 'Snow'), localHour: 21 },
    ];
    expect(summarizeDay({ entries }).midday.weather[0].main).toBe('Clear');
  });
});

describe('dailyForecast', () => {
  const current = (temp = 20, extra = {}) => ({
    main: { temp, temp_max: temp + 1, temp_min: temp - 1 },
    weather: [{ main: 'Clear', icon: '01n', description: 'clear sky' }],
    ...extra,
  });

  // Regression: Taal (UTC+8) at 00:50 local. The 120 hour window runs 02:00 on the 6th to 23:00
  // on the 10th, so skipping today left only four days.
  it('always returns five days, today first, even when the window ends before local midnight', () => {
    const tz = 8 * 3600;
    const now = Date.UTC(2026, 9, 5, 16, 50); // 00:50 on the 6th in UTC+8
    const list = Array.from({ length: 40 }, (_, i) => ({
      ...entry(Date.UTC(2026, 9, 5, 18) / 1000 + i * 3 * 3600, 25 + (i % 8)),
      pop: 0,
    }));

    const days = dailyForecast({ city: { timezone: tz }, list }, current(), now);

    expect(days).toHaveLength(5);
    expect(days[0].isToday).toBe(true);
    expect(days.slice(1).every((d) => !d.isToday)).toBe(true);
  });

  it("blends the live reading into today's high and low", () => {
    const list = [{ ...entry(at(2026, 6, 10, 15), 30), pop: 0 }];
    const [today] = dailyForecast({ city: { timezone: 0 }, list }, current(18), NOW);
    expect(today.high).toBe(30);
    expect(today.low).toBe(17);
  });

  it('still renders today from the live reading after the last slot of the day has passed', () => {
    const list = [{ ...entry(at(2026, 6, 11, 3), 12), pop: 0.9 }];
    const [today] = dailyForecast({ city: { timezone: 0 }, list }, current(15), NOW);
    expect(today).toMatchObject({ high: 16, low: 14, pop: 0 });
    expect(today.midday.weather[0].main).toBe('Clear');
  });

  it("uses each day's highest slot as its rain chance", () => {
    const list = [
      { ...entry(at(2026, 6, 11, 6), 10), pop: 0.1 },
      { ...entry(at(2026, 6, 11, 12), 14), pop: 0.7 },
    ];
    const [, tomorrow] = dailyForecast({ city: { timezone: 0 }, list }, current(), NOW);
    expect(tomorrow.pop).toBe(0.7);
  });
});
