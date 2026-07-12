// Shared Supra MAINNET (chain 8) constants and pure helpers for the phase-2
// self-service pages (/compute/bond, /wcosmo). Deliberately hardcoded and
// independent from rfqConfig/starkeySign — those are bound to the env-driven
// RFQ target (currently testnet chain 6). M2BondHelper keeps its own inline
// copies on purpose (that page is frozen "ported 1:1"); only the new pages
// import from here. Amounts/caps are NEVER hardcoded — always read live views.

// ---- Addresses -----------------------------------------------------------------
// cosmoclaw package (wcosmo, maker_vault)
export const COSMOCLAW_ADDR =
  '0xf2785bf6510d738d2f58c48ee62f00ec56462a5bf0de4ccfdebd11cd2b1264e1';
// compute package (compute_rfq, provider_vault)
export const COMPUTE_PKG_ADDR =
  '0x0fd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0';
// wCOSMO fungible-asset metadata (6 decimals on mainnet)
export const WCOSMO_META =
  '0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6';
// underlying $COSMO fungible-asset metadata (dispatchable FA)
export const COSMO_META =
  '0x11188bb79cd956ab6b8ddff06d64f479358b59ddbd2058a41b447cdf21c17ab0';

// maker_vault custody resource account (seed "maker_vault_v1"). No private key
// exists; the SignerCapability is held in VaultRegistry at COSMOCLAW_ADDR.
export const MAKER_VAULT_RESOURCE_ADDR =
  '0x04830c9b762bf0e00d2620026eb172426c686bc8b04a9c350f004482fa1fd54f';

// provider_vault custody resource account (seed "cprfq_bond_v1", derived from
// COMPUTE_PKG_ADDR). No private key exists; movements only via provider_vault
// entry functions. Distinct from the maker vault custody account above.
export const PROVIDER_VAULT_RESOURCE_ADDR =
  '0x76f115fcea64253ec60633c0cf197db38978822fae4af9cface9d88bf39bd576';

// Known maker operators. There is NO on-chain enumeration view — update this
// list manually when operators change (source of truth: maker_vault bond txs).
export const MAKER_OPERATORS = [
  {
    key: 'M2',
    label: 'Operator M2',
    role: 'Active maker · Slot 1',
    addr: '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb',
  },
  {
    key: 'K1',
    label: 'Operator K1',
    role: 'Stage B · D-14',
    addr: '0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53',
  },
] as const;

export const CHAIN_ID = '8'; // Supra Mainnet
export const RPC = 'https://rpc-mainnet.supra.com';
export const EXPLORER_TX = 'https://suprascan.io/tx/';
export const WCOSMO_DECIMALS = 6;

// ---- StarKey provider (minimal surface we use) ---------------------------------
export type SupraProvider = {
  connect: () => Promise<unknown>;
  account?: () => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
  getChainId?: () => Promise<unknown>;
  changeNetwork?: (opts: { chainId: string }) => Promise<unknown>;
  createRawTransactionData: (payload: unknown[]) => Promise<unknown>;
  sendTransaction: (tx: {
    data: unknown;
    from: string;
    to: string;
    chainId: number;
    value: string;
  }) => Promise<string>;
  on?: (event: string, cb: () => void) => void;
};

export function getSupra(): SupraProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { starkey?: { supra?: SupraProvider } })?.starkey?.supra ?? null;
}

// ---- Pure helpers ---------------------------------------------------------------
export const normAddr = (a: string) => (a || '').toLowerCase().replace(/^0x/, '').padStart(64, '0');
export const sameAddr = (a: string, b: string) => normAddr(a) === normAddr(b);

// Format a base-unit amount (6 decimals) for display.
export const fmtAmt = (q: string | number | bigint) =>
  (Number(q) / 1e6).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

export const shortAddr = (addr: string) => {
  const h = addr.startsWith('0x') ? addr : `0x${addr}`;
  return h.length <= 16 ? h : `${h.slice(0, 8)}…${h.slice(-6)}`;
};

export function bcsU64(n: number | bigint): Uint8Array {
  // BCS u64: 8 bytes, little-endian (tsconfig target is ES2017 — no bigint literals).
  const out = new Uint8Array(8);
  let x = BigInt(n);
  const MASK = BigInt(255);
  const SHIFT = BigInt(8);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & MASK);
    x >>= SHIFT;
  }
  return out;
}

// Parse a human amount string ("100", "100.5") into base units (10^6) without
// float math. Returns null on invalid input or more than 6 fraction digits.
export function parseAmount(input: string): bigint | null {
  const s = (input || '').trim().replace(',', '.');
  if (!/^\d+(\.\d*)?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  if (frac.length > WCOSMO_DECIMALS) return null;
  const fracPadded = frac.padEnd(WCOSMO_DECIMALS, '0');
  try {
    return BigInt(whole) * BigInt(1000000) + BigInt(fracPadded === '' ? 0 : fracPadded);
  } catch {
    return null;
  }
}

// ---- RPC (read-only) --------------------------------------------------------------
export async function rpcView(fn: string, typeArgs: string[], args: string[]): Promise<unknown> {
  const r = await fetch(`${RPC}/rpc/v1/view`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: typeArgs, arguments: args }),
  });
  if (!r.ok) throw new Error(`view HTTP ${r.status}`);
  const j = (await r.json()) as { result?: unknown[]; response?: { result?: unknown[] } };
  return (j.result ?? j.response?.result ?? [])[0];
}

// Multi-return view helper: returns the full result tuple, not just [0].
export async function rpcViewAll(
  fn: string,
  typeArgs: string[],
  args: string[],
): Promise<unknown[]> {
  const r = await fetch(`${RPC}/rpc/v1/view`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: typeArgs, arguments: args }),
  });
  if (!r.ok) throw new Error(`view HTTP ${r.status}`);
  const j = (await r.json()) as { result?: unknown[]; response?: { result?: unknown[] } };
  return j.result ?? j.response?.result ?? [];
}

export async function fetchSeqNum(addr: string): Promise<number> {
  const r = await fetch(`${RPC}/rpc/v1/accounts/${addr}`);
  if (!r.ok) throw new Error(`account HTTP ${r.status}`);
  const j = (await r.json()) as {
    sequence_number?: number | string;
    account?: { sequence_number?: number | string };
  };
  const s = j.sequence_number ?? j.account?.sequence_number;
  if (s === undefined) throw new Error('sequence_number not found');
  return Number(s);
}

export async function faBalance(owner: string, meta: string): Promise<bigint> {
  const v = await rpcView(
    '0x1::primary_fungible_store::balance',
    ['0x1::fungible_asset::Metadata'],
    [owner, meta],
  );
  return BigInt(String(v ?? 0));
}
