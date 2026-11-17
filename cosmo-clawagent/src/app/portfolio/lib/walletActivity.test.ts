import { describe, it, expect } from 'vitest';
import { parseActivity, parseEntry, shortFn } from './walletActivity';

const ME = '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb';
const OTHER = '0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53';
const h = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

// Shape as served by rpc-mainnet on 2026-11-17 (fields this page does not read are left out).
function tx(n: number, o: { height?: number | null; status?: string; sender?: string; fn?: string | null; micros?: unknown } = {}) {
  const height = o.height === undefined ? 1000 + n : o.height;
  return {
    hash: h(n),
    status: o.status ?? 'Success',
    ...(height === null
      ? {}
      : {
          block_header: {
            height,
            timestamp: { microseconds_since_unix_epoch: o.micros === undefined ? 1794933124822177 + n * 1_000_000 : o.micros },
          },
        }),
    header: { sender: { Move: o.sender ?? ME } },
    payload: { Move: o.fn === null ? { type: 'script_payload' } : { type: 'entry_function_payload', function: o.fn ?? `${OTHER}::router::swap` } },
  };
}

describe('parseEntry', () => {
  it('reads a confirmed transaction', () => {
    const a = parseEntry(tx(1), ME)!;
    expect(a.hash).toBe(h(1));
    expect(a.height).toBe(1001);
    expect(a.timeSecs).toBe(1794933125);
    expect(a.ok).toBe(true);
    expect(a.fnShort).toBe('router::swap');
    expect(a.sentByAddr).toBe(true);
  });

  it('keeps a failed transaction and marks it as failed', () => {
    expect(parseEntry(tx(1, { status: 'Fail' }), ME)!.ok).toBe(false);
  });

  it('drops an entry without a block header: not in a block, not shown', () => {
    expect(parseEntry(tx(1, { height: null }), ME)).toBeNull();
  });

  it('drops an entry without a usable block height or block time', () => {
    expect(parseEntry(tx(1, { height: 0 }), ME)).toBeNull();
    expect(parseEntry(tx(1, { micros: 0 }), ME)).toBeNull();
    expect(parseEntry(tx(1, { micros: 'soon' }), ME)).toBeNull();
  });

  it('drops an entry whose execution result is not final', () => {
    expect(parseEntry(tx(1, { status: 'Pending' }), ME)).toBeNull();
    expect(parseEntry(tx(1, { status: '' }), ME)).toBeNull();
    expect(parseEntry({ ...tx(1), status: undefined }, ME)).toBeNull();
  });

  it('drops an entry without a well-formed transaction id', () => {
    expect(parseEntry({ ...tx(1), hash: '0x12' }, ME)).toBeNull();
    expect(parseEntry(null, ME)).toBeNull();
    expect(parseEntry('x', ME)).toBeNull();
  });

  it('tells a transaction another account sent from one this address sent', () => {
    expect(parseEntry(tx(1, { sender: OTHER }), ME)!.sentByAddr).toBe(false);
    // the endpoint drops leading zeros in some fields; the comparison must not care
    expect(parseEntry(tx(1, { sender: ME.replace('0x0', '0x') }), ME)!.sentByAddr).toBe(true);
  });

  it('names a payload that is not a function call without inventing a function', () => {
    expect(parseEntry(tx(1, { fn: null }), ME)!.fn).toBe('script');
  });
});

describe('parseActivity', () => {
  it('merges both sources into one row per transaction, newest block first', () => {
    const v3 = [tx(3), tx(1)];
    const coin = { record: [tx(2), tx(3)], cursor: 1 };
    expect(parseActivity(v3, coin, ME).map((a) => a.hash)).toEqual([h(3), h(2), h(1)]);
  });

  it('treats the same transaction id in different letter case as one', () => {
    const upper = { ...tx(0xab), hash: h(0xab).toUpperCase().replace('0X', '0x') };
    expect(parseActivity([tx(0xab)], { record: [upper] }, ME)).toHaveLength(1);
  });

  it('shows only confirmed entries from a mixed answer', () => {
    const v3 = [tx(5, { status: 'Pending' }), tx(4), tx(3, { height: null })];
    expect(parseActivity(v3, null, ME).map((a) => a.hash)).toEqual([h(4)]);
  });

  it('cuts the list at the limit after sorting, so the newest stay', () => {
    const v3 = Array.from({ length: 30 }, (_, i) => tx(i + 1));
    const out = parseActivity(v3, null, ME, 20);
    expect(out).toHaveLength(20);
    expect(out[0].hash).toBe(h(30));
    expect(out[19].hash).toBe(h(11));
  });

  it('survives an answer in an unexpected shape with an empty list', () => {
    expect(parseActivity({ nope: 1 }, 'x', ME)).toEqual([]);
    expect(parseActivity(null, undefined, ME)).toEqual([]);
  });
});

describe('shortFn', () => {
  it('keeps module and function, drops the address', () => {
    expect(shortFn('0x1::supra_account::transfer')).toBe('supra_account::transfer');
    expect(shortFn('script')).toBe('script');
  });
});
