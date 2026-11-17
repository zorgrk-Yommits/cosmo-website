// Small layout pieces of /portfolio, moved out of PortfolioView.tsx unchanged so
// the wallet areas (plans/cosmo-wallet-v01-plan.md) can use the same rows.

import { cn } from '@/lib/utils';
import { fmtTokenAmt, sumByToken, type Position } from '../lib/positions';

export type RowTone = 'active' | 'proof' | 'warn' | 'settled' | 'fault' | 'neutral';

export function Row({
  n,
  title,
  tone,
  total,
  children,
}: {
  n: string;
  title: string;
  tone: RowTone;
  total?: Position[];
  children: React.ReactNode;
}) {
  const sums = total ? sumByToken(total) : [];
  return (
    <section
      className={cn(
        'mt-6 rounded-xl border p-5',
        tone === 'active' && 'border-phase-active/25 bg-phase-active/[0.04]',
        tone === 'proof' && 'border-phase-proof/25 bg-phase-proof/[0.04]',
        tone === 'warn' && 'border-phase-warn/25 bg-phase-warn/[0.04]',
        tone === 'settled' && 'border-phase-settled/25 bg-phase-settled/[0.04]',
        tone === 'fault' && 'border-phase-fault/25 bg-phase-fault/[0.04]',
        tone === 'neutral' && 'border-line-base bg-surface-1',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-1">
          <span className="text-ink-2">{n} ·</span> {title}
        </h2>
        {sums.length > 0 && (
          <span className="font-mono text-sm text-ink-0">{sums.map((s) => fmtTokenAmt(s.amount, s.token)).join(' + ')}</span>
        )}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
      <dt className="text-[12px] text-ink-2">{k}</dt>
      <dd className="text-ink-0">{v}</dd>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-ink-2">{children}</p>;
}
