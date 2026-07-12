'use client';

// Stacked horizontal composition bar. 24px marks, 4px rounded outer data-ends,
// 2px surface-color gaps between segments (dataviz mark spec). Values live in
// the legend below in text tokens — never inside or colored by the segment.

export type BarSegment = {
  key: string;
  label: string;
  value: bigint;
  color: string;
};

export default function CompositionBar({
  total,
  segments,
  format,
  ariaLabel,
}: {
  total: bigint;
  segments: BarSegment[];
  format: (v: bigint) => string;
  ariaLabel: string;
}) {
  const visible = segments.filter((s) => s.value > BigInt(0));
  const pct = (v: bigint) =>
    total > BigInt(0) ? Number((v * BigInt(10000)) / total) / 100 : 0;

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-6 w-full gap-[2px] overflow-hidden rounded"
      >
        {visible.length === 0 ? (
          <div className="h-full w-full rounded bg-white/5" />
        ) : (
          visible.map((s, i) => (
            <div
              key={s.key}
              title={`${s.label}: ${format(s.value)} (${pct(s.value).toFixed(1)}%)`}
              className="h-full transition-[width] duration-500"
              style={{
                width: `${pct(s.value)}%`,
                backgroundColor: s.color,
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === visible.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === visible.length - 1 ? 4 : 0,
              }}
            />
          ))
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-mono text-[11px] text-slate-500">{s.label}</span>
            <span className="font-mono text-xs text-slate-300">{format(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
