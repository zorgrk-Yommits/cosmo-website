'use client';

// Role-scoped lifecycle rail (role split 2026-07-23): a pure renderer for one
// role's step list (buildBuyerSteps / buildProviderSteps). Every node keeps
// its explicit OFF-CHAIN / ON-CHAIN badge (the trust boundary is rendered,
// not implied); the page-role's own action steps are emphasized with a "you"
// pill and, for the buyer's four buttons, numbered dots.

import { Check, Circle, Link2, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import type { TxRefs } from '../lib/marketApi';
import type { RoleStep, StepState } from '../lib/marketStatus';

const STATE_STYLE: Record<StepState, { dot: string; text: string }> = {
  done: { dot: 'border-phase-settled/60 bg-phase-settled/15 text-phase-settled', text: 'text-ink-1' },
  active: { dot: 'border-phase-active bg-phase-active/20 text-phase-active', text: 'text-ink-0' },
  pending: { dot: 'border-line-base bg-surface-inset text-ink-2', text: 'text-ink-2' },
};

export default function FlowRail({ steps, txRefs }: { steps: RoleStep[]; txRefs: TxRefs }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-start gap-0" aria-label="Job lifecycle">
        {steps.map((step, i) => {
          const s = STATE_STYLE[step.state];
          const isOwn = step.own !== undefined;
          const tx = step.txKey ? txRefs[step.txKey] : undefined;
          return (
            <li key={step.id} className="flex items-start">
              {i > 0 && (
                <span
                  className={cn(
                    'mx-1 h-px w-5 sm:w-8',
                    isOwn ? 'mt-4' : 'mt-3',
                    step.state === 'pending' ? 'bg-white/10' : 'bg-white/25',
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="flex flex-col items-center gap-1.5">
                {isOwn ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-phase-active">
                    you
                  </span>
                ) : (
                  <span className="h-[13px]" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'relative inline-flex shrink-0 items-center justify-center rounded-full border',
                    isOwn ? 'h-8 w-8 font-mono text-xs font-bold' : 'h-6 w-6',
                    s.dot,
                    isOwn && step.state === 'active' && 'ring-2 ring-phase-active/30',
                  )}
                >
                  {step.state === 'active' && (
                    <span className="absolute inset-0 animate-ping rounded-full border border-phase-active/50" />
                  )}
                  {step.state === 'done' ? (
                    <Check className={isOwn ? 'h-4 w-4' : 'h-3 w-3'} />
                  ) : typeof step.own === 'number' ? (
                    step.own
                  ) : (
                    <Circle className={isOwn ? 'h-2.5 w-2.5' : 'h-2 w-2'} />
                  )}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap font-mono text-[10px] uppercase tracking-wider',
                    s.text,
                    isOwn && 'font-bold',
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                    step.onchain
                      ? 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled'
                      : 'border-line-base bg-white/[0.02] text-ink-2',
                  )}
                >
                  {step.onchain ? <Link2 className="h-2.5 w-2.5" /> : <Server className="h-2.5 w-2.5" />}
                  {step.onchain ? 'on-chain' : 'off-chain'}
                </span>
                {tx && (
                  <a
                    href={`${EXPLORER_TX}${tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] text-phase-proof hover:text-phase-proof"
                  >
                    view tx
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
