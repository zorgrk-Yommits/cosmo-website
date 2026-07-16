// Display mapping for market jobs (rfqActivity.ts precedent): status chips
// and the 7-step lifecycle rail with an explicit OFF-CHAIN/ON-CHAIN badge per
// step — the honest boundary is part of the UI, not a footnote.

import type { JobStatus, MarketJob } from './marketApi';

export interface StatusBadge {
  label: string;
  cls: string;
}

export const STATUS_BADGE: Record<JobStatus, StatusBadge> = {
  submitted: {
    label: 'In moderation',
    cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  },
  approved: {
    label: 'Open for offers',
    cls: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  },
  rejected: {
    label: 'Rejected',
    cls: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
  },
  selected: {
    label: 'Offer selected — escrow next',
    cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  onchain: {
    label: 'On-chain execution',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
};

export type StepState = 'done' | 'active' | 'pending';

export interface MarketStep {
  id: string;
  label: string;
  onchain: boolean;
  state: StepState;
}

// The 7-step spec from the release plan. Steps 1-3 run on our server; from
// selection (step 4) on, every step is a verifiable mainnet transaction.
const STEPS: { id: string; label: string; onchain: boolean }[] = [
  { id: 'posted', label: 'Job posted', onchain: false },
  { id: 'review', label: 'Review + spec freeze', onchain: false },
  { id: 'offers', label: 'Offers', onchain: false },
  { id: 'escrow', label: 'Selection + escrow', onchain: true },
  { id: 'delivery', label: 'Delivery', onchain: true },
  { id: 'acceptance', label: 'Acceptance / dispute', onchain: true },
  { id: 'settlement', label: 'Settlement', onchain: true },
];

// Which step is ACTIVE for a given off-chain status. Finer on-chain
// sub-states (delivered, disputed, settled) arrive with M4/M5 once the rail
// can read them from the on-chain request; until then "onchain" sits at
// escrow-done, delivery-active.
const ACTIVE_STEP: Record<JobStatus, number> = {
  submitted: 1, // review active
  approved: 2, // offers active
  rejected: 1, // review was the terminal step
  selected: 3, // escrow active
  onchain: 4, // delivery active
};

export function buildSteps(job: MarketJob): MarketStep[] {
  const active = ACTIVE_STEP[job.status];
  return STEPS.map((s, i) => ({
    ...s,
    state: i < active ? 'done' : i === active ? 'active' : 'pending',
  }));
}

export const fmtTs = (secs: number) =>
  new Date(secs * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export function fmtRel(secs: number, nowSec: number): string {
  const d = secs - nowSec;
  const abs = Math.abs(d);
  const fmt =
    abs < 90
      ? `${abs}s`
      : abs < 5400
        ? `${Math.round(abs / 60)}m`
        : abs < 129600
          ? `${Math.round(abs / 3600)}h`
          : `${Math.round(abs / 86400)}d`;
  return d >= 0 ? `in ${fmt}` : `${fmt} ago`;
}

export function fmtDelivery(secs: number): string {
  if (secs < 7200) return `${Math.round(secs / 60)} min`;
  if (secs < 172800) return `${Math.round(secs / 3600)} h`;
  return `${Math.round(secs / 86400)} d`;
}
