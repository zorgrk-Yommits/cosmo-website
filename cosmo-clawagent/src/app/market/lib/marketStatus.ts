// Display mapping for market jobs (rfqActivity.ts precedent): status chips
// and the unified lifecycle rail with an explicit OFF-CHAIN/ON-CHAIN badge per
// step — the honest boundary is part of the UI, not a footnote.

import type { JobStatus, TxRefs } from './marketApi';

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
    label: 'Offer selected — you fund next',
    cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  onchain: {
    label: 'On-chain execution',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  delivered: {
    label: 'Delivered — buyer approval next',
    cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  settled: {
    label: 'Settled',
    cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
};

export type StepState = 'done' | 'active' | 'pending';

export type UnifiedStepId =
  | 'review'
  | 'offers'
  | 'select'
  | 'escrow'
  | 'accept'
  | 'deliver'
  | 'settle';

export interface UnifiedStep {
  id: UnifiedStepId;
  label: string;
  onchain: boolean;
  buyerAction?: 1 | 2 | 3; // the three buttons the buyer actually presses
  state: StepState;
  txKey?: keyof TxRefs;
}

// The unified lifecycle: ONE rail for the whole page. The buyer's three
// action steps (select / fund / confirm) are emphasized; arming is a server
// detail and deliberately has no node of its own. Delivery is the provider's
// step; approval/settlement closes the loop (M5). Labels use buyer
// vocabulary (Sprachpass, Etappe 5); ids stay technical.
const UNIFIED_STEPS: Omit<UnifiedStep, 'state'>[] = [
  { id: 'review', label: 'Posted & review', onchain: false },
  { id: 'offers', label: 'Offers', onchain: false },
  { id: 'select', label: 'Select offer', onchain: false, buyerAction: 1 },
  { id: 'escrow', label: 'Fund the job', onchain: true, buyerAction: 2, txKey: 'create' },
  { id: 'accept', label: 'Confirm & start', onchain: true, buyerAction: 3, txKey: 'accept' },
  { id: 'deliver', label: 'Delivery', onchain: true, txKey: 'deliver' },
  { id: 'settle', label: 'Settlement', onchain: true, txKey: 'settle' },
];

// The rail derives from ids/fields, not just the coarse off-chain status, so
// it also works for the moderation fallback's minimal synthetic job.
export interface UnifiedStepInput {
  status: JobStatus;
  selectedOfferId?: string;
  requestId?: number;
  jobIdOnchain?: number;
}

export function buildUnifiedSteps(job: UnifiedStepInput, offersCount: number): UnifiedStep[] {
  let active: number;
  if (job.status === 'settled') {
    active = 7; // beyond the last index — everything done
  } else if (job.status === 'delivered') {
    active = 6; // settlement (buyer approval or review timeout)
  } else if (job.jobIdOnchain != null) {
    active = 5; // delivery — the provider's turn
  } else if (job.requestId != null) {
    active = 4; // accept (arming happens invisibly inside this step)
  } else if (job.selectedOfferId) {
    active = 3; // escrow
  } else if (job.status === 'approved' && offersCount > 0) {
    active = 2; // select
  } else if (job.status === 'approved') {
    active = 1; // offers
  } else {
    active = 0; // submitted / rejected — review
  }
  return UNIFIED_STEPS.map((s, i) => ({
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
