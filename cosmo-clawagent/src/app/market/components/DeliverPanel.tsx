'use client';

// M5 provider panel: deliver the result on-chain. Renders on the job page
// once an on-chain job exists; only the assigned SOLVER wallet can act (the
// on-chain solver is the truth — OfferForm's roster-match pattern, but
// matched against get_job_v2). The deliverable is the backend-frozen
// attestation document: its URL goes on-chain as result_uri, its SHA3-256 as
// result_hash. Without a frozen hash the CTA never renders (fail closed).
//
// Deliberately self-contained (no useMarketFlow): that hook is buyer-shaped
// and already instantiated in NextStepPanel — a second instance would double
// every poll.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileJson, Loader2, Package, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import {
  attestationUrl,
  confirmDeliver,
  fetchFlow,
  type MarketJob,
  type MarketProvider,
} from '../lib/marketApi';
import { connectMainnetWallet, signAndSendCompute } from '../lib/computeSend';
import { deliverResultV2 } from '../lib/computeTx';
import { fetchOnchainJob, JOB_ONCHAIN_STATUS, type OnchainJob } from '../lib/computeViews';
import { sameWallet } from '../lib/marketWallet';
import { CTA_BIG, BTN_GHOST } from './cta';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmtCountdown(secs: number): string {
  if (secs >= 3600) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function DeliverPanel({
  job,
  providers,
  onChanged,
}: {
  job: MarketJob; // mounted only with jobIdOnchain != null
  providers: MarketProvider[];
  onChanged: () => void;
}) {
  const jobIdOnchain = job.jobIdOnchain!;
  const [oj, setOj] = useState<OnchainJob | null>(null);
  const [deliver, setDeliver] = useState<{ attestationUri: string; attestationHash: string } | null>(null);
  const [attError, setAttError] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'sending'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  // On-chain job poll (10s), stops at SETTLED.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const j = await fetchOnchainJob(jobIdOnchain);
        if (!stop) setOj(j);
        if (j.status === JOB_ONCHAIN_STATUS.SETTLED) stop = true;
      } catch {
        // keep last value
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 10_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [jobIdOnchain]);

  // Attestation bootstrap — order matters: GET /attestation triggers the
  // backend freeze, then /flow carries the stored hash.
  const loadAttestation = useCallback(async () => {
    setAttError(false);
    try {
      const r = await fetch(attestationUrl(job.id));
      if (!r.ok) throw new Error(`attestation ${r.status}`);
      const f = await fetchFlow(job.id);
      if (f.deliver?.attestationHash) {
        setDeliver({ attestationUri: f.deliver.attestationUri, attestationHash: f.deliver.attestationHash });
      } else {
        throw new Error('attestation hash missing');
      }
    } catch {
      setAttError(true);
    }
  }, [job.id]);

  useEffect(() => {
    void loadAttestation();
  }, [loadAttestation]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      setWallet(await connectMainnetWallet());
    } catch (e) {
      setError((e as Error).message ?? String(e));
    }
  }, []);

  const doDeliver = useCallback(async () => {
    if (!deliver) return;
    setPhase('sending');
    setError(null);
    try {
      const account = await connectMainnetWallet();
      setWallet(account);
      const jv = await fetchOnchainJob(jobIdOnchain); // fresh chain truth
      if (!sameWallet(account, jv.solver)) {
        throw new Error('Connected wallet is not the solver for this job.');
      }
      if (jv.status !== JOB_ONCHAIN_STATUS.ACTIVE) {
        throw new Error('The on-chain job is not active — nothing to deliver.');
      }
      const txHash = await signAndSendCompute(
        deliverResultV2({
          jobIdOnchain,
          resultHash: deliver.attestationHash,
          resultUri: deliver.attestationUri,
        }),
        account,
      );
      let lastErr: Error | null = null;
      for (let i = 0; i < 10; i++) {
        await sleep(3_000);
        try {
          await confirmDeliver(job.id, txHash);
          onChanged();
          setPhase('idle');
          return;
        } catch (e) {
          lastErr = e as Error;
        }
      }
      throw new Error(
        `Delivery transaction ${txHash} was sent, but not confirmed yet (${lastErr?.message}). Reload in a minute — the chain state is authoritative.`,
      );
    } catch (e) {
      setError((e as Error).message ?? String(e));
      setPhase('idle');
    }
  }, [deliver, job.id, jobIdOnchain, onChanged]);

  const isSolver = wallet !== null && oj !== null && sameWallet(wallet, oj.solver);
  const solverName = oj ? (providers.find((p) => sameWallet(p.wallet, oj.solver))?.name ?? null) : null;
  const deadlineLeft = oj ? Math.max(0, oj.jobDeadlineSecs - nowSec) : 0;
  const deadlinePassed = oj !== null && nowSec > oj.jobDeadlineSecs;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Package className="h-4 w-4 text-purple-300" />
        <h2 className="font-mono text-sm font-bold text-slate-100">Provider: deliver the result</h2>
      </div>
      <p className="mb-4 font-sans text-xs leading-relaxed text-slate-400">
        The assigned provider{solverName ? ` (${solverName})` : ''} delivers by committing the
        attestation document on-chain: its URL becomes result_uri, its SHA3-256 the result_hash.
      </p>

      {oj === null && (
        <p className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading on-chain job state…
        </p>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.ACTIVE && (
        <div className="space-y-3">
          {deliver ? (
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <a
                href={deliver.attestationUri}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
              >
                <FileJson className="h-3.5 w-3.5" />
                Attestation document (result_uri)
              </a>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
                result_hash: {deliver.attestationHash}
              </p>
            </div>
          ) : attError ? (
            <div className="space-y-2">
              <p className="flex items-start gap-1.5 font-mono text-xs text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The attestation is not ready — without its hash nothing can be delivered.
              </p>
              <button type="button" className={BTN_GHOST} onClick={() => void loadAttestation()}>
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          ) : (
            <p className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Preparing the attestation…
            </p>
          )}

          {!deadlinePassed && (
            <p className="flex items-center gap-2 font-mono text-xs">
              <Clock3 className={cn('h-3.5 w-3.5', deadlineLeft < 3600 ? 'text-amber-300' : 'text-emerald-300')} />
              <span className={cn(deadlineLeft < 3600 ? 'text-amber-300' : 'text-slate-400')}>
                Deliver before {new Date(oj.jobDeadlineSecs * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC
                — {fmtCountdown(deadlineLeft)} left
              </span>
            </p>
          )}
          {deadlinePassed && (
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The delivery deadline has passed — the on-chain rail no longer accepts a delivery
              for this job.
            </p>
          )}

          {wallet === null ? (
            <button type="button" className={BTN_GHOST} onClick={() => void connect()}>
              <Wallet className="h-3 w-3" />
              Connect StarKey (solver wallet)
            </button>
          ) : !isSolver ? (
            <p className="font-mono text-xs text-slate-500">
              Only the solver wallet ({oj.solver.slice(0, 10)}…) can deliver this job. Switch
              accounts in StarKey and reconnect.
            </p>
          ) : (
            <button
              type="button"
              className={CTA_BIG}
              disabled={phase === 'sending' || !deliver || deadlinePassed}
              onClick={() => void doDeliver()}
            >
              {phase === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
              Deliver result with StarKey
            </button>
          )}
        </div>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.DELIVERED && (
        <p className="flex items-start gap-2 font-mono text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Result delivered — waiting for the buyer&apos;s approval.
          {job.txRefs.deliver && (
            <a
              href={`${EXPLORER_TX}${job.txRefs.deliver}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              view transaction
            </a>
          )}
        </p>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.SETTLED && (
        <p className="flex items-start gap-2 font-mono text-xs text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Job settled — payout received.
        </p>
      )}

      {oj !== null &&
        oj.status !== JOB_ONCHAIN_STATUS.ACTIVE &&
        oj.status !== JOB_ONCHAIN_STATUS.DELIVERED &&
        oj.status !== JOB_ONCHAIN_STATUS.SETTLED && (
          <p className="font-mono text-xs text-amber-300">
            The on-chain job is in state {oj.status} (slashed/disputed/refunded) — delivery is not
            possible.
          </p>
        )}

      {error && (
        <p className="mt-4 flex items-start gap-1.5 font-mono text-[11px] text-rose-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
