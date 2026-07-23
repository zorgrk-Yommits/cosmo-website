'use client';

// Role split (2026-07-23): the next-steps document poll and the passive
// wallet pickup, shared by the buyer page (/market/job) and the provider
// page (/market/work). Extracted from RoleNextStep (dissolved) so both pages
// read the SAME server document that external agents consume. Fail-closed:
// backend down -> doc null, panels fall back with no actions.

import { useCallback, useEffect, useState } from 'react';
import { fetchNextSteps, type NextStepsDoc } from './marketApi';
import { getAccountSilent } from './marketWallet';

export function useNextStepsDoc(jobId: string | null, wallet: string | null): {
  doc: NextStepsDoc | null;
  refreshDoc: () => Promise<void>;
} {
  const [doc, setDoc] = useState<NextStepsDoc | null>(null);

  // B7: the doc is personalized to the passively known wallet (?wallet=) so
  // the self-quote warning appears per offer BEFORE any selection is signed.
  const refreshDoc = useCallback(async () => {
    if (!jobId) return;
    try {
      setDoc(await fetchNextSteps(jobId, wallet ?? undefined));
    } catch {
      setDoc(null);
    }
  }, [jobId, wallet]);

  useEffect(() => {
    void refreshDoc();
    const iv = setInterval(() => void refreshDoc(), 10_000);
    return () => clearInterval(iv);
  }, [refreshDoc]);

  return { doc, refreshDoc };
}

// Passive StarKey account pickup on load + tab focus (B7): never prompts
// (seen-flag gate inside getAccountSilent), a fresh non-null read always wins
// (the user may have switched accounts in the extension), a null read never
// clears a known wallet. For pages that must not mount useMarketFlow (the
// provider page — no auto-arm, no buyer polls).
export function usePassiveWallet(): { wallet: string | null; setWallet: (w: string | null) => void } {
  const [wallet, setWallet] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    const read = async () => {
      const addr = await getAccountSilent();
      if (!stop && addr) setWallet(addr);
    };
    void read();
    const onFocus = () => void read();
    window.addEventListener('focus', onFocus);
    return () => {
      stop = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return { wallet, setWallet };
}
