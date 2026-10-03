// Shared transaction-status logic for every page that signs something:
// read the real outcome of a sent transaction and explain a failure in plain
// text. Pure + fetch only; nothing here signs. Moved out of app/portfolio/lib
// (site-clarity plan, Etappe 0) so market and deposit flows can stop reporting
// "sent" for a transaction that actually failed.

import { RPC } from '@/lib/mainnetOnchain';

// GET /rpc/v1/transactions/<hash>: {status: 'Success'|'Fail'|'Pending'|..., output.Move.vm_status}.
// Verified 2026-10-02 against rpc-mainnet: an unknown / not-yet-indexed hash answers
// HTTP 200 with body `null` (not 404) -> treated as still pending.
export type TxResult = { status: 'Success' | 'Fail' | 'Pending' | 'Unknown'; vmStatus: string | null; raw: string };

export async function fetchTxStatus(hash: string): Promise<TxResult> {
  const h = hash.startsWith('0x') ? hash : `0x${hash}`;
  const r = await fetch(`${RPC}/rpc/v1/transactions/${h}`);
  if (r.status === 404) return { status: 'Pending', vmStatus: null, raw: '404' };
  if (!r.ok) throw new Error(`tx HTTP ${r.status}`);
  const body = (await r.json()) as unknown;
  if (body === null || typeof body !== 'object') return { status: 'Pending', vmStatus: null, raw: 'null' };
  const j = body as { status?: string; output?: { Move?: { vm_status?: string } } };
  const s = String(j.status ?? '');
  const vm = j.output?.Move?.vm_status ?? null;
  if (s === 'Success' || s === 'Fail' || s === 'Pending') return { status: s, vmStatus: vm, raw: s };
  return { status: 'Unknown', vmStatus: vm, raw: s };
}

// Poll until finalized or `maxMs` elapsed. Returns null on timeout (caller says "unconfirmed", never "failed").
export async function waitForTx(hash: string, maxMs = 90_000, stepMs = 3000): Promise<TxResult | null> {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    await new Promise((r) => setTimeout(r, stepMs));
    const st = await fetchTxStatus(hash).catch(() => null);
    if (st && st.status !== 'Pending' && st.status !== 'Unknown') return st;
  }
  return null;
}

// ---- Abort mapping -----------------------------------------------------------------
// vm_status on Supra: "Move abort in <addr>::<module>: E_SYMBOL(0x1f): comment"
// (older nodes may omit the symbol: "Move abort in <addr>::<module>: 0x1f").

export type VmAbort = { module: string; symbol: string | null; code: number };

export function parseVmAbort(vmStatus: string | null | undefined): VmAbort | null {
  if (!vmStatus) return null;
  const m = /Move abort in (?:0x[0-9a-fA-F]+)::(\w+):\s*(?:(E_\w+)\()?(0x[0-9a-fA-F]+|\d+)\)?/.exec(vmStatus);
  if (!m) return null;
  const raw = m[3];
  const code = raw.startsWith('0x') ? parseInt(raw.slice(2), 16) : parseInt(raw, 10);
  if (!Number.isFinite(code)) return null;
  return { module: m[1], symbol: m[2] ?? null, code };
}

// Keyed by module:code. Codes verified against the Move sources on 2026-10-02:
// maker_vault.move:111-114, provider_vault.move:46-60, rfq_engine.move:83-126,
// compute_rfq.move:100-154.
const ABORT_TEXT: Record<string, string> = {
  'maker_vault:2': 'Withdrawal is locked by a penalty cooldown. The lock end is shown in the deposits row.',
  'maker_vault:3': 'Amount exceeds your deposit, or there is no deposit for this address.',
  'maker_vault:4': 'A partial withdrawal must leave at least the minimum deposit, or take everything.',
  'provider_vault:10': 'A partial withdrawal must leave at least the minimum deposit, or take everything.',
  'provider_vault:11': 'Amount exceeds your deposit, or there is no deposit for this address.',
  'provider_vault:12': 'Withdrawal is locked by a penalty cooldown. The lock end is shown in the deposits row.',
  'provider_vault:15': 'A job is still active for this provider. Withdraw after it settles.',
  'rfq_engine:10': 'Request not found on chain.',
  'rfq_engine:29': 'This request has no quote to reclaim.',
  'rfq_engine:50': 'Accepted quote not found on chain.',
  'rfq_engine:52': 'Settlement deadline not reached on chain time. Try again after the deadline.',
  'rfq_engine:54': 'Only the maker who funded this quote can reclaim it.',
  'rfq_engine:60': 'The request has not expired on chain time. Try again after expiry.',
  'rfq_engine:61': 'This request is no longer in the funded state (accepted, settled or already reclaimed).',
  'compute_rfq:10': 'Compute request not found on chain.',
  'compute_rfq:11': 'The request is no longer open: a job may have started, or it was already reclaimed.',
  'compute_rfq:18': 'The quoting window has not closed on chain time. Try again after expiry.',
  'compute_rfq:40': 'Compute job not found on chain.',
  'compute_rfq:48': 'The provider delivered before you claimed. The review window applies now.',
  'compute_rfq:49': 'The delivery deadline has not passed on chain time. Try again after the deadline.',
  'compute_rfq:50': 'The job is not in dispute, so a dispute unwind does not apply.',
  'compute_rfq:52': 'The dispute window has not elapsed on chain time. Try again later.',
};

export function explainAbort(vmStatus: string | null | undefined): string {
  const a = parseVmAbort(vmStatus);
  if (!a) {
    return vmStatus
      ? `Transaction failed: ${vmStatus}. Tokens did not move; only gas was spent.`
      : 'Transaction failed without a VM status. Tokens did not move; only gas was spent.';
  }
  const text = ABORT_TEXT[`${a.module}:${a.code}`];
  const tag = `${a.module}: ${a.symbol ?? 'abort'}(0x${a.code.toString(16)})`;
  return text ? `${text} [${tag}]` : `Contract aborted with ${tag}. Tokens did not move; only gas was spent.`;
}

// ---- What the user is told ---------------------------------------------------------
// One vocabulary for every signing flow. `unconfirmed` is deliberately not
// `failed`: a timeout proves nothing about the transaction.

export type TxStage = 'idle' | 'signing' | 'sent' | 'confirmed' | 'failed' | 'unconfirmed';

export type TxOutcome = { stage: 'confirmed' | 'failed' | 'unconfirmed'; message: string };

export function outcomeOf(st: TxResult | null): TxOutcome {
  if (st === null) {
    return { stage: 'unconfirmed', message: 'Not confirmed yet. Nothing is assumed: check again in a moment.' };
  }
  if (st.status === 'Success') return { stage: 'confirmed', message: 'Confirmed on chain.' };
  return { stage: 'failed', message: explainAbort(st.vmStatus) };
}

// Wallet-side errors before anything was sent. 4001 is the EIP-1193 style
// "user rejected" code StarKey returns.
export function explainSignError(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  if (code === 4001) return 'You declined in the wallet. Nothing was sent.';
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return msg ? `Could not send: ${msg}. Nothing was sent.` : 'Could not send. Nothing was sent.';
}
