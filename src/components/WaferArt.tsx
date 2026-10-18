import { useId } from 'react';

export function WaferArt() {
  const prefix = useId().replaceAll(':', '');
  // An oversized wafer continues below the header, behind the workspace surface.
  const outline = 'M784 553.94A776 268 0 1 1 816 553.94L800 536Z';
  return (
    <svg
      className="wafer-art"
      viewBox="0 0 1600 420"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={`${prefix}-dies`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect
            x="2"
            y="2"
            width="23"
            height="23"
            rx="1.5"
            fill="var(--blue)"
            fillOpacity=".025"
            stroke="var(--blue)"
            strokeOpacity=".26"
            strokeWidth=".7"
          />
          <path
            d="M6 8H13M6 11H10M18 17H21M18 20H21"
            stroke="var(--blue)"
            strokeOpacity=".14"
            strokeWidth=".65"
          />
        </pattern>
        <clipPath id={`${prefix}-clip`}>
          <path d={outline} />
        </clipPath>
        <linearGradient
          id={`${prefix}-sheen`}
          x1="180"
          y1="0"
          x2="1420"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--blue)" stopOpacity="0" />
          <stop offset=".55" stopColor="var(--blue)" stopOpacity=".055" />
          <stop offset="1" stopColor="var(--green)" stopOpacity=".025" />
        </linearGradient>
      </defs>
      <g transform="rotate(-5 800 286)">
        <path d={outline} fill={`url(#${prefix}-sheen)`} />
        <g clipPath={`url(#${prefix}-clip)`}>
          <rect x="0" y="0" width="1600" height="560" fill={`url(#${prefix}-dies)`} />
          {[
            [534, 58],
            [1038, 86],
            [1178, 170],
            [702, 142],
            [366, 226],
            [1318, 282],
            [870, 254],
          ].map(([x, y], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width="23"
              height="23"
              rx="1.5"
              fill={i % 2 ? 'var(--blue)' : 'var(--green)'}
              fillOpacity=".1"
              stroke={i % 2 ? 'var(--blue)' : 'var(--green)'}
              strokeOpacity=".4"
              strokeWidth=".8"
            />
          ))}
        </g>
        <path d={outline} stroke="var(--blue)" strokeOpacity=".48" strokeWidth="1.2" />
        <ellipse
          cx="800"
          cy="286"
          rx="782"
          ry="274"
          stroke="var(--blue)"
          strokeOpacity=".13"
          strokeWidth=".7"
        />
        <path
          d="M784 553.94L800 536L816 553.94"
          stroke="var(--green)"
          strokeOpacity=".55"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
