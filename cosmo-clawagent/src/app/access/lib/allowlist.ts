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

const NORMALIZED: string[] = data.addresses.map(hexBody).filter((h) => h.length > 0);

// StarKey may surface either the native Supra address (64 hex) or the EVM address
// (40 hex); the EVM address is a prefix of the native one. Match tolerantly:
// equal, or one is a prefix of the other — but require >= 40 hex chars on the
// connected side to avoid trivial short-prefix collisions.
export function isAllowlisted(address: string | null | undefined): boolean {
  if (!address) return false;
  const c = hexBody(address);
  if (c.length < 40) return false;
  return NORMALIZED.some((e) => e === c || e.startsWith(c) || c.startsWith(e));
}

export const ALLOWLIST_STAGE = data.stage;
export const ALLOWLIST_COUNT = NORMALIZED.length;
