// Read-only chain access for the RFQ dApp: sequence number, chain id, and
// rfq_engine #[view] reads. No signing here -- pure RPC.
//
// Note: SupraClient.invokeViewMethod takes a fully-qualified function name and
// PLAIN STRING arguments (not BCS bytes) -- unlike the signed entry-call path
// in supraTx.ts which BCS-encodes for StarKey.

import { HexString, SupraClient } from "supra-l1-sdk";
import { RPC_URL, RFQ_MODULE_ADDR, RFQ_MODULE_NAME, assertConfigured } from "./rfqConfig";

let clientPromise: Promise<SupraClient> | null = null;
function client(): Promise<SupraClient> {
  return (clientPromise ??= SupraClient.init(RPC_URL));
}

// Current on-chain sequence number for the sender -- required to build a valid
// raw tx (the StarKey docs hardcode 0, which only works for a fresh account).
export async function getSequenceNumber(address: string): Promise<number> {
  const c = await client();
  const info = await c.getAccountInfo(new HexString(address));
  return Number(info.sequence_number);
}

export async function getChainId(): Promise<number> {
  const c = await client();
  const id = await c.getChainId();
  return Number((id as unknown as { value: number }).value);
}

function fqName(fn: string): string {
  return `${RFQ_MODULE_ADDR}::${RFQ_MODULE_NAME}::${fn}`;
}

async function view(
  fn: string,
  args: string[] = [],
  typeArgs: string[] = [],
): Promise<unknown> {
  assertConfigured();
  const c = await client();
  return c.invokeViewMethod(fqName(fn), typeArgs, args);
}

export function getNextRequestId(): Promise<unknown> {
  return view("get_next_request_id");
}

export function getNextQuoteId(): Promise<unknown> {
  return view("get_next_quote_id");
}

export function getRequest(requestId: number | bigint | string): Promise<unknown> {
  return view("get_request", [String(requestId)]);
}

export function getQuote(requestId: number | bigint | string): Promise<unknown> {
  return view("get_quote", [String(requestId)]);
}

export function acceptedQuoteStatus(quoteId: number | bigint | string): Promise<unknown> {
  return view("accepted_quote_status", [String(quoteId)]);
}

export function quoteTtlSecs(): Promise<unknown> {
  return view("quote_ttl_secs");
}
