'use client';

// One wallet session for /portfolio (plans/cosmo-wallet-v01-plan.md, section B).
//
// Before this module every page read window.starkey.supra itself and kept the
// address in its own React state, which produced a second connect dialog on
// /portfolio, listeners that were registered again on every click, and no
// reaction to a network change. This is a module-wide store with a hook:
//
//   - connect() has exactly one promise in flight. A second click joins it.
//   - On load the account is read without a dialog, and only when this browser
//     has connected before (the flag the market pages already set).
//   - The network is switched to mainnet ONLY inside connect(), i.e. on a click.
//   - Account and network listeners are registered once per page.
//
// Nothing in here signs. Market, deposit, buy and unwrap pages keep their own
// wallet code in v0.1.

import { useEffect, useSyncExternalStore } from 'react';
import { CHAIN_ID, getSupra, type SupraProvider } from '@/lib/mainnetOnchain';
import { getAccountSilent, markWalletSeen } from '@/app/market/lib/marketWallet';

export type WalletStatus = 'no-wallet' | 'disconnected' | 'connected';

export type WalletState = {
  status: WalletStatus;
  address: string | null;
  chainId: string | null; // null = the wallet did not say
  onMainnet: boolean;
  connecting: boolean;
  error: string | null;
};

export type WalletSessionDeps = {
  getProvider: () => SupraProvider | null;
  getAccountSilent: () => Promise<string | null>;
  markWalletSeen: () => void;
  // returns an unsubscribe function; absent outside a browser
  onFocus?: (cb: () => void) => () => void;
};

export type WalletSession = {
  getState: () => WalletState;
  subscribe: (cb: () => void) => () => void;
  init: () => void;
  connect: () => Promise<WalletState>;
  refresh: () => Promise<WalletState>;
};

const INITIAL: WalletState = {
  status: 'disconnected',
  address: null,
  chainId: null,
  onMainnet: false,
  connecting: false,
  error: null,
};

async function readChain(p: SupraProvider): Promise<string | null> {
  try {
    const c = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null | undefined;
    if (c === null || c === undefined) return null;
    const v = (c as { chainId?: unknown })?.chainId ?? c;
    return typeof v === 'string' || typeof v === 'number' ? String(v) : null;
  } catch {
    return null;
  }
}

function firstAccount(raw: unknown): string | null {
  const a = Array.isArray(raw) ? raw[0] : raw;
  return typeof a === 'string' && a.startsWith('0x') ? a : null;
}

export function createWalletSession(deps: WalletSessionDeps): WalletSession {
  let state: WalletState = INITIAL;
  const subs = new Set<() => void>();
  let started = false;
  let inflight: Promise<WalletState> | null = null;
  // Bumped on every account/network event and every connect. A read that started
  // before the bump must not overwrite what came after it.
  let epoch = 0;
  // True once the user connected on this page. From then on the account is read
  // straight from the wallet, so a browser that cannot store the "seen" flag
  // (private mode) does not lose the connection on the next refresh.
  let connectedHere = false;

  const readAccount = async (p: SupraProvider): Promise<string | null> => {
    if (!connectedHere) return deps.getAccountSilent();
    try {
      return firstAccount(await p.account?.());
    } catch {
      return null;
    }
  };

  const set = (patch: Partial<WalletState>) => {
    state = { ...state, ...patch };
    subs.forEach((cb) => cb());
  };

  const refresh = async (): Promise<WalletState> => {
    const p = deps.getProvider();
    if (!p) {
      set({ status: 'no-wallet', address: null, chainId: null, onMainnet: false });
      return state;
    }
    if (inflight) return inflight; // a connect is running and will set the state
    const mine = ++epoch;
    const addr = await readAccount(p);
    const chainId = addr ? await readChain(p) : null;
    if (mine !== epoch) return state;
    if (!addr) set({ status: 'disconnected', address: null, chainId: null, onMainnet: false });
    else set({ status: 'connected', address: addr, chainId, onMainnet: chainId === CHAIN_ID });
    return state;
  };

  const connect = (): Promise<WalletState> => {
    if (inflight) return inflight;
    const p = deps.getProvider();
    if (!p) {
      set({ status: 'no-wallet', address: null, chainId: null, onMainnet: false, error: null });
      return Promise.resolve(state);
    }
    const mine = ++epoch;
    set({ connecting: true, error: null });
    inflight = (async () => {
      try {
        const addr = firstAccount(await p.connect());
        if (!addr) throw new Error('the wallet returned no account');
        // Reading works on any network. Signing needs mainnet: ask the wallet to
        // switch (this is the one place that does, and only after a click), then
        // read the network again instead of trusting the request.
        let chainId = await readChain(p);
        if (chainId !== CHAIN_ID) {
          try {
            await p.changeNetwork?.({ chainId: CHAIN_ID });
            chainId = await readChain(p);
          } catch {
            /* the state below says which network the wallet is on */
          }
        }
        deps.markWalletSeen();
        connectedHere = true;
        if (mine === epoch) {
          set({ status: 'connected', address: addr, chainId, onMainnet: chainId === CHAIN_ID, connecting: false });
        } else {
          set({ connecting: false });
        }
      } catch (e) {
        const declined = (e as { code?: number })?.code === 4001;
        set({ connecting: false, error: declined ? null : `Could not connect: ${(e as Error)?.message ?? e}` });
      } finally {
        inflight = null;
      }
      return state;
    })();
    return inflight;
  };

  // The wallet changed account or network: what we hold is stale. Clear it at
  // once (no button may act on the old account), then read again without a dialog.
  const onWalletChange = () => {
    epoch++;
    set({ status: 'disconnected', address: null, chainId: null, onMainnet: false });
    void refresh();
  };

  const init = () => {
    if (started) return;
    started = true;
    const p = deps.getProvider();
    if (p) {
      p.on?.('accountChanged', onWalletChange);
      p.on?.('networkChanged', onWalletChange);
    }
    deps.onFocus?.(() => void refresh());
    void refresh();
  };

  return {
    getState: () => state,
    subscribe: (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    init,
    connect,
    refresh,
  };
}

const session = createWalletSession({
  getProvider: getSupra,
  getAccountSilent,
  markWalletSeen,
  onFocus: (cb) => {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('focus', cb);
    return () => window.removeEventListener('focus', cb);
  },
});

const getServerState = () => INITIAL;

export function useWalletSession(): WalletState & {
  connect: () => Promise<WalletState>;
  refresh: () => Promise<WalletState>;
} {
  const s = useSyncExternalStore(session.subscribe, session.getState, getServerState);
  useEffect(() => {
    session.init();
  }, []);
  return { ...s, connect: session.connect, refresh: session.refresh };
}
