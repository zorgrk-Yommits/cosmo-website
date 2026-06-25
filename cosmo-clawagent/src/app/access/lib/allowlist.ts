import allowlist from '@/data/cosmo-nft-allowlist.json';

// Stage 1 access gate: eligibility is membership in a STATIC, public allowlist of
// COSMO NFT holder addresses. No live RPC, no on-chain call, no secrets. Stage 2
// will replace/augment this with a signed-nonce + on-chain ownership check
// (src/lib/nftGate.ts already implements the on-chain holder query via Tradeport).

interface Allowlist {
  stage: string;
  description: string;
  addresses: string[];
}

const data = allowlist as Allowlist;

// Normalize to a comparable hex body: lowercase, strip leading 0x. Leading zeros
// are SIGNIFICANT in Supra addresses, so they are preserved (no trim/parseInt).
function hexBody(addr: string): string {
  return addr.trim().toLowerCase().replace(/^0x/, '');
}

// Pad to full 64 hex so a leading-zero-stripped form (the indexer drops them)
// still compares equal to the wallet's padded native address.
function pad64(h: string): string {
  return h.length < 64 ? h.padStart(64, '0') : h;
}

const NORMALIZED: string[] = data.addresses.map((a) => pad64(hexBody(a))).filter((h) => h.length > 0);

// StarKey may surface either the native Supra address (64 hex) or the EVM address
// (40 hex); the EVM address is a prefix of the native one. Match tolerantly:
// equal, or one is a prefix of the other — but require >= 40 hex chars on the
// connected side to avoid trivial short-prefix collisions.
export function isAllowlisted(address: string | null | undefined): boolean {
  if (!address) return false;
  const c = hexBody(address);
  if (c.length < 40) return false;
  const cPad = pad64(c);
  // Exact (padded native) match, or the connected EVM address is a prefix of the
  // stored native address (StarKey may surface either form).
  return NORMALIZED.some((e) => e === cPad || e.startsWith(c));
}

export const ALLOWLIST_STAGE = data.stage;
export const ALLOWLIST_COUNT = NORMALIZED.length;
