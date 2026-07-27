'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LifecycleStep } from '../lib/lifecycle';

interface DeployDrawerProps {
  steps: LifecycleStep[];
  open: boolean;
  activeId: string | null;
  onToggle: () => void;
  onSelect: (id: string) => void;
}

// The one-time deploy/mint/init phase. Collapsed by default so the first glance
// shows only the core RFQ loop. These steps are "skipped" in the snapshot
// (the contracts were already live) — shown here for completeness, not as the story.
export default function DeployDrawer({ steps, open, activeId, onToggle, onSelect }: DeployDrawerProps) {
  // The Mainnet round-trip capture carries no setup steps -> hide the drawer entirely
  // rather than showing an empty "0 steps" shell.
  if (steps.length === 0) return null;
  return (
    <div className="rounded-xl border border-line-base bg-surface-1 backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn('h-4 w-4 text-ink-2 transition-transform', open && 'rotate-90')}
        />
        <Layers className="h-4 w-4 text-ink-2" />
        <span className="font-mono text-xs uppercase tracking-wider text-ink-1">
          Deploy phase (one-time)
        </span>
        <span className="font-mono text-[10px] text-ink-2">
          {steps.length} steps · already live
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
              {steps.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors',
                    activeId === s.id
                      ? 'border-line-strong text-ink-0'
                      : 'border-line-base text-ink-2 hover:border-line-strong hover:text-ink-1',
                  )}
                >
                  <span className="text-ink-2">{s.id}</span> {s.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
