import { describe, it, expect } from 'vitest';
import {
  buildCall,
  buttonsLocked,
  checkWithdrawAmount,
  payloadLines,
  samePosition,
  verifyFresh,
  MAX_ABORTS_AFTER_GREEN,
  parseUnits,
} from './portfolioTx';
import {
  classifyRfqAccepted,
  classifyCmpJob,
  makerBondPosition,
  providerBondPosition,
  CMP_JOB,
  RFQ_ACC,
  type Position,
  type Token,
} from './positions';

const W: Token = { meta: '0xwcosmo', symbol: 'wCOSMO', decimals: 6 };
const tokenOf = () => W;
const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const ME = '0xME';
const NOW = BigInt(1_800_000_000);
const M = BigInt(1_000_000);
const ADDRS = { cosmoclaw: '0xCLAW', compute: '0xCOMP' };

const acc = {
  quoteId: BigInt(7),
  requestId: BigInt(3),
  taker: ME,
  makerOperator: '0xOTHER',
  tokenIn: W.meta,
  amountIn: M,
  tokenOut: W.meta,
  promisedAmountOut: M * BigInt(2),
  settlementDeadlineSecs: NOW,
  status: RFQ_ACC.PENDING,
};

const claimable = (): Position => classifyRfqAccepted(acc, ME, NOW, tokenOf, eq)[0];
const notYet = (): Position => classifyRfqAccepted(acc, ME, NOW - BigInt(1), tokenOf, eq)[0];

describe('buildCall', () => {
  it('claim: one u64 = the record id, module address from the right package', () => {
    const c = buildCall(claimable(), ADDRS)!;
    expect(c.fnKey).toBe('rfq_engine::claim_unwind');
    expect(c.moduleAddr).toBe('0xCLAW');
    expect(c.modName).toBe('rfq_engine');
    expect(c.fnName).toBe('claim_unwind');
    expect(c.arg).toBe(BigInt(7));
    expect(c.kind).toBe('claim');
  });
  it('compute job claim resolves to the compute package', () => {
    const job = {
      jobId: BigInt(9), requestId: BigInt(1), buyer: ME, solver: '0xS', price: M, jobDeadlineSecs: NOW,
      reviewWindowSecs: BigInt(0), deliveredAt: BigInt(0), status: CMP_JOB.ACTIVE, paymentFa: W.meta,
      disputedAt: BigInt(0), disputeBond: BigInt(0),
    };
    const c = buildCall(classifyCmpJob(job, ME, NOW, tokenOf, eq)[0], ADDRS)!;
    expect(c.moduleAddr).toBe('0xCOMP');
    expect(c.fnName).toBe('claim_no_delivery_v2');
    expect(c.arg).toBe(BigInt(9));
  });
  it('MUTATION: one second before the deadline the same record yields no call', () => {
    expect(buildCall(notYet(), ADDRS)).toBeNull();
  });
  it('withdraw needs an explicit amount and uses it as the only argument', () => {
    const b = makerBondPosition({ amount: M * BigInt(5), lockedUntilSecs: BigInt(0), activeJobs: BigInt(0), slashCount: BigInt(0) }, W, NOW)!;
    expect(buildCall(b, ADDRS)).toBeNull();
    expect(buildCall(b, ADDRS, BigInt(0))).toBeNull();
    const c = buildCall(b, ADDRS, M)!;
    expect(c.kind).toBe('withdraw');
    expect(c.arg).toBe(M);
    expect(c.moduleAddr).toBe('0xCLAW');
  });
  it('locked bond (or active job) builds no call even with an amount', () => {
    const locked = makerBondPosition({ amount: M, lockedUntilSecs: NOW + BigInt(1), activeJobs: BigInt(0), slashCount: BigInt(0) }, W, NOW)!;
    expect(buildCall(locked, ADDRS, M)).toBeNull();
    const busy = providerBondPosition({ amount: M, lockedUntilSecs: BigInt(0), activeJobs: BigInt(1), slashCount: BigInt(0) }, W, NOW)!;
    expect(buildCall(busy, ADDRS, M)).toBeNull();
  });
});

describe('checkWithdrawAmount (rem == 0 || rem >= min)', () => {
  const bond = M * BigInt(300);
  const min = M * BigInt(100);
  it('full exit ok; leaving exactly min ok; leaving min - 1 rejected', () => {
    expect(checkWithdrawAmount(bond, bond, min).ok).toBe(true);
    expect(checkWithdrawAmount(bond - min, bond, min).ok).toBe(true);
    expect(checkWithdrawAmount(bond - min + BigInt(1), bond, min).ok).toBe(false);
  });
  it('zero, over-deposit rejected; unknown min allows only a full exit', () => {
    expect(checkWithdrawAmount(BigInt(0), bond, min).ok).toBe(false);
    expect(checkWithdrawAmount(bond + BigInt(1), bond, min).ok).toBe(false);
    expect(checkWithdrawAmount(M, bond, null).ok).toBe(false);
    expect(checkWithdrawAmount(bond, bond, null).ok).toBe(true);
  });
});

describe('verifyFresh (live re-check before signing)', () => {
  it('passes when the fresh read is the same, actionable position', () => {
    expect(verifyFresh(claimable(), [claimable()]).ok).toBe(true);
  });
  it('MUTATION: fresh chain time one second earlier flips the verdict to false', () => {
    const v = verifyFresh(claimable(), [notYet()]);
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('Not claimable yet');
  });
  it('fails when the record resolved on chain (no fresh position) or the amount changed', () => {
    expect(verifyFresh(claimable(), []).ok).toBe(false);
    const settled = classifyRfqAccepted({ ...acc, status: RFQ_ACC.SETTLED }, ME, NOW, tokenOf, eq);
    expect(verifyFresh(claimable(), settled).ok).toBe(false);
    const changed = classifyRfqAccepted({ ...acc, amountIn: M + BigInt(1) }, ME, NOW, tokenOf, eq);
    expect(verifyFresh(claimable(), changed).ok).toBe(false);
  });
  it('a different quote id with the same role never verifies the position', () => {
    const other = classifyRfqAccepted({ ...acc, quoteId: BigInt(8) }, ME, NOW, tokenOf, eq);
    expect(samePosition(claimable(), other[0])).toBe(false);
    expect(verifyFresh(claimable(), other).ok).toBe(false);
  });
  it('bond: fresh lock (penalty after the snapshot) blocks the withdrawal', () => {
    const b = { amount: M, lockedUntilSecs: BigInt(0), activeJobs: BigInt(0), slashCount: BigInt(0) };
    const snap = makerBondPosition(b, W, NOW)!;
    const fresh = makerBondPosition({ ...b, lockedUntilSecs: NOW + BigInt(60) }, W, NOW)!;
    const v = verifyFresh(snap, [fresh]);
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('Not withdrawable');
    expect(verifyFresh(snap, [makerBondPosition(b, W, NOW)!]).ok).toBe(true);
  });
});

describe('payloadLines', () => {
  it('shows exactly the argument that will be signed', () => {
    const c = buildCall(claimable(), ADDRS)!;
    const lines = payloadLines({ sender: ME, call: c, seq: 12, expiry: 1234, argHuman: '' });
    expect(lines.find((l) => l.startsWith('Arg 1'))).toContain('7  (quote_id (u64))');
    expect(lines.find((l) => l.startsWith('Function-ID'))).toBe('Function-ID     : 0xCLAW::rfq_engine::claim_unwind');
    expect(lines.find((l) => l.startsWith('Sequence'))).toContain('12');
  });
});

describe('kill condition', () => {
  it('locks all buttons from the second abort after a green precondition', () => {
    expect(MAX_ABORTS_AFTER_GREEN).toBe(2);
    expect(buttonsLocked(0)).toBe(false);
    expect(buttonsLocked(1)).toBe(false);
    expect(buttonsLocked(2)).toBe(true);
  });
});

describe('parseUnits', () => {
  it('scales by decimals without float math and rejects bad input', () => {
    expect(parseUnits('100', 6)).toBe(BigInt(100_000_000));
    expect(parseUnits('0.000001', 6)).toBe(BigInt(1));
    expect(parseUnits('1,5', 6)).toBe(BigInt(1_500_000));
    expect(parseUnits('1.1234567', 6)).toBeNull();
    expect(parseUnits('abc', 6)).toBeNull();
    expect(parseUnits('', 6)).toBeNull();
    expect(parseUnits('7', 0)).toBe(BigInt(7));
  });
});
