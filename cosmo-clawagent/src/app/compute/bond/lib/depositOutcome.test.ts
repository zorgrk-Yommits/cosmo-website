import { describe, it, expect } from 'vitest';
import {
  describeDepositOutcome,
  depositOutcomeLines,
  depositReceiptLines,
  fmtUtc,
} from './depositOutcome';

const M = BigInt(1000000); // 1 wCOSMO (6 decimals)
const NOW = 1_800_000_000; // fixed clock for the tests

const base = {
  payloadAmount: BigInt(500) * M,
  wcosmoBal: BigInt(800) * M,
  bondAmount: BigInt(100) * M,
  lockedUntilSecs: BigInt(0),
  activeJobs: BigInt(0),
  cooldownSecs: BigInt(14 * 86400),
  nowSecs: NOW,
};

describe('describeDepositOutcome', () => {
  it('moves exactly the payload amount from wallet to bond', () => {
    const o = describeDepositOutcome(base);
    expect(o.walletAfter).toBe(BigInt(300) * M);
    expect(o.bondAfter).toBe(BigInt(600) * M);
    expect(o.walletBefore - o.walletAfter).toBe(o.payloadAmount);
    expect(o.bondAfter - o.bondBefore).toBe(o.payloadAmount);
  });

  it('is withdrawable now when nothing locks it', () => {
    const o = describeDepositOutcome(base);
    expect(o.withdrawableNow).toBe(true);
    expect(o.lockedUntilSecs).toBeNull();
  });

  it('treats an expired lock as no lock', () => {
    const o = describeDepositOutcome({ ...base, lockedUntilSecs: BigInt(NOW - 1) });
    expect(o.lockedUntilSecs).toBeNull();
    expect(o.withdrawableNow).toBe(true);
  });

  it('keeps a future lock and blocks withdrawal (boundary: lock 1 s ahead)', () => {
    const o = describeDepositOutcome({ ...base, lockedUntilSecs: BigInt(NOW + 1) });
    expect(o.lockedUntilSecs).toBe(BigInt(NOW + 1));
    expect(o.withdrawableNow).toBe(false);
  });

  it('blocks withdrawal while a job is active even without a lock', () => {
    const o = describeDepositOutcome({ ...base, activeJobs: BigInt(1) });
    expect(o.withdrawableNow).toBe(false);
  });

  it('reports the cooldown in days from the live view value', () => {
    expect(describeDepositOutcome(base).cooldownDays).toBe(14);
    expect(describeDepositOutcome({ ...base, cooldownSecs: BigInt(7 * 86400) }).cooldownDays).toBe(7);
  });
});

describe('depositOutcomeLines', () => {
  it('states the payload amount, never a different projection amount', () => {
    // The amount input may have drifted to 750 after the payload (500) was prepared.
    // The box must describe 500. The function has no projection parameter at all,
    // so a swap is structurally impossible; this test pins the rendered text.
    const o = describeDepositOutcome(base);
    const text = depositOutcomeLines(o).join('\n');
    expect(text).toContain('500.00 wCOSMO move from your wallet');
    expect(text).toContain('show 500.00 wCOSMO less');
    expect(text).not.toContain('750');
    expect(text).toContain('held in the vault, not spent');
  });

  it('says withdrawable any time when there is no lock and no job', () => {
    const text = depositOutcomeLines(describeDepositOutcome(base)).join('\n');
    expect(text).toContain('Withdrawable any time');
    expect(text).toContain('This deposit itself starts no lock');
  });

  it('names the lock date when a penalty lock is in force', () => {
    const until = BigInt(NOW + 3600);
    const text = depositOutcomeLines(
      describeDepositOutcome({ ...base, lockedUntilSecs: until }),
    ).join('\n');
    expect(text).toContain(`Withdrawable from ${fmtUtc(until)}`);
    expect(text).not.toContain('Withdrawable any time');
  });

  it('prefers the active-job block over the lock date', () => {
    const text = depositOutcomeLines(
      describeDepositOutcome({ ...base, lockedUntilSecs: BigInt(NOW + 3600), activeJobs: BigInt(1) }),
    ).join('\n');
    expect(text).toContain('blocked while a job is active (1 active)');
    expect(text).not.toContain('Withdrawable from');
  });
});

describe('depositReceiptLines', () => {
  const receipt = {
    payloadAmount: BigInt(500) * M,
    bondBefore: BigInt(100) * M,
    bondAfter: BigInt(600) * M,
    walletBefore: BigInt(800) * M,
    walletAfter: BigInt(300) * M,
    lockedUntilSecs: BigInt(0),
    activeJobs: BigInt(0),
    txHash: '0xabc',
    confirmed: true,
  };

  it('reports live before/after values when confirmed', () => {
    const text = depositReceiptLines(receipt, NOW).join('\n');
    expect(text).toContain('Deposit of 500.00 wCOSMO confirmed');
    expect(text).toContain('100.00 before, 600.00 wCOSMO now');
    expect(text).toContain('800.00 before, 300.00 now');
    expect(text).toContain('Withdrawable now');
  });

  it('does not claim confirmation when the increase was not seen', () => {
    const text = depositReceiptLines({ ...receipt, confirmed: false }, NOW).join('\n');
    expect(text).not.toContain('confirmed on-chain');
    expect(text).toContain('not visible on-chain yet');
  });
});
