'use client';

// Unified marketplace lifecycle rail — the ONE step indicator on the job page
// (replaces the old StepRail + BuyerFlow step circles pair). Every node keeps
// its explicit OFF-CHAIN / ON-CHAIN badge (the trust boundary is rendered,
// not implied); the buyer's three action steps are visually emphasized with
// numbered dots and a "you" pill; M5 nodes are tagged "soon" and never look
// actionable.

import { Check, Circle, Link2, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import type { TxRefs } from '../lib/marketApi';
import {
  buildUnifiedSteps,
  type StepState,
  type UnifiedStepInput,
} from '../lib/marketStatus';

const STATE_STYLE: Record<StepState, { dot: string; text: string }> = {
  done: { dot: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300', text: 'text-slate-300' },
  active: { dot: 'border-purple-400 bg-purple-500/20 text-purple-300', text: 'text-slate-100' },
  pending: { dot: 'border-white/15 bg-black/30 text-slate-600', text: 'text-slate-600' },
};

export default function FlowRail({
  job,
  offersCount,
}: {
  job: UnifiedStepInput & { txRefs: TxRefs };
  offersCount: number;
}) {
  const steps = buildUnifiedSteps(job, offersCount);
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-start gap-0" aria-label="Job lifecycle">
        {steps.map((step, i) => {
          // M5 steps never pulse like an action — they wait, amber-tinted.
          const waitingOnM5 = step.future && step.state === 'active';
          const s = STATE_STYLE[step.state];
          const isBuyer = step.buyerAction !== undefined;
          const tx = step.txKey ? job.txRefs[step.txKey] : undefined;
          return (
            <li key={step.id} className="flex items-start">
              {i > 0 && (
                <span
                  className={cn(
                    'mx-1 h-px w-5 sm:w-8',
                    isBuyer ? 'mt-4' : 'mt-3',
                    step.state === 'pending' ? 'bg-white/10' : 'bg-white/25',
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="flex flex-col items-center gap-1.5">
                {isBuyer ? (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-purple-300">
                    you
                  </span>
                ) : (
                  <span className="h-[13px]" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'relative inline-flex shrink-0 items-center justify-center rounded-full border',
                    isBuyer ? 'h-8 w-8 font-mono text-xs font-bold' : 'h-6 w-6',
                    waitingOnM5
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : s.dot,
                    isBuyer && step.state === 'active' && 'ring-2 ring-purple-500/30',
                  )}
                >
                  {step.state === 'active' && !step.future && (
                    <span className="absolute inset-0 animate-ping rounded-full border border-purple-400/50" />
                  )}
                  {waitingOnM5 && (
                    <span className="absolute inset-0 animate-pulse rounded-full border border-amber-400/40" />
                  )}
                  {step.state === 'done' ? (
                    <Check className={isBuyer ? 'h-4 w-4' : 'h-3 w-3'} />
                  ) : isBuyer ? (
                    step.buyerAction
                  ) : (
                    <Circle className="h-2 w-2" />
                  )}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap font-mono text-[10px] uppercase tracking-wider',
                    waitingOnM5 ? 'text-amber-300' : s.text,
                    isBuyer && 'font-bold',
                  )}
                >
                  {step.label}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                    step.onchain
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
                  )}
                >
                  {step.onchain ? <Link2 className="h-2.5 w-2.5" /> : <Server className="h-2.5 w-2.5" />}
                  {step.onchain ? 'on-chain' : 'off-chain'}
                </span>
                {step.future && (
                  <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                    soon (M5)
                  </span>
                )}
                {tx && (
                  <a
                    href={`${EXPLORER_TX}${tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] text-sky-400 hover:text-sky-300"
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
