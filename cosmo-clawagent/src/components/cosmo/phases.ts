import type { PhaseTone } from '@/design/tokens';

// The settlement rail. These six phases are the site's one recurring visual
// system — the hero core, the scroll sequence and the market pages all read
// from this list.
//
// They are not a marketing model: `steps` names the real buyer lifecycle
// steps from src/app/market/lib/marketStatus.ts that each phase covers, and
// phaseMap.test.ts fails if the two ever drift apart. If the protocol grows
// a step, this file must grow with it.

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
  status: string;
  action: string;
  proof: string;
  // Move entry function that produces the on-chain record, where there is one
  call?: string;
}

export const PHASES: Phase[] = [
  {
    id: 'request',
    actor: 'Marketplace',
    label: 'Request',
    steps: ['review', 'offers'],
    onchain: false,
    tone: 'active',
    status: 'Open for offers',
    action:
      'A buyer publishes a task: what has to be true for it to count as done, a budget, a deadline.',
    proof:
      'Once approved, the specification is frozen — the exact bytes stay served under a stable URL and their SHA3-256 becomes the job’s spec hash.',
  },
  {
    id: 'quote',
    actor: 'Buyer',
    label: 'Quote',
    steps: ['select'],
    onchain: false,
    tone: 'active',
    status: 'Offer selected',
    action:
      'Providers price the task and commit to a delivery window. The buyer selects one offer.',
    proof:
      'The selected terms — price, asset, deadline, provider — are what the on-chain request is built from. Nothing is renegotiated after this point.',
  },
  {
    id: 'fund',
    actor: 'Buyer',
    label: 'Fund',
    steps: ['escrow'],
    onchain: true,
    tone: 'active',
    status: 'Escrowed',
    action:
      'The buyer locks the budget on Supra Mainnet, bound to the frozen specification hash.',
    proof: 'An escrow transaction anyone can open in the explorer.',
    call: 'create_outcome_request_v2',
  },
  {
    id: 'deliver',
    actor: 'Provider',
    label: 'Deliver',
    steps: ['accept', 'working'],
    onchain: true,
    tone: 'active',
    status: 'In execution',
    action:
      'The buyer confirms and the job starts. The provider works, then submits the result with its hash.',
    proof:
      'Acceptance and delivery are two separate transactions; the result hash is written on-chain before anyone looks at the work.',
    call: 'accept_quote_v2 · deliver_result_v2',
  },
  {
    id: 'verify',
    actor: 'Buyer',
    label: 'Verify',
    steps: ['approve'],
    onchain: true,
    tone: 'proof',
    status: 'Awaiting approval',
    action:
      'The delivered artifact is checked against the acceptance criteria that were frozen before any money moved.',
    proof:
      'Hash the delivered bytes yourself and compare them to the result hash already recorded on-chain. The check does not depend on us.',
  },
  {
    id: 'settle',
    actor: 'Chain',
    label: 'Settle',
    steps: ['settled'],
    onchain: true,
    tone: 'settled',
    status: 'Settled',
    action:
      'The payout is released to the provider — or, if delivery failed, the provider’s security deposit absorbs the loss.',
    proof: 'A final transaction. The job’s end state is a fact on the chain, not a status in our database.',
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
