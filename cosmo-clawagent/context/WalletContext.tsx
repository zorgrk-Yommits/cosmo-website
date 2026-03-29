'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { checkCosmoNFTHolder } from '@/lib/nftGate';

interface WalletContextType {
  address: string | null;
  connected: boolean;
  notFound: boolean;
  isNFTHolder: boolean;
  nftCount: number;
  nftCheckLoading: boolean;
  nftCheckFailed: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  notFound: false,
  isNFTHolder: false,
  nftCount: 0,
  nftCheckLoading: false,
  nftCheckFailed: false,
  connect: async () => {},
  disconnect: () => {},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProvider = (): any => {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const provider = w.starkey?.supra ?? null;
  console.log('[StarKey] window.starkey:', w.starkey);
  console.log('[StarKey] window.starkey?.supra:', provider);
  if (provider) {
    console.log('[StarKey] provider methods:', Object.keys(provider));
  }
  return provider;
};

/** Extract a single lowercase native Supra address from whatever the provider returns. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAddress(raw: any): string | null {
  console.log('[StarKey] raw address value:', JSON.stringify(raw), typeof raw);
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first ? String(first).trim().toLowerCase() : null;
  }
  if (typeof raw === 'object' && raw !== null) {
    // Some providers return { address: '...' } or { accounts: [...] }
    const v = raw.address ?? raw.accounts?.[0] ?? raw.account ?? null;
    return v ? String(v).trim().toLowerCase() : null;
  }
  if (typeof raw === 'string') return raw.trim().toLowerCase() || null;
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isNFTHolder, setIsNFTHolder] = useState(false);
  const [nftCount, setNftCount] = useState(0);
  const [nftCheckLoading, setNftCheckLoading] = useState(false);
  const [nftCheckFailed, setNftCheckFailed] = useState(false);

  const runNFTCheck = async (addr: string) => {
    setNftCheckLoading(true);
    setNftCheckFailed(false);
    const result = await checkCosmoNFTHolder(addr);
    setIsNFTHolder(result.isHolder);
    setNftCount(result.count);
    setNftCheckLoading(false);
  };

  const connect = async () => {
    const provider = getProvider();
    if (!provider) {
      setNotFound(true);
      console.warn('[WalletContext] StarKey Supra provider not found');
      return;
    }
    setNotFound(false);
    try {
      // connect() returns string[] on StarKey Supra — use return value directly
      const connectResult = await provider.connect();
      console.log('[WalletContext] connect() result:', JSON.stringify(connectResult));

      // Prefer return value of connect(); fall back to provider.account()
      let raw = connectResult;
      if (!extractAddress(raw)) {
        console.log('[WalletContext] connect() gave no address, trying provider.account()');
        raw = await provider.account?.();
        console.log('[WalletContext] account() result:', JSON.stringify(raw));
      }

      const addr = extractAddress(raw);
      console.log('[WalletContext] final address:', addr, '(length:', addr?.length, ')');

      if (addr) {
        setAddress(addr);
        await runNFTCheck(addr);
      } else {
        console.warn('[WalletContext] could not extract address from provider');
      }
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.code !== 4001) console.error('[WalletContext] connect error:', err);
    }
  };

  const disconnect = async () => {
    const provider = getProvider();
    if (provider?.disconnect) {
      try { await provider.disconnect(); } catch { /* ignore */ }
    }
    setAddress(null);
    setIsNFTHolder(false);
    setNftCount(0);
    setNftCheckFailed(false);
  };

  useEffect(() => {
    const tryReconnect = async () => {
      const provider = getProvider();
      if (!provider) return;
      try {
        // Try to get existing session without prompting user
        const raw = await provider.account?.();
        console.log('[WalletContext] tryReconnect account():', JSON.stringify(raw));
        const addr = extractAddress(raw);
        if (addr) {
          console.log('[WalletContext] auto-reconnected:', addr);
          setAddress(addr);
          await runNFTCheck(addr);
        }
      } catch (e) {
        console.log('[WalletContext] tryReconnect: not previously connected', e);
      }

      provider.on?.('accountChanged', (accounts: string[]) => {
        console.log('[WalletContext] accountChanged event:', accounts);
        const addr = extractAddress(accounts);
        if (addr) {
          setAddress(addr);
          runNFTCheck(addr);
        } else {
          setAddress(null);
          setIsNFTHolder(false);
          setNftCount(0);
        }
      });

      provider.on?.('disconnect', () => {
        console.log('[WalletContext] disconnect event');
        setAddress(null);
        setIsNFTHolder(false);
        setNftCount(0);
      });
    };

    const timer = setTimeout(tryReconnect, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        connected: !!address,
        notFound,
        isNFTHolder,
        nftCount,
        nftCheckLoading,
        nftCheckFailed,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
