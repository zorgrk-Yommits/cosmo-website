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
    label: 'Offer selected — buyer funds next',
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

// Role split (2026-07-23): ONE rail per page, showing only the page's own
// role. `own` marks the page-role's actions (numbered for the buyer's four
// buttons, unnumbered `true` for provider actions — the artifact-only
// register node would otherwise renumber the chain per job type). `waiting`
// marks the single collapsed node where the other side / the marketplace
// acts. Arming stays a server detail with no node of its own.
export interface RoleStep {
  id: string;
  label: string;
  onchain: boolean;
  own?: 1 | 2 | 3 | 4 | true;
  waiting?: true;
  state: StepState;
  txKey?: keyof TxRefs;
}

// The rail derives from ids/fields, not just the coarse off-chain status, so
// it also works for the moderation fallback's minimal synthetic job.
export interface RoleStepInput {
  status: JobStatus;
  selectedOfferId?: string;
  requestId?: number;
  jobIdOnchain?: number;
  jobType?: 'attestation' | 'artifact';
  expectedResultHash?: string;
}

type StepDef = Omit<RoleStep, 'state'>;

const BUYER_STEPS: StepDef[] = [
  { id: 'review', label: 'Posted & review', onchain: false },
  { id: 'offers', label: 'Offers arrive', onchain: false, waiting: true },
  { id: 'select', label: 'Select offer', onchain: false, own: 1 },
  { id: 'escrow', label: 'Fund the job', onchain: true, own: 2, txKey: 'create' },
  { id: 'accept', label: 'Confirm & start', onchain: true, own: 3, txKey: 'accept' },
  { id: 'working', label: 'Provider is working', onchain: true, waiting: true, txKey: 'deliver' },
  { id: 'approve', label: 'Approve delivery', onchain: true, own: 4 },
  { id: 'settled', label: 'Settled', onchain: true, txKey: 'settle' },
];

const withStates = (defs: StepDef[], active: number): RoleStep[] =>
  defs.map((s, i) => ({
    ...s,
    state: i < active ? 'done' : i === active ? 'active' : 'pending',
  }));

export function buildBuyerSteps(job: RoleStepInput, offersCount: number): RoleStep[] {
  let active: number;
  if (job.status === 'settled') {
    active = 8; // beyond the last index — everything done
  } else if (job.status === 'delivered') {
    active = 6; // approve delivery — the buyer's fourth action
  } else if (job.jobIdOnchain != null) {
    active = 5; // provider is working
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
  return withStates(BUYER_STEPS, active);
}

export function buildProviderSteps(job: RoleStepInput): RoleStep[] {
  const isArtifact = job.jobType === 'artifact';
  const defs: StepDef[] = [
    { id: 'open', label: 'Job open for offers', onchain: false, waiting: true },
    { id: 'offer', label: 'Submit your offer', onchain: false, own: true },
    { id: 'buyer', label: 'Buyer selects & funds', onchain: true, waiting: true, txKey: 'accept' },
    ...(isArtifact ? [{ id: 'register', label: 'Register result', onchain: false, own: true as const }] : []),
    { id: 'deliver', label: 'Deliver result', onchain: true, own: true, txKey: 'deliver' },
    { id: 'settled', label: 'Paid & settled', onchain: true, txKey: 'settle' },
  ];
  const idx = (id: string) => defs.findIndex((s) => s.id === id);
  let active: number;
  if (job.status === 'settled') {
    active = defs.length; // everything done
  } else if (job.status === 'delivered') {
    active = idx('settled'); // payout pending (buyer approval or timeout)
  } else if (job.jobIdOnchain != null && isArtifact && !job.expectedResultHash) {
    active = idx('register');
  } else if (job.jobIdOnchain != null) {
    active = idx('deliver');
  } else if (job.selectedOfferId || job.requestId != null) {
    active = idx('buyer');
  } else if (job.status === 'approved') {
    active = idx('offer'); // offers stay replaceable until selection
  } else {
    active = idx('open'); // submitted / rejected
  }
  return withStates(defs, active);
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
