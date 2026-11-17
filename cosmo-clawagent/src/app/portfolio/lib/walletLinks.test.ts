import { describe, it, expect } from 'vitest';
import type { MarketJob } from '@/app/market/lib/marketApi';
import { findTrace, isLocalPage, localTraceUrl, parseTraceIndex, selectJobs, traceHref } from './walletLinks';

const ME = '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb';
const OTHER = '0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53';

const job = (id: string, buyerWallet: string | undefined, updatedAt = 1): MarketJob => ({
  id, status: 'approved', title: id, description: '', acceptanceCriteria: '', budgetAmount: '1', budgetAsset: 'wCOSMO',
  deadlineTs: 0, buyerWallet, createdAt: 0, updatedAt, txRefs: {},
});

describe('selectJobs', () => {
  it('lists only jobs whose recorded buyer is this address, newest change first', () => {
    const r = selectJobs([job('a', ME, 1), job('b', OTHER, 5), job('c', ME.replace('0x0', '0x'), 9), job('d', undefined)], ME, []);
    expect(r.ofAddress.map((j) => j.id)).toEqual(['c', 'a']);
  });

  it('never attributes a job without a recorded buyer to the address', () => {
    expect(selectJobs([job('d', undefined), job('e', '')], ME, []).ofAddress).toEqual([]);
  });

  it('keeps jobs remembered by this browser apart and does not list one twice', () => {
    const local = [{ id: 'a', title: 'A', createdAt: 1 }, { id: 'z', title: 'Z', createdAt: 2 }];
    const r = selectJobs([job('a', ME)], ME, local);
    expect(r.fromThisBrowser.map((e) => e.id)).toEqual(['z']);
  });
});

describe('trace index', () => {
  const entry = { address: ME, chain: 'supra', run: 'run-20261106T085338Z', generated_at: '2026-11-06T08:54:36.740Z', hops: 1 };

  it('accepts well-formed entries and drops everything else', () => {
    const idx = parseTraceIndex([
      entry,
      { ...entry, run: '../../etc' },
      { ...entry, run: 'run-20261106T085338Z/../x' },
      { ...entry, address: 'javascript:alert(1)' },
      { ...entry, generated_at: 'yesterday' },
      null,
      'x',
    ]);
    expect(idx).toEqual([entry]);
    expect(parseTraceIndex({ not: 'a list' })).toEqual([]);
  });

  it('finds the newest Supra trace of an address and nothing for another address or chain', () => {
    const older = { ...entry, run: 'run-20261101T000000Z', generated_at: '2026-11-01T00:00:00.000Z' };
    expect(findTrace([older, entry], ME.replace('0x0', '0x'))!.run).toBe(entry.run);
    expect(findTrace([entry], OTHER)).toBeNull();
    expect(findTrace([{ ...entry, chain: 'eth' }], ME)).toBeNull();
    expect(traceHref(entry.run)).toBe('/trace/run-20261106T085338Z/index.html');
  });
});

describe('local TRACE button', () => {
  it('is offered only when the page itself runs on this machine', () => {
    expect(isLocalPage('localhost')).toBe(true);
    expect(isLocalPage('127.0.0.1')).toBe(true);
    for (const h of ['heros.cloud', 'www.heros.cloud', '127.0.0.1.evil.example', 'localhost.evil.example', '76.13.136.132', '']) {
      expect(isLocalPage(h)).toBe(false);
    }
  });

  it('prefills the address and the chain, and refuses anything that is not an address', () => {
    expect(localTraceUrl(ME)).toBe(`http://127.0.0.1:4777/?input=${ME}&chain=supra`);
    expect(localTraceUrl('0x12&chain=eth')).toBeNull();
    expect(localTraceUrl('')).toBeNull();
  });
});
