import type { PhaseTone } from '@/design/tokens';

// The six steps of a job. The landing's "How a job works" section and the
// market pages read from this list.
//
// They are not a marketing model: `steps` names the real buyer lifecycle
// steps from src/app/market/lib/marketStatus.ts that each phase covers, and
// phases.test.ts fails if the two ever drift apart. If the protocol grows
// a step, this file must grow with it.
//
// Copy rule (plans/site-clarity-plan.md): `label` and `action` are plain
// language for a reader without blockchain knowledge. What an expert wants to
// check goes into `technical` and `call`, which are only rendered inside
// <TechDetails>.

export interface Phase {
  id: string;
  label: string;
  // Who moves the job forward in this phase — the site's rule is that a
  // waiting state must always name whose turn it is.
  actor: 'Buyer' | 'Provider' | 'Marketplace' | 'Chain';
  // BUYER_STEPS ids covered by this phase (see marketStatus.ts)
  steps: string[];
  onchain: boolean;
  tone: PhaseTone;
  action: string;
  // what this phase leaves behind that can be checked from outside
  technical: string;
  // Move entry function that produces the on-chain record, where there is one
  call?: string;
}

export const PHASES: Phase[] = [
  {
    id: 'request',
    actor: 'Buyer',
    label: 'Post job',
    steps: ['review', 'offers'],
    onchain: false,
    tone: 'active',
    action:
      'Say what you need, what counts as done, your budget and a deadline. We review the job before it goes on the board.',
    technical:
      'Off-chain, moderated by the operator. Once approved, the specification is frozen: the exact bytes stay served under a stable URL and their SHA3-256 becomes the job’s spec hash.',
  },
  {
    id: 'quote',
    actor: 'Buyer',
    label: 'Get offer',
    steps: ['select'],
    onchain: false,
    tone: 'active',
    action: 'Providers name a price and a delivery time. You pick one offer.',
    technical:
      'Off-chain. The selected terms (price, asset, deadline, provider) are what the on-chain request is built from. Nothing is renegotiated after this point.',
  },
  {
    id: 'fund',
    actor: 'Buyer',
    label: 'Lock payment',
    steps: ['escrow'],
    onchain: true,
    tone: 'active',
    action:
      'You lock the agreed budget. It leaves your wallet, but nobody has been paid yet.',
    technical:
      'An escrow transaction on Supra Mainnet, bound to the frozen specification hash. Anyone can open it in the explorer.',
    call: 'create_outcome_request_v2',
  },
  {
    id: 'deliver',
    actor: 'Provider',
    label: 'Work happens',
    steps: ['accept', 'working'],
    onchain: true,
    tone: 'active',
    action:
      'You confirm the offer and the job starts. The provider does the work and hands in the result.',
    technical:
      'Acceptance and delivery are two separate transactions. The result hash is written on-chain before anyone looks at the work.',
    call: 'accept_quote_v2 · deliver_result_v2',
  },
  {
    id: 'verify',
    actor: 'Buyer',
    label: 'Check result',
    steps: ['approve'],
    onchain: true,
    tone: 'proof',
    action:
      'You compare the result with what you said counts as done. If you do nothing, the provider is paid when the time to check runs out.',
    technical:
      'Hash the delivered bytes yourself and compare them to the result hash already recorded on-chain. After the review window, settlement can be triggered without the buyer (timeout_settle_v2).',
  },
  {
    id: 'settle',
    actor: 'Chain',
    label: 'Pay provider',
    steps: ['settled'],
    onchain: true,
    tone: 'settled',
    action:
      'The locked payment goes to the provider. If nothing was delivered by the deadline, you take your payment back and the provider loses part of their safety deposit.',
    technical:
      'A final transaction: the job’s end state is a fact on the chain, not a status in our database. No delivery: claim_no_delivery_v2 refunds the buyer and slashes the provider bond.',
    call: 'approve_delivery_v2',
  },
];

export const PHASE_COUNT = PHASES.length;

export interface CoverageGaps {
  // lifecycle steps that no landing phase claims
  uncovered: string[];
  // steps a phase claims that the lifecycle does not have (typo / removed step)
  unknown: string[];
  // steps claimed by more than one phase
  duplicated: string[];
}

// Guard against silent drift between the landing narrative and the real buyer
// lifecycle. Kept as a pure function so the test can feed it a deliberately
// broken input and prove the check actually fails — a guard nothing can turn
// red is not a guard.
export function findPhaseCoverageGaps(lifecycleStepIds: string[], phases: Phase[]): CoverageGaps {
  const claimed = phases.flatMap((p) => p.steps);
  const seen = new Set<string>();
  const duplicated: string[] = [];
  for (const id of claimed) {
    if (seen.has(id)) duplicated.push(id);
    seen.add(id);
  }
  return {
    uncovered: lifecycleStepIds.filter((id) => !seen.has(id)),
    unknown: [...seen].filter((id) => !lifecycleStepIds.includes(id)),
    duplicated,
  };
}

export const phaseTone = (index: number, active: number): PhaseTone =>
  index <= active ? PHASES[index].tone : 'idle';
