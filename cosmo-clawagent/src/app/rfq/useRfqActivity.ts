'use client';

// Polling hook for /rfq — extends the useVaultData pattern (per-section error
// isolation, keep-last-data-on-error) with the site's FIRST interval polling:
// 20s ticks gated on tab visibility, catch-up poll on tab return, in-flight
// guard, and a one-tick backoff after a failed poll (RPC etiquette).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMakerVitals,
  fetchRfqFeed,
  type MakerVitals,
  type RfqFeed,
} from './lib/rfqActivity';

export type Section<T> = { data: T | null; error: string | null };

const POLL_MS = 20_000;
const initial = { data: null, error: null };

export function useRfqActivity() {
  const [vitals, setVitals] = useState<Section<MakerVitals>>(initial);
  const [feed, setFeed] = useState<Section<RfqFeed>>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);
  const skipNextTick = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    const [v, f] = await Promise.allSettled([fetchMakerVitals(), fetchRfqFeed()]);
    const settle = <T,>(
      r: PromiseSettledResult<T>,
      set: (fn: (prev: Section<T>) => Section<T>) => void,
    ): boolean => {
      if (r.status === 'fulfilled') {
        set(() => ({ data: r.value, error: null }));
        return true;
      }
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      set((prev) => ({ data: prev.data, error: msg }));
      return false;
    };
    const okV = settle(v, setVitals);
    const okF = settle(f, setFeed);
    skipNextTick.current = !(okV && okF);
    setLastUpdated(Date.now());
    setRefreshing(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (skipNextTick.current) {
        skipNextTick.current = false; // one-tick backoff after an error
        return;
      }
      void refresh();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  return { vitals, feed, refreshing, lastUpdated, refresh };
}
