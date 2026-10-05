import { CloudWarning } from '@phosphor-icons/react/dist/csr/CloudWarning';

// Solid, multi-colour weather glyphs on a 64x64 grid. Phosphor's fill weight is one colour per
// icon, so "amber sun behind a white cloud" needs its own shapes. Colour carries the meaning:
// amber sun, white cloud (greyer when it brings rain), blue rain, violet storm, icy snow.

const CLOUD = 'M18 48a10 10 0 0 1-1.2-19.9A14 14 0 0 1 44 24.5a11.75 11.75 0 1 1 2 23.5Z';
const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

function Sun({ cx = 32, cy = 32, r = 11 }) {
  return (
    <g className="fill-amber-300">
      <circle cx={cx} cy={cy} r={r} />
      {SUN_RAYS.map((deg) => (
        <rect
          key={deg}
          x={cx - 2}
          y={cy - r - 9}
          width="4"
          height="6"
          rx="2"
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
    </g>
  );
}

function Moon({ className = 'fill-indigo-200', transform }) {
  return <path className={className} transform={transform} d="M38 10a22 22 0 1 0 18 34A18 18 0 0 1 38 10Z" />;
}

function Cloud({ className = 'fill-slate-50', transform }) {
  return <path className={className} transform={transform} d={CLOUD} />;
}

const drop = (x, y, s = 1) =>
  `M${x} ${y}c0 0-${4 * s} ${5.5 * s}-${4 * s} ${8 * s}a${4 * s} ${4 * s} 0 0 0 ${8 * s} 0c0-${2.5 * s}-${4 * s}-${8 * s}-${4 * s}-${8 * s}Z`;

const RAIN_CLOUD = 'fill-slate-200';
const UP = 'translate(0 -8)';

const GLYPHS = {
  'clear-day': () => <Sun />,
  'clear-night': () => <Moon transform="translate(-4 0)" />,
  'clouds-day': () => (
    <>
      <Sun cx={42} cy={20} r={10} />
      <Cloud transform="translate(-6 10)" />
    </>
  ),
  'clouds-night': () => (
    <>
      <Moon transform="translate(20 -6) scale(0.65)" />
      <Cloud transform="translate(-6 10)" />
    </>
  ),
  drizzle: () => (
    <>
      <Cloud className={RAIN_CLOUD} transform={UP} />
      <g className="fill-sky-400">
        <path d={drop(26, 46)} />
        <path d={drop(38, 46)} />
      </g>
    </>
  ),
  rain: () => (
    <>
      <Cloud className={RAIN_CLOUD} transform={UP} />
      <g className="fill-sky-400">
        <path d={drop(20, 44, 1.2)} />
        <path d={drop(32, 47, 1.2)} />
        <path d={drop(44, 44, 1.2)} />
      </g>
    </>
  ),
  thunderstorm: () => (
    <>
      <Cloud className="fill-slate-300" transform={UP} />
      <path className="fill-violet-400" d="M35 36 25 51h7l-3 11 12-16h-7l4-10Z" />
    </>
  ),
  snow: () => (
    <>
      <Cloud transform={UP} />
      <g className="fill-cyan-200">
        <circle cx="22" cy="49" r="3" />
        <circle cx="32" cy="55" r="3" />
        <circle cx="42" cy="49" r="3" />
        <circle cx="27" cy="60" r="2.5" />
        <circle cx="38" cy="60" r="2.5" />
      </g>
    </>
  ),
  fog: () => (
    <>
      <Cloud className="fill-slate-300" transform={UP} />
      <g className="fill-slate-400">
        <rect x="10" y="45" width="44" height="5" rx="2.5" />
        <rect x="16" y="54" width="36" height="5" rx="2.5" />
      </g>
    </>
  ),
  wind: () => (
    <g className="fill-none stroke-teal-200" strokeWidth="5" strokeLinecap="round">
      <path d="M8 24h30a7 7 0 1 0-7-7" />
      <path d="M8 36h40a7 7 0 1 1-7 7" />
      <path d="M8 48h18" />
    </g>
  ),
  unknown: () => <Cloud className="fill-slate-300" />,
};

export const WARNING_ICON = CloudWarning;

/** Decorative by default; pass `label` when the icon is the only carrier of the condition. */
export default function WeatherIcon({ kind, size = 32, label, className = '' }) {
  const Glyph = GLYPHS[kind] ?? GLYPHS.unknown;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 drop-shadow-[0_2px_6px_rgb(0_0_0/0.25)] ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Glyph />
    </svg>
  );
}
