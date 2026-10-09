import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { TRANSLATIONS } from '../src/i18n/translations.js';
import { BLANK_TILE, currentWeather, forecast, geocodeHits } from './fixtures.js';

const en = TRANSLATIONS.en;

/**
 * Answers every /api/weather call from fixtures and refuses anything off this origin, so a test
 * can never reach OpenWeatherMap (or anything else) by accident.
 *  - geocode: 'one' (a single hit) | 'none' (no results) | 'offline' (the request fails)
 *  - weather: 'ok' | 'fail-once' (500s through the automatic retry, then fine when the user retries)
 */
async function mockApi(page, { geocode = 'one', weather = 'ok' } = {}) {
  let weatherFailures = weather === 'fail-once' ? 2 : 0;

  await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
  await page.route(/tile\.openstreetmap\.org/, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }),
  );
  await page.route('**/api/weather?**', (route) => {
    const endpoint = new URL(route.request().url()).searchParams.get('endpoint');
    if (endpoint === 'geocode') {
      if (geocode === 'offline') return route.abort('internetdisconnected');
      return route.fulfill({ json: geocode === 'none' ? [] : geocodeHits() });
    }
    if (endpoint === 'weather') {
      if (weatherFailures > 0) {
        weatherFailures -= 1;
        return route.fulfill({ status: 500, json: { message: 'upstream error' } });
      }
      return route.fulfill({ json: currentWeather() });
    }
    if (endpoint === 'forecast') return route.fulfill({ json: forecast() });
    return route.fulfill({ status: 400, json: { message: 'unknown endpoint' } });
  });
}

/** WCAG 2 A/AA; fail on serious or critical findings. */
async function expectNoA11yViolations(page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
}

/** Visible elements poking out past either edge of the viewport (sideways scroll on a phone). */
const overflowingElements = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('header *, main *, nav *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.right > window.innerWidth + 1 || r.left < -1);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)),
  );

async function searchFor(page, text) {
  const box = page.getByPlaceholder(en.searchPlaceholder);
  await box.fill(text);
  await box.press('Enter');
}

let cspViolations;

test.beforeEach(async ({ page }) => {
  cspViolations = [];
  page.on('console', (msg) => {
    if (/Content Security Policy/i.test(msg.text())) cspViolations.push(msg.text());
  });
});

test.afterEach(() => {
  expect(cspViolations).toEqual([]);
});

test('first visit shows the empty state, under the production headers', async ({ page }) => {
  await mockApi(page);
  const response = await page.goto('./');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  await expect(page.getByRole('heading', { name: en.emptyTitle })).toBeVisible();
  await expectNoA11yViolations(page);
});

test('search a city, read it, switch units', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await searchFor(page, 'Reykjavik');

  await expect(page.getByRole('heading', { name: /Reykjavik/ })).toBeVisible();
  await expect(page.getByLabel('10°C')).toBeVisible();
  await expect(page.getByRole('heading', { name: en.forecastTitle })).toBeVisible();
  await expect(page.locator('#forecast-heading').locator('xpath=../..').getByRole('listitem')).toHaveCount(5);
  await expect(page.getByText(/^Best time to head out:/)).toBeVisible();
  await expect(page).toHaveTitle(/Reykjavik/);
  await expectNoA11yViolations(page);

  await page.getByRole('radio', { name: '°F' }).click();
  await expect(page.getByLabel('50°F')).toBeVisible();
  await expect(page.getByRole('radio', { name: '°F' })).toHaveAttribute('aria-checked', 'true');

  // Unit and city survive a reload.
  await page.reload();
  await expect(page.getByLabel('50°F')).toBeVisible();
});

test.describe('at 375px', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test('every language renders without sideways overflow', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone layout only');
    await mockApi(page);
    await page.goto('./');
    await searchFor(page, 'Reykjavik');
    await expect(page.getByLabel('10°C')).toBeVisible();

    for (const code of ['en', 'es', 'zh', 'hi', 'ar']) {
      await page.locator('header select').selectOption(code);
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      await expect(page.locator('#forecast-heading')).toHaveText(TRANSLATIONS[code].forecastTitle);
      expect(await overflowingElements(page), `overflow in ${code}`).toEqual([]);
    }
  });
});

test('a city that does not exist says so', async ({ page }) => {
  await mockApi(page, { geocode: 'none' });
  await page.goto('./');
  await searchFor(page, 'Atlantisville');
  await expect(page.getByRole('alert')).toHaveText(en.errorCityNotFound('Atlantisville'));
  await expect(page.getByPlaceholder(en.searchPlaceholder)).toHaveAttribute('aria-invalid', 'true');
  await expectNoA11yViolations(page);
});

test('a failed search request is reported, not swallowed', async ({ page }) => {
  await mockApi(page, { geocode: 'offline' });
  await page.goto('./');
  await searchFor(page, 'Reykjavik');
  await expect(page.getByRole('alert')).toHaveText(en.errorGeocodeFailed);
});

test('a failed weather request offers a working retry', async ({ page }) => {
  await mockApi(page, { weather: 'fail-once' });
  await page.goto('./');
  await searchFor(page, 'Reykjavik');

  const error = page.getByRole('alert').filter({ hasText: en.errorWeatherGeneric });
  await expect(error).toBeVisible();
  await expectNoA11yViolations(page);

  await error.getByRole('button', { name: en.retry }).click();
  await expect(page.getByLabel('10°C')).toBeVisible();
});

test('explore and history views', async ({ page }) => {
  await mockApi(page);
  await page.goto('./');
  await searchFor(page, 'Reykjavik');
  await expect(page.getByLabel('10°C')).toBeVisible();

  const views = page.getByRole('navigation', { name: 'Views' }).filter({ visible: true });
  await views.getByRole('link', { name: en.tabExplore }).click();
  await expect(page).toHaveURL(/#\/explore$/);
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible();
  await expectNoA11yViolations(page);

  await views.getByRole('link', { name: en.tabHistory }).click();
  await expect(page).toHaveURL(/#\/history$/);
  await expect(page.getByRole('button', { name: /^Reykjavik, IS/ })).toBeVisible();
  await expectNoA11yViolations(page);

  // Picking a history entry goes straight back to that city's weather.
  await page.getByRole('button', { name: /^Reykjavik, IS/ }).click();
  await expect(page).toHaveURL(/\/(#\/?)?$/);
  await expect(page.getByLabel('10°C')).toBeVisible();
});

test.describe('the animated sky', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('rains on a capable device and pauses while the tab is hidden', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    });
    await mockApi(page);
    await page.goto('./');
    await searchFor(page, 'Reykjavik');
    await expect(page.locator('.raindrop').first()).toBeAttached();
    await expect(page.locator('html')).not.toHaveClass(/lite/);

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.weather-bg')).toHaveClass(/weather-bg--paused/);
  });

  test('a weak device gets a still sky and the app still works', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
    });
    await mockApi(page);
    await page.goto('./');
    await searchFor(page, 'Reykjavik');
    await expect(page.getByLabel('10°C')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/lite/);
    await expect(page.locator('.raindrop')).toHaveCount(0);
    await expect(page.locator('.sun-beam')).toHaveCount(0);
    await expectNoA11yViolations(page);
  });
});
