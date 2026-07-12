// /rfq data layer — reconstructs the RFQ lifecycle PURELY from public
// rfq_engine view functions (no daemon endpoint, no events, no indexer).
//
// Correctness notes (verified against rfq_engine.move 2026-07-12):
// - Request status u8: 0 REQUESTED, 1 QUOTED, 2 ACCEPTED, 3 CANCELLED,
//   4 EXPIRED, 5 FUNDED. Status 4 is written ONLY by reclaim_unaccepted_quote
//   (requires FUNDED + past expiry) -> 4 unambiguously means RECLAIMED.
// - Timeouts are NEVER written on-chain: an unserved request keeps 0/1/5
//   forever. Display state must be derived from `expires_at` vs. the
//   viewer's clock (deriveDisplayPhase below).
// - Accepted-quote status u8: 0 PENDING, 1 SETTLED, 2 = RESERVED HOLE
//   (retired code, never crash on it), 3 VETOED, 4 FREEZE, 5 UNWOUND.
// - There is NO request_id -> quote_id view: iterate get_accepted_quote(q)
//   for q in 0..next_quote_id-1 and index by tuple slot 1 (request_id).
//   O(M) scan — fine for small M; needs a bounded scan once M grows > ~50.

import {
  COSMOCLAW_ADDR,
  K1_AGENT_NFT,
  MAKER_OPERATORS,
  WCOSMO_META,
  faBalance,
  rpcView,
  rpcViewAll,
} from '@/lib/mainnetOnchain';

const RFQ = `${COSMOCLAW_ADDR}::rfq_engine`;
const MV = `${COSMOCLAW_ADDR}::maker_vault`;
const CA = `${COSMOCLAW_ADDR}::clawagent_v3`;

export const K1_ADDR = MAKER_OPERATORS.find((o) => o.key === 'K1')!.addr;

// K1 quotes are machine-signed only since the maker daemon was armed
// (GO C1, 2026-07-12 13:21 UTC). Earlier K1 quotes were driven manually —
// the "autonomous maker" tag must not claim them. Curated constant.
export const K1_AUTONOMOUS_SINCE_SECS = BigInt(1783862473);

// Live-fetch cap: newest CAP requests. A footnote renders only when exceeded.
export const REQUEST_CAP = 25;

const big = (v: unknown) => BigInt(String(v ?? 0));

async function guarded<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

// ---- Types ------------------------------------------------------------------

export type MakerVitals = {
  agentActive: boolean | null; // null = fetch failed
  eligible: boolean | null;
  // null = no vault entry / fetch failed
  bond: { amount: bigint; lockedUntilSecs: bigint; slashCount: bigint } | null;
  freeInventory: bigint | null;
};

export type AcceptedInfo = {
  quoteId: bigint;
  taker: string;
  amountIn: bigint;
  promisedAmountOut: bigint;
  acceptedAt: bigint;
  settlementDeadlineSecs: bigint;
  status: number;
  resolved: boolean;
  lockedBackersCount: bigint;
};

export type QuoteInfo = {
  makerOperator: string;
  amountOut: bigint;
  settlementDeadlineSecs: bigint;
  signedAtSecs: bigint;
};

export type RfqRequest = {
  requestId: bigint;
  requester: string;
  agentNftAddr: string;
  tokenIn: string;
  amountIn: bigint;
  tokenOut: string;
  minAmountOut: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  status: number;
  quote: QuoteInfo | null;
  accepted: AcceptedInfo | null;
};

export type RfqFeed = {
  nextRequestId: bigint;
  requests: RfqRequest[]; // newest first
};

// ---- Fetchers ---------------------------------------------------------------

export async function fetchMakerVitals(): Promise<MakerVitals> {
  const [agentActive, eligible, bondTuple, freeInventory] = await Promise.all([
    guarded<unknown>(rpcView(`${CA}::is_active_agent`, [], [K1_AGENT_NFT]), null),
    guarded<unknown>(rpcView(`${MV}::is_operator_quote_eligible`, [], [K1_ADDR]), null),
    guarded<unknown[] | null>(rpcViewAll(`${MV}::get_operator_bond`, [], [K1_ADDR]), null),
    guarded<bigint | null>(faBalance(K1_ADDR, WCOSMO_META), null),
  ]);
  return {
    agentActive: agentActive === null ? null : agentActive === true,
    eligible: eligible === null ? null : eligible === true,
    bond:
      bondTuple === null || bondTuple.length === 0
        ? null
        : {
            amount: big(bondTuple[0]),
            lockedUntilSecs: big(bondTuple[1]),
            slashCount: big(bondTuple[2]),
          },
    freeInventory,
  };
}

export async function fetchRfqFeed(): Promise<RfqFeed> {
  // wave 1: counters
  const [nextReq, nextQuote] = await Promise.all([
    rpcView(`${RFQ}::get_next_request_id`, [], []),
    rpcView(`${RFQ}::get_next_quote_id`, [], []),
  ]);
  const n = Number(big(nextReq));
  const m = Number(big(nextQuote));
  const lo = Math.max(0, n - REQUEST_CAP);
  const ids = Array.from({ length: n - lo }, (_, i) => n - 1 - i); // newest first

  // wave 2: request rows + full accepted scan (indexed by request_id)
  const [rows, acceptedRows] = await Promise.all([
    Promise.all(ids.map((id) => rpcViewAll(`${RFQ}::get_request`, [], [id.toString()]))),
    Promise.all(
      Array.from({ length: m }, (_, q) =>
        guarded<unknown[] | null>(rpcViewAll(`${RFQ}::get_accepted_quote`, [], [q.toString()]), null),
      ),
    ),
  ]);

  const acceptedByReq = new Map<string, AcceptedInfo>();
  for (const t of acceptedRows) {
    if (!t || t.length < 15) continue;
    acceptedByReq.set(big(t[1]).toString(), {
      quoteId: big(t[0]),
      taker: String(t[2] ?? ''),
      amountIn: big(t[7]),
      promisedAmountOut: big(t[9]),
      acceptedAt: big(t[10]),
      settlementDeadlineSecs: big(t[11]),
      status: Number(big(t[12])),
      resolved: t[13] === true,
      lockedBackersCount: big(t[14]),
    });
  }

  const requests: RfqRequest[] = rows
    .filter((t) => t.length >= 11)
    .map((t) => ({
      requestId: big(t[0]),
      requester: String(t[1] ?? ''),
      agentNftAddr: String(t[2] ?? ''),
      tokenIn: String(t[3] ?? ''),
      amountIn: big(t[4]),
      tokenOut: String(t[5] ?? ''),
      minAmountOut: big(t[6]),
      createdAt: big(t[8]),
      expiresAt: big(t[9]),
      status: Number(big(t[10])),
      quote: null as QuoteInfo | null,
      accepted: acceptedByReq.get(big(t[0]).toString()) ?? null,
    }));

  // wave 3: quote snapshots only where a quote can exist
  const needQuote = requests.filter(
    (r) => r.status === 1 || r.status === 2 || r.status === 4 || r.status === 5 || r.accepted !== null,
  );
  const quoteTuples = await Promise.all(
    needQuote.map((r) =>
      guarded<unknown[] | null>(rpcViewAll(`${RFQ}::get_quote`, [], [r.requestId.toString()]), null),
    ),
  );
  needQuote.forEach((r, i) => {
    const t = quoteTuples[i];
    if (!t || t.length < 7 || t[0] !== true) return;
    r.quote = {
      makerOperator: String(t[1] ?? ''),
      amountOut: big(t[3]),
      settlementDeadlineSecs: big(t[4]),
      signedAtSecs: big(t[5]),
    };
  });

  return { nextRequestId: big(nextReq), requests };
}

// ---- Display-phase derivation (pure; correctness table below) -----------------
//
// | on-chain status        | accepted.status | now vs expires_at | phase            |
// |------------------------|-----------------|-------------------|------------------|
// | 2 ACCEPTED             | 0 PENDING       | (any)             | ACCEPTED_PENDING |
// | 2 ACCEPTED             | 1 SETTLED       | (any)             | SETTLED          |
// | 2 ACCEPTED             | 2 (hole)        | (any)             | UNKNOWN          |
// | 2 ACCEPTED             | 3 VETOED        | (any)             | VETOED           |
// | 2 ACCEPTED             | 4 FREEZE        | (any)             | FROZEN           |
// | 2 ACCEPTED             | 5 UNWOUND       | (any)             | UNWOUND          |
// | 2 ACCEPTED             | (no row found)  | (any)             | UNKNOWN          |
// | 3 CANCELLED            | -               | (any)             | CANCELLED        |
// | 4 EXPIRED (=reclaimed) | -               | (any)             | RECLAIMED        |
// | 0 / 1                  | -               | now >= expires    | EXPIRED_UNSERVED |
// | 5 FUNDED               | -               | now >= expires    | AWAITING_RECLAIM |
// | 0 REQUESTED            | -               | now < expires     | REQUESTED        |
// | 1 QUOTED               | -               | now < expires     | QUOTED           |
// | 5 FUNDED               | -               | now < expires     | FUNDED           |
// | anything else          | -               | -                 | UNKNOWN          |

export type DisplayPhase =
  | 'REQUESTED'
  | 'QUOTED'
  | 'FUNDED'
  | 'ACCEPTED_PENDING'
  | 'SETTLED'
  | 'VETOED'
  | 'FROZEN'
  | 'UNWOUND'
  | 'CANCELLED'
  | 'RECLAIMED'
  | 'EXPIRED_UNSERVED'
  | 'AWAITING_RECLAIM'
  | 'UNKNOWN';

export function deriveDisplayPhase(
  status: number,
  expiresAt: bigint,
  nowSec: number,
  accepted?: { status: number } | null,
): DisplayPhase {
  if (status === 2) {
    if (!accepted) return 'UNKNOWN';
    switch (accepted.status) {
      case 0:
        return 'ACCEPTED_PENDING';
      case 1:
        return 'SETTLED';
      case 3:
        return 'VETOED';
      case 4:
        return 'FROZEN';
      case 5:
        return 'UNWOUND';
      default:
        return 'UNKNOWN'; // incl. the reserved hole at 2
    }
  }
  if (status === 3) return 'CANCELLED';
  if (status === 4) return 'RECLAIMED';
  const expired = BigInt(nowSec) >= expiresAt;
  if ((status === 0 || status === 1) && expired) return 'EXPIRED_UNSERVED';
  if (status === 5 && expired) return 'AWAITING_RECLAIM';
  if (status === 0) return 'REQUESTED';
  if (status === 1) return 'QUOTED';
  if (status === 5) return 'FUNDED';
  return 'UNKNOWN';
}

// ---- Rail node builder --------------------------------------------------------

export type PhaseNodeState = 'done' | 'active' | 'pending' | 'terminal-bad' | 'terminal-neutral';
export type PhaseNode = { id: string; label: string; state: PhaseNodeState };

const HAPPY = ['Request', 'Quoted', 'Funded', 'Accepted', 'Settled'] as const;

function happyPath(doneUpTo: number, activeIndex: number | null): PhaseNode[] {
  return HAPPY.map((label, i) => ({
    id: label.toLowerCase(),
    label,
    state: i < doneUpTo ? 'done' : i === activeIndex ? 'active' : 'pending',
  }));
}

function truncated(doneUpTo: number, terminal: PhaseNode): PhaseNode[] {
  return [...happyPath(doneUpTo, null).slice(0, doneUpTo), terminal];
}

export function buildRailNodes(phase: DisplayPhase, rawStatus?: number): PhaseNode[] {
  switch (phase) {
    case 'REQUESTED':
      return happyPath(1, 1);
    case 'QUOTED':
      return happyPath(2, 2);
    case 'FUNDED':
      return happyPath(3, 3);
    case 'ACCEPTED_PENDING':
      return happyPath(4, 4);
    case 'SETTLED':
      return happyPath(5, null);
    case 'RECLAIMED':
      return truncated(3, { id: 'reclaimed', label: 'Reclaimed', state: 'terminal-neutral' });
    case 'AWAITING_RECLAIM':
      return truncated(3, { id: 'awaiting-reclaim', label: 'Awaiting reclaim', state: 'active' });
    case 'EXPIRED_UNSERVED':
      // rawStatus 1 = a quote existed but was never funded; 0 = never quoted
      return truncated(rawStatus === 1 ? 2 : 1, {
        id: 'expired',
        label: 'Expired unserved',
        state: 'terminal-neutral',
      });
    case 'CANCELLED':
      return truncated(1, { id: 'cancelled', label: 'Cancelled', state: 'terminal-neutral' });
    case 'VETOED':
      return truncated(4, { id: 'vetoed', label: 'Vetoed', state: 'terminal-bad' });
    case 'FROZEN':
      return truncated(4, { id: 'frozen', label: 'Frozen', state: 'terminal-bad' });
    case 'UNWOUND':
      return truncated(4, { id: 'unwound', label: 'Unwound', state: 'terminal-bad' });
    default:
      return truncated(1, { id: 'unknown', label: 'Unknown state', state: 'terminal-neutral' });
  }
}
