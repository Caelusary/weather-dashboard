import WeatherIcon from '../../components/WeatherIcon';
import { cityLabel } from '../../lib/cities';
import { formatTemp } from '../../lib/units';
import { conditionKind, formatCityDateTime } from '../../lib/weather';
import { useSettings } from '../../providers/settingsContext';
import Advice from './Advice';

/**
 * The reading, set straight on the sky with no box around it, so the weather scene is part of the
 * design rather than hidden behind it. Every line is large-text sized (>= 19px semibold) so the
 * 3:1 contrast rule holds over the brightest themes with the page scrim.
 */
export default function Hero({ data, city }) {
  const { unit, locale, t, condition } = useSettings();
  const description = condition(data.weather[0].description);
  const { date, time } = formatCityDateTime(data, locale);

  return (
    <section
      aria-labelledby="current-city"
      className="on-sky flex flex-col items-center pt-8 pb-10 text-center sm:pt-10 sm:pb-12"
    >
      <h2 id="current-city" className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {/* The API names the nearest weather station, which can differ from the city picked. */}
        {cityLabel({
          name: city?.name ?? data.name,
          state: city?.state,
          country: city?.country || data.sys.country,
        })}
      </h2>
      <p className="mt-2 text-[1.2rem] font-semibold text-white/90">
        {date}, {time}
      </p>

      <p
        className="mt-2 text-[clamp(4.75rem,16vw,7.5rem)] leading-none font-light tracking-tighter tabular-nums"
        aria-label={formatTemp(data.main.temp, unit, { withUnit: true })}
      >
        {formatTemp(data.main.temp, unit)}
      </p>

      <p className="mt-2 flex items-center gap-2 text-[1.35rem] font-semibold capitalize">
        <WeatherIcon kind={conditionKind(data)} size={34} />
        {description}
      </p>

      <p className="mt-2 flex items-center gap-2.5 text-[1.15rem] text-white/90 tabular-nums">
        <span>
          {t('high')} <span className="font-semibold text-fg">{formatTemp(data.main.temp_max, unit)}</span>
        </span>
        <span aria-hidden className="text-white/50">
          ·
        </span>
        <span>
          {t('low')} <span className="font-semibold text-fg">{formatTemp(data.main.temp_min, unit)}</span>
        </span>
      </p>

      <Advice data={data} />
    </section>
  );
}
