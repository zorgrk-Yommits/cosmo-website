// /portfolio stage 2b — PURE logic for the return-path buttons (claim / withdraw).
// No fetching, no signing here. Everything that touches the wallet lives in
// PortfolioView; everything that touches the RPC lives in portfolioData.
//
// Rules (plans/portfolio-view-plan.md, Stufe 2b + D-PV-3):
//  - A button is enabled only after the precondition was verified live, in the
//    same breath, against a fresh record and fresh chain time (verifyFresh).
//  - Every payload is one entry function with exactly one u64 argument. The
//    function ids are fixed; the only free input is the withdraw amount.
//  - Abort codes (hex + symbol in vm_status) are mapped to plain text so a
//    failed signature explains itself. Unknown codes are shown verbatim.

import type { Position } from './positions';

export type FnKey =
  | 'maker_vault::withdraw_operator_bond'
  | 'provider_vault::withdraw_provider_bond'
  | 'rfq_engine::reclaim_unaccepted_quote'
  | 'rfq_engine::claim_unwind'
  | 'compute_rfq::reclaim_expired_request_v2'
  | 'compute_rfq::claim_no_delivery_v2'
  | 'compute_rfq::claim_dispute_unwind_v2';

export type PackageAddrs = { cosmoclaw: string; compute: string };

export type ClaimCall = {
  fnKey: FnKey;
  moduleAddr: string;
  modName: string;
  fnName: string;
  kind: 'withdraw' | 'claim';
  // the single u64 argument and what it means
  arg: bigint;
  argLabel: string;
  // one sentence: what the call does with the tokens
  outcome: string;
};

const ZERO = BigInt(0);

// Registry of the seven return functions. The module address is resolved at
// build time from the package constants so tests can inject fake addresses.
const FN: Record<FnKey, { pkg: keyof PackageAddrs; modName: string; fnName: string; kind: ClaimCall['kind']; argLabel: string }> = {
  'maker_vault::withdraw_operator_bond': { pkg: 'cosmoclaw', modName: 'maker_vault', fnName: 'withdraw_operator_bond', kind: 'withdraw', argLabel: 'amount (u64, base units)' },
  'provider_vault::withdraw_provider_bond': { pkg: 'compute', modName: 'provider_vault', fnName: 'withdraw_provider_bond', kind: 'withdraw', argLabel: 'amount (u64, base units)' },
  'rfq_engine::reclaim_unaccepted_quote': { pkg: 'cosmoclaw', modName: 'rfq_engine', fnName: 'reclaim_unaccepted_quote', kind: 'claim', argLabel: 'request_id (u64)' },
  'rfq_engine::claim_unwind': { pkg: 'cosmoclaw', modName: 'rfq_engine', fnName: 'claim_unwind', kind: 'claim', argLabel: 'quote_id (u64)' },
  'compute_rfq::reclaim_expired_request_v2': { pkg: 'compute', modName: 'compute_rfq', fnName: 'reclaim_expired_request_v2', kind: 'claim', argLabel: 'request_id (u64)' },
  'compute_rfq::claim_no_delivery_v2': { pkg: 'compute', modName: 'compute_rfq', fnName: 'claim_no_delivery_v2', kind: 'claim', argLabel: 'job_id (u64)' },
  'compute_rfq::claim_dispute_unwind_v2': { pkg: 'compute', modName: 'compute_rfq', fnName: 'claim_dispute_unwind_v2', kind: 'claim', argLabel: 'job_id (u64)' },
};

export function isFnKey(s: string | null): s is FnKey {
  return s !== null && Object.prototype.hasOwnProperty.call(FN, s);
}

// Builds the call for a position. Returns null when the position has no return
// function, is not actionable, or (for withdrawals) no amount was given.
export function buildCall(p: Position, addrs: PackageAddrs, withdrawAmount?: bigint): ClaimCall | null {
  if (!isFnKey(p.returnFn) || !p.actionable) return null;
  const f = FN[p.returnFn];
  const base = { fnKey: p.returnFn, moduleAddr: addrs[f.pkg], modName: f.modName, fnName: f.fnName, kind: f.kind, argLabel: f.argLabel };
  if (f.kind === 'withdraw') {
    if (withdrawAmount === undefined || withdrawAmount <= ZERO) return null;
    return {
      ...base,
      arg: withdrawAmount,
      outcome: `Moves ${withdrawAmount.toString()} base units of ${p.token.symbol} from the vault back to your wallet.`,
    };
  }
  if (p.id === null) return null;
  const what =
    p.returnFn === 'rfq_engine::claim_unwind'
      ? 'Returns both legs of the accepted quote to their owners (your leg to you).'
      : p.returnFn === 'compute_rfq::claim_no_delivery_v2'
        ? 'Refunds the escrowed price to you and penalises the provider bond.'
        : p.returnFn === 'compute_rfq::claim_dispute_unwind_v2'
          ? 'Settles the disputed job by timeout; price plus dispute bond leave escrow.'
          : 'Returns the escrowed leg to you.';
  return { ...base, arg: p.id, outcome: what };
}

// Partial-withdraw rule shared by both vaults (maker_vault.move:729ff, provider_vault.move:398ff):
// remaining == 0 (full exit) OR remaining >= min bond. amount must be > 0 and <= bond.
export function checkWithdrawAmount(
  amount: bigint,
  bondAmount: bigint,
  minBond: bigint | null,
): { ok: boolean; reason: string } {
  if (amount <= ZERO) return { ok: false, reason: 'Enter an amount above 0.' };
  if (amount > bondAmount) return { ok: false, reason: 'Amount exceeds your deposit.' };
  const rem = bondAmount - amount;
  if (rem === ZERO) return { ok: true, reason: 'Full exit: the whole deposit returns.' };
  if (minBond === null) return { ok: false, reason: 'Minimum deposit could not be read; only a full exit is offered.' };
  if (rem < minBond) {
    return { ok: false, reason: `Remaining deposit would be below the minimum (${minBond.toString()} base units). Withdraw less, or everything.` };
  }
  return { ok: true, reason: 'Partial withdrawal: the rest stays deposited.' };
}

// Identity of a position for re-verification: same source, same record, same role.
export function samePosition(a: Position, b: Position): boolean {
  return a.source === b.source && a.role === b.role && (a.id === null ? b.id === null : b.id !== null && a.id === b.id);
}

// Live re-check right before a signature. `fresh` is the re-read of the SAME
// record (plus bonds) classified against fresh chain time. The call is allowed
// only if the position is still there, still actionable and unchanged in amount.
export function verifyFresh(p: Position, fresh: Position[]): { ok: boolean; reason: string } {
  const f = fresh.find((x) => samePosition(p, x));
  if (!f) return { ok: false, reason: 'The record changed on chain since the snapshot: this position no longer exists for your address.' };
  if (f.returnFn !== p.returnFn) return { ok: false, reason: 'The return path changed on chain since the snapshot. Refresh and look again.' };
  if (!f.actionable) {
    return {
      ok: false,
      reason:
        f.bucket === 'bonded'
          ? `Not withdrawable right now: ${f.next}`
          : f.bucket === 'escrow'
            ? `Not claimable yet on chain time: ${f.next}`
            : 'Not claimable any more: the record moved on.',
    };
  }
  if (f.amount !== p.amount) return { ok: false, reason: 'The amount changed on chain since the snapshot. Refresh and look again.' };
  return { ok: true, reason: 'Verified live: the on-chain precondition holds right now.' };
}

// ---- Payload text (what the user sees before signing) ---------------------------

export function payloadLines(args: { sender: string; call: ClaimCall; seq: number; expiry: number; argHuman: string }): string[] {
  const { sender, call, seq, expiry, argHuman } = args;
  return [
    `Sender          : ${sender}`,
    `Function-ID     : ${call.moduleAddr}::${call.modName}::${call.fnName}`,
    'Type-Args       : (none)',
    `Arg 1 (u64)     : ${call.arg.toString()}  (${call.argLabel}${argHuman ? `, = ${argHuman}` : ''})`,
    `Sequence-Number : ${seq}`,
    `Expiry (unix)   : ${expiry}`,
    'Chain           : 8 (Supra Mainnet)',
    `Effect          : ${call.outcome}`,
  ];
}

// ---- Abort mapping: moved to @/lib/txStatus (shared with market + deposit flows) ----
export { explainAbort, parseVmAbort, type VmAbort } from '@/lib/txStatus';

// ---- Kill-condition bookkeeping (plan: "zweiter Contract-Abort trotz gruener Vorbedingung") ----
export const MAX_ABORTS_AFTER_GREEN = 2;

export function buttonsLocked(abortsAfterGreen: number): boolean {
  return abortsAfterGreen >= MAX_ABORTS_AFTER_GREEN;
}

// Human amount ("100", "100.5") -> base units for a token with `decimals`, no float
// math. null on invalid input or too many fraction digits.
export function parseUnits(input: string, decimals: number): bigint | null {
  const s = (input || '').trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  if (frac.length > decimals) return null;
  const scale = BigInt(10) ** BigInt(decimals);
  try {
    return BigInt(whole) * scale + BigInt(frac === '' ? 0 : frac.padEnd(decimals, '0'));
  } catch {
    return null;
  }
}
