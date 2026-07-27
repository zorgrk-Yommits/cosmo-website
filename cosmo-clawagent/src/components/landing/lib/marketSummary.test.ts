import { describe, expect, it } from 'vitest';
import type { MarketJob } from '@/app/market/lib/marketApi';
import { deriveMarketSummary } from './marketSummary';

// The landing shows live counts. The dangerous failure mode is not a crash —
// it is a plausible-looking zero produced by a failed fetch, which a visitor
// reads as "this market has settled nothing".

const job = (over: Partial<MarketJob>): MarketJob =>
  ({
    id: 'job_x',
    status: 'approved',
    title: 't',
    description: 'd',
    acceptanceCriteria: 'a',
    budgetAmount: '5',
    budgetAsset: 'wCOSMO',
    deadlineTs: 1_800_000_000,
    createdAt: 1,
    updatedAt: 1,
    txRefs: {},
    ...over,
  }) as MarketJob;

// Frozen shape of a real /api/market/jobs answer (statuses as of 2026-07-27).
const LIVE: MarketJob[] = [
  job({ id: 'a', status: 'settled', updatedAt: 100 }),
  job({ id: 'b', status: 'settled', updatedAt: 300 }),
  job({ id: 'c', status: 'settled', updatedAt: 200 }),
  job({ id: 'd', status: 'settled', updatedAt: 50 }),
  job({ id: 'e', status: 'approved', updatedAt: 400 }),
];

describe('deriveMarketSummary', () => {
  it('counts a live response by status', () => {
    const s = deriveMarketSummary(LIVE);
    expect(s).toMatchObject({ total: 5, settled: 4, open: 1, inExecution: 0 });
  });

  it('picks the most recently updated settled job', () => {
    expect(deriveMarketSummary(LIVE)?.latestSettled?.id).toBe('b');
  });

  it('counts selected, on-chain and delivered jobs as in execution', () => {
    const s = deriveMarketSummary([
      job({ id: 'f', status: 'selected' }),
      job({ id: 'g', status: 'onchain' }),
      job({ id: 'h', status: 'delivered' }),
    ]);
    expect(s?.inExecution).toBe(3);
    expect(s?.settled).toBe(0);
  });

  // The point of the whole module.
  it('returns null — never zeros — when there is no data', () => {
    expect(deriveMarketSummary(null)).toBeNull();
    expect(deriveMarketSummary(undefined)).toBeNull();
  });

  // Counter-proof for the rendering contract: the section renders "—" for
  // `undefined` and a digit for a number. If a failed fetch ever produced a
  // summary object, the page would print "0 settled" as if it were a fact.
  it('never yields a numeric settled count from a failed fetch', () => {
    const s = deriveMarketSummary(null);
    expect(s?.settled).toBeUndefined();
    expect(s?.settled).not.toBe(0);
  });

  // An empty array is a real answer and must NOT be confused with no answer.
  it('summarises an empty market to zeros, not to null', () => {
    expect(deriveMarketSummary([])).toEqual({
      total: 0,
      open: 0,
      inExecution: 0,
      settled: 0,
      latestSettled: null,
    });
  });
});
