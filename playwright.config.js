import { defineConfig, devices } from '@playwright/test';

// The journeys run against the production build (vite preview), on a phone and on desktop, since
// the two get different layouts (bottom tab bar vs top tabs). Every /api/weather call is answered
// by fixtures in e2e/fixtures.js, so no API key is needed and OpenWeatherMap is never contacted.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4183',
    // Animations off so axe never measures colours mid-fade.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4183 --strictPort',
    url: 'http://localhost:4183',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
