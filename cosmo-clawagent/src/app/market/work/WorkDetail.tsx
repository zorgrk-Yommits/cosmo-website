'use client';

// /market/work?id=<id> — the PROVIDER page (role split 2026-07-23: one page
// per role; buyers act on /market/job). Everything a provider does lives
// here: submit an offer while the job is open, register and deliver the
// result once the job is on-chain, get paid. The buyer's activity collapses
// into a single waiting node. Deliberately does NOT mount useMarketFlow —
// auto-arm and the buyer polls have no business on this page; the wallet is
// picked up passively, the server's next-steps document drives the rest.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketJob, useMarketProviders } from '../useMarketData';
import { buildProviderSteps, providerStageView } from '../lib/marketStatus';
import { fetchOnchainJob, type OnchainJob } from '../lib/computeViews';
import StatusTrack from '@/components/cosmo/StatusTrack';
import Surface from '@/components/cosmo/Surface';
import TechDetails from '@/components/cosmo/TechDetails';
import { useNextStepsDoc, usePassiveWallet } from '../lib/useNextStepsDoc';
import { connectWallet, markWalletSeen } from '../lib/marketWallet';
import FlowRail from '../components/FlowRail';
import OfferForm from '../components/OfferForm';
import DeliverPanel from '../components/DeliverPanel';
import TurnStatusLine from '../components/TurnStatusLine';
import { BlockerCards } from '../components/NextStepPanel';
import { FrozenSpecCard, JobFactsCard, TxRecord } from '../components/JobInfoSections';
import HonestyBox from '../components/HonestyBox';

export default function WorkDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  const { section, refreshing, refresh } = useMarketJob(id);
  const { section: providersSection } = useMarketProviders();

  const job = section.data?.job ?? null;
  const providers = providersSection.data ?? [];

  const { wallet, setWallet } = usePassiveWallet();
  const { doc } = useNextStepsDoc(job?.id ?? null, wallet);
  const providerBlock = doc?.roles.find((r) => r.role === 'provider') ?? null;

  const [connectError, setConnectError] = useState<string | null>(null);
  const connect = async () => {
    setConnectError(null);
    try {
      const addr = await connectWallet();
      markWalletSeen();
      setWallet(addr);
    } catch (e) {
      setConnectError((e as Error).message ?? String(e));
    }
  };

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  // Live on-chain job for the status track (end states, deadlines). Read-only.
  const jobIdOnchain = job?.jobIdOnchain ?? null;
  const [oj, setOj] = useState<OnchainJob | null>(null);
  useEffect(() => {
    if (jobIdOnchain == null) return;
    let stop = false;
    const tick = () =>
      fetchOnchainJob(jobIdOnchain)
        .then((j) => {
          if (!stop) setOj(j);
        })
        .catch(() => {
          /* keep the last value */
        });
    void tick();
    const iv = setInterval(() => void tick(), 15_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [jobIdOnchain]);

  const view = job
    ? providerStageView({
        status: job.status,
        selectedOfferId: job.selectedOfferId ?? undefined,
        requestId: job.requestId ?? undefined,
        jobIdOnchain: job.jobIdOnchain ?? undefined,
        offersCount: 0,
        onchainStatus: jobIdOnchain != null ? (oj?.status ?? null) : null,
        deliverDueSecs: oj?.jobDeadlineSecs ?? null,
        checkBySecs: oj && oj.deliveredAt > 0 ? oj.deliveredAt + oj.reviewWindowSecs : null,
        nowSec: nowSec ?? undefined,
      })
    : null;

  const buyerUrl = id ? `/market/job/?id=${encodeURIComponent(id)}` : '/market/job/';
  const showDeliverPanel = !!job && job.jobIdOnchain != null && job.status !== 'settled';
  const showOfferForm = !!job && job.status === 'approved';

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-24 md:px-6">
        <Link
          href="/market/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-1 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        {!id && (
          <p className="mt-8 font-mono text-sm text-ink-1">
            No job chosen. Pick one from{' '}
            <Link href="/market/" className="text-phase-proof hover:text-phase-proof">
              the job board
            </Link>
            .
          </p>
        )}

        {id && !!section.error && !job && (
          <p className="mt-8 font-mono text-sm text-ink-1">
            This job is not public ({section.error}). It may still be in review. Check back
            later.
          </p>
        )}

        {id && !section.error && !job && (
          <div className="mt-8 h-24 w-full animate-pulse rounded bg-surface-2" />
        )}

        {job && view && nowSec !== null && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-phase-active">
                  Provider view
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink-0 md:text-3xl">
                  {job.title}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-1.5 font-mono text-[11px] text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Where the job stands ── */}
            <Surface className="mt-6 p-5 md:p-6">
              <StatusTrack current={view.current} yourTurn={view.yourTurn} end={view.end} note={view.note} />
            </Surface>

            {/* ── Status line + wallet ── */}
            <TurnStatusLine
              ownRole="provider"
              doc={doc}
              wallet={wallet}
              buyerWallet={job.buyerWallet ?? null}
              providers={providers}
              onConnect={() => void connect()}
            />
            {connectError && (
              <p className="mt-2 font-mono text-xs text-phase-warn">{connectError}</p>
            )}

            {/* ── Provider next step ── */}
            {showOfferForm ? (
              <div className="mt-4 rounded-xl border border-phase-active/25 bg-phase-active/[0.04] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-phase-active" />
                  <h2 className="font-mono text-sm font-bold text-ink-0">Your next step</h2>
                </div>
                <p className="mb-4 font-sans text-sm leading-relaxed text-ink-1">
                  This job is open for offers. Name your price and delivery time and confirm
                  with your provider wallet. The buyer then chooses among the offers.
                </p>
                {providerBlock && providerBlock.blockers.length > 0 && (
                  <div className="mb-4">
                    <BlockerCards blockers={providerBlock.blockers} />
                  </div>
                )}
                <OfferForm
                  jobId={job.id}
                  budgetAsset={job.budgetAsset}
                  providers={providers}
                  onSubmitted={() => void refresh()}
                />
              </div>
            ) : showDeliverPanel ? (
              <div className="mt-4">
                <DeliverPanel
                  job={job}
                  providers={providers}
                  block={providerBlock}
                  onChanged={() => void refresh()}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-line-base bg-surface-1 p-6">
                <p className="font-sans text-sm leading-relaxed text-ink-1">
                  {job.status === 'settled'
                    ? 'Paid. The payment was released to the provider. This job is complete.'
                    : (providerBlock?.headline ?? 'Nothing for providers to do on this job right now.')}
                </p>
                {providerBlock && providerBlock.blockers.length > 0 && (
                  <div className="mt-3">
                    <BlockerCards blockers={providerBlock.blockers} />
                  </div>
                )}
              </div>
            )}

            <JobFactsCard job={job} nowSec={nowSec} />
            <FrozenSpecCard job={job} />

            {/* ── Every step with its transaction, for those who want to check ── */}
            <TechDetails title="Technical details: every step and its transaction" className="mt-4">
              <FlowRail steps={buildProviderSteps(job)} txRefs={job.txRefs} />
              <TxRecord txRefs={job.txRefs} />
            </TechDetails>

            {/* ── Machine-readable footer + cross-link ── */}
            <p className="mt-6 font-mono text-xs text-ink-2">
              For agents: this job can be read by a program at{' '}
              <a
                href={`/api/market/jobs/${encodeURIComponent(job.id)}/next-steps`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-phase-proof hover:text-phase-proof"
              >
                /next-steps
              </a>{' '}
              . It is the same document this page is built from.
            </p>
            <p className="mt-2 font-mono text-xs text-ink-2">
              Are you the buyer? Choosing an offer, locking the payment and approving the
              result happen on the{' '}
              <Link href={buyerUrl} className="text-phase-proof hover:text-phase-proof">
                buyer view →
              </Link>
            </p>
          </>
        )}
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6">
        <HonestyBox />
      </section>
    </div>
  );
}
