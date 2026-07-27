'use client';

// Capacity meter: track is a lighter step of the fill's own hue; fill escalates
// violet → amber → rose past the warn/danger thresholds. Optional value markers
// as 1px ticks with muted labels. Values render as slate text to the side.

export type MeterMarker = { label: string; value: bigint };

export default function UtilizationMeter({
  value,
  max,
  label,
  format,
  markers = [],
  warnPct = 75,
  dangerPct = 90,
}: {
  value: bigint;
  max: bigint;
  label: string;
  format: (v: bigint) => string;
  markers?: MeterMarker[];
  warnPct?: number;
  dangerPct?: number;
}) {
  const uncapped = max <= BigInt(0);
  const pct = uncapped ? 0 : Number((value * BigInt(10000)) / max) / 100;
  const clamped = Math.min(pct, 100);
  const fill =
    pct >= dangerPct ? '#FF6B7E' : pct >= warnPct ? '#E0A458' : '#6E8BFF';

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
          {label}
        </span>
        <span className="font-mono text-xs text-ink-1">
          {format(value)}
          {!uncapped && (
            <>
              <span className="text-ink-2"> / </span>
              {format(max)}
              <span className="ml-2 text-ink-2">{pct.toFixed(1)}%</span>
            </>
          )}
          {uncapped && <span className="ml-2 text-ink-2">uncapped</span>}
        </span>
      </div>
      <div className="relative h-3 w-full rounded bg-phase-active/15">
        <div
          className="h-full rounded transition-[width] duration-500"
          style={{ width: `${uncapped ? 100 : clamped}%`, backgroundColor: uncapped ? 'rgba(139,92,246,0.25)' : fill }}
        />
        {!uncapped &&
          markers.map((m) => {
            const mp = Math.min(Number((m.value * BigInt(10000)) / max) / 100, 100);
            return (
              <div
                key={m.label}
                className="absolute top-[-3px] h-[18px] w-px bg-ink-2/60"
                style={{ left: `${mp}%` }}
                title={`${m.label}: ${format(m.value)}`}
              />
            );
          })}
      </div>
      {!uncapped && markers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
          {markers.map((m) => (
            <span key={m.label} className="font-mono text-[10px] text-ink-2">
              | {m.label}: {format(m.value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
