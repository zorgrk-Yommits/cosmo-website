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
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn('h-4 w-4 text-slate-500 transition-transform', open && 'rotate-90')}
        />
        <Layers className="h-4 w-4 text-slate-500" />
        <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
          Deploy-Phase (einmalig)
        </span>
        <span className="font-mono text-[10px] text-slate-600">
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
                      ? 'border-slate-400 text-slate-100'
                      : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-slate-300',
                  )}
                >
                  <span className="text-slate-600">{s.id}</span> {s.title}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
