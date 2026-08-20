// Shared read model for the SUPRA -> wCOSMO treasury sale.
//
// WHY THIS MODULE EXISTS
// /buy owns the full sale UI. The landing page also advertises the sale, and
// the moment two places describe the same sale there is a risk they disagree —
// the landing shouting "live" while the chain is paused. That failure mode is
// the whole reason for the 2026-08-20 consistency work, so it is not allowed
// to come back through the discoverability layer.
//
// The rule: there is exactly ONE origin of truth, /api/sale/status, which
// reads cosmo_sale::sale_status on the chain. Nothing here caches a verdict,
// hard-codes a number, or keeps a second copy of the sale config.
//
// deriveSaleAvailability is deliberately a pure function with no I/O so the
// "may we claim this sale is live" decision is unit-testable on its own.

// Build-time gate, same flag /buy uses. A build with the buy path switched
// off must not advertise a buy path anywhere else either.
export const SALE_LIVE = process.env.NEXT_PUBLIC_SALE_LIVE === '1';

// Raw wCOSMO carries 6 decimals (SUPRA carries 8). Pinned by the on-chain
// COSMO_SCALE constant in cosmo_sale.move.
export const WCOSMO_DECIMALS = 6;

export type SaleChainStatus = {
  configured?: boolean;
  paused?: boolean;
  closed?: boolean;
  inventoryRaw?: string;
};

export type SaleStatusLike = {
  chain?: { available?: boolean; reason?: string; status?: SaleChainStatus };
  probe?: { ok?: boolean; tiles?: { effectiveAsk?: string } };
};

export type SaleAvailability = {
  // True only when the chain is genuinely selling AND this build can buy.
  // Anything unknown resolves to false — an unverified sale is not live.
  selling: boolean;
  // Human-readable inventory, or null when it cannot be established.
  inventoryWcosmo: number | null;
  // Effective ask in SUPRA per COSMO, or null when the quoter refused.
  effectiveAsk: string | null;
  // Why we are not claiming "live", for the neutral fallback copy.
  reason: 'ok' | 'loading' | 'unreachable' | 'paused' | 'closed' | 'empty' | 'build-disabled';
};

const NEUTRAL = (reason: SaleAvailability['reason']): SaleAvailability => ({
  selling: false,
  inventoryWcosmo: null,
  effectiveAsk: null,
  reason,
});

// Pure: status payload -> what we are allowed to say about the sale.
//
// FAIL CLOSED. Every unknown, malformed or unreachable case returns
// selling:false. A "0" or a stale "live" on the landing page would be a claim
// about real money, and this codebase only makes claims it can back.
export function deriveSaleAvailability(
  resp: SaleStatusLike | null | undefined,
  buildLive: boolean = SALE_LIVE,
): SaleAvailability {
  if (!buildLive) return NEUTRAL('build-disabled');
  if (!resp) return NEUTRAL('loading');

  const chain = resp.chain;
  if (!chain || chain.available !== true || !chain.status) return NEUTRAL('unreachable');

  const s = chain.status;
  if (s.configured !== true) return NEUTRAL('unreachable');
  if (s.closed === true) return NEUTRAL('closed');
  if (s.paused === true) return NEUTRAL('paused');

  let inventoryRaw: bigint;
  try {
    inventoryRaw = BigInt(s.inventoryRaw ?? '0');
  } catch {
    return NEUTRAL('unreachable');
  }
  // BigInt(0), not 0n: the TS target in this repo predates BigInt literals
  // (same reason BuySaleHelper declares its own ZERO constant).
  if (inventoryRaw <= BigInt(0)) return NEUTRAL('empty');

  const ask =
    resp.probe && resp.probe.ok === true ? (resp.probe.tiles?.effectiveAsk ?? null) : null;

  return {
    selling: true,
    inventoryWcosmo: Number(inventoryRaw) / 10 ** WCOSMO_DECIMALS,
    effectiveAsk: ask,
    reason: 'ok',
  };
}

export async function fetchSaleStatus(signal?: AbortSignal): Promise<SaleStatusLike> {
  const r = await fetch('/api/sale/status', { cache: 'no-store', signal });
  if (!r.ok) throw new Error(`sale status HTTP ${r.status}`);
  return (await r.json()) as SaleStatusLike;
}
