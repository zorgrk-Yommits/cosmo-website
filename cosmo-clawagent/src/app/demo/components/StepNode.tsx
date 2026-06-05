'use client';

import { motion } from 'framer-motion';
import { Link2, PenLine, Layers, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LifecycleStep } from '../lib/lifecycle';

interface StepNodeProps {
  step: LifecycleStep;
  index: number; // position in the rendered sequence (for stagger)
  active: boolean;
  done: boolean; // already passed in the replay
  onSelect: () => void;
}

// Per-kind visual language:
//   onchain  -> purple, the protocol surface
//   offchain -> cyan, "off-chain by design" (a feature, not a gap)
//   setup    -> muted slate, one-time deploy phase
const KIND_STYLE = {
  onchain: {
    icon: Link2,
    ring: 'border-purple-500/40',
    ringActive: 'border-purple-400',
    dot: 'bg-purple-400',
    glow: 'shadow-[0_0_22px_rgba(139,92,246,0.45)]',
    text: 'text-purple-200',
    tag: 'text-purple-300/70',
  },
  offchain: {
    icon: PenLine,
    ring: 'border-cyan-500/40',
    ringActive: 'border-cyan-300',
    dot: 'bg-cyan-300',
    glow: 'shadow-[0_0_22px_rgba(6,182,212,0.45)]',
    text: 'text-cyan-200',
    tag: 'text-cyan-300/70',
  },
  setup: {
    icon: Layers,
    ring: 'border-white/10',
    ringActive: 'border-slate-400',
    dot: 'bg-slate-500',
    glow: 'shadow-[0_0_16px_rgba(148,163,184,0.25)]',
    text: 'text-slate-300',
    tag: 'text-slate-500',
  },
} as const;

export default function StepNode({ step, index, active, done, onSelect }: StepNodeProps) {
  const s = KIND_STYLE[step.kind];
  const Icon = step.isSettlement ? Check : s.icon;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.04 * index }}
      className={cn(
        'group relative flex shrink-0 flex-col items-center gap-2 rounded-xl border bg-[rgba(15,15,35,0.7)] px-4 py-3 backdrop-blur transition-all',
        'w-[148px] text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]',
        active ? cn(s.ringActive, s.glow) : cn(s.ring, 'hover:border-white/25'),
        step.isSettlement && active && 'border-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.5)]',
      )}
      aria-current={active ? 'step' : undefined}
      aria-label={`${step.title} — ${step.kind} step`}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
          active ? 'border-current' : 'border-white/10',
          step.isSettlement && active ? 'text-emerald-300' : s.text,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>

      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {step.id}
      </span>

      <span className={cn('font-mono text-xs leading-tight', active ? 'text-slate-100' : 'text-slate-400')}>
        {step.title}
      </span>

      {step.eventName ? (
        <span className={cn('font-mono text-[10px] leading-tight', s.tag)}>{step.eventName}</span>
      ) : step.kind === 'offchain' ? (
        <span className={cn('font-mono text-[10px] leading-tight', s.tag)}>off-chain by design</span>
      ) : null}

      {/* completed marker */}
      {done && !active && (
        <span className={cn('absolute right-2 top-2 h-1.5 w-1.5 rounded-full', s.dot)} />
      )}
    </motion.button>
  );
}
