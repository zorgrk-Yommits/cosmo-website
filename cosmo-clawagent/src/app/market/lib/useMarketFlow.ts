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
  confirmRequest,
  confirmSettle,
  fetchFlow,
  requestSelectChallenge,
  submitSelect,
  type ArmResult,
  type FlowState,
} from './marketApi';
import { connectWallet, signChallenge, sameWallet, getAccountSilent, markWalletSeen } from './marketWallet';
import { connectMainnetWallet, signAndSendCompute } from './computeSend';
import { acceptQuoteV2, approveDeliveryV2, createOutcomeRequestV2, type ComputeEntryCall } from './computeTx';
import { explainSignError, outcomeOf, waitForTx, type TxStage } from '@/lib/txStatus';
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

// What happened to the transaction the buyer just signed. Read from the chain,
// not assumed: a transaction that was sent and then failed says `failed`.
export interface FlowTx {
  stage: TxStage;
  hash?: string;
  message?: string;
}

// Thrown after a transaction was sent and the chain reported it as failed. The
// outcome is already shown through `tx`, so run() must not repeat it as an error.
class TxFailed extends Error {}

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
  tx: FlowTx; // outcome of the last signed transaction, read from the chain
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
  const [tx, setTx] = useState<FlowTx>({ stage: 'idle' });
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

  // B7 (F1/F4): passively pick up the already-connected StarKey account on
  // load and on tab focus, so the wallet chip and the role-tab highlight work
  // BEFORE the first signing action. Never prompts (seen-flag gate inside),
  // never overwrites a known wallet with null.
  useEffect(() => {
    let stop = false;
    const read = async () => {
      const addr = await getAccountSilent();
      // A fresh non-null read always wins (the user may have switched
      // accounts in the extension); a null read never clears a known wallet.
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

  // L2: the browser no longer self-heals chain-ahead state — the backend's
  // chain poller (L1) is the sync guarantee. The hook only READS; if the
  // server record lags the chain for a tick, the next flow poll catches up.

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
      setTx({ stage: 'idle' });
      try {
        const msg = await fn();
        if (msg) setInfo(msg);
        await refreshFlow();
        changedRef.current?.();
      } catch (e) {
        if (!(e instanceof TxFailed)) setError((e as Error).message ?? String(e));
      } finally {
        setBusy(null);
      }
    },
    [refreshFlow],
  );

  // Sign, send, then read the real outcome from the chain. Returns the hash for
  // a confirmed OR not-yet-confirmed transaction (a timeout proves nothing, the
  // server's chain poller still picks it up); throws only when the wallet did
  // not send or the chain reported a failure.
  const sendTracked = useCallback(async (call: ComputeEntryCall, account: string): Promise<string> => {
    setTx({ stage: 'signing' });
    let hash: string;
    try {
      hash = await signAndSendCompute(call, account);
    } catch (e) {
      setTx({ stage: 'idle' });
      throw new Error(explainSignError(e));
    }
    setTx({ stage: 'sent', hash });
    const outcome = outcomeOf(await waitForTx(hash, 45_000));
    setTx({ stage: outcome.stage, hash, message: outcome.message });
    if (outcome.stage === 'failed') throw new TxFailed(outcome.message);
    return hash;
  }, []);

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
          ? 'Preparing the offer is temporarily unavailable on our server. Your payment stays locked and is not lost. Retry in a moment.'
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
      markWalletSeen();
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
        markWalletSeen();
        setWallet(addr);
        // B7/R3: no buyer-wallet pre-check here — the server re-binds the
        // buyer wallet from the fresh signature while nothing is on-chain,
        // and hard-rejects self-quotes (422).
        const challenge = await requestSelectChallenge(jobId, offerId);
        const proof = await signChallenge(challenge.hexMessage, challenge.nonce);
        await submitSelect(jobId, offerId, { message: challenge.challenge, ...proof });
        return 'Offer chosen. Next step: lock the payment.';
      });
    },
    [jobId, run],
  );

  const createEscrow = useCallback(async () => {
    if (!jobId) return;
    await run('escrowing', async () => {
      const f = await fetchFlow(jobId); // fresh params — never stale ones
      if (!f.escrowParams) throw new Error('No offer chosen yet, so the amount to lock is not known.');
      if (f.rail.paused) throw new Error('The contract is paused right now, so payments cannot be locked.');
      if (f.providerChecks && !(f.providerChecks.eligible && f.providerChecks.bondCoversMinimum && f.providerChecks.hasCapacity)) {
        throw new Error('The chosen provider does not meet the contract requirements right now, so the job could not start. Nothing was locked.');
      }
      const account = await connectMainnetWallet();
      markWalletSeen();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      const p = f.escrowParams;
      const txHash = await sendTracked(
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
      // Fast path: a few quick confirms (the view lags the broadcast). If they
      // miss, that is FINE — the server's chain poller records the request on
      // its own; a lost callback can no longer wedge the flow (L1).
      for (let i = 0; i < 3; i++) {
        await sleep(3_000);
        try {
          const r = await confirmRequest(jobId, txHash);
          return `Payment locked (request #${r.requestId}). Getting the job ready…`;
        } catch {
          // retry quietly
        }
      }
      return 'This page updates by itself in a moment.';
    });
  }, [jobId, run, sendTracked]);

  const accept = useCallback(async () => {
    if (!jobId) return;
    await run('accepting', async () => {
      const f = await fetchFlow(jobId);
      if (typeof f.requestId !== 'number') throw new Error('There is no locked payment for this job yet.');
      // Anti-drift: the expected tuple comes from the CHAIN, never local state.
      const q = await fetchOnchainQuote(f.requestId);
      if (!q.hasQuote) throw new Error('The offer is not ready yet. A fresh one is being prepared.');
      const now = Math.floor(Date.now() / 1000);
      const ttl = f.rail.quoteTtlSecs || 300;
      if (now > q.signedAtSecs + ttl - QUOTE_SAFETY_SECS) {
        // Flag expiry so the auto-arm effect fetches a fresh quote once idle.
        setArmState('expired');
        throw new Error('The offer expired before you confirmed. A fresh one is being prepared.');
      }
      const account = await connectMainnetWallet();
      markWalletSeen();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      const txHash = await sendTracked(
        acceptQuoteV2({
          requestId: f.requestId,
          expectedPriceQuants: q.price,
          expectedSignedAt: q.signedAtSecs,
          expectedSolver: q.solver,
        }),
        account,
      );
      // Fast path only — the chain poller (L1) is the sync guarantee.
      for (let i = 0; i < 3; i++) {
        await sleep(3_000);
        try {
          const r = await confirmAccept(jobId, txHash);
          return `Job started (job #${r.jobIdOnchain}). The provider can begin.`;
        } catch {
          // retry quietly
        }
      }
      return 'This page updates by itself in a moment.';
    });
  }, [jobId, run, sendTracked]);

  // M5: buyer approves the delivery — approve_delivery_v2 settles atomically
  // (price + dispute bond are paid out to the solver in this one tx).
  const approve = useCallback(async () => {
    if (!jobId) return;
    await run('approving', async () => {
      const f = await fetchFlow(jobId);
      if (typeof f.jobIdOnchain !== 'number') throw new Error('This job has not started, so there is nothing to approve.');
      // Anti-drift: the chain decides whether there is anything to approve.
      const jv = await fetchOnchainJob(f.jobIdOnchain);
      if (jv.status === JOB_ONCHAIN_STATUS.SETTLED) {
        await confirmSettle(jobId).catch(() => undefined);
        return 'The provider has already been paid.';
      }
      if (jv.status !== JOB_ONCHAIN_STATUS.DELIVERED) {
        throw new Error('No result has been handed in yet, so there is nothing to approve.');
      }
      const account = await connectMainnetWallet();
      markWalletSeen();
      setWallet(account);
      if (f.buyerWallet && !sameWallet(account, f.buyerWallet)) {
        throw new Error('Connected wallet is not the buyer wallet for this job.');
      }
      if (!sameWallet(account, jv.buyer)) {
        throw new Error('Connected wallet is not the on-chain buyer for this job.');
      }
      const txHash = await sendTracked(approveDeliveryV2({ jobIdOnchain: f.jobIdOnchain }), account);
      // Fast path only — the chain poller (L1) is the sync guarantee.
      for (let i = 0; i < 3; i++) {
        await sleep(3_000);
        try {
          await confirmSettle(jobId, txHash);
          return 'Result approved. The provider was paid.';
        } catch {
          // retry quietly
        }
      }
      return 'This page updates by itself in a moment.';
    });
  }, [jobId, run, sendTracked]);

  return {
    flow,
    flowChecked,
    quote: quote ?? null,
    quoteChecked: quote !== undefined,
    quoteExpiresAt,
    busy,
    error,
    info,
    tx,
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
