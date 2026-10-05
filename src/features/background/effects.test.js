import { describe, expect, it, vi } from 'vitest';
import {
  BASE_COUNTS,
  PARTICLE_KIND_BY_THEME,
  THEMES,
  generateClouds,
  generateEmbers,
  generateParticles,
  generateRaindrops,
  generateSnowflakes,
  generateStars,
} from './effects';

// Small deterministic PRNG (mulberry32) so tests do not depend on Math.random.
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inRange = (value, min, max) => value >= min && value <= max;

describe('generateParticles counts', () => {
  it.each([
    ['snow', 40],
    ['rain', 50],
    ['thunderstorm', 50],
    ['hot', 16],
    ['night', 70],
    ['clouds', 5],
  ])('%s produces %i particles', (theme, count) => {
    expect(generateParticles(theme, { random: seeded(1) })).toHaveLength(count);
  });

  it('halves counts at density 0.5', () => {
    expect(generateParticles('snow', { density: 0.5 })).toHaveLength(20);
    expect(generateParticles('rain', { density: 0.5 })).toHaveLength(25);
    expect(generateParticles('hot', { density: 0.5 })).toHaveLength(8);
    expect(generateParticles('night', { density: 0.5 })).toHaveLength(35);
    expect(generateParticles('clouds', { density: 0.5 })).toHaveLength(3);
  });

  it('clamps negative density to zero particles', () => {
    expect(generateParticles('rain', { density: -1 })).toEqual([]);
  });

  it('keeps every particle theme in the base count table', () => {
    for (const kind of Object.values(PARTICLE_KIND_BY_THEME)) {
      expect(BASE_COUNTS[kind]).toBeGreaterThan(0);
    }
  });
});

describe('themes without particles', () => {
  it.each(['default', 'fog', 'cold', 'clear', 'not-a-theme'])('%s returns an empty array', (theme) => {
    expect(generateParticles(theme)).toEqual([]);
  });

  it('only the expected themes have particles', () => {
    const withParticles = THEMES.filter((theme) => generateParticles(theme).length > 0);
    expect(withParticles.sort()).toEqual(['clouds', 'hot', 'night', 'rain', 'snow', 'thunderstorm']);
  });
});

describe('value ranges', () => {
  it('snowflakes', () => {
    for (const p of generateSnowflakes(seeded(2))) {
      expect(inRange(p.left, 0, 100)).toBe(true);
      expect(inRange(p.size, 0.5, 1.5)).toBe(true);
      expect(inRange(p.opacity, 0.4, 1)).toBe(true);
      expect(inRange(p.duration, 8, 14)).toBe(true);
      expect(inRange(p.delay, 0, 8)).toBe(true);
    }
  });

  it('raindrops start mid-fall via negative delays', () => {
    for (const p of generateRaindrops(seeded(3))) {
      expect(inRange(p.left, 0, 100)).toBe(true);
      expect(inRange(p.duration, 0.6, 1.1)).toBe(true);
      expect(inRange(p.delay, -2, 0)).toBe(true);
    }
  });

  it('embers', () => {
    for (const p of generateEmbers(seeded(4))) {
      expect(inRange(p.left, 0, 100)).toBe(true);
      expect(inRange(p.size, 3, 7)).toBe(true);
      expect(Number.isInteger(p.drift)).toBe(true);
      expect(inRange(p.drift, -20, 20)).toBe(true);
      expect(inRange(p.duration, 5, 9)).toBe(true);
      expect(inRange(p.delay, 0, 6)).toBe(true);
    }
  });

  it('stars', () => {
    const stars = generateStars(seeded(5));
    for (const p of stars) {
      expect(inRange(p.top, 0, 100)).toBe(true);
      expect(inRange(p.left, 0, 100)).toBe(true);
      expect(inRange(p.size, 1, 3)).toBe(true);
      expect(inRange(p.twinkleMin, 0.15, 0.4)).toBe(true);
      expect(inRange(p.duration, 2, 5)).toBe(true);
      expect(inRange(p.delay, -5, 0)).toBe(true);
    }
    // Most stars should be the small kind.
    expect(stars.filter((p) => p.size < 2).length).toBeGreaterThan(stars.length / 2);
  });

  it('clouds', () => {
    for (const p of generateClouds(seeded(6))) {
      expect(inRange(p.top, 5, 45)).toBe(true);
      expect(inRange(p.scale, 0.6, 1.3)).toBe(true);
      expect(inRange(p.opacity, 0.15, 0.35)).toBe(true);
      expect(inRange(p.duration, 45, 75)).toBe(true);
      expect(inRange(p.delay, -60, 0)).toBe(true);
    }
  });
});

describe('determinism', () => {
  it.each(['snow', 'rain', 'hot', 'night', 'clouds'])('%s is repeatable with the same seed', (theme) => {
    const a = generateParticles(theme, { random: seeded(42) });
    const b = generateParticles(theme, { random: seeded(42) });
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    const a = generateParticles('snow', { random: seeded(1) });
    const b = generateParticles('snow', { random: seeded(2) });
    expect(a).not.toEqual(b);
  });

  it('uses the injected random function and never Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const random = vi.fn(seeded(7));
    generateParticles('hot', { random });
    expect(random).toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('defaults to Math.random', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const drops = generateParticles('rain');
    expect(spy).toHaveBeenCalled();
    expect(drops[0].left).toBe(50);
    expect(drops[0].duration).toBeCloseTo(0.85);
    expect(drops[0].delay).toBe(-1);
    spy.mockRestore();
  });
});
