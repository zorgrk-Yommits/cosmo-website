'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  connected: boolean;
  notFound: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  notFound: false,
  connect: async () => {},
  disconnect: () => {},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getProvider = (): any => {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).starKeyWallet ?? (window as any).starKey ?? null;
};

/** Normalise whatever getCurrentAccount() returns into a single clean address string. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanAddress(raw: any): string | null {
  console.log('[StarKey] raw account value:', raw, typeof raw);
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === 'string') {
    // Guard against doubled strings like "0xABC...0xABC..." or extra suffixes
    const trimmed = raw.trim();
    // Take only the first 42 characters (0x + 40 hex chars for EVM address)
    return trimmed.slice(0, 42);
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const connect = async () => {
    const provider = getProvider();
    if (!provider) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    try {
      await provider.connectWallet({ multiple: false, network: 'ETH' });
      const raw = await provider.getCurrentAccount();
      const addr = cleanAddress(raw);
      if (addr) setAddress(addr);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as any)?.code !== 4001) console.error('StarKey connect error:', err);
    }
  };

  const disconnect = async () => {
    const provider = getProvider();
    if (provider?.disconnect) {
      try { await provider.disconnect(); } catch { /* ignore */ }
    }
    setAddress(null);
  };

  useEffect(() => {
    const tryReconnect = async () => {
      const provider = getProvider();
      if (!provider) return;
      try {
        const raw = await provider.getCurrentAccount();
        const addr = cleanAddress(raw);
        if (addr) setAddress(addr);
      } catch { /* not previously connected */ }

      // Listen for wallet events
      provider.onMessage?.((message: { type: string; account?: string }) => {
        if (message?.type === 'starkey-wallet-connected' && message?.account) {
          const addr = cleanAddress(message.account);
          if (addr) setAddress(addr);
        }
        if (message?.type === 'starkey-wallet-disconnected') {
          setAddress(null);
        }
        if (message?.type === 'starkey-wallet-updated' && message?.account) {
          const addr = cleanAddress(message.account);
          if (addr) setAddress(addr);
        }
      });
    };

    const timer = setTimeout(tryReconnect, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, connected: !!address, notFound, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
