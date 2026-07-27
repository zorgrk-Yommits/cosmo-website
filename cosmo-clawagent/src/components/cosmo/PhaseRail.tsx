'use client';

import { cn } from '@/lib/utils';
import { PHASE } from '@/design/tokens';
import { PHASES, phaseTone } from './phases';

// The canonical settlement rail, drawn as SVG. This is the fallback for the
// WebGL core, the header of the flow section, and the motif that repeats on
// the market pages — one geometry, one set of labels, everywhere.
//
// The off-chain / on-chain bracket is part of the drawing, not a footnote:
// where the trust boundary sits is the most important thing this diagram
// has to say.

const W = 1200;
const PAD = 90;
const GAP = (W - PAD * 2) / (PHASES.length - 1);
const Y = 52;
const x = (i: number) => PAD + i * GAP;

const FIRST_ONCHAIN = PHASES.findIndex((p) => p.onchain);

export default function PhaseRail({
  active,
  onSelect,
  showBoundary = true,
  className,
}: {
  active: number;
  onSelect?: (i: number) => void;
  showBoundary?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* Wide screens get the drawing; the list below is the accessible
          source of truth at every size and the visible rail on phones, where
          six labels scaled into a 1200-unit viewBox would be unreadable. */}
      <PhaseRailSvg active={active} onSelect={onSelect} showBoundary={showBoundary} />
      <PhaseRailList active={active} onSelect={onSelect} />
    </div>
  );
}

function PhaseRailSvg({
  active,
  onSelect,
  showBoundary,
}: {
  active: number;
  onSelect?: (i: number) => void;
  showBoundary: boolean;
}) {
  const interactive = typeof onSelect === 'function';

  return (
    <svg
      viewBox={`0 0 ${W} ${showBoundary ? 132 : 100}`}
      className="hidden w-full md:block"
      aria-hidden="true"
      focusable="false"
    >
      {/* segments — a segment is lit once its left-hand phase is reached */}
      {PHASES.slice(0, -1).map((p, i) => (
        <line
          key={p.id}
          x1={x(i) + 14}
          y1={Y}
          x2={x(i + 1) - 14}
          y2={Y}
          stroke={i < active ? PHASE[PHASES[i].tone] : PHASE.idle}
          strokeOpacity={i < active ? 0.55 : 0.35}
          strokeWidth={1.5}
        />
      ))}

      {PHASES.map((p, i) => {
        const tone = phaseTone(i, active);
        const reached = i <= active;
        const isActive = i === active;
        // Pointer only. The drawing is aria-hidden, so it must contain nothing
        // focusable — keyboard access lives in the list, which is present at
        // every viewport size.
        return (
          <g
            key={p.id}
            {...(interactive
              ? { onClick: () => onSelect?.(i), style: { cursor: 'pointer' } }
              : {})}
          >
            {/* generous invisible hit area for touch + pointer */}
            {interactive && <rect x={x(i) - 44} y={16} width={88} height={76} fill="transparent" />}

            {isActive && (
              <circle cx={x(i)} cy={Y} r={17} fill={PHASE[tone]} fillOpacity={0.12}>
                <animate
                  attributeName="r"
                  values="14;19;14"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle
              cx={x(i)}
              cy={Y}
              r={isActive ? 8.5 : 6}
              fill={reached ? PHASE[tone] : 'transparent'}
              fillOpacity={reached ? (isActive ? 1 : 0.9) : 0}
              stroke={PHASE[tone]}
              strokeOpacity={reached ? 1 : 0.5}
              strokeWidth={1.5}
            />
            <text
              x={x(i)}
              y={Y + 32}
              textAnchor="middle"
              className="font-mono"
              fontSize={16}
              letterSpacing={2}
              fill={reached ? PHASE[tone] : PHASE.idle}
              fillOpacity={reached ? 1 : 0.85}
            >
              {p.label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {showBoundary && (
        <g aria-hidden="true">
          {/* off-chain bracket */}
          <Bracket
            x1={x(0) - 26}
            x2={x(FIRST_ONCHAIN - 1) + 26}
            label="OFF-CHAIN · MARKETPLACE"
            color={PHASE.idle}
          />
          {/* on-chain bracket */}
          <Bracket
            x1={x(FIRST_ONCHAIN) - 26}
            x2={x(PHASES.length - 1) + 26}
            label="ON-CHAIN · SUPRA MAINNET"
            color={PHASE.settled}
          />
        </g>
      )}
    </svg>
  );
}

// The rail as a list. Visible on phones, screen-reader-only on desktop — so
// the six phases and the current position are announced identically no matter
// which rendering a visitor gets.
function PhaseRailList({
  active,
  onSelect,
}: {
  active: number;
  onSelect?: (i: number) => void;
}) {
  const interactive = typeof onSelect === 'function';

  return (
    <ol
      className="space-y-1.5 md:sr-only"
      aria-label={`Settlement rail, ${PHASES.length} phases. Current phase: ${
        PHASES[active]?.label ?? PHASES[0].label
      }.`}
    >
      {PHASES.map((p, i) => {
        const tone = phaseTone(i, active);
        const reached = i <= active;
        const isActive = i === active;
        const label = `Phase ${i + 1} of ${PHASES.length}: ${p.label}, ${
          p.onchain ? 'on-chain' : 'off-chain'
        }`;

        const body = (
          <>
            <span
              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{
                borderColor: PHASE[tone],
                background: reached ? PHASE[tone] : 'transparent',
              }}
              aria-hidden="true"
            />
            <span
              className="font-mono text-[11px] uppercase tracking-[0.18em]"
              style={{ color: reached ? PHASE[tone] : PHASE.idle }}
            >
              {p.label}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-ink-2">
              {p.onchain ? 'on-chain' : 'off-chain'}
            </span>
          </>
        );

        return (
          <li key={p.id} aria-current={isActive ? 'step' : undefined}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onSelect?.(i)}
                aria-label={label}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                  isActive ? 'border-line-strong bg-surface-2' : 'border-line-subtle',
                )}
              >
                {body}
              </button>
            ) : (
              <span
                aria-label={label}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5',
                  isActive ? 'border-line-strong bg-surface-2' : 'border-line-subtle',
                )}
              >
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Bracket({
  x1,
  x2,
  label,
  color,
}: {
  x1: number;
  x2: number;
  label: string;
  color: string;
}) {
  const top = 100;
  return (
    <g>
      <path
        d={`M ${x1} ${top} v 6 H ${x2} v -6`}
        fill="none"
        stroke={color}
        strokeOpacity={0.4}
        strokeWidth={1}
      />
      <text
        x={(x1 + x2) / 2}
        y={top + 24}
        textAnchor="middle"
        className="font-mono"
        fontSize={12}
        letterSpacing={2}
        fill={color}
        fillOpacity={0.75}
      >
        {label}
      </text>
    </g>
  );
}
