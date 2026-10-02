// /portfolio — PURE classification of on-chain records into the six rows of
// the position snapshot. No fetching here. Every predicate mirrors the
// contract, with the source line noted, so spec and code cannot drift.
//
// Rows: wallet | bonded | escrow | claimable | gone | not-readable (honesty box)
//
// Rules (plan: plans/portfolio-view-plan.md, D-PV-1..5):
//  - "claimable" ONLY where an entry function returns the tokens on a click.
//  - Time compares against CHAIN time (block timestamp), never the browser alone.
//  - Nothing here claims completeness: the caller labels the scanned window.

export type Token = { meta: string; symbol: string; decimals: number };

export type Bucket = 'bonded' | 'escrow' | 'claimable' | 'gone';

export type Position = {
  bucket: Bucket;
  // where the tokens sit / came from
  source:
    | 'maker_vault'
    | 'provider_vault'
    | 'council_bond'
    | 'rfq_request'
    | 'rfq_accepted'
    | 'compute_request'
    | 'compute_job';
  // human id of the record, '' for bonds
  ref: string;
  role: 'operator' | 'provider' | 'council' | 'maker' | 'taker' | 'buyer' | 'requester';
  amount: bigint;
  token: Token;
  // one sentence: what happens next / why it is gone
  next: string;
  // entry function that returns the tokens (claimable rows), else null
  returnFn: string | null;
  // unix secs from which returnFn is callable (escrow rows that will become claimable), else null
  returnAfterSecs: bigint | null;
};

const ZERO = BigInt(0);
const big = (v: unknown) => BigInt(String(v ?? 0));

export function fmtUtc(secs: bigint | number): string {
  return new Date(Number(secs) * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

// ---- Bonds ------------------------------------------------------------------

export type BondInput = {
  amount: bigint;
  lockedUntilSecs: bigint; // 0 = never locked
  activeJobs: bigint; // provider only; 0 for maker/council
  slashCount: bigint;
};

// provider_vault.move:398ff / maker_vault.move:729ff — withdraw requires
// now >= locked_until_secs (set ONLY by a penalty deduction) and, for the
// provider vault, active_job_count == 0.
export function bondState(
  b: BondInput,
  nowSecs: bigint,
): { withdrawableNow: boolean; lockedUntilSecs: bigint | null; next: string } {
  const locked = b.lockedUntilSecs > ZERO && b.lockedUntilSecs > nowSecs;
  if (b.activeJobs > ZERO) {
    return {
      withdrawableNow: false,
      lockedUntilSecs: locked ? b.lockedUntilSecs : null,
      next: `Withdrawal blocked while a job is active (${b.activeJobs.toString()} active). Opens again when the job settles.`,
    };
  }
  if (locked) {
    return {
      withdrawableNow: false,
      lockedUntilSecs: b.lockedUntilSecs,
      next: `Withdrawable from ${fmtUtc(b.lockedUntilSecs)} (a penalty deduction set this lock).`,
    };
  }
  return {
    withdrawableNow: true,
    lockedUntilSecs: null,
    next: 'Withdrawable now, in full or down to the required minimum.',
  };
}

export function makerBondPosition(b: BondInput | null, token: Token, nowSecs: bigint): Position | null {
  if (!b || b.amount === ZERO) return null;
  const s = bondState(b, nowSecs);
  return {
    bucket: 'bonded',
    source: 'maker_vault',
    ref: '',
    role: 'operator',
    amount: b.amount,
    token,
    next: s.next,
    returnFn: 'maker_vault::withdraw_operator_bond',
    returnAfterSecs: s.lockedUntilSecs,
  };
}

export function providerBondPosition(b: BondInput | null, token: Token, nowSecs: bigint): Position | null {
  if (!b || b.amount === ZERO) return null;
  const s = bondState(b, nowSecs);
  return {
    bucket: 'bonded',
    source: 'provider_vault',
    ref: '',
    role: 'provider',
    amount: b.amount,
    token,
    next: s.next,
    returnFn: 'provider_vault::withdraw_provider_bond',
    returnAfterSecs: s.lockedUntilSecs,
  };
}

// maker_vault.move: post_council_bond exists, no withdraw entry function (plan L3).
export function councilBondPosition(amount: bigint | null, token: Token): Position | null {
  if (amount === null || amount === ZERO) return null;
  return {
    bucket: 'bonded',
    source: 'council_bond',
    ref: '',
    role: 'council',
    amount,
    token,
    next: 'No withdraw function in v1. Exit rules are planned (council liability), not deployed.',
    returnFn: null,
    returnAfterSecs: null,
  };
}

// ---- RFQ (rfq_engine.move) ---------------------------------------------------
// Request status u8: 0 REQUESTED, 1 QUOTED, 2 ACCEPTED, 3 CANCELLED, 4 EXPIRED
// (written only by reclaim_unaccepted_quote), 5 FUNDED.
// Accepted status u8: 0 PENDING, 1 SETTLED, 3 VETOED, 4 FREEZE, 5 UNWOUND.

export const RFQ_REQ = { REQUESTED: 0, QUOTED: 1, ACCEPTED: 2, CANCELLED: 3, EXPIRED: 4, FUNDED: 5 } as const;
export const RFQ_ACC = { PENDING: 0, SETTLED: 1, VETOED: 3, FREEZE: 4, UNWOUND: 5 } as const;

// get_request 11-tuple (rfq_engine.move get_request)
export type RfqRequestRec = {
  requestId: bigint;
  requester: string;
  tokenIn: string;
  amountIn: bigint;
  tokenOut: string;
  minAmountOut: bigint;
  requestFeeQuants: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  status: number;
};

// get_quote 7-tuple
export type RfqQuoteRec = {
  hasQuote: boolean;
  makerOperator: string;
  amountOut: bigint;
  settlementDeadlineSecs: bigint;
};

// get_accepted_quote 15-tuple
export type RfqAcceptedRec = {
  quoteId: bigint;
  requestId: bigint;
  taker: string;
  makerOperator: string;
  tokenIn: string;
  amountIn: bigint;
  tokenOut: string;
  promisedAmountOut: bigint;
  settlementDeadlineSecs: bigint;
  status: number;
};

export function parseRfqRequest(t: unknown[]): RfqRequestRec | null {
  if (!t || t.length < 11) return null;
  return {
    requestId: big(t[0]),
    requester: String(t[1] ?? ''),
    tokenIn: String(t[3] ?? ''),
    amountIn: big(t[4]),
    tokenOut: String(t[5] ?? ''),
    minAmountOut: big(t[6]),
    requestFeeQuants: big(t[7]),
    createdAt: big(t[8]),
    expiresAt: big(t[9]),
    status: Number(big(t[10])),
  };
}

export function parseRfqQuote(t: unknown[] | null): RfqQuoteRec | null {
  if (!t || t.length < 7) return null;
  return {
    hasQuote: t[0] === true,
    makerOperator: String(t[1] ?? ''),
    amountOut: big(t[3]),
    settlementDeadlineSecs: big(t[4]),
  };
}

export function parseRfqAccepted(t: unknown[] | null): RfqAcceptedRec | null {
  if (!t || t.length < 15) return null;
  return {
    quoteId: big(t[0]),
    requestId: big(t[1]),
    taker: String(t[2] ?? ''),
    makerOperator: String(t[5] ?? ''),
    tokenIn: String(t[6] ?? ''),
    amountIn: big(t[7]),
    tokenOut: String(t[8] ?? ''),
    promisedAmountOut: big(t[9]),
    settlementDeadlineSecs: big(t[11]),
    status: Number(big(t[12])),
  };
}

export type AddrEq = (a: string, b: string) => boolean;

// Request-level positions for `addr`:
//  - requester fee: paid in wCOSMO (create_request transfers wcosmo_metadata_addr
//    to the fee account), never returned                                          -> gone
//  - maker leg of a FUNDED (not yet accepted) quote: amount_out in escrow;
//    reclaim_unaccepted_quote(maker only) after expires_at                       -> escrow / claimable
export function classifyRfqRequest(
  req: RfqRequestRec,
  quote: RfqQuoteRec | null,
  addr: string,
  nowSecs: bigint,
  tokenOf: (meta: string) => Token,
  feeToken: Token,
  eq: AddrEq,
): Position[] {
  const out: Position[] = [];
  const ref = `request #${req.requestId.toString()}`;
  if (eq(req.requester, addr) && req.requestFeeQuants > ZERO) {
    out.push({
      bucket: 'gone',
      source: 'rfq_request',
      ref,
      role: 'requester',
      amount: req.requestFeeQuants,
      token: feeToken,
      next: 'Request fee, paid to the fee account at creation. Not refundable.',
      returnFn: null,
      returnAfterSecs: null,
    });
  }
  if (req.status === RFQ_REQ.FUNDED && quote?.hasQuote && eq(quote.makerOperator, addr)) {
    const expired = nowSecs >= req.expiresAt;
    out.push({
      bucket: expired ? 'claimable' : 'escrow',
      source: 'rfq_request',
      ref,
      role: 'maker',
      amount: quote.amountOut,
      token: tokenOf(req.tokenOut),
      next: expired
        ? 'Request expired without acceptance. You (the maker) can reclaim this leg now.'
        : `Your funded quote leg. Returned if nobody accepts by ${fmtUtc(req.expiresAt)}; otherwise it settles.`,
      returnFn: 'rfq_engine::reclaim_unaccepted_quote',
      returnAfterSecs: req.expiresAt,
    });
  }
  return out;
}

// Accepted-quote positions for `addr` (both legs sit in the pooled escrow):
//  - PENDING / FREEZE: taker leg amount_in, maker leg promised_amount_out
//  - claim_unwind (permissionless) once now >= settlement_deadline_secs
//  - SETTLED / VETOED / UNWOUND: terminal, nothing in escrow
export function classifyRfqAccepted(
  acc: RfqAcceptedRec,
  addr: string,
  nowSecs: bigint,
  tokenOf: (meta: string) => Token,
  eq: AddrEq,
): Position[] {
  if (acc.status !== RFQ_ACC.PENDING && acc.status !== RFQ_ACC.FREEZE) return [];
  const out: Position[] = [];
  const ref = `quote #${acc.quoteId.toString()} (request #${acc.requestId.toString()})`;
  const due = nowSecs >= acc.settlementDeadlineSecs;
  const frozen = acc.status === RFQ_ACC.FREEZE;
  const next = due
    ? 'Settlement deadline passed. Anyone can call claim_unwind; both legs return to their owners.'
    : frozen
      ? `Frozen by council. If not settled by ${fmtUtc(acc.settlementDeadlineSecs)}, it unwinds and your leg returns.`
      : `Awaiting settlement by ${fmtUtc(acc.settlementDeadlineSecs)}. If the deadline passes, your leg returns via claim_unwind.`;
  const base = {
    bucket: (due ? 'claimable' : 'escrow') as Bucket,
    source: 'rfq_accepted' as const,
    ref,
    next,
    returnFn: 'rfq_engine::claim_unwind',
    returnAfterSecs: acc.settlementDeadlineSecs,
  };
  if (eq(acc.taker, addr)) {
    out.push({ ...base, role: 'taker', amount: acc.amountIn, token: tokenOf(acc.tokenIn) });
  }
  if (eq(acc.makerOperator, addr)) {
    out.push({ ...base, role: 'maker', amount: acc.promisedAmountOut, token: tokenOf(acc.tokenOut) });
  }
  return out;
}

// ---- Compute (compute_rfq.move, V2 registry) ---------------------------------
// Request status: 0 OPEN, 1 QUOTED, 2 ACCEPTED, 3 CANCELLED, 4 EXPIRED
// Job status: 0 ACTIVE, 1 DELIVERED, 2 SETTLED, 3 SLASHED, 4 DISPUTED, 5 REFUNDED

export const CMP_REQ = { OPEN: 0, QUOTED: 1, ACCEPTED: 2, CANCELLED: 3, EXPIRED: 4 } as const;
export const CMP_JOB = { ACTIVE: 0, DELIVERED: 1, SETTLED: 2, SLASHED: 3, DISPUTED: 4, REFUNDED: 5 } as const;
export const DISPUTE_TTL_SECS = BigInt(7 * 86400); // compute_rfq.move:74

// get_request_v2 11-tuple
export type CmpRequestRec = {
  requestId: bigint;
  buyer: string;
  maxPrice: bigint;
  expiresAt: bigint;
  status: number;
  paymentFa: string;
};

// get_job_v2 12-tuple + get_dispute_info_v2 2-tuple
export type CmpJobRec = {
  jobId: bigint;
  requestId: bigint;
  buyer: string;
  solver: string;
  price: bigint;
  jobDeadlineSecs: bigint;
  reviewWindowSecs: bigint;
  deliveredAt: bigint;
  status: number;
  paymentFa: string;
  disputedAt: bigint;
  disputeBond: bigint;
};

export function parseCmpRequest(id: bigint, t: unknown[] | null): CmpRequestRec | null {
  if (!t || t.length < 11) return null;
  return {
    requestId: id,
    buyer: String(t[0] ?? ''),
    maxPrice: big(t[3]),
    expiresAt: big(t[7]),
    status: Number(big(t[8])),
    paymentFa: String(t[9] ?? ''),
  };
}

export function parseCmpJob(id: bigint, t: unknown[] | null, d: unknown[] | null): CmpJobRec | null {
  if (!t || t.length < 12) return null;
  return {
    jobId: id,
    requestId: big(t[0]),
    buyer: String(t[1] ?? ''),
    solver: String(t[2] ?? ''),
    price: big(t[3]),
    jobDeadlineSecs: big(t[4]),
    reviewWindowSecs: big(t[5]),
    deliveredAt: big(t[7]),
    status: Number(big(t[9])),
    paymentFa: String(t[10] ?? ''),
    disputedAt: d && d.length >= 2 ? big(d[0]) : ZERO,
    disputeBond: d && d.length >= 2 ? big(d[1]) : ZERO,
  };
}

// Buyer escrow of max_price at create (compute_rfq create_outcome_request_v2);
// reclaim_expired_request_v2 after expires_at while OPEN/QUOTED.
export function classifyCmpRequest(
  req: CmpRequestRec,
  addr: string,
  nowSecs: bigint,
  tokenOf: (meta: string) => Token,
  eq: AddrEq,
): Position[] {
  if (!eq(req.buyer, addr)) return [];
  if (req.status !== CMP_REQ.OPEN && req.status !== CMP_REQ.QUOTED) return [];
  const expired = nowSecs >= req.expiresAt;
  return [
    {
      bucket: expired ? 'claimable' : 'escrow',
      source: 'compute_request',
      ref: `compute request #${req.requestId.toString()}`,
      role: 'buyer',
      amount: req.maxPrice,
      token: tokenOf(req.paymentFa),
      next: expired
        ? 'Quoting window closed without a job. You can reclaim the escrowed price now.'
        : `Escrowed max price while providers quote, until ${fmtUtc(req.expiresAt)}. Returned if no job starts.`,
      returnFn: 'compute_rfq::reclaim_expired_request_v2',
      returnAfterSecs: req.expiresAt,
    },
  ];
}

// Buyer's price (and dispute bond) sit in escrow while the job is open:
//  ACTIVE    -> claim_no_delivery_v2 once now >= job_deadline_secs
//  DELIVERED -> review window; settles to the provider (timeout_settle_v2), not claimable by buyer
//  DISPUTED  -> claim_dispute_unwind_v2 once now >= disputed_at + DISPUTE_TTL
export function classifyCmpJob(
  job: CmpJobRec,
  addr: string,
  nowSecs: bigint,
  tokenOf: (meta: string) => Token,
  eq: AddrEq,
): Position[] {
  if (!eq(job.buyer, addr)) return [];
  const token = tokenOf(job.paymentFa);
  const ref = `compute job #${job.jobId.toString()}`;
  if (job.status === CMP_JOB.ACTIVE) {
    const due = nowSecs >= job.jobDeadlineSecs;
    return [
      {
        bucket: due ? 'claimable' : 'escrow',
        source: 'compute_job',
        ref,
        role: 'buyer',
        amount: job.price,
        token,
        next: due
          ? 'Delivery deadline passed with no result. You can claim the price back now (provider is penalised).'
          : `Job price escrowed until delivery, due by ${fmtUtc(job.jobDeadlineSecs)}. If nothing is delivered, you can claim it back.`,
        returnFn: 'compute_rfq::claim_no_delivery_v2',
        returnAfterSecs: job.jobDeadlineSecs,
      },
    ];
  }
  if (job.status === CMP_JOB.DELIVERED) {
    const settleAt = job.deliveredAt + job.reviewWindowSecs;
    return [
      {
        bucket: 'escrow',
        source: 'compute_job',
        ref,
        role: 'buyer',
        amount: job.price,
        token,
        next: `Result delivered. Review window until ${fmtUtc(settleAt)}; then the price settles to the provider unless you dispute.`,
        returnFn: null,
        returnAfterSecs: null,
      },
    ];
  }
  if (job.status === CMP_JOB.DISPUTED) {
    const due = nowSecs >= job.disputedAt + DISPUTE_TTL_SECS;
    const amount = job.price + job.disputeBond;
    return [
      {
        bucket: due ? 'claimable' : 'escrow',
        source: 'compute_job',
        ref,
        role: 'buyer',
        amount,
        token,
        next: due
          ? 'Dispute window passed unresolved. You can unwind and get price and dispute bond back now.'
          : `Disputed. Price plus your dispute bond stay escrowed until resolution or ${fmtUtc(job.disputedAt + DISPUTE_TTL_SECS)}.`,
        returnFn: 'compute_rfq::claim_dispute_unwind_v2',
        returnAfterSecs: job.disputedAt + DISPUTE_TTL_SECS,
      },
    ];
  }
  return []; // SETTLED / SLASHED / REFUNDED: terminal, nothing in escrow
}

// ---- Aggregation ---------------------------------------------------------------

export function sumByToken(positions: Position[]): { token: Token; amount: bigint }[] {
  const m = new Map<string, { token: Token; amount: bigint }>();
  for (const p of positions) {
    const cur = m.get(p.token.meta);
    if (cur) cur.amount += p.amount;
    else m.set(p.token.meta, { token: p.token, amount: p.amount });
  }
  return [...m.values()];
}

export function fmtTokenAmt(amount: bigint, token: Token): string {
  const d = token.decimals;
  const whole = amount / BigInt(10 ** d);
  const frac = amount % BigInt(10 ** d);
  const fracStr = frac.toString().padStart(d, '0').replace(/0+$/, '');
  const w = whole.toLocaleString('en-US');
  return (fracStr ? `${w}.${fracStr}` : w) + ' ' + token.symbol;
}
