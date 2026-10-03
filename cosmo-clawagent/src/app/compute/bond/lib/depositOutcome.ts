// Pure "what happens to your tokens" logic for the provider bond helper.
//
// Takes the EXACT payload amount (the u64 the user is about to sign), never the
// projection from the amount input. The two can differ if the input changed after
// the payload was prepared; the box must always describe the payload.
//
// On-chain facts mirrored here (compute-rfq/sources/provider_vault.move):
//  - deposit_provider_bond does not touch locked_until_secs (new bond: 0)
//  - withdraw_provider_bond requires now >= locked_until_secs AND active_job_count == 0,
//    and a remainder of 0 or >= min bond (full exit always allowed)
//  - locked_until_secs is set ONLY by a penalty deduction: now + BOND_COOLDOWN_SECS (14 d)

import { fmtAmt } from '@/lib/mainnetOnchain';

export type DepositOutcomeInput = {
  payloadAmount: bigint; // base units, exactly what is signed
  wcosmoBal: bigint;
  bondAmount: bigint;
  lockedUntilSecs: bigint; // 0 = never locked
  activeJobs: bigint;
  cooldownSecs: bigint; // live bond_cooldown_secs()
  nowSecs: number;
};

export type DepositOutcome = {
  payloadAmount: bigint;
  walletBefore: bigint;
  walletAfter: bigint;
  bondBefore: bigint;
  bondAfter: bigint;
  // null = no lock in force at nowSecs
  lockedUntilSecs: bigint | null;
  activeJobs: bigint;
  withdrawableNow: boolean;
  cooldownDays: number;
};

export function describeDepositOutcome(i: DepositOutcomeInput): DepositOutcome {
  const locked = i.lockedUntilSecs > BigInt(0) && Number(i.lockedUntilSecs) > i.nowSecs;
  return {
    payloadAmount: i.payloadAmount,
    walletBefore: i.wcosmoBal,
    walletAfter: i.wcosmoBal - i.payloadAmount,
    bondBefore: i.bondAmount,
    bondAfter: i.bondAmount + i.payloadAmount,
    lockedUntilSecs: locked ? i.lockedUntilSecs : null,
    activeJobs: i.activeJobs,
    withdrawableNow: !locked && i.activeJobs === BigInt(0),
    cooldownDays: Math.round(Number(i.cooldownSecs) / 86400),
  };
}

export function fmtUtc(secs: bigint | number): string {
  return new Date(Number(secs) * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

// One sentence per fact, in the order a depositor asks them.
export function depositOutcomeLines(o: DepositOutcome): string[] {
  const amt = fmtAmt(o.payloadAmount);
  const lines = [
    `${amt} wCOSMO move from your wallet into the provider vault.`,
    `Your wallet will show ${amt} wCOSMO less: ${fmtAmt(o.walletBefore)} now, ${fmtAmt(o.walletAfter)} after. The deposit is held in the vault, not spent.`,
    `Your safety deposit: ${fmtAmt(o.bondBefore)} now, ${fmtAmt(o.bondAfter)} wCOSMO after.`,
  ];
  if (o.activeJobs > BigInt(0)) {
    lines.push(
      `Withdrawal is blocked while a job is active (${o.activeJobs.toString()} active). It opens again when the job is paid.`,
    );
  } else if (o.lockedUntilSecs !== null) {
    lines.push(`Withdrawable from ${fmtUtc(o.lockedUntilSecs)} (a deposit penalty set this lock).`);
  } else {
    lines.push(
      'Withdrawable any time, in full or down to the required minimum, as long as no job is active.',
    );
  }
  lines.push(
    `A deposit penalty locks withdrawal for ${o.cooldownDays} days from that moment. This deposit itself starts no lock.`,
  );
  lines.push('The transaction fee is paid in SUPRA and is not refunded.');
  return lines;
}

// Receipt after the deposit confirmed on-chain. Values are the LIVE reads after
// the transaction, not the projection.
export type DepositReceipt = {
  payloadAmount: bigint;
  bondBefore: bigint;
  bondAfter: bigint;
  walletBefore: bigint;
  walletAfter: bigint;
  lockedUntilSecs: bigint;
  activeJobs: bigint;
  txHash: string;
  confirmed: boolean; // false = bond increase not yet visible when polling stopped
};

export function depositReceiptLines(r: DepositReceipt, nowSecs: number): string[] {
  const amt = fmtAmt(r.payloadAmount);
  if (!r.confirmed) {
    return [
      `Deposit of ${amt} wCOSMO sent. The increase was not visible on-chain yet when we stopped polling. Refresh the status in a moment; the transaction link below shows its state.`,
    ];
  }
  const locked = r.lockedUntilSecs > BigInt(0) && Number(r.lockedUntilSecs) > nowSecs;
  const lines = [
    `Deposit of ${amt} wCOSMO confirmed on-chain.`,
    `Safety deposit: ${fmtAmt(r.bondBefore)} before, ${fmtAmt(r.bondAfter)} wCOSMO now (held in the vault).`,
    `wCOSMO in wallet: ${fmtAmt(r.walletBefore)} before, ${fmtAmt(r.walletAfter)} now.`,
  ];
  if (r.activeJobs > BigInt(0)) {
    lines.push(`Withdrawable once the active job is paid (${r.activeJobs.toString()} active).`);
  } else if (locked) {
    lines.push(`Withdrawable from ${fmtUtc(r.lockedUntilSecs)}.`);
  } else {
    lines.push('Withdrawable now (full exit or down to the required minimum).');
  }
  return lines;
}
