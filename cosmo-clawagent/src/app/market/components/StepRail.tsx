'use client';

// 7-step marketplace lifecycle rail. Every node carries an explicit
// OFF-CHAIN / ON-CHAIN badge — the trust boundary is rendered, not implied
// (PhaseRail precedent: state never rides on color alone).

import { Check, Circle, Link2, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketStep, StepState } from '../lib/marketStatus';

const STATE_STYLE: Record<StepState, { dot: string; text: string }> = {
  done: { dot: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300', text: 'text-slate-300' },
  active: { dot: 'border-purple-400 bg-purple-500/20 text-purple-300', text: 'text-slate-100' },
  pending: { dot: 'border-white/15 bg-black/30 text-slate-600', text: 'text-slate-600' },
};

export default function StepRail({ steps }: { steps: MarketStep[] }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-start gap-0" aria-label="Job lifecycle">
        {steps.map((step, i) => {
          const s = STATE_STYLE[step.state];
          return (
            <li key={step.id} className="flex items-start">
              {i > 0 && (
                <span
                  className={cn(
                    'mx-1 mt-3 h-px w-5 sm:w-8',
                    step.state === 'pending' ? 'bg-white/10' : 'bg-white/25',
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                    s.dot,
                  )}
                >
                  {step.state === 'active' && (
                    <span className="absolute inset-0 animate-ping rounded-full border border-purple-400/50" />
                  )}
                  {step.state === 'done' ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                </span>
                <span className={cn('whitespace-nowrap font-mono text-[10px] uppercase tracking-wider', s.text)}>
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
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
