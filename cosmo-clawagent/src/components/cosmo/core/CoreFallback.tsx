'use client';

import { PHASE } from '@/design/tokens';
import { PHASES } from '../phases';

// The rail without WebGL. Same six nodes, same colour logic, same story —
// drawn as one SVG path with SMIL-driven packets, which costs nothing and
// works everywhere. `animated={false}` is the reduced-motion rendering.

const PATH =
  'M 40 176 C 150 120, 210 96, 320 128 S 500 208, 610 160 S 800 72, 920 116 S 1090 176, 1160 132';

// Sampled from PATH at the six phase positions (kept in sync by eye — the
// rail is decorative here; PhaseRail.tsx is the diagram that must be exact).
const NODE_POS: [number, number][] = [
  [40, 176],
  [263, 108],
  [493, 200],
  [714, 122],
  [934, 118],
  [1160, 132],
];

export default function CoreFallback({
  active,
  animated = true,
}: {
  active: number;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 1200 280"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="rail-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PHASE.idle} stopOpacity="0.5" />
          <stop offset="45%" stopColor={PHASE.active} stopOpacity="0.55" />
          <stop offset="78%" stopColor={PHASE.proof} stopOpacity="0.5" />
          <stop offset="100%" stopColor={PHASE.settled} stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="rail-halo">
          <stop offset="0%" stopColor={PHASE.active} stopOpacity="0.16" />
          <stop offset="100%" stopColor={PHASE.active} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="600" cy="150" rx="470" ry="150" fill="url(#rail-halo)" />

      <path id="rail-path" d={PATH} fill="none" stroke="url(#rail-grad)" strokeWidth="1.6" />

      {/* on-chain stretch, drawn heavier — the trust boundary is geometry */}
      <path
        d={PATH}
        fill="none"
        stroke={PHASE.settled}
        strokeOpacity="0.28"
        strokeWidth="3"
        strokeDasharray="640 2000"
        strokeDashoffset="-620"
        strokeLinecap="round"
      />

      {NODE_POS.map(([cx, cy], i) => {
        const reached = i <= active;
        const tone = reached ? PHASE[PHASES[i].tone] : PHASE.idle;
        return (
          <g key={PHASES[i].id}>
            {i === active && (
              <circle cx={cx} cy={cy} r="16" fill={tone} fillOpacity="0.14">
                {animated && (
                  <animate attributeName="r" values="13;22;13" dur="2.6s" repeatCount="indefinite" />
                )}
              </circle>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={i === active ? 6 : 4.5}
              fill={reached ? tone : 'transparent'}
              stroke={tone}
              strokeOpacity={reached ? 1 : 0.55}
              strokeWidth="1.4"
            />
          </g>
        );
      })}

      {animated &&
        [0, 1, 2, 3].map((i) => (
          <circle key={i} r="3.2" fill={PHASE.active} fillOpacity="0.85">
            <animateMotion
              dur="14s"
              begin={`${i * 3.5}s`}
              repeatCount="indefinite"
              rotate="auto"
              path={PATH}
            />
          </circle>
        ))}
    </svg>
  );
}
