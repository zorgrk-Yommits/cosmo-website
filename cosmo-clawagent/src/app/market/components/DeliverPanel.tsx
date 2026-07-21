'use client';

// PROVIDER role panel (L2: a tab inside RoleNextStep, no longer a separately
// mounted card — end of the role mixing, finding B5). Driven by the server's
// next-steps document: the deliver action arrives as a ready tx template whose
// display.hashToCommit is the EXACT hash that will be committed irreversibly.
// B6 rule: the hash is shown up front and the CTA stays disabled until the
// operator explicitly confirms that exact hash. Only the assigned SOLVER
// wallet can act (on-chain get_job_v2.solver is the truth).
//
// Deliberately self-contained (no useMarketFlow): that hook is buyer-shaped
// and already instantiated once per page — a second instance would double
// every poll.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, FileJson, Loader2, Package, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import {
  confirmDeliver,
  type MarketJob,
  type MarketProvider,
  type NextRoleBlock,
} from '../lib/marketApi';
import { connectMainnetWallet, signAndSendCompute } from '../lib/computeSend';
import { deliverResultV2 } from '../lib/computeTx';
import { fetchOnchainJob, JOB_ONCHAIN_STATUS, type OnchainJob } from '../lib/computeViews';
import { sameWallet } from '../lib/marketWallet';
import { BlockerCards } from './NextStepPanel';
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
  block,
  onChanged,
}: {
  job: MarketJob; // mounted only with jobIdOnchain != null
  providers: MarketProvider[];
  block: NextRoleBlock | null; // the server doc's provider role block
  onChanged: () => void;
}) {
  const jobIdOnchain = job.jobIdOnchain!;
  const [oj, setOj] = useState<OnchainJob | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idle' | 'sending'>('idle');
  const [hashConfirmed, setHashConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  // The deliver action comes from the SERVER document — template args carry
  // the exact result_hash / result_uri; nothing is derived client-side.
  const action = block?.action?.id === 'deliver_result' ? block.action : null;
  const tmpl = action?.txTemplate ?? null;
  const hashToCommit = tmpl?.display.hashToCommit ?? null;
  const resultUri = tmpl?.args.find((a) => a.name === 'result_uri')?.value ?? null;

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

  const connect = useCallback(async () => {
    setError(null);
    try {
      setWallet(await connectMainnetWallet());
    } catch (e) {
      setError((e as Error).message ?? String(e));
    }
  }, []);

  const doDeliver = useCallback(async () => {
    if (!hashToCommit || !resultUri || !hashConfirmed) return;
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
          resultHash: hashToCommit,
          resultUri,
        }),
        account,
      );
      // Fast path only — the server's chain poller (L1) is the sync guarantee.
      for (let i = 0; i < 3; i++) {
        await sleep(3_000);
        try {
          await confirmDeliver(job.id, txHash);
          break;
        } catch {
          // retry quietly; the poller records it either way
        }
      }
      onChanged();
      setPhase('idle');
    } catch (e) {
      setError((e as Error).message ?? String(e));
      setPhase('idle');
    }
  }, [hashToCommit, resultUri, hashConfirmed, job.id, jobIdOnchain, onChanged]);

  const isSolver = wallet !== null && oj !== null && sameWallet(wallet, oj.solver);
  const solverName = oj ? (providers.find((p) => sameWallet(p.wallet, oj.solver))?.name ?? null) : null;
  const deadlineLeft = oj ? Math.max(0, oj.jobDeadlineSecs - nowSec) : 0;
  const deadlinePassed = oj !== null && nowSec > oj.jobDeadlineSecs;

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Package className="h-4 w-4 text-purple-300" />
        <h2 className="font-mono text-sm font-bold text-slate-100">Provider: deliver the result</h2>
      </div>
      <p className="mb-4 font-sans text-xs leading-relaxed text-slate-400">
        {block?.headline ??
          `The assigned provider${solverName ? ` (${solverName})` : ''} delivers by committing the result hash on-chain.`}
      </p>

      {oj === null && (
        <p className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading on-chain job state…
        </p>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.ACTIVE && (
        <div className="space-y-3">
          {block && block.blockers.length > 0 && <BlockerCards blockers={block.blockers} />}

          {hashToCommit && resultUri && (
            <div className="rounded-lg border border-rose-500/25 bg-rose-500/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-rose-300">
                This exact hash will be committed on-chain — irreversibly
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-slate-300">{hashToCommit}</p>
              <a
                href={resultUri}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
              >
                <FileJson className="h-3.5 w-3.5" />
                Open the document behind it (result_uri)
              </a>
              <label className="mt-3 flex cursor-pointer items-start gap-2 font-mono text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={hashConfirmed}
                  onChange={(e) => setHashConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                I opened the document, recomputed or verified this hash, and want to commit
                exactly this hash as the delivery result.
              </label>
            </div>
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
              disabled={phase === 'sending' || !hashToCommit || !hashConfirmed || deadlinePassed}
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
