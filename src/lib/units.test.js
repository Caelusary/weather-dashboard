import { describe, expect, it } from 'vitest';
import { celsiusToDisplay, formatPressure, formatTemp, formatVisibility, formatWind } from './units';

describe('temperature', () => {
  it('converts Celsius to Fahrenheit', () => {
    expect(celsiusToDisplay(100, 'imperial')).toBe(212);
    expect(celsiusToDisplay(0, 'imperial')).toBe(32);
    expect(celsiusToDisplay(21, 'metric')).toBe(21);
  });

  it('rounds and renders the degree sign, optionally with the unit', () => {
    expect(formatTemp(21.6, 'metric')).toBe('22°');
    expect(formatTemp(21.6, 'imperial', { withUnit: true })).toBe('71°F');
  });

  it('never renders negative zero', () => {
    expect(formatTemp(-0.2, 'metric')).toBe('0°');
  });
});

describe('wind, visibility, pressure', () => {
  it('converts m/s to km/h or mph', () => {
    expect(formatWind(10, 'metric')).toBe('36 km/h');
    expect(formatWind(10, 'imperial')).toBe('22 mph');
  });

  it('shows whole units at the 10 km cap and one decimal below', () => {
    expect(formatVisibility(10000, 'metric')).toBe('10 km');
    expect(formatVisibility(4500, 'metric')).toBe('4.5 km');
    expect(formatVisibility(10000, 'imperial')).toBe('6 mi');
  });

  it('handles missing visibility and rounds pressure', () => {
    expect(formatVisibility(undefined, 'metric')).toBe('-');
    expect(formatPressure(1013.4)).toBe('1013 hPa');
  });
});

describe('visibility formatting regressions', () => {
  it('drops a trailing .0 just under the cap', () => {
    expect(formatVisibility(9999, 'metric')).toBe('10 km');
  });
});
