import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { proxyOpenWeather } from './api/_openweather.js';

// Production-only CSP: the dev server needs inline module scripts and a websocket, so the meta
// tag is injected at build time. Leaflet sets inline styles at runtime, hence style-src 'unsafe-inline'.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  // Weather data comes from the same-origin /api/weather function, not from OpenWeatherMap directly.
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    },
  ],
};

// Each Phosphor icon ships six weights as separate SVG paths and tree-shaking cannot drop unused
// entries from the per-icon weight map. The app never uses "thin" or "light", so strip them from
// the bundled icon definitions (they just render nothing if ever requested).
// The latin Geist subset covers all English UI text. Without a preload the browser only finds it
// after the CSS downloads and parses, so text paints late in the fallback font and then swaps.
const preloadFont = {
  name: 'preload-latin-font',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find((file) =>
        /geist-latin-wght-normal.*.woff2$/.test(file),
      );
      if (!font) return undefined;
      return [
        {
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${font}`, crossorigin: '' },
          injectTo: 'head',
        },
      ];
    },
  },
};

// Vite does not run Vercel functions, so locally /api/weather is answered by the same proxy code,
// reading the server-only OPENWEATHER_API_KEY (no VITE_ prefix, so it is never bundled).
const weatherApi = (apiKey) => {
  const handle = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/weather') return next();
    if (req.method !== 'GET') {
      res.statusCode = 405;
      return res.end();
    }
    const { status, headers, body } = await proxyOpenWeather(url.searchParams, apiKey);
    res.writeHead(status, headers);
    res.end(body);
  };
  return {
    name: 'local-weather-api',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  };
};

const ICON_DEF_FILE = /@phosphor-icons\/react\/dist\/defs\/.+\.es\.js$/;
const UNUSED_WEIGHT_ENTRY = /\n {2}\[\n {4}"(?:thin|light)",[\s\S]*?\n {2}\],?(?=\n)/g;
const pruneIconWeights = {
  name: 'prune-phosphor-weights',
  apply: 'build',
  enforce: 'pre',
  transform(code, id) {
    if (!ICON_DEF_FILE.test(id)) return null;
    return { code: code.replace(UNUSED_WEIGHT_ENTRY, ''), map: null };
  },
};

export default defineConfig(({ mode }) => ({
  // Relative base so the same build works on GitHub Pages project sites and any static host.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin,
    pruneIconWeights,
    preloadFont,
    weatherApi(loadEnv(mode, process.cwd(), '').OPENWEATHER_API_KEY),
  ],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}', 'api/**/*.test.js'],
    setupFiles: ['src/test/setup.js'],
    css: false,
  },
}));
