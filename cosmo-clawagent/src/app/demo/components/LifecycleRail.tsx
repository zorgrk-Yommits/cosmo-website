'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LifecycleStep } from '../lib/lifecycle';
import StepNode from './StepNode';

interface LifecycleRailProps {
  steps: LifecycleStep[]; // the core RFQ loop, in order
  activeId: string;
  onSelect: (id: string) => void;
}

// Horizontal signal-trace of the core loop. The connector line fills up to the
// active node as the replay advances. On mobile the rail stacks vertically.
export default function LifecycleRail({ steps, activeId, onSelect }: LifecycleRailProps) {
  const activeIndex = steps.findIndex((s) => s.id === activeId);

  return (
    <div className="relative">
      {/* base connector line (desktop) */}
      <div className="pointer-events-none absolute left-0 right-0 top-[44px] hidden h-px bg-white/10 md:block" />
      {/* progress connector (desktop) */}
      <motion.div
        className="pointer-events-none absolute left-0 top-[44px] hidden h-px bg-gradient-to-r from-purple-500/0 via-purple-400/70 to-cyan-300/70 md:block"
        initial={false}
        animate={{
          width: steps.length > 1 ? `${(activeIndex / (steps.length - 1)) * 100}%` : '0%',
        }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />

      <div
        className={cn(
          'relative flex gap-3 overflow-x-auto pb-2',
          'md:justify-between md:overflow-visible',
          'flex-col md:flex-row',
        )}
      >
        {steps.map((step, i) => (
          <StepNode
            key={step.id}
            step={step}
            index={i}
            active={step.id === activeId}
            done={i < activeIndex}
            onSelect={() => onSelect(step.id)}
          />
        ))}
      </div>
    </div>
  );
}
