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
