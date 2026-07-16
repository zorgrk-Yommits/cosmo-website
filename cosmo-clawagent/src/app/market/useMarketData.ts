'use client';

// Polling hooks for /market (useRfqActivity clone): 20s ticks gated on tab
// visibility, catch-up poll on tab return, in-flight guard, one-tick backoff
// after a failed poll, keep-last-data-on-error.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchJob,
  fetchJobs,
  fetchProviders,
  type MarketJob,
  type MarketOffer,
  type MarketProvider,
} from './lib/marketApi';

export type Section<T> = { data: T | null; error: string | null };

const POLL_MS = 20_000;

function usePolled<T>(fetcher: () => Promise<T>) {
  const [section, setSection] = useState<Section<T>>({ data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);
  const skipNextTick = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const data = await fetcher();
      setSection({ data, error: null });
      skipNextTick.current = false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSection((prev) => ({ data: prev.data, error: msg }));
      skipNextTick.current = true; // one-tick backoff
    }
    setLastUpdated(Date.now());
    setRefreshing(false);
    inFlight.current = false;
  }, [fetcher]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (skipNextTick.current) {
        skipNextTick.current = false;
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

  return { section, refreshing, lastUpdated, refresh };
}

export function useMarketJobs() {
  const fetcher = useCallback(() => fetchJobs(), []);
  return usePolled<MarketJob[]>(fetcher);
}

export function useMarketJob(id: string | null) {
  const fetcher = useCallback(() => {
    if (!id) return Promise.reject(new Error('missing job id'));
    return fetchJob(id);
  }, [id]);
  return usePolled<{ job: MarketJob; offers: MarketOffer[] }>(fetcher);
}

export function useMarketProviders() {
  const fetcher = useCallback(() => fetchProviders(), []);
  return usePolled<MarketProvider[]>(fetcher);
}
