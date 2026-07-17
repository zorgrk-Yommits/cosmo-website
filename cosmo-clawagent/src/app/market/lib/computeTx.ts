// Pure builders for the wallet-signable compute_rfq BUYER entry calls (M4).
//
// Mirrors the supraTx.ts pattern, bound to the MAINNET compute package
// (chain 8) instead of the env-driven RFQ target. Only BUYER actions live
// here — quote submission is server-relayed and admin/keeper calls are
// intentionally absent. The server never signs these; the only signer is the
// connected StarKey wallet.
//
// Arg encoding (BCS):
//   address    -> 32 canonical bytes, big-endian, short addrs left-padded
//   u64        -> 8 bytes, little-endian
//   vector<u8> -> ULEB128 length prefix + raw bytes

import { COMPUTE_PKG_ADDR } from '@/lib/mainnetOnchain';

export type ComputeEntryCall = {
  moduleAddress: string; // 0x-prefixed (StarKey payload + `to` field)
  moduleName: string;
  functionName: string;
  typeArgs: string[];
  functionArgs: Uint8Array[];
};

export function addrArg(a: string): Uint8Array {
  let h = a.toLowerCase().replace(/^0x/, '');
  if (h.length > 64) throw new Error(`address too long: ${a}`);
  if (!/^[0-9a-f]*$/.test(h)) throw new Error(`invalid address hex: ${a}`);
  h = h.padStart(64, '0');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function u64Arg(v: number | bigint | string): Uint8Array {
  const out = new Uint8Array(8);
  let x = BigInt(v);
  if (x < BigInt(0) || x > BigInt('0xffffffffffffffff')) throw new Error(`u64 out of range: ${v}`);
  const MASK = BigInt(255);
  const SHIFT = BigInt(8);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & MASK);
    x >>= SHIFT;
  }
  return out;
}

// BCS vector<u8>: real ULEB128 length prefix + raw bytes.
export function bytesArg(b: Uint8Array): Uint8Array {
  const prefix: number[] = [];
  let n = b.length;
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) byte |= 0x80;
    prefix.push(byte);
  } while (n !== 0);
  const out = new Uint8Array(prefix.length + b.length);
  out.set(Uint8Array.from(prefix), 0);
  out.set(b, prefix.length);
  return out;
}

export function utf8Arg(s: string): Uint8Array {
  return bytesArg(new TextEncoder().encode(s));
}

export function hexArg(hex: string): Uint8Array {
  const h = hex.toLowerCase().replace(/^0x/, '');
  if (h.length % 2 !== 0 || !/^[0-9a-f]*$/.test(h)) throw new Error(`invalid hex: ${hex}`);
  const raw = new Uint8Array(h.length / 2);
  for (let i = 0; i < raw.length; i++) raw[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return bytesArg(raw);
}

function call(functionName: string, functionArgs: Uint8Array[]): ComputeEntryCall {
  return {
    moduleAddress: COMPUTE_PKG_ADDR,
    moduleName: 'compute_rfq',
    functionName,
    typeArgs: [],
    functionArgs,
  };
}

// create_outcome_request_v2(buyer, workload_uri, input_hash, payment_fa,
//   max_price, min_bond_quants, job_deadline_secs, review_window_secs)
// — compute_rfq.move:2137. input_hash must be exactly 32 bytes.
export function createOutcomeRequestV2(p: {
  workloadUri: string;
  inputHash: string; // 0x-hex, 32 bytes
  paymentFa: string;
  maxPriceQuants: string;
  minBondQuants: string;
  jobDeadlineSecs: number;
  reviewWindowSecs: number;
}): ComputeEntryCall {
  const hashHex = p.inputHash.toLowerCase().replace(/^0x/, '');
  if (hashHex.length !== 64) throw new Error('input_hash must be 32 bytes (64 hex chars)');
  return call('create_outcome_request_v2', [
    utf8Arg(p.workloadUri),
    hexArg(p.inputHash),
    addrArg(p.paymentFa),
    u64Arg(p.maxPriceQuants),
    u64Arg(p.minBondQuants),
    u64Arg(p.jobDeadlineSecs),
    u64Arg(p.reviewWindowSecs),
  ]);
}

// accept_quote_v2(buyer, request_id, expected_price, expected_signed_at,
//   expected_solver) — compute_rfq.move:2393. The expected_* tuple MUST come
// from the on-chain quote (get_quote_v2), never from local state.
export function acceptQuoteV2(p: {
  requestId: number;
  expectedPriceQuants: string;
  expectedSignedAt: number;
  expectedSolver: string;
}): ComputeEntryCall {
  return call('accept_quote_v2', [
    u64Arg(p.requestId),
    u64Arg(p.expectedPriceQuants),
    u64Arg(p.expectedSignedAt),
    addrArg(p.expectedSolver),
  ]);
}

// cancel_request_v2(buyer, request_id) — buyer exit before accept.
export function cancelRequestV2(p: { requestId: number }): ComputeEntryCall {
  return call('cancel_request_v2', [u64Arg(p.requestId)]);
}

// deliver_result_v2(solver, job_id, result_hash, result_uri) —
// compute_rfq.move:2519. SOLVER signs; requires on-chain status ACTIVE and
// now < job_deadline_secs. result_hash must be exactly 32 bytes (the
// attestation's SHA3-256); result_uri is the attestation URL (event-only).
export function deliverResultV2(p: {
  jobIdOnchain: number;
  resultHash: string; // 0x-hex, 32 bytes
  resultUri: string;
}): ComputeEntryCall {
  const h = p.resultHash.toLowerCase().replace(/^0x/, '');
  if (h.length !== 64) throw new Error('result_hash must be 32 bytes (64 hex chars)');
  return call('deliver_result_v2', [u64Arg(p.jobIdOnchain), hexArg(p.resultHash), utf8Arg(p.resultUri)]);
}

// approve_delivery_v2(buyer, job_id) — compute_rfq.move:2559. BUYER signs;
// requires DELIVERED; settles ATOMICALLY (pays the solver price + dispute
// bond in this one transaction).
export function approveDeliveryV2(p: { jobIdOnchain: number }): ComputeEntryCall {
  return call('approve_delivery_v2', [u64Arg(p.jobIdOnchain)]);
}
