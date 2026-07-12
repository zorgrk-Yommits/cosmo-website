// /vault data layer — read-only mainnet view calls for the custody dashboard.
// Three independent section fetchers (maker vault, provider vault, wCOSMO peg)
// so a failing module degrades one section instead of blanking the page.

import {
  COSMOCLAW_ADDR,
  COMPUTE_PKG_ADDR,
  MAKER_OPERATORS,
  MAKER_VAULT_RESOURCE_ADDR,
  WCOSMO_META,
  faBalance,
  rpcView,
  rpcViewAll,
} from '@/lib/mainnetOnchain';

export type OperatorState = {
  key: string;
  label: string;
  role: string;
  addr: string;
  // null = no bond entry on-chain (get_operator_bond aborts for unknown addresses)
  bond: { amount: bigint; lockedUntilSecs: bigint; slashCount: bigint } | null;
  available: bigint;
  slashBasis: bigint;
  eligible: boolean;
};

export type MakerVaultData = {
  totalLocked: bigint;
  custodyBalance: bigint;
  admin: string;
  operators: OperatorState[];
};

export type ProviderVaultData = {
  minBond: bigint;
  maxPerProvider: bigint; // 0 = uncapped
  globalCap: bigint; // 0 = uncapped
  totalBonded: bigint;
  paused: boolean;
};

export type PegData = {
  pegHolds: boolean;
  supply: bigint;
  reserve: bigint;
};

const MV = `${COSMOCLAW_ADDR}::maker_vault`;
const PV = `${COMPUTE_PKG_ADDR}::provider_vault`;
const W = `${COSMOCLAW_ADDR}::wcosmo`;

const big = (v: unknown) => BigInt(String(v ?? 0));

// maker_vault views abort (HTTP 500) for addresses without an entry — guard
// each per-operator call individually so one unknown address cannot sink the
// whole maker section.
async function guarded<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

async function fetchOperator(op: (typeof MAKER_OPERATORS)[number]): Promise<OperatorState> {
  const [bondTuple, available, slashBasis, eligible] = await Promise.all([
    guarded<unknown[] | null>(rpcViewAll(`${MV}::get_operator_bond`, [], [op.addr]), null),
    guarded(rpcView(`${MV}::operator_available`, [], [op.addr]), null),
    guarded(rpcView(`${MV}::operator_slash_basis`, [], [op.addr]), null),
    guarded(rpcView(`${MV}::is_operator_quote_eligible`, [], [op.addr]), false),
  ]);
  return {
    key: op.key,
    label: op.label,
    role: op.role,
    addr: op.addr,
    bond:
      bondTuple === null || bondTuple.length === 0
        ? null
        : {
            amount: big(bondTuple[0]),
            lockedUntilSecs: big(bondTuple[1]),
            slashCount: big(bondTuple[2]),
          },
    available: big(available),
    slashBasis: big(slashBasis),
    eligible: eligible === true,
  };
}

export async function fetchMakerVault(): Promise<MakerVaultData> {
  const [totalLocked, custodyBalance, admin, operators] = await Promise.all([
    rpcView(`${MV}::get_total_locked`, [], []),
    faBalance(MAKER_VAULT_RESOURCE_ADDR, WCOSMO_META),
    rpcView(`${MV}::get_admin`, [], []),
    Promise.all(MAKER_OPERATORS.map((op) => fetchOperator(op))),
  ]);
  return {
    totalLocked: big(totalLocked),
    custodyBalance,
    admin: String(admin ?? ''),
    operators,
  };
}

export async function fetchProviderVault(): Promise<ProviderVaultData> {
  const [minBond, maxPer, globalCap, totalBonded, paused] = await Promise.all([
    rpcView(`${PV}::get_min_provider_bond`, [], []),
    rpcView(`${PV}::get_max_bond_per_provider`, [], []),
    rpcView(`${PV}::get_global_bond_cap`, [], []),
    rpcView(`${PV}::get_total_bonded`, [], []),
    rpcView(`${PV}::is_onboarding_paused`, [], []),
  ]);
  return {
    minBond: big(minBond),
    maxPerProvider: big(maxPer),
    globalCap: big(globalCap),
    totalBonded: big(totalBonded),
    paused: paused === true,
  };
}

export async function fetchPeg(): Promise<PegData> {
  const [pegHolds, supply, reserve] = await Promise.all([
    rpcView(`${W}::peg_holds`, [], []),
    rpcView(`${W}::wcosmo_supply`, [], []),
    rpcView(`${W}::reserve_balance`, [], []),
  ]);
  return {
    pegHolds: pegHolds === true,
    supply: big(supply),
    reserve: big(reserve),
  };
}
