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
    label: 'In review',
    cls: 'border-line-base bg-white/[0.02] text-ink-1',
  },
  approved: {
    label: 'Open for offers',
    cls: 'border-phase-active/40 bg-phase-active/10 text-phase-active',
  },
  rejected: {
    label: 'Not approved',
    cls: 'border-line-base bg-white/[0.02] text-ink-1',
  },
  selected: {
    label: 'Offer chosen: payment not locked yet',
    cls: 'border-phase-proof/40 bg-phase-proof/10 text-phase-proof',
  },
  onchain: {
    label: 'In progress',
    cls: 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled',
  },
  delivered: {
    label: 'Result delivered: being checked',
    cls: 'border-phase-warn/40 bg-phase-warn/10 text-phase-warn',
  },
  settled: {
    label: 'Paid',
    cls: 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled',
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
  { id: 'review', label: 'Posted, in review', onchain: false },
  { id: 'offers', label: 'Offers arrive', onchain: false, waiting: true },
  { id: 'select', label: 'Choose offer', onchain: false, own: 1 },
  { id: 'escrow', label: 'Lock payment', onchain: true, own: 2, txKey: 'create' },
  { id: 'accept', label: 'Confirm and start', onchain: true, own: 3, txKey: 'accept' },
  { id: 'working', label: 'Provider is working', onchain: true, waiting: true, txKey: 'deliver' },
  { id: 'approve', label: 'Check result', onchain: true, own: 4 },
  { id: 'settled', label: 'Provider paid', onchain: true, txKey: 'settle' },
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
    { id: 'offer', label: 'Make your offer', onchain: false, own: true },
    { id: 'buyer', label: 'Buyer chooses and locks payment', onchain: true, waiting: true, txKey: 'accept' },
    ...(isArtifact ? [{ id: 'register', label: 'Register result', onchain: false, own: true as const }] : []),
    { id: 'deliver', label: 'Hand in result', onchain: true, own: true, txKey: 'deliver' },
    { id: 'settled', label: 'Paid', onchain: true, txKey: 'settle' },
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

// ---- The five-stage picture (site-clarity plan) --------------------------------
// Waiting -> Accepted -> Running -> Checking -> Paid, derived from the same
// fields the detailed rail uses plus the on-chain job status. On-chain,
// "accepted" and "running" are one state (ACTIVE); the split shown here is:
// Accepted = an offer is chosen but the job has not started, Running = the
// on-chain job exists. A job that left the happy path gets an END STATE next
// to the track; it is never pressed into one of the five stages.

export type JobStage = 'waiting' | 'accepted' | 'running' | 'checking' | 'paid';

export interface StageView {
  current: JobStage;
  // one sentence: what is happening and who acts next
  note: string;
  // the buyer is the one who has to act now
  yourTurn: boolean;
  end?: { label: string; tone: 'bad' | 'neutral' };
}

export interface StageInput extends RoleStepInput {
  offersCount: number;
  // get_job_v2 status (0 ACTIVE .. 5 REFUNDED); null/undefined = not read
  onchainStatus?: number | null;
  // absolute unix secs; null/undefined = not known
  deliverDueSecs?: number | null;
  checkBySecs?: number | null;
  // the on-chain request was closed before a job started (cancelled / expired)
  requestClosed?: boolean;
  nowSec?: number;
}

// Mirrors compute_rfq job status codes (see computeViews.JOB_ONCHAIN_STATUS).
const ONCHAIN = { SLASHED: 3, DISPUTED: 4, REFUNDED: 5 } as const;

export function buyerStageView(j: StageInput): StageView {
  if (j.status === 'rejected') {
    return {
      current: 'waiting',
      yourTurn: false,
      note: 'This job was not approved for the pilot board. Nothing was charged.',
      end: { label: 'Not approved', tone: 'neutral' },
    };
  }
  if (j.onchainStatus === ONCHAIN.SLASHED) {
    return {
      current: 'running',
      yourTurn: false,
      note: 'No result arrived by the deadline. Your payment was returned and the provider lost part of their safety deposit.',
      end: { label: 'Not delivered: payment refunded, provider penalised', tone: 'bad' },
    };
  }
  if (j.onchainStatus === ONCHAIN.DISPUTED) {
    return {
      current: 'checking',
      yourTurn: false,
      note: 'The result is in dispute. The payment stays locked until the dispute is decided.',
      end: { label: 'In dispute', tone: 'neutral' },
    };
  }
  if (j.onchainStatus === ONCHAIN.REFUNDED) {
    return {
      current: 'checking',
      yourTurn: false,
      note: 'The payment was returned to you.',
      end: { label: 'Refunded', tone: 'neutral' },
    };
  }
  if (j.status === 'settled') {
    return { current: 'paid', yourTurn: false, note: 'The provider was paid. This job is complete.' };
  }
  if (j.status === 'delivered') {
    return {
      current: 'checking',
      yourTurn: true,
      note: j.checkBySecs
        ? `Your turn: check the result by ${fmtTs(j.checkBySecs)}. After that the provider is paid automatically.`
        : 'Your turn: check the result. If you do nothing, the provider is paid automatically when the time to check runs out.',
    };
  }
  if (j.jobIdOnchain != null) {
    const late = !!j.deliverDueSecs && j.nowSec !== undefined && j.nowSec > j.deliverDueSecs;
    if (late) {
      return {
        current: 'running',
        yourTurn: true,
        note: 'No result arrived by the deadline. You can take your payment back on My tokens.',
      };
    }
    return {
      current: 'running',
      yourTurn: false,
      note: j.deliverDueSecs
        ? `The provider is working. The result is due by ${fmtTs(j.deliverDueSecs)}.`
        : 'The provider is working. Nothing to do right now.',
    };
  }
  if (j.requestClosed) {
    return {
      current: 'accepted',
      yourTurn: false,
      note: 'This job was closed before it started. If your payment was locked, take it back on My tokens.',
      end: { label: 'Closed before it started', tone: 'neutral' },
    };
  }
  if (j.requestId != null) {
    return {
      current: 'accepted',
      yourTurn: true,
      note: 'Your payment is locked. Your turn: confirm the offer to start the job.',
    };
  }
  if (j.selectedOfferId) {
    return {
      current: 'accepted',
      yourTurn: true,
      note: 'You chose an offer. Your turn: lock the payment.',
    };
  }
  if (j.status === 'approved' && j.offersCount > 0) {
    return { current: 'waiting', yourTurn: true, note: 'Offers are in. Your turn: choose one.' };
  }
  if (j.status === 'approved') {
    return {
      current: 'waiting',
      yourTurn: false,
      note: 'Waiting for offers from providers. Nothing to do right now.',
    };
  }
  return { current: 'waiting', yourTurn: false, note: 'Your job is in review. Nothing to do right now.' };
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
