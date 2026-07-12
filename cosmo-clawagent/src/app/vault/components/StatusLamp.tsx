'use client';

// Status indicator pill — state is always carried by icon + label together,
// never by color alone (dataviz status rule).

import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LampState = 'good' | 'warning' | 'critical' | 'unknown';

const STYLES: Record<LampState, { box: string; dot: string; text: string; icon: LucideIcon }> = {
  good: {
    box: 'border-emerald-500/40 bg-emerald-500/[0.07]',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    icon: ShieldCheck,
  },
  warning: {
    box: 'border-amber-500/40 bg-amber-500/[0.07]',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    icon: AlertTriangle,
  },
  critical: {
    box: 'border-rose-500/40 bg-rose-500/[0.07]',
    dot: 'bg-rose-400',
    text: 'text-rose-300',
    icon: ShieldAlert,
  },
  unknown: {
    box: 'border-white/10 bg-black/20',
    dot: 'bg-slate-500',
    text: 'text-slate-400',
    icon: HelpCircle,
  },
};

export default function StatusLamp({
  state,
  label,
  detail,
  icon,
}: {
  state: LampState;
  label: string;
  detail?: string;
  icon?: LucideIcon;
}) {
  const s = STYLES[state];
  const Icon = icon ?? s.icon;
  return (
    <div className={cn('inline-flex items-center gap-2.5 rounded-lg border px-3.5 py-2', s.box)}>
      <span className={cn('inline-flex h-2 w-2 shrink-0 rounded-full', s.dot)} />
      <Icon className={cn('h-4 w-4 shrink-0', s.text)} />
      <span className="font-mono text-xs text-slate-200">{label}</span>
      {detail && <span className="font-mono text-[11px] text-slate-500">{detail}</span>}
    </div>
  );
}
