import { describe, it, expect } from 'vitest';
import {
  buildBuyerSteps,
  buildProviderSteps,
  fmtTs,
  fmtRel,
  fmtDelivery,
  STATUS_BADGE,
} from './marketStatus';

describe('buildBuyerSteps', () => {
  it('marks everything done when the job is settled', () => {
    const steps = buildBuyerSteps({ status: 'settled' }, 1);
    expect(steps).toHaveLength(8);
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('puts a freshly approved job without offers on the waiting-for-offers step', () => {
    const steps = buildBuyerSteps({ status: 'approved' }, 0);
    expect(steps[0].state).toBe('done'); // review
    expect(steps[1].id).toBe('offers');
    expect(steps[1].state).toBe('active');
    expect(steps[2].state).toBe('pending');
  });

  it('advances to select once offers exist', () => {
    const steps = buildBuyerSteps({ status: 'approved' }, 2);
    expect(steps[2].id).toBe('select');
    expect(steps[2].state).toBe('active');
    expect(steps[2].own).toBe(1);
  });

  it('shows the provider working while the job runs on-chain', () => {
    const steps = buildBuyerSteps(
      { status: 'onchain', selectedOfferId: 'o1', requestId: 1, jobIdOnchain: 8 },
      1,
    );
    expect(steps[5].id).toBe('working');
    expect(steps[5].state).toBe('active');
    expect(steps[5].waiting).toBe(true);
    expect(steps[4].state).toBe('done');
  });

  it('asks the buyer to approve once delivered', () => {
    const steps = buildBuyerSteps(
      { status: 'delivered', selectedOfferId: 'o1', requestId: 1, jobIdOnchain: 8 },
      1,
    );
    expect(steps[6].id).toBe('approve');
    expect(steps[6].state).toBe('active');
    expect(steps[6].own).toBe(4);
  });

  it('falls back to the review step for submitted jobs', () => {
    const steps = buildBuyerSteps({ status: 'submitted' }, 0);
    expect(steps[0].id).toBe('review');
    expect(steps[0].state).toBe('active');
  });
});

describe('buildProviderSteps', () => {
  it('inserts the register node only for artifact jobs', () => {
    const artifact = buildProviderSteps({ status: 'approved', jobType: 'artifact' });
    const attestation = buildProviderSteps({ status: 'approved', jobType: 'attestation' });
    expect(artifact.map((s) => s.id)).toContain('register');
    expect(attestation.map((s) => s.id)).not.toContain('register');
    expect(artifact).toHaveLength(6);
    expect(attestation).toHaveLength(5);
  });

  it('activates register before deliver while the artifact hash is unregistered', () => {
    const steps = buildProviderSteps({
      status: 'onchain',
      jobIdOnchain: 8,
      jobType: 'artifact',
    });
    const register = steps.find((s) => s.id === 'register');
    expect(register?.state).toBe('active');
    expect(steps.find((s) => s.id === 'deliver')?.state).toBe('pending');
  });

  it('unlocks deliver once the result hash is registered', () => {
    const steps = buildProviderSteps({
      status: 'onchain',
      jobIdOnchain: 8,
      jobType: 'artifact',
      expectedResultHash: '0xabc',
    });
    expect(steps.find((s) => s.id === 'deliver')?.state).toBe('active');
    expect(steps.find((s) => s.id === 'register')?.state).toBe('done');
  });

  it('shows payout pending on the settled node after delivery', () => {
    const steps = buildProviderSteps({
      status: 'delivered',
      jobIdOnchain: 8,
      jobType: 'artifact',
      expectedResultHash: '0xabc',
    });
    const last = steps[steps.length - 1];
    expect(last.id).toBe('settled');
    expect(last.state).toBe('active');
  });

  it('marks everything done when settled', () => {
    const steps = buildProviderSteps({ status: 'settled', jobType: 'artifact' });
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });
});

describe('formatters', () => {
  it('fmtTs renders an ISO-like UTC minute stamp', () => {
    expect(fmtTs(0)).toBe('1970-01-01 00:00 UTC');
  });

  it('fmtRel switches units by magnitude and direction', () => {
    expect(fmtRel(1060, 1000)).toBe('in 60s');
    expect(fmtRel(1000, 1060)).toBe('60s ago');
    expect(fmtRel(1000 + 1800, 1000)).toBe('in 30m');
    expect(fmtRel(1000 + 7200, 1000)).toBe('in 2h');
    expect(fmtRel(1000 + 3 * 86400, 1000)).toBe('in 3d');
  });

  it('fmtDelivery renders minutes, hours, then days', () => {
    expect(fmtDelivery(600)).toBe('10 min');
    expect(fmtDelivery(86400)).toBe('24 h');
    expect(fmtDelivery(5 * 86400)).toBe('5 d');
  });
});

describe('STATUS_BADGE', () => {
  it('covers every job status with a label and style', () => {
    for (const badge of Object.values(STATUS_BADGE)) {
      expect(badge.label.length).toBeGreaterThan(0);
      expect(badge.cls.length).toBeGreaterThan(0);
    }
  });
});
