import { cn } from '@/lib/utils';

// "Where are my tokens?" as one picture: a bar split into where they sit, and
// a legend that says the same thing in words and numbers. Used before signing
// (what will change) and on overview pages (what is true now).
//
// The component only draws. Amounts are passed in already formatted; `value`
// is used for the bar proportions alone, so no rounding here can misstate a
// balance. A part with an unknown amount is listed but left out of the bar.

export type PositionKind = 'wallet' | 'locked' | 'free' | 'risk';

export type PositionPart = {
  kind: PositionKind;
  // overrides the default label, e.g. "Locked in this job"
  label?: string;
  // formatted amount with unit, e.g. "200 wCOSMO"; null = could not be read
  amount: string | null;
  // same quantity as a plain number, for the bar only
  value?: number;
  // when and how it becomes available, or what the risk is
  hint?: React.ReactNode;
};

const KIND: Record<PositionKind, { label: string; bar: string; swatch: string }> = {
  wallet: { label: 'In your wallet', bar: 'bg-ink-1', swatch: 'bg-ink-1' },
  locked: { label: 'Locked', bar: 'bg-phase-active', swatch: 'bg-phase-active' },
  free: { label: 'Free to withdraw', bar: 'bg-phase-settled', swatch: 'bg-phase-settled' },
  // Not a place tokens sit in, but a share of them that can be lost: listed,
  // never added to the bar.
  risk: { label: 'At risk', bar: '', swatch: 'bg-phase-warn' },
};

export default function TokenPosition({
  parts,
  title,
  className,
}: {
  parts: PositionPart[];
  title?: string;
  className?: string;
}) {
  const inBar = parts.filter((p) => p.kind !== 'risk' && typeof p.value === 'number' && p.value > 0);
  const total = inBar.reduce((sum, p) => sum + (p.value as number), 0);

  return (
    <div className={cn('rounded-xl border border-line-base bg-surface-1 p-4', className)}>
      {title && <h3 className="mb-3 text-sm font-semibold text-ink-0">{title}</h3>}

      {total > 0 && (
        <div className="mb-4 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
          {inBar.map((p, i) => (
            <span
              key={`${p.kind}-${i}`}
              className={cn('h-full min-w-[3px] rounded-[2px]', KIND[p.kind].bar)}
              style={{ flexGrow: p.value as number, flexBasis: 0 }}
            />
          ))}
        </div>
      )}

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {parts.map((p, i) => (
          <div key={`${p.kind}-${i}`} className="flex min-w-0 gap-2.5">
            <span
              aria-hidden="true"
              className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-[2px]', KIND[p.kind].swatch)}
            />
            <div className="min-w-0">
              <dt className="text-xs text-ink-2">{p.label ?? KIND[p.kind].label}</dt>
              <dd className="font-mono text-base font-semibold tabular-nums text-ink-0">
                {p.amount ?? <span className="text-ink-2">not readable right now</span>}
              </dd>
              {p.hint && <dd className="mt-0.5 text-pretty text-xs leading-snug text-ink-1">{p.hint}</dd>}
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
