'use client';

// Slim per-request lifecycle rail. Deliberately NOT the /demo LifecycleRail
// (whose types are coupled to the static replay capture): this one is pure
// presentational, non-interactive, and models terminal variants (Reclaimed,
// Expired unserved, Vetoed, ...). Dataviz rule: every node carries icon +
// text label — state never rides on color alone.

import {
  Check,
  Circle,
  Hourglass,
  RotateCcw,
  ShieldAlert,
  Snowflake,
  TimerOff,
  Undo2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseNode, PhaseNodeState } from '../lib/rfqActivity';

const TERMINAL_ICONS: Record<string, LucideIcon> = {
  reclaimed: Undo2,
  'awaiting-reclaim': Hourglass,
  expired: TimerOff,
  cancelled: XCircle,
  vetoed: ShieldAlert,
  frozen: Snowflake,
  unwound: RotateCcw,
};

const STATE_STYLE: Record<PhaseNodeState, { dot: string; text: string }> = {
  done: { dot: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300', text: 'text-slate-300' },
  active: { dot: 'border-purple-400 bg-purple-500/20 text-purple-300', text: 'text-slate-100' },
  pending: { dot: 'border-white/15 bg-black/30 text-slate-600', text: 'text-slate-600' },
  'terminal-bad': { dot: 'border-rose-500/60 bg-rose-500/15 text-rose-300', text: 'text-rose-300' },
  'terminal-neutral': {
    dot: 'border-slate-500/50 bg-slate-500/10 text-slate-400',
    text: 'text-slate-400',
  },
};

function NodeIcon({ node }: { node: PhaseNode }) {
  if (node.state === 'done') return <Check className="h-3 w-3" />;
  const Terminal = TERMINAL_ICONS[node.id];
  if (Terminal) return <Terminal className="h-3 w-3" />;
  return <Circle className="h-2 w-2" />;
}

export default function PhaseRail({ nodes }: { nodes: PhaseNode[] }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-0" aria-label="Request lifecycle">
        {nodes.map((node, i) => {
          const s = STATE_STYLE[node.state];
          return (
            <li key={node.id} className="flex items-center">
              {i > 0 && (
                <span
                  className={cn(
                    'mx-1 h-px w-6 sm:w-9',
                    node.state === 'pending' ? 'bg-white/10' : 'bg-white/25',
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                    s.dot,
                  )}
                >
                  {node.state === 'active' && (
                    <span className="absolute inset-0 animate-ping rounded-full border border-purple-400/50" />
                  )}
                  <NodeIcon node={node} />
                </span>
                <span className={cn('whitespace-nowrap font-mono text-[10px] uppercase tracking-wider', s.text)}>
                  {node.label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
