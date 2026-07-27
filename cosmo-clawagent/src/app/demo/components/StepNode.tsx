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
    ring: 'border-phase-active/40',
    ringActive: 'border-phase-active',
    dot: 'bg-phase-active',
    glow: 'shadow-[0_0_22px_rgba(139,92,246,0.45)]',
    text: 'text-phase-active',
    tag: 'text-phase-active/70',
  },
  offchain: {
    icon: PenLine,
    ring: 'border-phase-proof/40',
    ringActive: 'border-phase-proof',
    dot: 'bg-phase-proof',
    glow: 'shadow-[0_0_22px_rgba(6,182,212,0.45)]',
    text: 'text-phase-proof',
    tag: 'text-phase-proof/70',
  },
  setup: {
    icon: Layers,
    ring: 'border-line-base',
    ringActive: 'border-line-strong',
    dot: 'bg-ink-2',
    glow: 'shadow-[0_0_16px_rgba(148,163,184,0.25)]',
    text: 'text-ink-1',
    tag: 'text-ink-2',
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
        'w-[148px] text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090B]',
        active ? cn(s.ringActive, s.glow) : cn(s.ring, 'hover:border-line-strong'),
        step.isSettlement && active && 'border-phase-settled shadow-[0_0_28px_rgba(16,185,129,0.5)]',
      )}
      aria-current={active ? 'step' : undefined}
      aria-label={`${step.title} — ${step.kind} step`}
    >
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
          active ? 'border-current' : 'border-line-base',
          step.isSettlement && active ? 'text-phase-settled' : s.text,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>

      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-2">
        {step.id}
      </span>

      <span className={cn('font-mono text-xs leading-tight', active ? 'text-ink-0' : 'text-ink-1')}>
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
