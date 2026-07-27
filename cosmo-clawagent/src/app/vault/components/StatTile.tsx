'use client';

export default function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-line-base bg-surface-inset px-4 py-3">
      <div className="font-mono text-[11px] uppercase tracking-wider text-ink-2">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-ink-0">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-ink-2">{sub}</div>}
    </div>
  );
}
