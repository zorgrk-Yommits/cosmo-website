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
    <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
      <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold text-slate-200">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}
