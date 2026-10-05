import { CalendarBlank } from '@phosphor-icons/react/dist/csr/CalendarBlank';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { useMemo } from 'react';
import InfoDialog from '../../components/InfoDialog';
import WeatherIcon from '../../components/WeatherIcon';
import { dailyForecast } from '../../lib/forecast';
import { weekHighlights } from '../../lib/insights';
import { formatTemp } from '../../lib/units';
import { conditionKind } from '../../lib/weather';
import { useSettings } from '../../providers/settingsContext';

// Below this, a rain chance is noise; above it, it is worth a line.
const RAIN_THRESHOLD = 0.2;

/**
 * Five frosted tiles set straight on the sky (no outer panel, so no boxes inside a box). Each
 * tile: day, icon, short condition, a labelled high and low, and a rain chance only when rain is
 * actually likely. Today leads and carries the accent.
 */
export default function Forecast({ forecast, current }) {
  const { unit, locale, t, condition } = useSettings();

  const days = useMemo(() => dailyForecast(forecast, current), [forecast, current]);

  const dayName = (day) =>
    day.isToday ? t('today') : day.date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
  const { warmest, coolest, wettest } = weekHighlights(days, RAIN_THRESHOLD);

  return (
    <section aria-labelledby="forecast-heading">
      <div className="mb-4 flex items-center gap-1.5 px-1">
        <h2
          id="forecast-heading"
          className="on-sky flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-fg sm:text-[1.75rem]"
        >
          <CalendarBlank size={26} weight="duotone" aria-hidden className="text-accent" />
          {t('forecastTitle')}
        </h2>
        <InfoDialog title={t('infoForecastTitle')} Icon={CalendarBlank}>
          <ul className="list-disc space-y-1.5 ps-4 marker:text-fg-subtle">
            <li>{t('fcToday')}</li>
            <li>{t('fcHighLow')}</li>
            <li>{t('fcRain')}</li>
            <li>{t('fcIcon')}</li>
          </ul>
          <div className="mt-4 space-y-1 rounded-xl bg-white/6 p-3 text-fg">
            <p>{t('fcWarmest', dayName(warmest), formatTemp(warmest.high, unit))}</p>
            <p>{t('fcCoolest', dayName(coolest), formatTemp(coolest.low, unit))}</p>
            <p>
              {wettest ? t('fcWettest', dayName(wettest), `${Math.round(wettest.pop * 100)}%`) : t('fcDry')}
            </p>
          </div>
        </InfoDialog>
      </div>

      <ul className="grid grid-cols-5 gap-2 sm:gap-3">
        {days.map((day) => {
          const description = condition(day.midday.weather[0].description);
          const rainy = day.pop >= RAIN_THRESHOLD;

          return (
            <li
              key={day.key}
              className={`glass flex min-w-0 flex-col items-center gap-2 rounded-2xl px-1.5 py-4 text-center sm:px-3 sm:py-5 ${
                day.isToday ? 'border-accent/60 bg-accent/10' : ''
              }`}
            >
              <span className={`text-sm font-semibold ${day.isToday ? 'text-accent' : 'text-fg-muted'}`}>
                {dayName(day)}
              </span>
              <WeatherIcon kind={conditionKind(day.midday)} size={38} label={description} />
              <span className="hidden w-full truncate text-xs text-fg-muted capitalize sm:block">
                {description}
              </span>

              <span className="mt-1 flex flex-col items-center tabular-nums">
                <span className="text-[0.65rem] font-semibold tracking-wider text-fg-muted uppercase">
                  {t('high')}
                </span>
                <span className="text-xl font-semibold">{formatTemp(day.high, unit)}</span>
                <span className="mt-1.5 text-[0.65rem] font-semibold tracking-wider text-fg-muted uppercase">
                  {t('low')}
                </span>
                <span className="text-base text-fg-muted">{formatTemp(day.low, unit)}</span>
              </span>

              {/* Space is reserved even when dry, so every tile keeps the same height. */}
              <span
                className={`flex min-h-5 items-center gap-1 text-xs font-semibold text-sky-300 ${rainy ? '' : 'invisible'}`}
                aria-hidden={!rainy}
              >
                <Drop size={12} weight="fill" aria-hidden />
                <span className="sr-only">{t('rainChance')}</span>
                {Math.round(day.pop * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
