'use client';

// Status indicator pill — state is always carried by icon + label together,
// never by color alone (dataviz status rule).

import { AlertTriangle, HelpCircle, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LampState = 'good' | 'warning' | 'critical' | 'unknown';

const STYLES: Record<LampState, { box: string; dot: string; text: string; icon: LucideIcon }> = {
  good: {
    box: 'border-phase-settled/40 bg-phase-settled/[0.07]',
    dot: 'bg-phase-settled',
    text: 'text-phase-settled',
    icon: ShieldCheck,
  },
  warning: {
    box: 'border-phase-warn/40 bg-phase-warn/[0.07]',
    dot: 'bg-phase-warn',
    text: 'text-phase-warn',
    icon: AlertTriangle,
  },
  critical: {
    box: 'border-phase-fault/40 bg-phase-fault/[0.07]',
    dot: 'bg-phase-fault',
    text: 'text-phase-fault',
    icon: ShieldAlert,
  },
  unknown: {
    box: 'border-line-base bg-surface-inset',
    dot: 'bg-ink-2',
    text: 'text-ink-1',
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
      <span className="font-mono text-xs text-ink-0">{label}</span>
      {detail && <span className="font-mono text-[11px] text-ink-2">{detail}</span>}
    </div>
  );
}
