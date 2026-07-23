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
import { AlertTriangle, ArrowLeft, ListChecks, RefreshCw, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketJob, useMarketJobStatus, useMarketProviders } from '../useMarketData';
import { STATUS_BADGE, buildBuyerSteps } from '../lib/marketStatus';
import { getMyJobs } from '../lib/myJobs';
import { useMarketFlow } from '../lib/useMarketFlow';
import { useNextStepsDoc } from '../lib/useNextStepsDoc';
import { sameWallet } from '../lib/marketWallet';
import FlowRail from '../components/FlowRail';
import OfferCard from '../components/OfferCard';
import NextStepPanel from '../components/NextStepPanel';
import TurnStatusLine from '../components/TurnStatusLine';
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

  const workUrl = id ? `/market/work/?id=${encodeURIComponent(id)}` : '/market/work/';

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        {!id && (
          <p className="mt-8 font-mono text-sm text-slate-400">
            No job selected — pick one from{' '}
            <Link href="/" className="text-sky-400 hover:text-sky-300">
              the job board
            </Link>
            .
          </p>
        )}

        {/* ── Moderation fallback: not publicly listed, but the status answers ── */}
        {statusFallbackEnabled && fallbackStatus && !job && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
                {myTitle ?? 'Your submitted job'}
              </h1>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
                  STATUS_BADGE[fallbackStatus.status].cls,
                )}
              >
                {STATUS_BADGE[fallbackStatus.status].label}
              </span>
            </div>

            <div className="mt-6 rounded-xl border border-purple-500/25 bg-purple-500/[0.04] p-6">
              <h2 className="font-mono text-sm font-bold text-slate-100">Your next step</h2>
              {fallbackStatus.status === 'rejected' ? (
                <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
                  This job was not approved for the pilot board.{' '}
                  <Link href="/market/post/" className="text-sky-400 hover:text-sky-300">
                    Post a new job
                  </Link>{' '}
                  if you want to try a different scope.
                </p>
              ) : (
                <div className="mt-3 flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-slate-400" />
                  <p className="font-sans text-sm leading-relaxed text-slate-300">
                    Your job is <span className="font-bold text-slate-100">in review</span>. Once
                    approved it opens for offers from curated pilot providers — we also reach out
                    by email. Nothing to do right now; this page updates automatically.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Your steps</h2>
              </div>
              <FlowRail
                steps={buildBuyerSteps(
                  { status: fallbackStatus.status, requestId: fallbackStatus.requestId },
                  0,
                )}
                txRefs={fallbackStatus.txRefs}
              />
            </div>
          </>
        )}

        {statusFallbackEnabled && !fallbackStatus && statusSection.error && (
          <p className="mt-8 font-mono text-sm text-slate-400">
            This job is not publicly visible ({section.error}). It may still be in moderation —
            check back later.
          </p>
        )}

        {id && !section.error && !job && (
          <div className="mt-8 h-24 w-full animate-pulse rounded bg-white/5" />
        )}

        {job && nowSec !== null && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
                {job.title}
              </h1>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
                    STATUS_BADGE[job.status].cls,
                  )}
                >
                  {STATUS_BADGE[job.status].label}
                </span>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-400 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                  Refresh
                </button>
              </div>
            </div>

            {/* ── Status line + wallet ── */}
            <TurnStatusLine
              ownRole="buyer"
              doc={doc}
              wallet={f.wallet}
              buyerWallet={buyerWallet}
              providers={providers}
              onConnect={() => void f.connect()}
            />

            {/* ── Provider-wallet hint (never a redirect) ── */}
            {walletIsProvider && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3">
                <p className="flex items-start gap-1.5 font-sans text-sm leading-relaxed text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <span>
                    You are connected with a provider wallet for this job. This page is the
                    buyer&apos;s view — offers and delivery happen on the provider view.{' '}
                    <Link href={workUrl} className="font-bold text-sky-400 hover:text-sky-300">
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

            {/* ── Your steps (buyer-only rail) ── */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Your steps</h2>
              </div>
              <FlowRail steps={buildBuyerSteps(job, offers.length)} txRefs={job.txRefs} />
              <TxRecord txRefs={job.txRefs} />
            </div>

            <JobFactsCard job={job} nowSec={nowSec} />
            <FrozenSpecCard job={job} />

            {/* ── Offers (the buyer chooses; providers submit on /market/work) ── */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">
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
                <p className="font-mono text-xs text-slate-500">
                  No offers yet. Curated pilot providers are notified of approved jobs and submit
                  offers on the provider view.
                </p>
              )}
              <p className="mt-4 font-mono text-[11px] text-slate-500">
                Prices are in {job.budgetAsset}.
              </p>
            </div>

            {/* ── Cross-link to the provider view ── */}
            <p className="mt-6 font-mono text-xs text-slate-500">
              Are you a provider on this job? Offers and delivery live on the{' '}
              <Link href={workUrl} className="text-sky-400 hover:text-sky-300">
                provider view →
              </Link>
            </p>
          </>
        )}
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
