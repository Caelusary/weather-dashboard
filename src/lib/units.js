// The API is always queried in metric; everything the user sees is converted here, so flipping
// the unit toggle is instant and never refetches.

export const UNITS = { metric: 'metric', imperial: 'imperial' };

export const celsiusToDisplay = (celsius, unit) =>
  unit === UNITS.imperial ? (celsius * 9) / 5 + 32 : celsius;

export const tempSymbol = (unit) => (unit === UNITS.imperial ? '°F' : '°C');

/** Rounded, signed-correct display string: formatTemp(21.6, 'metric') -> "22°". */
export function formatTemp(celsius, unit, { withUnit = false } = {}) {
  const rounded = Math.round(celsiusToDisplay(celsius, unit));
  const value = Object.is(rounded, -0) ? 0 : rounded;
  return `${value}${withUnit ? tempSymbol(unit) : '°'}`;
}

/** m/s from the API -> km/h or mph. */
export function formatWind(metersPerSecond, unit) {
  return unit === UNITS.imperial
    ? `${Math.round(metersPerSecond * 2.23694)} mph`
    : `${Math.round(metersPerSecond * 3.6)} km/h`;
}

/** Visibility arrives in metres (capped at 10 km by the API). One decimal, without a trailing ".0". */
export function formatVisibility(meters, unit) {
  if (meters == null) return '-';
  const value = unit === UNITS.imperial ? meters / 1609.344 : meters / 1000;
  // At (or rounding to) the API's 10 km cap, "6.2 mi" implies precision the API does not have.
  const shown = meters >= 9950 ? Math.round(value) : Number(value.toFixed(1));
  return `${shown} ${unit === UNITS.imperial ? 'mi' : 'km'}`;
}

export const formatPressure = (hPa) => `${Math.round(hPa)} hPa`;
