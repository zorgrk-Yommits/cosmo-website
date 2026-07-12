'use client';

// Aggregate fetch hook for /vault. Each section settles independently: a
// failing module keeps its last data and reports an error string — the page
// never goes blank because one of the three modules is unreachable.

import { useCallback, useEffect, useState } from 'react';
import {
  fetchMakerVault,
  fetchPeg,
  fetchProviderVault,
  type MakerVaultData,
  type PegData,
  type ProviderVaultData,
} from './lib/vaultData';

export type Section<T> = { data: T | null; error: string | null };

const initial = { data: null, error: null };

export function useVaultData() {
  const [maker, setMaker] = useState<Section<MakerVaultData>>(initial);
  const [provider, setProvider] = useState<Section<ProviderVaultData>>(initial);
  const [peg, setPeg] = useState<Section<PegData>>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [m, p, g] = await Promise.allSettled([
      fetchMakerVault(),
      fetchProviderVault(),
      fetchPeg(),
    ]);
    const settle = <T,>(
      r: PromiseSettledResult<T>,
      set: (fn: (prev: Section<T>) => Section<T>) => void,
    ) => {
      if (r.status === 'fulfilled') {
        set(() => ({ data: r.value, error: null }));
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        set((prev) => ({ data: prev.data, error: msg }));
      }
    };
    settle(m, setMaker);
    settle(p, setProvider);
    settle(g, setPeg);
    setLastUpdated(Date.now());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { maker, provider, peg, refreshing, lastUpdated, refresh };
}
