const dayKey = (date) => `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

/**
 * Groups the 3-hourly entries into calendar days in the city's own timezone and drops today, so
 * the strip always shows the next days rather than today-plus-four. `now` is injectable for tests.
 */
export function groupForecastByDay(data, now = Date.now(), maxDays = 5) {
  const offset = data.city.timezone;
  const todayKey = dayKey(new Date(now + offset * 1000));
  const days = new Map();

  for (const entry of data.list) {
    const local = new Date((entry.dt + offset) * 1000);
    const key = dayKey(local);
    if (key === todayKey) continue;

    if (!days.has(key)) days.set(key, { key, date: local, entries: [] });
    days.get(key).entries.push({ ...entry, localHour: local.getUTCHours() });
  }

  return [...days.values()].slice(0, maxDays);
}

/** High / low (Celsius) plus the entry closest to 13:00 local, which stands in for the day's condition. */
export function summarizeDay(day) {
  const temps = day.entries.map((e) => e.main.temp);
  const midday = day.entries.reduce((closest, entry) =>
    Math.abs(entry.localHour - 13) < Math.abs(closest.localHour - 13) ? entry : closest,
  );
  return { high: Math.max(...temps), low: Math.min(...temps), midday, pop: maxPop(day.entries) };
}

// Probability of precipitation (0-1) is per 3-hour slot; a day's chance is its highest slot.
const maxPop = (entries) => Math.max(0, ...entries.map((e) => e.pop ?? 0));

/**
 * Exactly `count` days: "today" first, then the following days.
 *
 * The free forecast covers 120 hours from now, so skipping today leaves only four full days for
 * any city whose window ends before local midnight (Taal, UTC+8, at 00:50 local is one). Leading
 * with today always yields five. Today blends the current reading (its own high/low and the live
 * condition) with whatever forecast slots remain today, and can still render after the last slot
 * of the day has passed.
 */
export function dailyForecast(forecast, current, now = Date.now(), count = 5) {
  const offset = forecast.city.timezone;
  const todayKey = dayKey(new Date(now + offset * 1000));
  const todayEntries = forecast.list.filter((e) => dayKey(new Date((e.dt + offset) * 1000)) === todayKey);
  const todayTemps = [
    current.main.temp,
    current.main.temp_max,
    current.main.temp_min,
    ...todayEntries.map((e) => e.main.temp),
  ];

  const today = {
    key: todayKey,
    date: new Date(now + offset * 1000),
    isToday: true,
    high: Math.max(...todayTemps),
    low: Math.min(...todayTemps),
    midday: current,
    pop: maxPop(todayEntries),
  };

  const rest = groupForecastByDay(forecast, now, count - 1).map((day) => ({
    key: day.key,
    date: day.date,
    isToday: false,
    ...summarizeDay(day),
  }));

  return [today, ...rest];
}
