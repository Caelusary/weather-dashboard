import { useQuery } from '@tanstack/react-query';
import { fetchForecast, fetchWeather } from '../../lib/api';

const MINUTE = 60 * 1000;

/**
 * Current conditions and the forecast for a city, fetched in parallel (neither needs the other's
 * result) and cached by coordinates. Because the API is always queried in metric, switching units
 * never changes these keys, so toggling °C/°F is instant. A failed forecast never blocks the
 * current-weather view: the two queries fail independently.
 */
export function useWeatherData(city) {
  const lat = city?.lat;
  const lon = city?.lon;
  const enabled = lat != null && lon != null;

  const weather = useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: ({ signal }) => fetchWeather(lat, lon, { signal }),
    enabled,
    staleTime: 5 * MINUTE,
  });

  const forecast = useQuery({
    queryKey: ['forecast', lat, lon],
    queryFn: ({ signal }) => fetchForecast(lat, lon, { signal }),
    enabled,
    staleTime: 15 * MINUTE,
  });

  return { weather, forecast };
}
