import { describe, it, expect } from 'vitest';
import {
  buildUnifiedSteps,
  fmtTs,
  fmtRel,
  fmtDelivery,
  STATUS_BADGE,
} from './marketStatus';

describe('buildUnifiedSteps', () => {
  it('marks everything done when the job is settled', () => {
    const steps = buildUnifiedSteps({ status: 'settled' }, 1);
    expect(steps).toHaveLength(7);
    expect(steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('puts a freshly approved job without offers on the offers step', () => {
    const steps = buildUnifiedSteps({ status: 'approved' }, 0);
    expect(steps[0].state).toBe('done'); // review
    expect(steps[1].id).toBe('offers');
    expect(steps[1].state).toBe('active');
    expect(steps[2].state).toBe('pending');
  });

  it('advances to select once offers exist', () => {
    const steps = buildUnifiedSteps({ status: 'approved' }, 2);
    expect(steps[2].id).toBe('select');
    expect(steps[2].state).toBe('active');
  });

  it('is on the delivery step while the job runs on-chain', () => {
    const steps = buildUnifiedSteps(
      { status: 'onchain', selectedOfferId: 'o1', requestId: 1, jobIdOnchain: 8 },
      1,
    );
    expect(steps[5].id).toBe('deliver');
    expect(steps[5].state).toBe('active');
    expect(steps[4].state).toBe('done');
    expect(steps[6].state).toBe('pending');
  });

  it('falls back to the review step for submitted jobs', () => {
    const steps = buildUnifiedSteps({ status: 'submitted' }, 0);
    expect(steps[0].id).toBe('review');
    expect(steps[0].state).toBe('active');
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
