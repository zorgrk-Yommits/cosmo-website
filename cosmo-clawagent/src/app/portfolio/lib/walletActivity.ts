// /portfolio "Transactions" (plans/cosmo-wallet-v01-plan.md, C5).
//
// Reads the newest entries of two public account endpoints and shows only
// transactions that are in a block: an entry needs a block header (height and
// block time) AND an execution result (Success or Fail). Anything else, such as
// a transaction that is still waiting, is dropped and never shown as done.
//
// This is the newest LIMIT entries, not the history of the address.
//
// Shapes verified against rpc-mainnet.supra.com on 2026-11-17:
//   GET /rpc/v3/accounts/{a}/transactions?count=N      -> [tx, ...]
//   GET /rpc/v1/accounts/{a}/coin_transactions?count=N -> { record: [tx, ...], cursor }
// Read-only; nothing here signs.

import { RPC, sameAddr } from '@/lib/mainnetOnchain';

export const ACTIVITY_LIMIT = 20;

export type Activity = {
  hash: string;
  height: number;
  timeSecs: number; // block time, seconds since epoch
  fn: string; // full function id, or a short word for other payload kinds
  fnShort: string; // "module::function"
  ok: boolean; // Success = true, Fail = false
  sender: string | null;
  sentByAddr: boolean; // false = another account sent it and this address was touched
};

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : null);

function posInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function shortFn(fn: string): string {
  const parts = fn.split('::');
  return parts.length >= 3 ? parts.slice(-2).join('::') : fn;
}

// One raw entry -> Activity, or null when it is not a confirmed transaction.
export function parseEntry(raw: unknown, addr: string): Activity | null {
  const t = rec(raw);
  if (!t) return null;
  const hash = t.hash;
  if (typeof hash !== 'string' || !HASH_RE.test(hash)) return null;
  const bh = rec(t.block_header);
  if (!bh) return null;
  const height = posInt(bh.height);
  const micros = posInt(rec(bh.timestamp)?.microseconds_since_unix_epoch);
  if (height === null || micros === null) return null;
  if (t.status !== 'Success' && t.status !== 'Fail') return null;
  const move = rec(rec(t.payload)?.Move);
  const fn =
    typeof move?.function === 'string' && move.function
      ? move.function
      : typeof move?.type === 'string' && move.type
        ? move.type.replace(/_payload$/, '')
        : 'other';
  const s = rec(rec(t.header)?.sender)?.Move;
  const sender = typeof s === 'string' ? s : null;
  return {
    hash: hash.toLowerCase(),
    height,
    timeSecs: Math.floor(micros / 1_000_000),
    fn,
    fnShort: shortFn(fn),
    ok: t.status === 'Success',
    sender,
    sentByAddr: sender !== null && sameAddr(sender, addr),
  };
}

function entries(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const r = rec(body)?.record;
  return Array.isArray(r) ? r : [];
}

// Merge both endpoint bodies: one row per transaction, newest block first.
export function parseActivity(v3Body: unknown, coinBody: unknown, addr: string, limit = ACTIVITY_LIMIT): Activity[] {
  const byHash = new Map<string, Activity>();
  for (const raw of [...entries(v3Body), ...entries(coinBody)]) {
    const a = parseEntry(raw, addr);
    if (a && !byHash.has(a.hash)) byHash.set(a.hash, a);
  }
  return [...byHash.values()]
    .sort((x, y) => y.height - x.height || y.timeSecs - x.timeSecs || (x.hash < y.hash ? -1 : 1))
    .slice(0, limit);
}

export type ActivityResult = {
  items: Activity[];
  // sources that could not be read; the list is then possibly shorter than it should be
  missing: ('transactions' | 'coin transfers')[];
};

async function getJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as unknown;
}

export async function fetchActivity(addr: string, limit = ACTIVITY_LIMIT): Promise<ActivityResult> {
  const a = encodeURIComponent(addr);
  const [v3, coin] = await Promise.allSettled([
    getJson(`${RPC}/rpc/v3/accounts/${a}/transactions?count=${limit}`),
    getJson(`${RPC}/rpc/v1/accounts/${a}/coin_transactions?count=${limit}`),
  ]);
  if (v3.status === 'rejected' && coin.status === 'rejected') {
    throw new Error(String((v3.reason as Error)?.message ?? v3.reason));
  }
  const missing: ActivityResult['missing'] = [];
  if (v3.status === 'rejected') missing.push('transactions');
  if (coin.status === 'rejected') missing.push('coin transfers');
  return {
    items: parseActivity(
      v3.status === 'fulfilled' ? v3.value : null,
      coin.status === 'fulfilled' ? coin.value : null,
      addr,
      limit,
    ),
    missing,
  };
}
