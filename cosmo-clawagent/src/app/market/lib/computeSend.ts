// StarKey send path for the market's mainnet compute calls (chain 8).
//
// Deliberately separate from src/lib/starkeySign.ts, which is bound to the
// env-driven RFQ target (currently testnet). Payload shape and network
// handling follow the proven chain-8 pattern from ProviderBondHelper.

import { CHAIN_ID, fetchSeqNum, getSupra } from '@/lib/mainnetOnchain';
import type { ComputeEntryCall } from './computeTx';

async function ensureMainnet(p: NonNullable<ReturnType<typeof getSupra>>): Promise<void> {
  const raw = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
  const current = typeof raw === 'object' && raw !== null ? String(raw.chainId) : String(raw);
  if (current === CHAIN_ID) return;
  await p.changeNetwork?.({ chainId: CHAIN_ID });
  const after = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
  const now = typeof after === 'object' && after !== null ? String(after.chainId) : String(after);
  if (now !== CHAIN_ID) {
    throw new Error(`StarKey is on chain ${now}, expected Supra Mainnet (${CHAIN_ID}). Switch networks and retry.`);
  }
}

export async function connectMainnetWallet(): Promise<string> {
  const p = getSupra();
  if (!p) throw new Error('StarKey wallet not found — install/unlock StarKey first.');
  const raw = await p.connect();
  const addr = Array.isArray(raw) ? raw[0] : raw;
  if (typeof addr !== 'string' || !addr.startsWith('0x')) {
    throw new Error('No connected StarKey account.');
  }
  await ensureMainnet(p);
  return addr;
}

// Build + sign + broadcast a buyer entry call via StarKey. Returns tx hash.
export async function signAndSendCompute(
  call: ComputeEntryCall,
  account: string,
): Promise<string> {
  const p = getSupra();
  if (!p) throw new Error('StarKey wallet not found — install/unlock StarKey first.');
  await ensureMainnet(p);

  const seq = await fetchSeqNum(account);
  const expiry = Math.ceil(Date.now() / 1000) + 120;
  const rawTxPayload = [
    account,
    seq,
    call.moduleAddress,
    call.moduleName,
    call.functionName,
    call.typeArgs,
    call.functionArgs,
    { txExpiryTime: expiry },
  ];
  const data = await p.createRawTransactionData(rawTxPayload);
  if (!data) throw new Error('StarKey returned no transaction data (request rejected or invalid payload).');

  const txHash = await p.sendTransaction({
    data,
    from: account,
    to: call.moduleAddress,
    chainId: Number(CHAIN_ID),
    value: '',
  });
  if (typeof txHash !== 'string' || !txHash) throw new Error('StarKey did not return a transaction hash.');
  return txHash;
}
