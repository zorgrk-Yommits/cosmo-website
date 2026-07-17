// Direct chain reads for the market flow (resilience rule: the on-chain rail
// must stay readable even if the market backend is down). Tuple layouts
// mirror compute_rfq.move — get_quote_v2 5-tuple, get_request_v2 11-tuple.

import { COMPUTE_PKG_ADDR, rpcViewAll } from '@/lib/mainnetOnchain';

export interface OnchainQuote {
  hasQuote: boolean;
  solver: string;
  price: string; // quants, decimal string
  signedAtSecs: number;
}

export interface OnchainRequest {
  buyer: string;
  inputHash: string;
  maxPrice: string;
  jobDeadlineSecs: number;
  expiresAt: number;
  status: number;
  paymentFa: string;
}

export const REQ_STATUS_ACCEPTED = 2;

// On-chain job statuses (compute_rfq.move:84-89).
export const JOB_ONCHAIN_STATUS = {
  ACTIVE: 0,
  DELIVERED: 1,
  SETTLED: 2,
  SLASHED: 3,
  DISPUTED: 4,
  REFUNDED: 5,
} as const;

export interface OnchainJob {
  requestId: number;
  buyer: string;
  solver: string;
  price: string; // quants, decimal string
  jobDeadlineSecs: number; // ABSOLUTE unix secs — the deliver deadline
  reviewWindowSecs: number;
  acceptedAt: number;
  deliveredAt: number; // 0 until delivered
  resultHash: string; // '0x' while empty
  status: number;
  paymentFa: string;
}

export async function fetchOnchainQuote(requestId: number): Promise<OnchainQuote> {
  const t = await rpcViewAll(
    `${COMPUTE_PKG_ADDR}::compute_rfq::get_quote_v2`,
    [],
    [String(requestId)],
  );
  if (t.length !== 5) throw new Error(`get_quote_v2: expected 5-tuple, got ${t.length}`);
  return {
    hasQuote: t[0] === true,
    solver: String(t[1]),
    price: String(t[2]),
    signedAtSecs: Number(t[3]),
  };
}

// get_job_v2 12-tuple: (request_id, buyer, solver, price, job_deadline_secs,
// review_window_secs, accepted_at, delivered_at, result_hash, status,
// payment_fa, bond_required_quants) — compute_rfq.move:2868.
export async function fetchOnchainJob(jobId: number): Promise<OnchainJob> {
  const t = await rpcViewAll(
    `${COMPUTE_PKG_ADDR}::compute_rfq::get_job_v2`,
    [],
    [String(jobId)],
  );
  if (t.length !== 12) throw new Error(`get_job_v2: expected 12-tuple, got ${t.length}`);
  return {
    requestId: Number(t[0]),
    buyer: String(t[1]),
    solver: String(t[2]),
    price: String(t[3]),
    jobDeadlineSecs: Number(t[4]),
    reviewWindowSecs: Number(t[5]),
    acceptedAt: Number(t[6]),
    deliveredAt: Number(t[7]),
    resultHash: String(t[8]),
    status: Number(t[9]),
    paymentFa: String(t[10]),
  };
}

export async function fetchOnchainRequest(requestId: number): Promise<OnchainRequest> {
  const t = await rpcViewAll(
    `${COMPUTE_PKG_ADDR}::compute_rfq::get_request_v2`,
    [],
    [String(requestId)],
  );
  if (t.length !== 11) throw new Error(`get_request_v2: expected 11-tuple, got ${t.length}`);
  return {
    buyer: String(t[0]),
    inputHash: String(t[2]),
    maxPrice: String(t[3]),
    jobDeadlineSecs: Number(t[4]),
    expiresAt: Number(t[7]),
    status: Number(t[8]),
    paymentFa: String(t[9]),
  };
}
