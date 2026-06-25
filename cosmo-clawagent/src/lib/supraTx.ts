// Pure builders for the wallet-signable RFQ TAKER entry calls.
//
// Each builder returns the call-specific parts of a StarKey raw-tx payload
// (module/function/typeArgs/functionArgs); the sender, sequence number and
// optional gas/expiry args are assembled at send-time in starkeySign.ts.
//
// Guardrail: only TAKER actions live here. Maker (submit_quote/fund_quote) and
// admin/governance calls are off-chain and intentionally absent.
//
// Arg encoding (BCS, per Supra dApp-with-StarKey docs):
//   address -> 32 canonical bytes, big-endian, short addrs left-padded
//   u64     -> 8 bytes, little-endian
//
// These were originally produced via supra-l1-sdk's TxnBuilderTypes.AccountAddress
// and BCS helpers. That import is intentionally REMOVED: in the browser bundle the
// SDK's `export * as TxnBuilderTypes` namespace re-export resolves to `undefined`
// (webpack/esbuild namespace-reexport interop bug), so `TxnBuilderTypes.AccountAddress`
// threw "Cannot read properties of undefined (reading 'AccountAddress')" before any
// StarKey prompt. Both encodings are fixed-width and trivial; the pure
// implementations below are byte-for-byte identical to the SDK output (verified
// against AccountAddress.fromHex(a).address and BCS.bcsSerializeUint64) and carry
// no bundler resolution risk on the hot path.

import { RFQ_MODULE_NAME, moduleAddrNo0x } from "./rfqConfig";

export type EntryCall = {
  moduleAddress: string; // 64-char hex, no 0x
  moduleName: string;
  functionName: string;
  typeArgs: string[];
  functionArgs: Uint8Array[];
};

function addrArg(a: string): Uint8Array {
  // Canonical 32-byte big-endian address; short addrs (e.g. 0x1) left-padded.
  let h = a.toLowerCase().replace(/^0x/, "");
  if (h.length > 64) throw new Error(`address too long: ${a}`);
  if (!/^[0-9a-f]*$/.test(h)) throw new Error(`invalid address hex: ${a}`);
  h = h.padStart(64, "0");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function u64Arg(v: number | bigint | string): Uint8Array {
  // BCS u64: 8 bytes, little-endian.
  const out = new Uint8Array(8);
  let x = BigInt(v);
  const MASK = BigInt(255);
  const SHIFT = BigInt(8);
  if (x < BigInt(0) || x > BigInt("0xffffffffffffffff")) {
    throw new Error(`u64 out of range: ${v}`);
  }
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & MASK);
    x >>= SHIFT;
  }
  return out;
}

function call(functionName: string, functionArgs: Uint8Array[]): EntryCall {
  return {
    moduleAddress: moduleAddrNo0x(),
    moduleName: RFQ_MODULE_NAME,
    functionName,
    typeArgs: [],
    functionArgs,
  };
}

// create_request(requester, agent_nft_addr, token_in, amount_in, token_out,
//                min_amount_out, request_fee_quants)
export function createRequest(p: {
  agentNftAddr: string;
  tokenIn: string;
  amountIn: number | bigint | string;
  tokenOut: string;
  minAmountOut: number | bigint | string;
  requestFeeQuants: number | bigint | string;
}): EntryCall {
  return call("create_request", [
    addrArg(p.agentNftAddr),
    addrArg(p.tokenIn),
    u64Arg(p.amountIn),
    addrArg(p.tokenOut),
    u64Arg(p.minAmountOut),
    u64Arg(p.requestFeeQuants),
  ]);
}

// accept_quote(taker, request_id, cap_id, expected_amount_out,
//              expected_signed_at, expected_settlement_deadline_secs)
export function acceptQuote(p: {
  requestId: number | bigint | string;
  capId: number | bigint | string;
  expectedAmountOut: number | bigint | string;
  expectedSignedAt: number | bigint | string;
  expectedSettlementDeadlineSecs: number | bigint | string;
}): EntryCall {
  return call("accept_quote", [
    u64Arg(p.requestId),
    u64Arg(p.capId),
    u64Arg(p.expectedAmountOut),
    u64Arg(p.expectedSignedAt),
    u64Arg(p.expectedSettlementDeadlineSecs),
  ]);
}

// cancel_request(requester, request_id)
export function cancelRequest(p: { requestId: number | bigint | string }): EntryCall {
  return call("cancel_request", [u64Arg(p.requestId)]);
}

// execute_settlement(caller, quote_id) -- permissionless caller; taker self-triggers
export function executeSettlement(p: { quoteId: number | bigint | string }): EntryCall {
  return call("execute_settlement", [u64Arg(p.quoteId)]);
}

// claim_unwind(caller, quote_id) -- recovery after deadline
export function claimUnwind(p: { quoteId: number | bigint | string }): EntryCall {
  return call("claim_unwind", [u64Arg(p.quoteId)]);
}
