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
  requestResultChallenge,
  submitResult,
  type MarketJob,
  type MarketProvider,
  type NextRoleBlock,
} from '../lib/marketApi';
import { connectMainnetWallet, signAndSendCompute } from '../lib/computeSend';
import { deliverResultV2 } from '../lib/computeTx';
import { fetchOnchainJob, JOB_ONCHAIN_STATUS, type OnchainJob } from '../lib/computeViews';
import { sameWallet, signChallenge } from '../lib/marketWallet';
import { BlockerCards } from './NextStepPanel';
import { explainSignError, outcomeOf, waitForTx, type TxStage } from '@/lib/txStatus';
import TxStatus from '@/components/cosmo/TxStatus';
import TechDetails from '@/components/cosmo/TechDetails';
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
  // outcome of the hand-in transaction, read from the chain
  const [tx, setTx] = useState<{ stage: TxStage; hash?: string; message?: string }>({ stage: 'idle' });
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

  // L3 artifact jobs: registration comes first — the solver signs the exact
  // hash+uri; only then does the server hand out a deliver template.
  const needsRegistration = block?.action?.id === 'register_result';
  const [regHash, setRegHash] = useState('');
  const [regUri, setRegUri] = useState('');
  const [regBusy, setRegBusy] = useState(false);

  const doRegister = useCallback(async () => {
    setRegBusy(true);
    setError(null);
    try {
      const hash = regHash.trim();
      const uri = regUri.trim();
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('The fingerprint must be 0x followed by 64 hex characters (SHA3-256 of the result file).');
      }
      const challenge = await requestResultChallenge(job.id, hash, uri);
      const proof = await signChallenge(challenge.hexMessage, challenge.nonce);
      await submitResult(job.id, hash, uri, { message: challenge.challenge, ...proof });
      onChanged();
    } catch (e) {
      setError((e as Error).message ?? String(e));
    } finally {
      setRegBusy(false);
    }
  }, [job.id, regHash, regUri, onChanged]);

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
    setTx({ stage: 'idle' });
    try {
      const account = await connectMainnetWallet();
      setWallet(account);
      const jv = await fetchOnchainJob(jobIdOnchain); // fresh chain truth
      if (!sameWallet(account, jv.solver)) {
        throw new Error('The connected wallet is not the chosen provider for this job.');
      }
      if (jv.status !== JOB_ONCHAIN_STATUS.ACTIVE) {
        throw new Error('The job is not active any more, so nothing can be handed in.');
      }
      setTx({ stage: 'signing' });
      let txHash: string;
      try {
        txHash = await signAndSendCompute(
          deliverResultV2({
            jobIdOnchain,
            resultHash: hashToCommit,
            resultUri,
          }),
          account,
        );
      } catch (e) {
        setTx({ stage: 'idle' });
        throw new Error(explainSignError(e));
      }
      // Read the real outcome: a hand-in that failed on chain must say so.
      setTx({ stage: 'sent', hash: txHash });
      const outcome = outcomeOf(await waitForTx(txHash, 45_000));
      setTx({ stage: outcome.stage, hash: txHash, message: outcome.message });
      if (outcome.stage === 'failed') {
        setPhase('idle');
        return;
      }
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
    <div className="rounded-xl border border-line-base bg-surface-1 p-6">
      <div className="mb-1 flex items-center gap-2">
        <Package className="h-4 w-4 text-phase-active" />
        <h2 className="font-mono text-sm font-bold text-ink-0">Hand in the result</h2>
      </div>
      <p className="mb-4 font-sans text-xs leading-relaxed text-ink-1">
        {block?.headline ??
          `The chosen provider${solverName ? ` (${solverName})` : ''} hands in the result. A fingerprint of it is recorded on-chain.`}
      </p>

      {oj === null && (
        <p className="flex items-center gap-2 font-mono text-xs text-ink-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Reading the job from the chain…
        </p>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.ACTIVE && (
        <div className="space-y-3">
          {block && block.blockers.length > 0 && <BlockerCards blockers={block.blockers} />}

          {needsRegistration && (
            <div className="space-y-3 rounded-lg border border-line-base bg-surface-inset p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-phase-active">
                Step 1: register your result (wallet signature, no fee)
              </p>
              <label className="block">
                <span className="font-mono text-[11px] text-ink-1">
                  Fingerprint of the exact result file (SHA3-256: 0x + 64 hex characters)
                </span>
                <input
                  type="text"
                  value={regHash}
                  onChange={(e) => setRegHash(e.target.value)}
                  placeholder="0x…"
                  className="mt-1 w-full rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-xs text-ink-0 placeholder:text-ink-2"
                />
              </label>
              <label className="block">
                <span className="font-mono text-[11px] text-ink-1">
                  Web address where the result file can be downloaded
                </span>
                <input
                  type="url"
                  value={regUri}
                  onChange={(e) => setRegUri(e.target.value)}
                  placeholder="https://…"
                  className="mt-1 w-full rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-xs text-ink-0 placeholder:text-ink-2"
                />
              </label>
              <button
                type="button"
                className={CTA_BIG}
                disabled={regBusy || !regHash || !regUri}
                onClick={() => void doRegister()}
              >
                {regBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
                Register result
              </button>
              <p className="font-mono text-[11px] leading-relaxed text-ink-2">
                Only the chosen provider&apos;s wallet can register. The next step then records
                exactly the fingerprint you register here, nothing else.
              </p>
            </div>
          )}

          {hashToCommit && resultUri && (
            <div className="rounded-lg border border-phase-fault/25 bg-phase-fault/[0.04] p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-phase-fault">
                This exact fingerprint will be recorded on-chain. It cannot be changed afterwards.
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-ink-1">{hashToCommit}</p>
              <a
                href={resultUri}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs text-phase-proof hover:text-phase-proof"
              >
                <FileJson className="h-3.5 w-3.5" />
                Open the result file behind it
              </a>
              <label className="mt-3 flex cursor-pointer items-start gap-2 font-mono text-[11px] text-ink-1">
                <input
                  type="checkbox"
                  checked={hashConfirmed}
                  onChange={(e) => setHashConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                I opened the file, checked this fingerprint, and want to hand in exactly this
                result.
              </label>
            </div>
          )}

          {!deadlinePassed && (
            <p className="flex items-center gap-2 font-mono text-xs">
              <Clock3 className={cn('h-3.5 w-3.5', deadlineLeft < 3600 ? 'text-phase-warn' : 'text-phase-settled')} />
              <span className={cn(deadlineLeft < 3600 ? 'text-phase-warn' : 'text-ink-1')}>
                Hand in before {new Date(oj.jobDeadlineSecs * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC:{' '}
                {fmtCountdown(deadlineLeft)} left
              </span>
            </p>
          )}
          {deadlinePassed && (
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-phase-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The deadline has passed. The contract no longer accepts a result for this job. The
              buyer can take the payment back, and part of the safety deposit goes to the buyer.
            </p>
          )}

          {wallet === null ? (
            <button type="button" className={BTN_GHOST} onClick={() => void connect()}>
              <Wallet className="h-3 w-3" />
              Connect the chosen provider&apos;s wallet
            </button>
          ) : !isSolver ? (
            <p className="font-mono text-xs text-ink-2">
              Only the chosen provider&apos;s wallet ({oj.solver.slice(0, 10)}…) can hand in this
              job. Switch the account in StarKey and connect again.
            </p>
          ) : (
            <button
              type="button"
              className={CTA_BIG}
              disabled={phase === 'sending' || !hashToCommit || !hashConfirmed || deadlinePassed}
              onClick={() => void doDeliver()}
            >
              {phase === 'sending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
              Hand in result
            </button>
          )}
        </div>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.DELIVERED && (
        <p className="flex items-start gap-2 font-mono text-xs text-phase-settled">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Result handed in. The buyer is checking it: the provider is paid when the buyer
          approves, or automatically when the time to check runs out.
          {job.txRefs.deliver && (
            <a
              href={`${EXPLORER_TX}${job.txRefs.deliver}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-phase-proof hover:text-phase-proof"
            >
              view transaction
            </a>
          )}
        </p>
      )}

      {oj !== null && oj.status === JOB_ONCHAIN_STATUS.SETTLED && (
        <p className="flex items-start gap-2 font-mono text-xs text-phase-settled">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Paid. The payment was released to the provider.
        </p>
      )}

      {oj !== null &&
        oj.status !== JOB_ONCHAIN_STATUS.ACTIVE &&
        oj.status !== JOB_ONCHAIN_STATUS.DELIVERED &&
        oj.status !== JOB_ONCHAIN_STATUS.SETTLED && (
          <p className="font-sans text-sm leading-relaxed text-phase-warn">
            {oj.status === JOB_ONCHAIN_STATUS.SLASHED
              ? 'No result was handed in by the deadline. The buyer took the payment back, and part of the safety deposit went to the buyer.'
              : oj.status === JOB_ONCHAIN_STATUS.DISPUTED
                ? 'The buyer disputed the result. The payment stays locked until the dispute is decided.'
                : oj.status === JOB_ONCHAIN_STATUS.REFUNDED
                  ? 'The payment went back to the buyer. Nothing more can be handed in.'
                  : 'This job has ended. Nothing more can be handed in.'}
          </p>
        )}

      <TxStatus stage={tx.stage} message={tx.message} txHash={tx.hash} className="mt-4" />
      <TechDetails className="mt-4">
        <p>
          Hand-in calls <code className="font-mono text-xs">deliver_result_v2(job_id, result_hash, result_uri)</code>{' '}
          on Supra Mainnet for on-chain job #{jobIdOnchain}. The hash and the address come from
          the server&apos;s next-steps document; nothing is derived in the browser.
        </p>
        {oj !== null && (
          <p className="mt-2 font-mono text-[11px]">on-chain job status code: {oj.status}</p>
        )}
      </TechDetails>

      {error && (
        <p className="mt-4 flex items-start gap-1.5 font-mono text-[11px] text-phase-fault">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
