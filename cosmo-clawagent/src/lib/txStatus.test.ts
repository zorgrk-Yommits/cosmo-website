import { describe, it, expect } from 'vitest';
import { explainAbort, explainSignError, outcomeOf, parseVmAbort } from './txStatus';

describe('abort mapping', () => {
  it('parses symbol + hex code, hex-only, and rejects non-abort statuses', () => {
    expect(parseVmAbort('Move abort in 0x2edd::compute_rfq: E_PAUSED(0x20): paused')).toEqual({ module: 'compute_rfq', symbol: 'E_PAUSED', code: 32 });
    expect(parseVmAbort('Move abort in 0x2edd::rfq_engine: 0x34')).toEqual({ module: 'rfq_engine', symbol: null, code: 52 });
    expect(parseVmAbort('Executed successfully')).toBeNull();
    expect(parseVmAbort(null)).toBeNull();
  });
  it('maps the known return-path aborts to plain text and keeps the tag', () => {
    const t = explainAbort('Move abort in 0xabc::rfq_engine: E_DEADLINE_NOT_REACHED(0x34): claim_unwind before deadline');
    expect(t).toContain('Settlement deadline not reached');
    expect(t).toContain('rfq_engine: E_DEADLINE_NOT_REACHED(0x34)');
    expect(explainAbort('Move abort in 0xabc::provider_vault: E_WITHDRAW_DURING_ACTIVE_JOB(0xf)')).toContain('job is still active');
    expect(explainAbort('Move abort in 0xabc::maker_vault: E_BELOW_MIN_BOND(0x4)')).toContain('minimum deposit');
  });
  it('MUTATION: same symbol in another module is not reused (codes are per module)', () => {
    // rfq_engine:50 is "accepted quote not found"; compute_rfq:50 is "not disputed".
    expect(explainAbort('Move abort in 0xabc::rfq_engine: E_ACCEPTED_NOT_FOUND(0x32)')).toContain('Accepted quote not found');
    expect(explainAbort('Move abort in 0xabc::compute_rfq: E_JOB_NOT_DISPUTED(0x32)')).toContain('not in dispute');
  });
  it('unknown codes are shown verbatim, never invented', () => {
    const t = explainAbort('Move abort in 0xabc::compute_rfq: E_NOT_ADMIN(0x2)');
    expect(t).toContain('E_NOT_ADMIN(0x2)');
    expect(t).toContain('only gas was spent');
    expect(explainAbort('Out of gas')).toContain('Out of gas');
  });
});

describe('buyer-flow aborts', () => {
  it('explains a paused contract and a drifted offer', () => {
    expect(explainAbort('Move abort in 0xabc::compute_rfq: E_PAUSED(0x20)')).toContain('paused');
    expect(explainAbort('Move abort in 0xabc::compute_rfq: E_QUOTE_DRIFT(0x19)')).toContain('Nothing was paid');
  });
});

describe('outcomeOf', () => {
  it('timeout is unconfirmed, never failed', () => {
    expect(outcomeOf(null).stage).toBe('unconfirmed');
  });
  it('Success is confirmed', () => {
    expect(outcomeOf({ status: 'Success', vmStatus: 'Executed successfully', raw: 'Success' }).stage).toBe('confirmed');
  });
  it('Fail is failed and carries the explained abort', () => {
    const o = outcomeOf({ status: 'Fail', vmStatus: 'Move abort in 0xabc::provider_vault: E_WITHDRAW_DURING_ACTIVE_JOB(0xf)', raw: 'Fail' });
    expect(o.stage).toBe('failed');
    expect(o.message).toContain('job is still active');
  });
});

describe('explainSignError', () => {
  it('a wallet rejection says nothing was sent', () => {
    expect(explainSignError({ code: 4001 })).toBe('You declined in the wallet. Nothing was sent.');
  });
  it('other errors keep the original message', () => {
    expect(explainSignError(new Error('chain mismatch'))).toContain('chain mismatch');
  });
});
