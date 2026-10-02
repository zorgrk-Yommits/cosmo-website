// /portfolio fetch layer — read-only Supra MAINNET (chain 8) view calls.
// Window-bounded ID scans; every record is parsed and classified by the pure
// functions in ./positions. Nothing here signs anything.

import {
  COSMOCLAW_ADDR,
  COMPUTE_PKG_ADDR,
  WCOSMO_META,
  COSMO_META,
  TINTEST_META,
  TINTEST_DECIMALS,
  RPC,
  faBalance,
  rpcView,
  rpcViewAll,
  sameAddr,
  shortAddr,
} from '@/lib/mainnetOnchain';
import {
  type BondInput,
  type Position,
  type Token,
  classifyCmpJob,
  classifyCmpRequest,
  classifyRfqAccepted,
  classifyRfqRequest,
  councilBondPosition,
  makerBondPosition,
  parseCmpJob,
  parseCmpRequest,
  parseRfqAccepted,
  parseRfqQuote,
  parseRfqRequest,
  providerBondPosition,
} from './positions';

const RFQ = `${COSMOCLAW_ADDR}::rfq_engine`;
const MV = `${COSMOCLAW_ADDR}::maker_vault`;
const PV = `${COMPUTE_PKG_ADDR}::provider_vault`;
const CR = `${COMPUTE_PKG_ADDR}::compute_rfq`;

const ZERO = BigInt(0);
const big = (v: unknown) => BigInt(String(v ?? 0));

export const WCOSMO: Token = { meta: WCOSMO_META, symbol: 'wCOSMO', decimals: 6 };
export const COSMO: Token = { meta: COSMO_META, symbol: 'COSMO', decimals: 6 };

export function tokenOf(meta: string): Token {
  if (sameAddr(meta, WCOSMO_META)) return WCOSMO;
  if (sameAddr(meta, COSMO_META)) return COSMO;
  if (sameAddr(meta, TINTEST_META)) return { meta, symbol: 'TINTEST', decimals: TINTEST_DECIMALS };
  // Unknown FA: show base units with the short metadata address as the symbol.
  return { meta, symbol: `units of ${shortAddr(meta)}`, decimals: 0 };
}

async function guarded<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

// Bounded-concurrency map so a 200-ID scan does not open 200 sockets at once.
async function pMap<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ---- Chain time ----------------------------------------------------------------
// /rpc/v1/block returns the latest block with a microsecond timestamp. Positions
// are classified against THIS clock, and the page warns if the browser disagrees.
export type ChainTime = { height: number; secs: bigint; isoUtc: string };

export async function fetchChainTime(): Promise<ChainTime> {
  const r = await fetch(`${RPC}/rpc/v1/block`);
  if (!r.ok) throw new Error(`block HTTP ${r.status}`);
  const j = (await r.json()) as {
    height?: number | string;
    timestamp?: { microseconds_since_unix_epoch?: number | string; utc_date_time?: string };
  };
  const us = BigInt(String(j.timestamp?.microseconds_since_unix_epoch ?? 0));
  if (us === ZERO) throw new Error('block timestamp missing');
  return {
    height: Number(j.height ?? 0),
    secs: us / BigInt(1_000_000),
    isoUtc: String(j.timestamp?.utc_date_time ?? ''),
  };
}

// ---- Wallet + bonds --------------------------------------------------------------
export type WalletSnapshot = {
  cosmo: bigint;
  wcosmo: bigint;
  maker: BondInput | null; // null = no entry (get_operator_bond aborts)
  provider: BondInput | null; // null = no entry or zero
  council: bigint | null; // null = no entry (get_council_bond aborts)
  makerSlashCount: bigint;
  providerSlashCount: bigint;
  errors: string[];
};

export async function fetchWalletSnapshot(addr: string): Promise<WalletSnapshot> {
  const errors: string[] = [];
  const [cosmo, wcosmo, makerT, provT, councilT] = await Promise.all([
    guarded(faBalance(addr, COSMO_META), null),
    guarded(faBalance(addr, WCOSMO_META), null),
    guarded<unknown[] | null>(rpcViewAll(`${MV}::get_operator_bond`, [], [addr]), null),
    guarded<unknown[] | null>(rpcViewAll(`${PV}::get_provider_bond`, [], [addr]), null),
    guarded<unknown[] | null>(rpcViewAll(`${MV}::get_council_bond`, [], [addr]), null),
  ]);
  if (cosmo === null) errors.push('COSMO balance unavailable');
  if (wcosmo === null) errors.push('wCOSMO balance unavailable');
  const maker: BondInput | null =
    makerT && makerT.length >= 3
      ? { amount: big(makerT[0]), lockedUntilSecs: big(makerT[1]), activeJobs: ZERO, slashCount: big(makerT[2]) }
      : null;
  const provider: BondInput | null =
    provT && provT.length >= 5
      ? { amount: big(provT[0]), lockedUntilSecs: big(provT[1]), activeJobs: big(provT[4]), slashCount: big(provT[2]) }
      : null;
  return {
    cosmo: cosmo ?? ZERO,
    wcosmo: wcosmo ?? ZERO,
    maker,
    provider,
    council: councilT && councilT.length >= 1 ? big(councilT[0]) : null,
    makerSlashCount: maker?.slashCount ?? ZERO,
    providerSlashCount: provider?.slashCount ?? ZERO,
    errors,
  };
}

export function bondPositions(w: WalletSnapshot, nowSecs: bigint): Position[] {
  return [
    makerBondPosition(w.maker, WCOSMO, nowSecs),
    providerBondPosition(w.provider, WCOSMO, nowSecs),
    councilBondPosition(w.council, WCOSMO),
  ].filter((p): p is Position => p !== null);
}

// ---- Window scans -----------------------------------------------------------------
export type ScanWindow = { rfqRequests: number; rfqQuotes: number; cmpRequests: number; cmpJobs: number };
export const DEFAULT_WINDOW: ScanWindow = { rfqRequests: 200, rfqQuotes: 200, cmpRequests: 200, cmpJobs: 100 };
export const MIN_WINDOW = 50;
export const SLOW_SCAN_MS = 8000;

export type ScanReport = {
  // ids actually checked: [lo, hi) per counter
  rfqRequests: { lo: number; hi: number; total: number };
  rfqQuotes: { lo: number; hi: number; total: number };
  cmpRequests: { lo: number; hi: number; total: number };
  cmpJobs: { lo: number; hi: number; total: number };
  ms: number;
  unreadable: number; // ids whose view call failed (counted, never shown as 0)
};

function range(next: number, cap: number): { lo: number; hi: number; total: number; ids: number[] } {
  const hi = next;
  const lo = Math.max(0, next - cap);
  return { lo, hi, total: next, ids: Array.from({ length: hi - lo }, (_, i) => hi - 1 - i) };
}

const eq = (a: string, b: string) => sameAddr(a, b);

export async function scanPositions(
  addr: string,
  nowSecs: bigint,
  win: ScanWindow,
): Promise<{ positions: Position[]; report: ScanReport }> {
  const t0 = performance.now();
  const [nReq, nQuote, nCReq, nJob] = await Promise.all([
    rpcView(`${RFQ}::get_next_request_id`, [], []),
    rpcView(`${RFQ}::get_next_quote_id`, [], []),
    rpcView(`${CR}::get_next_request_id`, [], []),
    rpcView(`${CR}::get_next_job_id`, [], []),
  ]);
  const rr = range(Number(big(nReq)), win.rfqRequests);
  const rq = range(Number(big(nQuote)), win.rfqQuotes);
  const cr = range(Number(big(nCReq)), win.cmpRequests);
  const cj = range(Number(big(nJob)), win.cmpJobs);
  let unreadable = 0;

  const [reqRows, accRows, cReqRows, jobRows] = await Promise.all([
    pMap(rr.ids, 8, (id) => guarded<unknown[] | null>(rpcViewAll(`${RFQ}::get_request`, [], [String(id)]), null)),
    pMap(rq.ids, 8, (id) => guarded<unknown[] | null>(rpcViewAll(`${RFQ}::get_accepted_quote`, [], [String(id)]), null)),
    // V2 views abort for V1-era ids (shared counter): a failure here is "not a V2 record", not an error.
    pMap(cr.ids, 8, (id) => guarded<unknown[] | null>(rpcViewAll(`${CR}::get_request_v2`, [], [String(id)]), null)),
    pMap(cj.ids, 8, (id) => guarded<unknown[] | null>(rpcViewAll(`${CR}::get_job_v2`, [], [String(id)]), null)),
  ]);

  const positions: Position[] = [];

  // RFQ requests: fee rows + funded maker legs (quote fetched only where it can matter)
  const reqs = reqRows.map((t) => (t ? parseRfqRequest(t) : null));
  reqRows.forEach((t, i) => {
    if (t === null) unreadable++;
    void i;
  });
  const needQuote = reqs.filter((r): r is NonNullable<typeof r> => r !== null && r.status === 5 && r.requestFeeQuants >= ZERO);
  const quoteRows = await pMap(needQuote, 8, (r) =>
    guarded<unknown[] | null>(rpcViewAll(`${RFQ}::get_quote`, [], [r.requestId.toString()]), null),
  );
  const quoteByReq = new Map<string, ReturnType<typeof parseRfqQuote>>();
  needQuote.forEach((r, i) => quoteByReq.set(r.requestId.toString(), parseRfqQuote(quoteRows[i])));
  for (const r of reqs) {
    if (!r) continue;
    positions.push(...classifyRfqRequest(r, quoteByReq.get(r.requestId.toString()) ?? null, addr, nowSecs, tokenOf, WCOSMO, eq));
  }

  // RFQ accepted quotes
  for (const t of accRows) {
    const a = parseRfqAccepted(t);
    if (!a) continue;
    positions.push(...classifyRfqAccepted(a, addr, nowSecs, tokenOf, eq));
  }

  // Compute requests (V2 only)
  cr.ids.forEach((id, i) => {
    const r = parseCmpRequest(BigInt(id), cReqRows[i]);
    if (!r) return;
    positions.push(...classifyCmpRequest(r, addr, nowSecs, tokenOf, eq));
  });

  // Compute jobs (V2 only); dispute info only for disputed jobs of this buyer
  const jobsParsed = cj.ids.map((id, i) => parseCmpJob(BigInt(id), jobRows[i], null));
  const disputed = jobsParsed.filter((j): j is NonNullable<typeof j> => j !== null && j.status === 4 && eq(j.buyer, addr));
  const disputeRows = await pMap(disputed, 8, (j) =>
    guarded<unknown[] | null>(rpcViewAll(`${CR}::get_dispute_info_v2`, [], [j.jobId.toString()]), null),
  );
  disputed.forEach((j, i) => {
    const d = disputeRows[i];
    if (d && d.length >= 2) {
      j.disputedAt = big(d[0]);
      j.disputeBond = big(d[1]);
    }
  });
  for (const j of jobsParsed) {
    if (!j) continue;
    positions.push(...classifyCmpJob(j, addr, nowSecs, tokenOf, eq));
  }

  return {
    positions,
    report: {
      rfqRequests: { lo: rr.lo, hi: rr.hi, total: rr.total },
      rfqQuotes: { lo: rq.lo, hi: rq.hi, total: rq.total },
      cmpRequests: { lo: cr.lo, hi: cr.hi, total: cr.total },
      cmpJobs: { lo: cj.lo, hi: cj.hi, total: cj.total },
      ms: Math.round(performance.now() - t0),
      unreadable,
    },
  };
}

// D-PV-2: halve every window when a scan took longer than SLOW_SCAN_MS; never below MIN_WINDOW.
export function nextWindow(win: ScanWindow, lastMs: number): ScanWindow {
  if (lastMs <= SLOW_SCAN_MS) return win;
  const h = (n: number) => Math.max(MIN_WINDOW, Math.floor(n / 2));
  return { rfqRequests: h(win.rfqRequests), rfqQuotes: h(win.rfqQuotes), cmpRequests: h(win.cmpRequests), cmpJobs: h(win.cmpJobs) };
}
