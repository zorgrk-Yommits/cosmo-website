import { describe, it, expect } from 'vitest';
import {
  bondState,
  makerBondPosition,
  providerBondPosition,
  councilBondPosition,
  classifyRfqRequest,
  classifyRfqAccepted,
  classifyCmpRequest,
  classifyCmpJob,
  parseRfqRequest,
  parseRfqAccepted,
  parseCmpJob,
  sumByToken,
  fmtTokenAmt,
  RFQ_REQ,
  RFQ_ACC,
  CMP_REQ,
  CMP_JOB,
  DISPUTE_TTL_SECS,
  type Token,
} from './positions';

const W: Token = { meta: '0xwcosmo', symbol: 'wCOSMO', decimals: 6 };
const T: Token = { meta: '0xtin', symbol: 'TINTEST', decimals: 6 };
const tokenOf = (m: string) => (m === W.meta ? W : T);
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const ME = '0xME';
const OTHER = '0xOTHER';
const NOW = BigInt(1_800_000_000);
const M = BigInt(1_000_000);

describe('bondState', () => {
  const base = { amount: M, lockedUntilSecs: BigInt(0), activeJobs: BigInt(0), slashCount: BigInt(0) };
  it('withdrawable now without lock or job', () => {
    expect(bondState(base, NOW).withdrawableNow).toBe(true);
  });
  it('lock exactly at now is not a lock; one second later it is', () => {
    expect(bondState({ ...base, lockedUntilSecs: NOW }, NOW).withdrawableNow).toBe(true);
    const s = bondState({ ...base, lockedUntilSecs: NOW + BigInt(1) }, NOW);
    expect(s.withdrawableNow).toBe(false);
    expect(s.lockedUntilSecs).toBe(NOW + BigInt(1));
    expect(s.next).toContain('Withdrawable from');
  });
  it('active job blocks even without a lock, and wins over the lock text', () => {
    const s = bondState({ ...base, activeJobs: BigInt(1), lockedUntilSecs: NOW + BigInt(99) }, NOW);
    expect(s.withdrawableNow).toBe(false);
    expect(s.next).toContain('blocked while a job is active');
  });
});

describe('bond positions', () => {
  it('skip empty bonds and null', () => {
    expect(makerBondPosition(null, W, NOW)).toBeNull();
    expect(providerBondPosition({ amount: BigInt(0), lockedUntilSecs: BigInt(0), activeJobs: BigInt(0), slashCount: BigInt(0) }, W, NOW)).toBeNull();
    expect(councilBondPosition(null, W)).toBeNull();
  });
  it('council bond has no return path', () => {
    const p = councilBondPosition(M, W)!;
    expect(p.bucket).toBe('bonded');
    expect(p.returnFn).toBeNull();
    expect(p.next).toContain('No withdraw function in v1');
  });
});

describe('classifyRfqRequest', () => {
  const req = {
    requestId: BigInt(3),
    requester: ME,
    tokenIn: T.meta,
    amountIn: M,
    tokenOut: W.meta,
    minAmountOut: M,
    requestFeeQuants: BigInt(1000),
    createdAt: NOW - BigInt(100),
    expiresAt: NOW + BigInt(100),
    status: RFQ_REQ.FUNDED,
  };
  const quote = { hasQuote: true, makerOperator: OTHER, amountOut: M * BigInt(2), settlementDeadlineSecs: NOW };

  it('requester fee is gone, in wCOSMO, never claimable', () => {
    const ps = classifyRfqRequest(req, quote, ME, NOW, tokenOf, W, eq);
    const fee = ps.find((p) => p.bucket === 'gone')!;
    expect(fee.amount).toBe(BigInt(1000));
    expect(fee.token).toBe(W);
    expect(fee.returnFn).toBeNull();
    expect(ps.some((p) => p.bucket === 'escrow' || p.bucket === 'claimable')).toBe(false);
  });

  it('maker leg of a funded quote is escrow before expiry and claimable from expiry', () => {
    const before = classifyRfqRequest(req, quote, OTHER, NOW, tokenOf, W, eq);
    expect(before).toHaveLength(1);
    expect(before[0].bucket).toBe('escrow');
    expect(before[0].role).toBe('maker');
    expect(before[0].amount).toBe(M * BigInt(2));
    expect(before[0].returnAfterSecs).toBe(req.expiresAt);
    // boundary: 1 s before expiry still escrow, at expiry claimable
    expect(classifyRfqRequest(req, quote, OTHER, req.expiresAt - BigInt(1), tokenOf, W, eq)[0].bucket).toBe('escrow');
    const at = classifyRfqRequest(req, quote, OTHER, req.expiresAt, tokenOf, W, eq)[0];
    expect(at.bucket).toBe('claimable');
    expect(at.returnFn).toBe('rfq_engine::reclaim_unaccepted_quote');
  });

  it('a reclaimed (status 4) or accepted (status 2) request holds no maker leg', () => {
    expect(classifyRfqRequest({ ...req, status: RFQ_REQ.EXPIRED }, quote, OTHER, NOW, tokenOf, W, eq)).toHaveLength(0);
    expect(classifyRfqRequest({ ...req, status: RFQ_REQ.ACCEPTED }, quote, OTHER, NOW, tokenOf, W, eq)).toHaveLength(0);
  });

  it('zero fee produces no gone row', () => {
    expect(classifyRfqRequest({ ...req, requestFeeQuants: BigInt(0), status: RFQ_REQ.CANCELLED }, null, ME, NOW, tokenOf, W, eq)).toHaveLength(0);
  });
});

describe('classifyRfqAccepted', () => {
  const acc = {
    quoteId: BigInt(1),
    requestId: BigInt(3),
    taker: ME,
    makerOperator: OTHER,
    tokenIn: T.meta,
    amountIn: M,
    tokenOut: W.meta,
    promisedAmountOut: M * BigInt(2),
    settlementDeadlineSecs: NOW + BigInt(60),
    status: RFQ_ACC.PENDING,
  };

  it('taker leg pending: escrow with claim_unwind after the deadline', () => {
    const ps = classifyRfqAccepted(acc, ME, NOW, tokenOf, eq);
    expect(ps).toHaveLength(1);
    expect(ps[0].role).toBe('taker');
    expect(ps[0].bucket).toBe('escrow');
    expect(ps[0].amount).toBe(M);
    expect(ps[0].token).toBe(T);
    expect(ps[0].returnFn).toBe('rfq_engine::claim_unwind');
  });

  it('maker leg pending: escrow in token_out', () => {
    const ps = classifyRfqAccepted(acc, OTHER, NOW, tokenOf, eq);
    expect(ps[0].role).toBe('maker');
    expect(ps[0].amount).toBe(M * BigInt(2));
    expect(ps[0].token).toBe(W);
  });

  it('becomes claimable exactly at the deadline, for both legs', () => {
    expect(classifyRfqAccepted(acc, ME, acc.settlementDeadlineSecs - BigInt(1), tokenOf, eq)[0].bucket).toBe('escrow');
    expect(classifyRfqAccepted(acc, ME, acc.settlementDeadlineSecs, tokenOf, eq)[0].bucket).toBe('claimable');
    expect(classifyRfqAccepted(acc, OTHER, acc.settlementDeadlineSecs, tokenOf, eq)[0].bucket).toBe('claimable');
  });

  it('frozen quotes stay escrow until the deadline, then claimable', () => {
    const f = { ...acc, status: RFQ_ACC.FREEZE };
    expect(classifyRfqAccepted(f, ME, NOW, tokenOf, eq)[0].next).toContain('Frozen by council');
    expect(classifyRfqAccepted(f, ME, acc.settlementDeadlineSecs, tokenOf, eq)[0].bucket).toBe('claimable');
  });

  it('terminal statuses hold nothing in escrow', () => {
    for (const s of [RFQ_ACC.SETTLED, RFQ_ACC.VETOED, RFQ_ACC.UNWOUND]) {
      expect(classifyRfqAccepted({ ...acc, status: s }, ME, NOW + BigInt(999), tokenOf, eq)).toHaveLength(0);
    }
  });

  it('an unrelated address sees nothing', () => {
    expect(classifyRfqAccepted(acc, '0xNOBODY', NOW, tokenOf, eq)).toHaveLength(0);
  });
});

describe('classifyCmpRequest', () => {
  const req = { requestId: BigInt(15), buyer: ME, maxPrice: M * BigInt(5), expiresAt: NOW + BigInt(10), status: CMP_REQ.OPEN, paymentFa: W.meta };
  it('open request: buyer max price escrowed, reclaimable from expiry', () => {
    expect(classifyCmpRequest(req, ME, NOW, tokenOf, eq)[0].bucket).toBe('escrow');
    const at = classifyCmpRequest(req, ME, req.expiresAt, tokenOf, eq)[0];
    expect(at.bucket).toBe('claimable');
    expect(at.returnFn).toBe('compute_rfq::reclaim_expired_request_v2');
    expect(at.amount).toBe(M * BigInt(5));
  });
  it('accepted / expired / cancelled requests hold nothing', () => {
    for (const s of [CMP_REQ.ACCEPTED, CMP_REQ.EXPIRED, CMP_REQ.CANCELLED]) {
      expect(classifyCmpRequest({ ...req, status: s }, ME, NOW, tokenOf, eq)).toHaveLength(0);
    }
  });
  it('not the buyer: nothing', () => {
    expect(classifyCmpRequest(req, OTHER, NOW, tokenOf, eq)).toHaveLength(0);
  });
});

describe('classifyCmpJob', () => {
  const job = {
    jobId: BigInt(10),
    requestId: BigInt(15),
    buyer: ME,
    solver: OTHER,
    price: M * BigInt(5),
    jobDeadlineSecs: NOW + BigInt(100),
    reviewWindowSecs: BigInt(86400),
    deliveredAt: BigInt(0),
    status: CMP_JOB.ACTIVE,
    paymentFa: W.meta,
    disputedAt: BigInt(0),
    disputeBond: BigInt(0),
  };
  it('active: price escrowed, claim_no_delivery from the deadline', () => {
    expect(classifyCmpJob(job, ME, NOW, tokenOf, eq)[0].bucket).toBe('escrow');
    const at = classifyCmpJob(job, ME, job.jobDeadlineSecs, tokenOf, eq)[0];
    expect(at.bucket).toBe('claimable');
    expect(at.returnFn).toBe('compute_rfq::claim_no_delivery_v2');
  });
  it('delivered: escrow during review, never claimable by the buyer', () => {
    const d = { ...job, status: CMP_JOB.DELIVERED, deliveredAt: NOW };
    const p = classifyCmpJob(d, ME, NOW + BigInt(999_999), tokenOf, eq)[0];
    expect(p.bucket).toBe('escrow');
    expect(p.returnFn).toBeNull();
  });
  it('disputed: price plus dispute bond, unwind after the dispute TTL', () => {
    const d = { ...job, status: CMP_JOB.DISPUTED, disputedAt: NOW, disputeBond: M };
    const before = classifyCmpJob(d, ME, NOW + DISPUTE_TTL_SECS - BigInt(1), tokenOf, eq)[0];
    expect(before.bucket).toBe('escrow');
    expect(before.amount).toBe(M * BigInt(6));
    const at = classifyCmpJob(d, ME, NOW + DISPUTE_TTL_SECS, tokenOf, eq)[0];
    expect(at.bucket).toBe('claimable');
    expect(at.returnFn).toBe('compute_rfq::claim_dispute_unwind_v2');
  });
  it('terminal statuses and non-buyers hold nothing', () => {
    for (const s of [CMP_JOB.SETTLED, CMP_JOB.SLASHED, CMP_JOB.REFUNDED]) {
      expect(classifyCmpJob({ ...job, status: s }, ME, NOW, tokenOf, eq)).toHaveLength(0);
    }
    expect(classifyCmpJob(job, OTHER, NOW, tokenOf, eq)).toHaveLength(0);
  });
});

describe('parsers', () => {
  it('parseRfqRequest reads the 11-tuple slots, fee at slot 7', () => {
    const r = parseRfqRequest(['3', ME, '0xnft', T.meta, '1000000', W.meta, '996000', '42', '1', '2', 5])!;
    expect(r.requestFeeQuants).toBe(BigInt(42));
    expect(r.expiresAt).toBe(BigInt(2));
    expect(r.status).toBe(5);
    expect(parseRfqRequest(['short'])).toBeNull();
  });
  it('parseRfqAccepted reads maker at slot 5, deadline at 11, status at 12', () => {
    const a = parseRfqAccepted(['1', '3', ME, '0', '0xnft', OTHER, T.meta, '7', W.meta, '9', '10', '11', 4, false, '0'])!;
    expect(a.makerOperator).toBe(OTHER);
    expect(a.settlementDeadlineSecs).toBe(BigInt(11));
    expect(a.status).toBe(4);
  });
  it('parseCmpJob tolerates a missing dispute tuple', () => {
    const j = parseCmpJob(BigInt(10), ['15', ME, OTHER, '5', '100', '86400', '1', '0', '0x', 0, W.meta, '0'], null)!;
    expect(j.disputeBond).toBe(BigInt(0));
    expect(parseCmpJob(BigInt(10), null, null)).toBeNull();
  });
});

describe('aggregation', () => {
  it('sums per token and formats with decimals', () => {
    const s = sumByToken([
      { bucket: 'escrow', source: 'rfq_accepted', ref: '', id: null, role: 'taker', amount: M, token: W, next: '', returnFn: null, returnAfterSecs: null, actionable: false },
      { bucket: 'escrow', source: 'rfq_accepted', ref: '', id: null, role: 'taker', amount: M * BigInt(2), token: W, next: '', returnFn: null, returnAfterSecs: null, actionable: false },
      { bucket: 'escrow', source: 'rfq_accepted', ref: '', id: null, role: 'taker', amount: BigInt(1500000), token: T, next: '', returnFn: null, returnAfterSecs: null, actionable: false },
    ]);
    expect(s).toHaveLength(2);
    expect(fmtTokenAmt(s[0].amount, s[0].token)).toBe('3 wCOSMO');
    expect(fmtTokenAmt(s[1].amount, s[1].token)).toBe('1.5 TINTEST');
  });
});
