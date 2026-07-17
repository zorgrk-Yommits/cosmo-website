'use client';

// Buyer-side on-chain flow orchestration (M4). One hook drives the whole
// choreography and exposes a small, explicit state machine:
//
//   select offer (wallet signature)            -> off-chain, binds buyer
//   create escrow (create_outcome_request_v2)  -> BUYER signs in StarKey
//   confirm request (server view-walk)         -> off-chain verification
//   arm (server signs V3 + relays quote)       -> server-side, 300s TTL,
//                                                  AUTO-triggered (see below)
//   accept (accept_quote_v2)                   -> BUYER signs in StarKey,
//                                                  tuple FROM THE CHAIN
//   confirm accept (server view-walk)          -> off-chain verification
//
// Hard rules honored here: the accept tuple is read from get_quote_v2, never
// from local state; every unclear chain answer surfaces as an error and stops
// the flow (fail closed); no private key material exists in the browser.
//
// Auto-arm: arming needs no wallet signature (pure server call), so the hook
// arms automatically whenever a request exists without a live quote — after
// escrow confirmation, after a page reload, and when the TTL runs out. A
// budget of AUTO_ARM_BUDGET automatic arms per page session prevents a silent
// re-arm loop; arm FAILURES are never retried automatically (rearm() resets
// the budget for a manual retry). The hook never arms before the first
// on-chain quote read resolved (quoteChecked) — it must not arm blind over a
// possibly live quote.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  armQuote,
  confirmAccept,
  confirmDeliver,
  confirmRequest,
  confirmSettle,
  fetchFlow,
  requestSelectChallenge,
  submitSelect,
  type ArmResult,
  type FlowState,
} from './marketApi';
import { connectWallet, signChallenge, sameWallet } from './marketWallet';
import { connectMainnetWallet, signAndSendCompute } from './computeSend';
import { acceptQuoteV2, approveDeliveryV2, createOutcomeRequestV2 } from './computeTx';
import {
  fetchOnchainJob,
  fetchOnchainQuote,
  JOB_ONCHAIN_STATUS,
  type OnchainJob,
  type OnchainQuote,
} from './computeViews';

export type FlowBusy =
  | null
  | 'selecting'
  | 'escrowing'
  | 'confirming'
  | 'arming'
  | 'accepting'
  | 'confirming-accept'
  | 'approving';

export type ArmState = 'idle' | 'arming' | 'armed' | 'failed' | 'expired';

// Automatic arms per page session: initial arm + a couple of TTL re-arms.
const AUTO_ARM_BUDGET = 3;

// Mirror of accept()'s fail-closed guard: a quote expiring within this many
// seconds is treated as already expired everywhere in the UI.
export const QUOTE_SAFETY_SECS = 15;

export interface MarketFlow {
  flow: FlowState | null;
  flowChecked: boolean; // first flow fetch has resolved (null + checked = backend down)
  quote: OnchainQuote | null;
  quoteChecked: boolean; // first on-chain quote read has resolved
  quoteExpiresAt: number | null; // effective expiry (unix secs)
  busy: FlowBusy;
  error: string | null;
  info: string | null;
  wallet: string | null;
  lastArm: ArmResult | null;
  armState: ArmState;
  armError: string | null;
  autoArmsLeft: number;
  onchainJob: OnchainJob | null; // M5: live get_job_v2 during deliver/approve
  onchainJobChecked: boolean;
  connect: () => Promise<void>;
  selectOffer: (offerId: string) => Promise<void>;
  createEscrow: () => Promise<void>;
  rearm: () => Promise<void>; // manual retry/re-arm — resets the auto budget
  accept: () => Promise<void>;
  approve: () => Promise<void>; // M5: buyer approves delivery (settles atomically)
  refreshFlow: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useMarketFlow(jobId: string | null, onChanged?: () => void): MarketFlow {
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [flowChecked, setFlowChecked] = useState(false);
  // Tri-state: undefined = not yet read, null = no quote live, object = quote.
  const [quote, setQuote] = useState<OnchainQuote | null | undefined>(undefined);
  const [busy, setBusy] = useState<FlowBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [lastArm, setLastArm] = useState<ArmResult | null>(null);
  const [armState, setArmState] = useState<ArmState>('idle');
  const [armError, setArmError] = useState<string | null>(null);
  const [autoArmsLeft, setAutoArmsLeft] = useState(AUTO_ARM_BUDGET);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  // Tri-state like quote: undefined = not yet read.
  const [onchainJob, setOnchainJob] = useState<OnchainJob | null | undefined>(undefined);
  const autoArmsRef = useRef(AUTO_ARM_BUDGET);
  const armInFlight = useRef(false);
  const syncRef = useRef({ deliver: false, settle: false });
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
    } finally {
      setFlowChecked(true);
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

  // 1s clock while expiry matters (request exists, job not yet accepted).
  useEffect(() => {
    if (typeof flow?.requestId !== 'number' || flow?.jobIdOnchain != null) return;
    setNowSec(Math.floor(Date.now() / 1000));
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1_000);
    return () => clearInterval(iv);
  }, [flow?.requestId, flow?.jobIdOnchain]);

  // M5: poll get_job_v2 during the deliver/approve phase. Separate from the
  // quote poll (which is gated on jobIdOnchain == null). Stops once the
  // off-chain status reaches the terminal 'settled'.
  useEffect(() => {
    const jid = flow?.jobIdOnchain;
    if (jid == null || flow?.status === 'settled') return;
    let stop = false;
    const tick = async () => {
      try {
        const j = await fetchOnchainJob(jid);
        if (!stop) setOnchainJob(j);
      } catch {
        // keep the last value — unreadable chain state is never a "no"
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 5_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [flow?.jobIdOnchain, flow?.status]);

  // M5 self-heal: if the chain is ahead of the off-chain record (DELIVERED or
  // SETTLED without a confirm), post the confirm once so the state can never
  // wedge behind the chain. Guarded refs prevent repeat posts; a failed
  // confirm re-arms the guard so a later poll retries.
  useEffect(() => {
    if (!jobId || !flow || onchainJob === undefined || onchainJob === null) return;
    if (
      onchainJob.status === JOB_ONCHAIN_STATUS.DELIVERED &&
      flow.status === 'onchain' &&
      !syncRef.current.deliver
    ) {
      syncRef.current.deliver = true;
      void confirmDeliver(jobId)
        .then(() => refreshFlow())
        .catch(() => {
          syncRef.current.deliver = false;
        });
    }
    if (
      onchainJob.status === JOB_ONCHAIN_STATUS.SETTLED &&
      flow.status !== 'settled' &&
      !syncRef.current.settle
    ) {
      syncRef.current.settle = true;
      void confirmSettle(jobId)
        .then(() => refreshFlow())
        .catch(() => {
          syncRef.current.settle = false;
        });
    }
  }, [jobId, flow, onchainJob, refreshFlow]);

  // Effective expiry: the chain read lags an arm by up to one 5s poll tick, so
  // right after arming the ArmResult's expiry is authoritative.
  const chainExpiry =
    quote && flow ? quote.signedAtSecs + (flow.rail.quoteTtlSecs || 300) : null;
  const armExpiry =
    lastArm && flow?.requestId === lastArm.requestId ? lastArm.expiresAtSecs : null;
  const quoteExpiresAt = Math.max(chainExpiry ?? 0, armExpiry ?? 0) || null;

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

  // Arm runs outside run(): it has its own state channel (armState/armError)
  // so a failed arm never clobbers select/escrow/accept errors and vice versa.
  const doArm = useCallback(async () => {
    if (!jobId || armInFlight.current) return;
    armInFlight.current = true;
    setArmState('arming');
    setArmError(null);
    setBusy('arming');
    try {
      const r = await armQuote(jobId);
      setLastArm(r);
      setArmState('armed');
      await refreshFlow();
      changedRef.current?.();
    } catch (e) {
      setArmState('failed');
      setArmError(
        e instanceof ApiError && e.status === 503
          ? 'Quote signing is temporarily unavailable on our server. Your escrow is safe on-chain — retry in a moment.'
          : ((e as Error).message ?? String(e)),
      );
    } finally {
      setBusy(null);
      armInFlight.current = false;
    }
  }, [jobId, refreshFlow]);

  const rearm = useCallback(async () => {
    autoArmsRef.current = AUTO_ARM_BUDGET;
    setAutoArmsLeft(AUTO_ARM_BUDGET);
    await doArm();
  }, [doArm]);

  // Auto-arm: one effect covers post-escrow arming, resume after a page
  // reload, and TTL-expiry re-arms. Never fires blind (waits for the first
  // chain quote read), never retries a failed arm, never exceeds the budget.
  useEffect(() => {
    if (!flow || typeof flow.requestId !== 'number' || flow.jobIdOnchain != null) return;
    if (quote === undefined) return; // first chain read pending — never arm blind
    if (busy !== null || armInFlight.current) return;
    if (armState === 'failed') return; // failures require a manual retry
    const live = quoteExpiresAt !== null && quoteExpiresAt - nowSec > QUOTE_SAFETY_SECS;
    if (live) {
      if (armState !== 'armed') setArmState('armed');
      return;
    }
    // No live quote (missing or expired):
    if (autoArmsRef.current > 0) {
      autoArmsRef.current -= 1;
      setAutoArmsLeft(autoArmsRef.current);
      void doArm();
    } else if (armState !== 'expired') {
      setArmState('expired'); // budget spent — hero shows a manual re-arm button
    }
  }, [flow, quote, quoteExpiresAt, nowSec, busy, armState, doArm]);

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
          return `Escrow confirmed on-chain (request #${r.requestId}). Preparing your quote…`;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      throw new Error(
        `Escrow transaction ${txHash} was sent, but the request could not be confirmed yet (${lastErr?.message}). Reload this page in a minute — funds are recoverable via cancel if anything is off.`,
      );
    });
  }, [jobId, run]);

  const accept = useCallback(async () => {
    if (!jobId) return;
    await run('accepting', async () => {
      const f = await fetchFlow(jobId);
      if (typeof f.requestId !== 'number') throw new Error('No on-chain request to accept against.');
      // Anti-drift: the expected tuple comes from the CHAIN, never local state.
      const q = await fetchOnchainQuote(f.requestId);
      if (!q.hasQuote) throw new Error('No quote is live on-chain — a fresh one is being prepared.');
      const now = Math.floor(Date.now() / 1000);
      const ttl = f.rail.quoteTtlSecs || 300;
      if (now > q.signedAtSecs + ttl - QUOTE_SAFETY_SECS) {
        // Flag expiry so the auto-arm effect fetches a fresh quote once idle.
        setArmState('expired');
        throw new Error('The on-chain quote expired before acceptance — a fresh one is being prepared.');
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

  // M5: buyer approves the delivery — approve_delivery_v2 settles atomically
  // (price + dispute bond are paid out to the solver in this one tx).
  const approve = useCallback(async () => {
    if (!jobId) return;
    await run('approving', async () => {
      const f = await fetchFlow(jobId);
      if (typeof f.jobIdOnchain !== 'number') throw new Error('No on-chain job to approve.');
      // Anti-drift: the chain decides whether there is anything to approve.
      const jv = await fetchOnchainJob(f.jobIdOnchain);
      if (jv.status === JOB_ONCHAIN_STATUS.SETTLED) {
        await confirmSettle(jobId).catch(() => undefined);
        return 'Already settled on-chain.';
      }
      if (jv.status !== JOB_ONCHAIN_STATUS.DELIVERED) {
        throw new Error('No delivered result on-chain yet — nothing to approve.');
      }
      const account = await connectMainnetWallet();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      if (!sameWallet(account, jv.buyer)) {
        throw new Error('Connected wallet is not the on-chain buyer for this job.');
      }
      const txHash = await signAndSendCompute(
        approveDeliveryV2({ jobIdOnchain: f.jobIdOnchain }),
        account,
      );
      let lastErr: Error | null = null;
      for (let i = 0; i < 10; i++) {
        await sleep(3_000);
        try {
          await confirmSettle(jobId, txHash);
          return 'Delivery approved — job settled, payout released to the provider.';
        } catch (e) {
          lastErr = e as Error;
        }
      }
      throw new Error(
        `Approve transaction ${txHash} was sent, but settlement could not be confirmed yet (${lastErr?.message}). Reload this page in a minute — funds are safe.`,
      );
    });
  }, [jobId, run]);

  return {
    flow,
    flowChecked,
    quote: quote ?? null,
    quoteChecked: quote !== undefined,
    quoteExpiresAt,
    busy,
    error,
    info,
    wallet,
    lastArm,
    armState,
    armError,
    autoArmsLeft,
    onchainJob: onchainJob ?? null,
    onchainJobChecked: onchainJob !== undefined,
    connect,
    selectOffer,
    createEscrow,
    rearm,
    accept,
    approve,
    refreshFlow,
  };
}
