// The site's plain-language vocabulary (plans/site-clarity-plan.md).
//
// Left: the technical term the contracts and older copy use. Right: what the
// interface says. The technical term stays reachable inside <TechDetails> and
// may appear once in brackets where an expert looks for it: "Rules (mandate)".
//
// scripts/check-plain-language.cjs enforces the left column out of visible
// copy; terms.test.ts keeps that script and this table in step.

export const TERMS = {
  request: 'job',
  quote: 'offer',
  settlement: 'payment',
  escrow: 'locked payment',
  bond: 'safety deposit',
  'security deposit': 'safety deposit',
  slash: 'deposit penalty',
  'penalty deduction': 'deposit penalty',
  mandate: 'rules',
  artifact: 'result',
  'acceptance criteria': 'what counts as done',
  solver: 'provider',
  'frozen specification': 'fixed job description',
  'review window': 'time to check the result',
} as const;

export type TechnicalTerm = keyof typeof TERMS;

// "request" is ordinary English ("on request") and is therefore not enforced
// by the checker; it is in the table so writers still find the mapping.
export const NOT_ENFORCED: readonly TechnicalTerm[] = ['request'];
