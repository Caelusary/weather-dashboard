import { proxyOpenWeather } from './_openweather.js';

/**
 * GET /api/weather?endpoint=weather|forecast|geocode&... — OpenWeatherMap behind an allowlist,
 * with the key added here so it never reaches the browser.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { status, headers, body } = await proxyOpenWeather(searchParams, process.env.OPENWEATHER_API_KEY);
  return new Response(body, { status, headers });
}
