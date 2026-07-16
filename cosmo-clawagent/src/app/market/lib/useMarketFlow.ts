'use client';

// Buyer-side on-chain flow orchestration (M4). One hook drives the whole
// choreography and exposes a small, explicit state machine:
//
//   select offer (wallet signature)            -> off-chain, binds buyer
//   create escrow (create_outcome_request_v2)  -> BUYER signs in StarKey
//   confirm request (server view-walk)         -> off-chain verification
//   arm (server signs V3 + relays quote)       -> server-side, 300s TTL
//   accept (accept_quote_v2)                   -> BUYER signs in StarKey,
//                                                  tuple FROM THE CHAIN
//   confirm accept (server view-walk)          -> off-chain verification
//
// Hard rules honored here: the accept tuple is read from get_quote_v2, never
// from local state; every unclear chain answer surfaces as an error and stops
// the flow (fail closed); no private key material exists in the browser.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  armQuote,
  confirmAccept,
  confirmRequest,
  fetchFlow,
  requestSelectChallenge,
  submitSelect,
  type ArmResult,
  type FlowState,
} from './marketApi';
import { connectWallet, signChallenge, sameWallet } from './marketWallet';
import { connectMainnetWallet, signAndSendCompute } from './computeSend';
import { acceptQuoteV2, createOutcomeRequestV2 } from './computeTx';
import { fetchOnchainQuote, type OnchainQuote } from './computeViews';

export type FlowBusy =
  | null
  | 'selecting'
  | 'escrowing'
  | 'confirming'
  | 'arming'
  | 'accepting'
  | 'confirming-accept';

export interface MarketFlow {
  flow: FlowState | null;
  quote: OnchainQuote | null;
  quoteExpiresAt: number | null; // signedAt + TTL (unix secs)
  busy: FlowBusy;
  error: string | null;
  info: string | null;
  wallet: string | null;
  lastArm: ArmResult | null;
  connect: () => Promise<void>;
  selectOffer: (offerId: string) => Promise<void>;
  createEscrow: () => Promise<void>;
  arm: () => Promise<void>;
  accept: () => Promise<void>;
  refreshFlow: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useMarketFlow(jobId: string | null, onChanged?: () => void): MarketFlow {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [quote, setQuote] = useState<OnchainQuote | null>(null);
  const [busy, setBusy] = useState<FlowBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [lastArm, setLastArm] = useState<ArmResult | null>(null);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const refreshFlow = useCallback(async () => {
    if (!jobId) return;
    try {
      const f = await fetchFlow(jobId);
      setFlow(f);
    } catch {
      // Backend down — the job page still renders; flow panel shows a hint.
      setFlow(null);
    }
  }, [jobId]);

  useEffect(() => {
    void refreshFlow();
  }, [refreshFlow]);

  // Poll the on-chain quote while a request exists and is not yet accepted.
  useEffect(() => {
    const requestId = flow?.requestId;
    if (typeof requestId !== 'number' || flow?.jobIdOnchain != null) return;
    let stop = false;
    const tick = async () => {
      try {
        const q = await fetchOnchainQuote(requestId);
        if (!stop) setQuote(q.hasQuote ? q : null);
      } catch {
        if (!stop) setQuote(null); // unreadable chain state — show nothing, never guess
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 5_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [flow?.requestId, flow?.jobIdOnchain]);

  const quoteExpiresAt =
    quote && flow ? quote.signedAtSecs + (flow.rail.quoteTtlSecs || 300) : null;

  const run = useCallback(
    async (phase: FlowBusy, fn: () => Promise<string | null>) => {
      setBusy(phase);
      setError(null);
      setInfo(null);
      try {
        const msg = await fn();
        if (msg) setInfo(msg);
        await refreshFlow();
        changedRef.current?.();
      } catch (e) {
        setError((e as Error).message ?? String(e));
      } finally {
        setBusy(null);
      }
    },
    [refreshFlow],
  );

  const connect = useCallback(async () => {
    setError(null);
    try {
      const addr = await connectMainnetWallet();
      setWallet(addr);
    } catch (e) {
      setError((e as Error).message ?? String(e));
    }
  }, []);

  const selectOffer = useCallback(
    async (offerId: string) => {
      if (!jobId) return;
      await run('selecting', async () => {
        const addr = await connectWallet();
        setWallet(addr);
        if (flow?.buyerWallet && !sameWallet(addr, flow.buyerWallet)) {
          throw new Error(
            'The connected wallet is not the buyer wallet bound to this job. Switch accounts in StarKey.',
          );
        }
        const challenge = await requestSelectChallenge(jobId, offerId);
        const proof = await signChallenge(challenge.hexMessage, challenge.nonce);
        await submitSelect(jobId, offerId, { message: challenge.challenge, ...proof });
        return 'Offer selected and signed. Next step: fund the on-chain escrow.';
      });
    },
    [jobId, flow?.buyerWallet, run],
  );

  const createEscrow = useCallback(async () => {
    if (!jobId) return;
    await run('escrowing', async () => {
      const f = await fetchFlow(jobId); // fresh params — never stale ones
      if (!f.escrowParams) throw new Error('No selected offer / escrow parameters available.');
      if (f.rail.paused) throw new Error('The on-chain rail is paused — escrow is disabled.');
      if (f.providerChecks && !(f.providerChecks.eligible && f.providerChecks.bondCoversMinimum && f.providerChecks.hasCapacity)) {
        throw new Error('The selected provider is not currently eligible on-chain — escrow would be wasted.');
      }
      const account = await connectMainnetWallet();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      const p = f.escrowParams;
      const txHash = await signAndSendCompute(
        createOutcomeRequestV2({
          workloadUri: p.workloadUri,
          inputHash: p.inputHash,
          paymentFa: p.paymentFa,
          maxPriceQuants: p.maxPriceQuants,
          minBondQuants: p.minBondQuants,
          jobDeadlineSecs: p.jobDeadlineSecs,
          reviewWindowSecs: p.reviewWindowSecs,
        }),
        account,
      );
      // The view lags the broadcast by a few seconds — retry the confirm.
      let lastErr: Error | null = null;
      for (let i = 0; i < 10; i++) {
        await sleep(3_000);
        try {
          const r = await confirmRequest(jobId, txHash);
          return `Escrow confirmed on-chain (request #${r.requestId}).`;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      throw new Error(
        `Escrow transaction ${txHash} was sent, but the request could not be confirmed yet (${lastErr?.message}). Reload this page in a minute — funds are recoverable via cancel if anything is off.`,
      );
    });
  }, [jobId, run]);

  const arm = useCallback(async () => {
    if (!jobId) return;
    await run('arming', async () => {
      const r = await armQuote(jobId);
      setLastArm(r);
      return `Quote armed on-chain (valid ${Math.max(0, r.expiresAtSecs - Math.floor(Date.now() / 1000))}s). Accept it before it expires.`;
    });
  }, [jobId, run]);

  const accept = useCallback(async () => {
    if (!jobId) return;
    await run('accepting', async () => {
      const f = await fetchFlow(jobId);
      if (typeof f.requestId !== 'number') throw new Error('No on-chain request to accept against.');
      // Anti-drift: the expected tuple comes from the CHAIN, never local state.
      const q = await fetchOnchainQuote(f.requestId);
      if (!q.hasQuote) throw new Error('No quote is live on-chain — arm (or re-arm) first.');
      const now = Math.floor(Date.now() / 1000);
      const ttl = f.rail.quoteTtlSecs || 300;
      if (now > q.signedAtSecs + ttl - 15) {
        throw new Error('The on-chain quote is expired (or expires within seconds) — re-arm first.');
      }
      const account = await connectMainnetWallet();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      const txHash = await signAndSendCompute(
        acceptQuoteV2({
          requestId: f.requestId,
          expectedPriceQuants: q.price,
          expectedSignedAt: q.signedAtSecs,
          expectedSolver: q.solver,
        }),
        account,
      );
      let lastErr: Error | null = null;
      for (let i = 0; i < 10; i++) {
        await sleep(3_000);
        try {
          const r = await confirmAccept(jobId, txHash);
          return `Quote accepted — on-chain job #${r.jobIdOnchain} is active.`;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      throw new Error(
        `Accept transaction ${txHash} was sent, but the job could not be confirmed yet (${lastErr?.message}). Reload this page in a minute.`,
      );
    });
  }, [jobId, run]);

  return {
    flow,
    quote,
    quoteExpiresAt,
    busy,
    error,
    info,
    wallet,
    lastArm,
    connect,
    selectOffer,
    createEscrow,
    arm,
    accept,
    refreshFlow,
  };
}
