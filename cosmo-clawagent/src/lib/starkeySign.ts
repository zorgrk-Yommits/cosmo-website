// StarKey Supra-provider signing layer. Browser-only.
//
// Assembles the 8-element StarKey raw-tx payload and routes it through the
// user's wallet for signature + broadcast. The deployer/admin key never appears
// here -- the only signer is the connected browser wallet.
//
// Payload shape (Supra dApp-with-StarKey docs, verbatim order):
//   [ sender, sequenceNumber, moduleAddress(64hex no-0x), moduleName,
//     functionName, typeArgs, functionArgs, optionalTransactionPayloadArgs ]
// optionalTransactionPayloadArgs = { maxGas?, gasUnitPrice?, txExpiryTime? }

import type { EntryCall } from "./supraTx";
import { RFQ_CHAIN_ID } from "./rfqConfig";
import { getSequenceNumber } from "./rfqViews";

type SupraProvider = {
  connect: () => Promise<unknown>;
  account: () => Promise<string[] | string | undefined>;
  getChainId: () => Promise<unknown>;
  changeNetwork: (p: { chainId: string }) => Promise<unknown>;
  createRawTransactionData: (payload: unknown[]) => Promise<string | null>;
  sendTransaction: (params: { data: string }) => Promise<string>;
};

export function getSupraProvider(): SupraProvider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { starkey?: { supra?: SupraProvider } })?.starkey?.supra ?? null;
}

function extractAddress(raw: string[] | string | undefined): string | null {
  if (!raw) return null;
  const a = Array.isArray(raw) ? raw[0] : raw;
  return typeof a === "string" && a.startsWith("0x") ? a : null;
}

// Make sure the wallet is on the configured RFQ chain (testnet 6 / mainnet 8)
// before signing, so a tx is never broadcast against the wrong network.
export async function ensureNetwork(provider: SupraProvider): Promise<void> {
  const raw = await provider.getChainId();
  const current = typeof raw === "number" ? raw : Number((raw as { chainId?: number })?.chainId ?? raw);
  if (Number.isFinite(current) && current === RFQ_CHAIN_ID) return;
  await provider.changeNetwork({ chainId: String(RFQ_CHAIN_ID) });
}

export type SendOpts = {
  maxGas?: bigint;
  gasUnitPrice?: bigint;
  expirySecs?: number; // default 60s -- within the RFQ TTL envelope
};

// Build + sign + send a TAKER entry call. Returns the tx hash.
export async function signAndSend(call: EntryCall, opts: SendOpts = {}): Promise<string> {
  const provider = getSupraProvider();
  if (!provider) throw new Error("StarKey Supra provider not found (install/unlock StarKey).");

  await ensureNetwork(provider);

  const sender = extractAddress(await provider.account());
  if (!sender) throw new Error("No connected StarKey account.");

  const sequenceNumber = await getSequenceNumber(sender);

  const optionalTransactionPayloadArgs: Record<string, unknown> = {
    txExpiryTime: Math.ceil(Date.now() / 1000) + (opts.expirySecs ?? 60),
  };
  if (opts.maxGas !== undefined) optionalTransactionPayloadArgs.maxGas = opts.maxGas;
  if (opts.gasUnitPrice !== undefined) optionalTransactionPayloadArgs.gasUnitPrice = opts.gasUnitPrice;

  const payload = [
    sender,
    sequenceNumber,
    call.moduleAddress,
    call.moduleName,
    call.functionName,
    call.typeArgs,
    call.functionArgs,
    optionalTransactionPayloadArgs,
  ];

  const data = await provider.createRawTransactionData(payload);
  if (!data) throw new Error("createRawTransactionData returned empty (user rejected or bad payload).");

  return provider.sendTransaction({ data });
}
