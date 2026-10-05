import { Cloud } from '@phosphor-icons/react/dist/csr/Cloud';
import { Drop } from '@phosphor-icons/react/dist/csr/Drop';
import { Eye } from '@phosphor-icons/react/dist/csr/Eye';
import { Gauge } from '@phosphor-icons/react/dist/csr/Gauge';
import { MoonStars } from '@phosphor-icons/react/dist/csr/MoonStars';
import { SquaresFour } from '@phosphor-icons/react/dist/csr/SquaresFour';
import { SunHorizon } from '@phosphor-icons/react/dist/csr/SunHorizon';
import { Thermometer } from '@phosphor-icons/react/dist/csr/Thermometer';
import { Wind } from '@phosphor-icons/react/dist/csr/Wind';
import InfoPopover from '../../components/InfoPopover';
import {
  cloudsKey,
  daylight,
  feelsKey,
  humidityKey,
  pressureKey,
  visibilityKey,
  WIND_BANDS,
  windKey,
} from '../../lib/insights';
import { formatPressure, formatTemp, formatVisibility, formatWind } from '../../lib/units';
import { formatCityClock } from '../../lib/weather';
import { useSettings } from '../../providers/settingsContext';

/**
 * One number with its own (i). The explanation has three parts: what the measure is, what today's
 * value means (with a practical tip), and the general scale when there is one.
 */
function Stat({ Icon, label, value, definition, reading, scale }) {
  const { t } = useSettings();
  return (
    <div className="py-4">
      <dt className="flex items-center gap-2 text-sm font-medium text-fg-muted">
        <Icon size={16} weight="bold" aria-hidden className="shrink-0" />
        {label}
        <span className="-my-2 -ms-1 -me-2">
          <InfoPopover title={label}>
            <p>{definition}</p>
            <div className="mt-3 rounded-xl bg-white/6 p-3">
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-fg tabular-nums">
                {t('nowLabel')} {value}
              </span>
              <p className="mt-2 text-fg">{reading}</p>
            </div>
            {scale && <p className="mt-3 text-xs text-fg-subtle">{scale}</p>}
          </InfoPopover>
        </span>
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** The supporting numbers, in a frosted panel below the forecast. Hairlines, not boxes. */
export default function Details({ data }) {
  const { unit, locale, t } = useSettings();
  const clock = (unix) => (unix ? formatCityClock(unix, data.timezone, locale) : '-');

  const wind = data.wind?.speed ?? 0;
  const clouds = data.clouds?.all ?? 0;
  const sun = daylight(data.sys.sunrise, data.sys.sunset);

  const values = {
    feels: formatTemp(data.main.feels_like, unit),
    humidity: `${data.main.humidity}%`,
    wind: formatWind(wind, unit),
    clouds: `${clouds}%`,
    visibility: formatVisibility(data.visibility, unit),
    pressure: formatPressure(data.main.pressure),
  };

  return (
    <section aria-labelledby="details-heading" className="glass rounded-[1.25rem] p-6 sm:p-8">
      <h2 id="details-heading" className="flex items-center gap-2 text-sm font-semibold text-fg-muted">
        <SquaresFour size={16} weight="bold" aria-hidden />
        {t('detailsTitle')}
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-4 sm:gap-x-8 [&>div]:border-b [&>div]:border-white/10 [&>div:nth-last-child(-n+2)]:border-b-0 sm:[&>div:nth-last-child(-n+4)]:border-b-0">
        <Stat
          Icon={Thermometer}
          label={t('feelsLikeLabel')}
          value={values.feels}
          definition={t('feelsDef')}
          reading={t(feelsKey(data.main.temp, data.main.feels_like))}
        />
        <Stat
          Icon={Drop}
          label={t('humidityLabel')}
          value={values.humidity}
          definition={t('humDef')}
          scale={t('humScale')}
          reading={t(humidityKey(data.main.humidity))}
        />
        <Stat
          Icon={Wind}
          label={t('statWind')}
          value={values.wind}
          definition={t('windDef')}
          scale={t('windScale', ...WIND_BANDS.map((ms) => formatWind(ms, unit)))}
          reading={t(windKey(wind))}
        />
        <Stat
          Icon={Cloud}
          label={t('statClouds')}
          value={values.clouds}
          definition={t('cloudsDef')}
          scale={t('cloudsScale')}
          reading={t(cloudsKey(clouds))}
        />
        <Stat
          Icon={Eye}
          label={t('statVisibility')}
          value={values.visibility}
          definition={t('visDef')}
          scale={t('visScale', ...[10000, 5000, 1000].map((m) => formatVisibility(m, unit)))}
          reading={data.visibility == null ? t('noReading') : t(visibilityKey(data.visibility))}
        />
        <Stat
          Icon={Gauge}
          label={t('statPressure')}
          value={values.pressure}
          definition={t('pressDef')}
          scale={t('pressScale')}
          reading={t(pressureKey(data.main.pressure))}
        />
        <Stat
          Icon={SunHorizon}
          label={t('statSunrise')}
          value={clock(data.sys.sunrise)}
          definition={t('sunriseDef')}
          reading={sun ? t('daylightLine', sun.hours, sun.minutes) : t('noSunToday')}
        />
        <Stat
          Icon={MoonStars}
          label={t('statSunset')}
          value={clock(data.sys.sunset)}
          definition={t('sunsetDef')}
          reading={t('sunsetTip')}
        />
      </dl>
    </section>
  );
}
