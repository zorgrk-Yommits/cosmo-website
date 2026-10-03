'use client';

// /market/job?id=<id> — the BUYER page (role split 2026-07-23: one page per
// role; providers act on /market/work). Query-param routing: static export
// has no dynamic segments. The "Your next step" hero panel leads the page —
// one big CTA per state — followed by the buyer-only lifecycle rail, job
// facts, frozen spec and the offers the buyer chooses from. Jobs still in
// moderation are not publicly listed; a lightweight status poll renders a
// waiting view for the submitter instead.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ListChecks, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Surface from '@/components/cosmo/Surface';
import { useMarketJob, useMarketJobStatus, useMarketProviders } from '../useMarketData';
import { buildBuyerSteps, buyerStageView } from '../lib/marketStatus';
import { getMyJobs } from '../lib/myJobs';
import { useMarketFlow } from '../lib/useMarketFlow';
import { useNextStepsDoc } from '../lib/useNextStepsDoc';
import { sameWallet } from '../lib/marketWallet';
import FlowRail from '../components/FlowRail';
import OfferCard from '../components/OfferCard';
import NextStepPanel from '../components/NextStepPanel';
import WalletChip from '../components/WalletChip';
import StatusTrack from '@/components/cosmo/StatusTrack';
import TechDetails from '@/components/cosmo/TechDetails';
import { FrozenSpecCard, JobFactsCard, TxRecord } from '../components/JobInfoSections';
import HonestyBox from '../components/HonestyBox';

export default function JobDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  const { section, refreshing, refresh } = useMarketJob(id);
  const { section: providersSection } = useMarketProviders();

  const job = section.data?.job ?? null;
  const offers = section.data?.offers ?? [];
  const providers = providersSection.data ?? [];

  const f = useMarketFlow(job?.id ?? null, () => void refresh());
  const { doc } = useNextStepsDoc(job?.id ?? null, f.wallet);

  // Moderation fallback: the public job fetch 404s for submitted/rejected
  // jobs, but the status endpoint answers for any id.
  const statusFallbackEnabled = !!id && !!section.error && !job;
  const { section: statusSection } = useMarketJobStatus(id, statusFallbackEnabled);
  const fallbackStatus = statusFallbackEnabled ? (statusSection.data ?? null) : null;

  const [myTitle, setMyTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    setMyTitle(getMyJobs().find((e) => e.id === id)?.title ?? null);
  }, [id]);

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  // Role split: if the connected wallet belongs to a provider on this job,
  // this is probably the wrong page — offer a link, never a redirect.
  const buyerWallet = f.flow?.buyerWallet ?? job?.buyerWallet ?? null;
  const solverWallet =
    doc?.roles.find((r) => r.role === 'provider')?.action?.signerWallet ?? f.onchainJob?.solver ?? null;
  const walletIsProvider =
    !!f.wallet &&
    ((solverWallet ? sameWallet(f.wallet, solverWallet) : false) ||
      providers.some(
        (p) => p.wallet && offers.some((o) => o.providerId === p.id) && sameWallet(f.wallet!, p.wallet),
      ));

  const oj = f.onchainJob;
  const buyerState = doc?.roles.find((r) => r.role === 'buyer')?.state ?? null;
  const view = job
    ? buyerStageView({
        status: f.flow?.status ?? job.status,
        selectedOfferId: f.flow?.selectedOfferId ?? job.selectedOfferId ?? undefined,
        requestId: f.flow?.requestId ?? job.requestId ?? undefined,
        jobIdOnchain: f.flow?.jobIdOnchain ?? job.jobIdOnchain ?? undefined,
        offersCount: offers.length,
        onchainStatus: oj?.status ?? null,
        deliverDueSecs: oj?.jobDeadlineSecs ?? null,
        checkBySecs: oj && oj.deliveredAt > 0 ? oj.deliveredAt + oj.reviewWindowSecs : null,
        requestClosed: buyerState === 'request_closed',
        nowSec: nowSec ?? undefined,
      })
    : null;

  const workUrl = id ? `/market/work/?id=${encodeURIComponent(id)}` : '/market/work/';

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

        {/* ── Moderation fallback: not publicly listed, but the status answers ── */}
        {statusFallbackEnabled && fallbackStatus && !job && (
          <>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink-0 md:text-3xl">
              {myTitle ?? 'Your submitted job'}
            </h1>

            {(() => {
              const view = buyerStageView({
                status: fallbackStatus.status,
                requestId: fallbackStatus.requestId,
                offersCount: 0,
              });
              return (
                <Surface className="mt-6 p-5 md:p-6">
                  <StatusTrack current={view.current} yourTurn={view.yourTurn} end={view.end} note={view.note} />
                </Surface>
              );
            })()}

            <div className="mt-4 rounded-xl border border-phase-active/25 bg-phase-active/[0.04] p-6">
              <h2 className="font-mono text-sm font-bold text-ink-0">Your next step</h2>
              {fallbackStatus.status === 'rejected' ? (
                <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
                  This job was not approved for the pilot board. Nothing was charged.{' '}
                  <Link href="/market/post/" className="text-phase-proof hover:text-phase-proof">
                    Post a new job
                  </Link>{' '}
                  if you want to try a different scope.
                </p>
              ) : (
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-ink-2" />
                  <p className="font-sans text-sm leading-relaxed text-ink-1">
                    Your job is <span className="font-bold text-ink-0">in review</span>. Once
                    approved, hand-picked pilot providers can make offers. We also write to you
                    by email. Nothing to do right now; this page updates by itself.
                  </p>
                </div>
              )}
            </div>

            <TechDetails title="Technical details: every step" className="mt-4">
              <FlowRail
                steps={buildBuyerSteps(
                  { status: fallbackStatus.status, requestId: fallbackStatus.requestId },
                  0,
                )}
                txRefs={fallbackStatus.txRefs}
              />
            </TechDetails>
          </>
        )}

        {statusFallbackEnabled && !fallbackStatus && statusSection.error && (
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
            <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-ink-0 md:text-3xl">
                {job.title}
              </h1>
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

            {/* ── Where the job stands: five stages, whose turn, end states ── */}
            <Surface className="mt-6 p-5 md:p-6">
              <StatusTrack current={view.current} yourTurn={view.yourTurn} end={view.end} note={view.note} />
            </Surface>

            <div className="mt-4 flex justify-end">
              <WalletChip
                wallet={f.wallet}
                buyerWallet={buyerWallet}
                providers={providers}
                onConnect={() => void f.connect()}
              />
            </div>

            {/* ── Provider-wallet hint (never a redirect) ── */}
            {walletIsProvider && (
              <div className="mt-3 rounded-lg border border-phase-warn/30 bg-phase-warn/[0.06] p-3">
                <p className="flex items-start gap-1.5 font-sans text-sm leading-relaxed text-phase-warn">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-phase-warn" />
                  <span>
                    You are connected with a provider wallet for this job. This page is the
                    buyer&apos;s view. Offers and delivery happen on the provider view.{' '}
                    <Link href={workUrl} className="font-bold text-phase-proof hover:text-phase-proof">
                      Open the provider view →
                    </Link>
                  </span>
                </p>
              </div>
            )}

            {/* ── Your next step (buyer panel, server-computed turn) ── */}
            <div className="mt-4">
              <NextStepPanel job={job} offers={offers} providers={providers} doc={doc} f={f} />
            </div>

            <JobFactsCard job={job} nowSec={nowSec} />

            {/* ── Offers (the buyer chooses; providers submit on /market/work) ── */}
            <div className="mt-4 rounded-xl border border-line-base bg-surface-1 p-6">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-phase-active" />
                <h2 className="font-mono text-sm font-bold text-ink-0">
                  Offers ({offers.length})
                </h2>
              </div>
              {offers.length > 0 ? (
                <div className="space-y-3">
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      provider={providers.find((p) => p.id === offer.providerId) ?? null}
                      selected={job.selectedOfferId === offer.id}
                    />
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-ink-2">
                  No offers yet. The pilot providers are notified of approved jobs and make their
                  offers on the provider view.
                </p>
              )}
              <p className="mt-4 font-mono text-[11px] text-ink-2">
                Prices are in {job.budgetAsset}.
              </p>
            </div>

            <FrozenSpecCard job={job} />

            {/* ── Every step with its transaction, for those who want to check ── */}
            <TechDetails title="Technical details: every step and its transaction" className="mt-4">
              <FlowRail steps={buildBuyerSteps(job, offers.length)} txRefs={job.txRefs} />
              <TxRecord txRefs={job.txRefs} />
            </TechDetails>

            {/* ── Cross-link to the provider view ── */}
            <p className="mt-6 font-mono text-xs text-ink-2">
              Are you a provider on this job? Offers and delivery live on the{' '}
              <Link href={workUrl} className="text-phase-proof hover:text-phase-proof">
                provider view →
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
