// Pure builders for the wallet-signable RFQ TAKER entry calls.
//
// Each builder returns the call-specific parts of a StarKey raw-tx payload
// (module/function/typeArgs/functionArgs); the sender, sequence number and
// optional gas/expiry args are assembled at send-time in starkeySign.ts.
//
// Guardrail: only TAKER actions live here. Maker (submit_quote/fund_quote) and
// admin/governance calls are off-chain and intentionally absent.
//
// Arg encoding (per Supra dApp-with-StarKey docs + supra-l1-sdk BCS):
//   address -> AccountAddress.fromHex(a).toUint8Array()  (canonical 32 bytes)
//   u64     -> BCS.bcsSerializeUint64(BigInt(v))
// AccountAddress (not HexString) is used for address args so short addresses
// like 0x1 are left-padded to 32 bytes instead of producing 1 byte.

import { BCS, TxnBuilderTypes } from "supra-l1-sdk";
import { RFQ_MODULE_NAME, moduleAddrNo0x } from "./rfqConfig";

export type EntryCall = {
  moduleAddress: string; // 64-char hex, no 0x
  moduleName: string;
  functionName: string;
  typeArgs: string[];
  functionArgs: Uint8Array[];
};

function addrArg(a: string): Uint8Array {
  // .address is the canonical 32-byte representation (short addrs left-padded).
  return TxnBuilderTypes.AccountAddress.fromHex(a).address;
}

function u64Arg(v: number | bigint | string): Uint8Array {
  return BCS.bcsSerializeUint64(BigInt(v));
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
