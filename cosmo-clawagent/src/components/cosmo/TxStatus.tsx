import { AlertTriangle, Check, Clock, XCircle } from 'lucide-react';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import type { TxStage } from '@/lib/txStatus';
import { cn } from '@/lib/utils';

// What happened to the thing you just signed, in the same three steps on every
// page: waiting for your signature -> sent -> confirmed. A transaction that
// failed says "failed"; one we could not confirm in time says exactly that and
// nothing more. Pair with outcomeOf() / explainSignError() from @/lib/txStatus.

const STEPS = [
  { id: 'signing', label: 'Sign in wallet' },
  { id: 'sent', label: 'Sent' },
  { id: 'confirmed', label: 'Confirmed' },
] as const;

// index of the step that is in progress (or was reached) for each stage
const AT: Record<Exclude<TxStage, 'idle'>, number> = {
  signing: 0,
  sent: 1,
  confirmed: 2,
  failed: 2,
  unconfirmed: 2,
};

export default function TxStatus({
  stage,
  message,
  txHash,
  className,
}: {
  stage: TxStage;
  // plain sentence for the current stage; required for failed / unconfirmed
  message?: string;
  txHash?: string | null;
  className?: string;
}) {
  if (stage === 'idle') return null;
  const at = AT[stage];
  const failed = stage === 'failed';
  const unconfirmed = stage === 'unconfirmed';

  const fallback =
    stage === 'signing'
      ? 'Waiting for your signature in the wallet.'
      : stage === 'sent'
        ? 'Sent. Waiting for confirmation.'
        : stage === 'confirmed'
          ? 'Confirmed on chain.'
          : failed
            ? 'Failed.'
            : 'Not confirmed yet.';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col gap-2.5 rounded-xl border border-line-base bg-surface-1 p-4', className)}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5" aria-label="Transaction progress">
        {STEPS.map((s, i) => {
          const done = i < at || (i === at && stage === 'confirmed');
          const now = i === at && (stage === 'signing' || stage === 'sent');
          const bad = i === at && failed;
          const open = i === at && unconfirmed;
          const Icon = done ? Check : bad ? XCircle : open ? AlertTriangle : Clock;
          return (
            <li key={s.id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true" className="font-mono text-xs text-ink-2">→</span>}
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider',
                  done && 'text-phase-settled',
                  now && 'font-bold text-phase-active',
                  bad && 'font-bold text-phase-fault',
                  open && 'font-bold text-phase-warn',
                  !done && !now && !bad && !open && 'text-ink-2',
                )}
              >
                <Icon
                  className={cn('h-3.5 w-3.5', now && 'animate-pulse motion-reduce:animate-none')}
                  aria-hidden="true"
                />
                {bad ? 'Failed' : open ? 'Not confirmed yet' : s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p
        className={cn(
          'text-pretty text-sm leading-relaxed',
          failed ? 'text-phase-fault' : unconfirmed ? 'text-phase-warn' : 'text-ink-1',
        )}
      >
        {message ?? fallback}
      </p>
      {txHash && (
        <a
          href={`${EXPLORER_TX}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start font-mono text-xs text-phase-proof underline-offset-2 hover:underline"
        >
          View transaction
        </a>
      )}
    </div>
  );
}
