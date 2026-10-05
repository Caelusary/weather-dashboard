import { Bed } from '@phosphor-icons/react/dist/csr/Bed';
import { CloudFog } from '@phosphor-icons/react/dist/csr/CloudFog';
import { CloudLightning } from '@phosphor-icons/react/dist/csr/CloudLightning';
import { CloudSun } from '@phosphor-icons/react/dist/csr/CloudSun';
import { Fire } from '@phosphor-icons/react/dist/csr/Fire';
import { Leaf } from '@phosphor-icons/react/dist/csr/Leaf';
import { MoonStars } from '@phosphor-icons/react/dist/csr/MoonStars';
import { PersonSimpleWalk } from '@phosphor-icons/react/dist/csr/PersonSimpleWalk';
import { Snowflake } from '@phosphor-icons/react/dist/csr/Snowflake';
import { Star } from '@phosphor-icons/react/dist/csr/Star';
import { ThermometerCold } from '@phosphor-icons/react/dist/csr/ThermometerCold';
import { Umbrella } from '@phosphor-icons/react/dist/csr/Umbrella';
import { suggestionKey } from '../../lib/weather';
import { useSettings } from '../../providers/settingsContext';

const ICONS = {
  sugStorm: CloudLightning,
  sugSnow: Snowflake,
  sugFreezing: ThermometerCold,
  sugRain: Umbrella,
  sugLowVisibility: CloudFog,
  sugScorching: Fire,
  sugWarmNight: MoonStars,
  sugBedtime: Bed,
  sugClearNight: Star,
  sugBeautifulDay: Leaf,
  sugPleasantEvening: PersonSimpleWalk,
  sugCool: CloudSun,
  sugChilly: ThermometerCold,
};

/** One line of practical advice, as a quiet glass pill under the reading. Amber marks it as advice. */
export default function Advice({ data }) {
  const { t } = useSettings();
  const key = suggestionKey(data);
  const Icon = ICONS[key];

  return (
    <aside
      aria-label="Advice"
      className="glass mt-6 flex max-w-xl items-center gap-3 rounded-2xl px-5 py-3 text-left [text-shadow:none]"
    >
      <Icon size={22} weight="duotone" aria-hidden className="shrink-0 text-warn" />
      <p className="text-base leading-snug">{t(key)}</p>
    </aside>
  );
}
