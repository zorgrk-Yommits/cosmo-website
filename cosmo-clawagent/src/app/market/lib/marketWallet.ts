// StarKey provider surface for the market offer flow (M3.0 spike findings).
// Deliberately local to /market: the site-wide starkeySign.ts is bound to the
// RFQ tx flow; here we only need connect + signMessage.

export interface StarkeySignResponse {
  address?: string;
  publicKey?: string;
  // Spike finding: a NON-hex message resolves with {signature: null} and no
  // error — callers must treat null as failure.
  signature: string | null;
}

interface MarketWalletProvider {
  connect: () => Promise<string[] | string | undefined>;
  account: () => Promise<string[] | string | undefined>;
  signMessage: (params: { message: string; nonce?: string }) => Promise<StarkeySignResponse>;
}

export function getMarketWallet(): MarketWalletProvider | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as { starkey?: { supra?: MarketWalletProvider } })?.starkey?.supra ?? null
  );
}

export async function connectWallet(): Promise<string> {
  const provider = getMarketWallet();
  if (!provider) throw new Error('StarKey wallet not found — install/unlock StarKey first.');
  const raw = await provider.connect();
  const addr = Array.isArray(raw) ? raw[0] : raw;
  if (typeof addr !== 'string' || !addr.startsWith('0x')) {
    throw new Error('No connected StarKey account.');
  }
  return addr;
}

// Sign a challenge TEXT. The hex encoding is what StarKey actually signs over
// (it signs the hex-decoded bytes = utf8 of the text; raw text yields
// signature: null — verified against StarKey 4.9.0).
export async function signChallenge(
  hexMessage: string,
  nonce: string,
): Promise<{ signature: string; publicKey: string; address: string }> {
  const provider = getMarketWallet();
  if (!provider) throw new Error('StarKey wallet not found.');
  const res = await provider.signMessage({ message: hexMessage, nonce });
  if (!res || !res.signature) {
    throw new Error(
      'StarKey returned no signature. Approve the request in the wallet and try again; if this repeats, update StarKey.',
    );
  }
  if (!res.publicKey || !res.address) {
    throw new Error('StarKey response is missing publicKey/address — cannot build the proof.');
  }
  return { signature: res.signature, publicKey: res.publicKey, address: res.address };
}

// B7: whether this browser has ever completed a StarKey connect on the market
// pages. Gates the passive account() read so first-time visitors never get a
// surprise wallet popup.
const WALLET_SEEN_KEY = 'cosmo_market_wallet_seen';

export function markWalletSeen(): void {
  try {
    localStorage.setItem(WALLET_SEEN_KEY, '1');
  } catch {
    /* private mode — chip simply stays passive-less */
  }
}

// Passive read of the currently active StarKey account. Never prompts on a
// first visit (seen-flag gate); any provider error resolves to null.
export async function getAccountSilent(): Promise<string | null> {
  try {
    if (localStorage.getItem(WALLET_SEEN_KEY) !== '1') return null;
  } catch {
    return null;
  }
  const provider = getMarketWallet();
  if (!provider) return null;
  try {
    const raw = await provider.account();
    const addr = Array.isArray(raw) ? raw[0] : raw;
    return typeof addr === 'string' && addr.startsWith('0x') ? addr : null;
  } catch {
    return null;
  }
}

export const sameWallet = (a: string, b: string) =>
  a.toLowerCase().replace(/^0x/, '').padStart(64, '0') ===
  b.toLowerCase().replace(/^0x/, '').padStart(64, '0');
