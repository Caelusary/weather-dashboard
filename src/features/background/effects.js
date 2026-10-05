// Pure particle descriptor generators for the animated background. No DOM
// access here: the component turns these plain objects into styled elements,
// and tests can inject a seeded `random` to get repeatable output.

export const THEMES = [
  'default',
  'thunderstorm',
  'snow',
  'rain',
  'fog',
  'night',
  'hot',
  'cold',
  'clear',
  'clouds',
];

// Themes with no entry here (default, fog, cold, clear) get no particles.
// Thunderstorm shares rain drops; the legacy app never drew lightning.
export const PARTICLE_KIND_BY_THEME = {
  snow: 'snow',
  rain: 'rain',
  thunderstorm: 'rain',
  hot: 'ember',
  night: 'star',
  clouds: 'cloud',
};

// Full-size counts, matched to the legacy values.
export const BASE_COUNTS = { snow: 40, rain: 50, ember: 16, star: 70, cloud: 5 };

// Beam lengths alternate long/short around the sun; each beam is 30 degrees
// from its neighbour and pulses on a staggered delay so they do not blink in sync.
export const SUN_BEAMS = [70, 52, 70, 52, 70, 52, 70, 52, 70, 52, 70, 52].map((length, i) => ({
  length,
  rotation: i * 30,
  delay: i * 0.15,
}));

// Craters are positioned in % of the moon disc, size in px.
export const MOON_CRATERS = [
  { top: '18%', left: '26%', size: 16 },
  { top: '52%', left: '58%', size: 22 },
  { top: '72%', left: '24%', size: 11 },
];

const between = (random, min, max) => min + random() * (max - min);

function countFor(kind, density) {
  return Math.max(0, Math.round(BASE_COUNTS[kind] * density));
}

export function generateSnowflakes(random = Math.random, density = 1) {
  return Array.from({ length: countFor('snow', density) }, () => ({
    left: between(random, 0, 100),
    size: between(random, 0.5, 1.5), // rem
    opacity: between(random, 0.4, 1),
    duration: between(random, 8, 14),
    delay: between(random, 0, 8),
  }));
}

// Negative delays start each drop mid-fall so the screen is full immediately.
export function generateRaindrops(random = Math.random, density = 1) {
  return Array.from({ length: countFor('rain', density) }, () => ({
    left: between(random, 0, 100),
    duration: between(random, 0.6, 1.1),
    delay: -between(random, 0, 2),
  }));
}

export function generateEmbers(random = Math.random, density = 1) {
  return Array.from({ length: countFor('ember', density) }, () => ({
    left: between(random, 0, 100),
    size: between(random, 3, 7), // px
    drift: Math.round(between(random, -20, 20)), // px, horizontal sway while rising
    duration: between(random, 5, 9),
    delay: between(random, 0, 6),
  }));
}

export function generateStars(random = Math.random, density = 1) {
  return Array.from({ length: countFor('star', density) }, () => ({
    top: between(random, 0, 100),
    left: between(random, 0, 100),
    // Most stars are small; a few bigger ones add depth.
    size: random() < 0.85 ? between(random, 1, 2) : between(random, 2, 3), // px
    twinkleMin: between(random, 0.15, 0.4),
    duration: between(random, 2, 5),
    delay: -between(random, 0, 5),
  }));
}

export function generateClouds(random = Math.random, density = 1) {
  return Array.from({ length: countFor('cloud', density) }, () => ({
    top: between(random, 5, 45),
    scale: between(random, 0.6, 1.3),
    opacity: between(random, 0.15, 0.35),
    duration: between(random, 45, 75),
    delay: -between(random, 0, 60),
  }));
}

const GENERATORS = {
  snow: generateSnowflakes,
  rain: generateRaindrops,
  ember: generateEmbers,
  star: generateStars,
  cloud: generateClouds,
};

/**
 * Particle descriptors for a theme. `density` scales the count (0.5 on small
 * screens). Returns [] for themes without particles.
 */
export function generateParticles(theme, { random = Math.random, density = 1 } = {}) {
  const kind = PARTICLE_KIND_BY_THEME[theme];
  return kind ? GENERATORS[kind](random, density) : [];
}
