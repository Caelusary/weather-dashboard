import { describe, expect, it } from 'vitest';
import { cityLabel, distanceKm, findPopularCity, parseCityInput, sortCityResults, toCity } from './cities';

describe('parseCityInput', () => {
  it('splits "City, CC" into a name and country', () => {
    expect(parseCityInput('Paris, FR')).toEqual({ name: 'Paris', country: 'FR' });
  });

  it('uses the last segment as the country when there are several commas', () => {
    expect(parseCityInput('Austin, Texas, US')).toEqual({ name: 'Austin', country: 'US' });
  });

  it('returns null for a plain name', () => {
    expect(parseCityInput('Paris')).toBeNull();
  });
});

describe('findPopularCity', () => {
  it('matches case-insensitively and ignores surrounding space', () => {
    expect(findPopularCity('  dUbAi ')).toMatchObject({ name: 'Dubai', country: 'AE' });
  });

  it('returns null for an unknown city', () => {
    expect(findPopularCity('Springfield')).toBeNull();
  });
});

describe('sortCityResults', () => {
  const dubaiUS = { name: 'Dubai', country: 'US', lat: 40, lon: -90 };
  const dubaiAE = { name: 'Dubai', country: 'AE', lat: 25.2, lon: 55.27 };
  const dubaiHills = { name: 'Dubai Hills', country: 'AE', lat: 25.1, lon: 55.25 };

  it('puts the well-known popular city first, then other exact names, then the rest', () => {
    const sorted = sortCityResults([dubaiHills, dubaiUS, dubaiAE], 'Dubai');
    expect(sorted.map((c) => c.country + c.name)).toEqual(['AEDubai', 'USDubai', 'AEDubai Hills']);
  });

  it('breaks ties by distance from the user within a tier', () => {
    const near = { name: 'Aberdeen', country: 'GB', lat: 57.15, lon: -2.09 };
    const far = { name: 'Aberdeen', country: 'US', lat: 45.46, lon: -98.49 };
    const sorted = sortCityResults([far, near], 'Aberdeen', { lat: 55.9, lon: -3.2 });
    expect(sorted[0]).toBe(near);
  });

  it('does not mutate the input array', () => {
    const input = [dubaiHills, dubaiAE];
    sortCityResults(input, 'Dubai');
    expect(input[0]).toBe(dubaiHills);
  });
});

describe('distanceKm', () => {
  it('is roughly 344 km between London and Paris', () => {
    const km = distanceKm({ lat: 51.5074, lon: -0.1278 }, { lat: 48.8566, lon: 2.3522 });
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(348);
  });

  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 1, lon: 2 }, { lat: 1, lon: 2 })).toBe(0);
  });
});

describe('cityLabel / toCity', () => {
  it('skips an empty state', () => {
    expect(cityLabel({ name: 'Paris', state: '', country: 'FR' })).toBe('Paris, FR');
    expect(cityLabel({ name: 'Austin', state: 'Texas', country: 'US' })).toBe('Austin, Texas, US');
  });

  it('normalizes a geocoding hit and drops extra fields', () => {
    const city = toCity({ name: 'Paris', country: 'FR', lat: 1, lon: 2, local_names: { fr: 'Paris' } });
    expect(city).toEqual({ name: 'Paris', country: 'FR', state: '', lat: 1, lon: 2 });
  });
});
