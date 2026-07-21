'use client';

// /market/job?id=<id> — job detail (query-param routing: static export has no
// dynamic segments). The "Your next step" hero panel leads the page — one big
// CTA per state — followed by the unified lifecycle rail, job facts, frozen
// spec and offers. Jobs still in moderation are not publicly listed; a
// lightweight status poll renders a waiting view for the submitter instead.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileJson, Fingerprint, ListChecks, RefreshCw, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import { useMarketJob, useMarketJobStatus, useMarketProviders } from '../useMarketData';
import { STATUS_BADGE, fmtRel, fmtTs } from '../lib/marketStatus';
import { specUrl, type TxRefs } from '../lib/marketApi';
import { getMyJobs } from '../lib/myJobs';
import FlowRail from '../components/FlowRail';
import OfferCard from '../components/OfferCard';
import OfferForm from '../components/OfferForm';
import RoleNextStep from '../components/RoleNextStep';
import HonestyBox from '../components/HonestyBox';

const TX_LABELS: { key: keyof TxRefs; label: string }[] = [
  { key: 'create', label: 'Job funded' },
  { key: 'submitQuote', label: 'Provider offer confirmed' },
  { key: 'accept', label: 'Job confirmed & started' },
  { key: 'deliver', label: 'Result delivered' },
  { key: 'dispute', label: 'Delivery disputed' },
  { key: 'settle', label: 'Settled' },
];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs text-slate-300">{children}</dd>
    </div>
  );
}

export default function JobDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  const { section, refreshing, refresh } = useMarketJob(id);
  const { section: providersSection } = useMarketProviders();

  const job = section.data?.job ?? null;
  const offers = section.data?.offers ?? [];
  const providers = providersSection.data ?? [];

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
                <h2 className="font-mono text-sm font-bold text-slate-100">Lifecycle</h2>
              </div>
              <FlowRail
                job={{
                  status: fallbackStatus.status,
                  requestId: fallbackStatus.requestId,
                  txRefs: fallbackStatus.txRefs,
                }}
                offersCount={0}
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

            {/* ── Your next step (L2: role tabs, server-computed turn) ── */}
            <RoleNextStep
              job={job}
              offers={offers}
              providers={providers}
              onChanged={() => void refresh()}
            />

            {/* ── Lifecycle ── */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Lifecycle</h2>
              </div>
              <FlowRail job={job} offersCount={offers.length} />
              {Object.values(job.txRefs).some(Boolean) && (
                <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-3">
                  {TX_LABELS.filter(({ key }) => job.txRefs[key]).map(({ key, label }) => (
                    <Fact key={key} label={label}>
                      <a
                        href={`${EXPLORER_TX}${job.txRefs[key]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300"
                      >
                        view transaction
                      </a>
                    </Fact>
                  ))}
                </dl>
              )}
            </div>

            {/* ── Job facts ── */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Job</h2>
              </div>
              <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-slate-300">
                {job.description}
              </p>
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Acceptance criteria
                </p>
                <p className="mt-1.5 whitespace-pre-line font-sans text-sm leading-relaxed text-slate-300">
                  {job.acceptanceCriteria}
                </p>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
                <Fact label="Budget">
                  {job.budgetAmount} {job.budgetAsset}
                </Fact>
                <Fact label="Deadline">
                  {fmtTs(job.deadlineTs)}{' '}
                  <span className="text-slate-500">({fmtRel(job.deadlineTs, nowSec)})</span>
                </Fact>
                <Fact label="Posted">{fmtTs(job.createdAt)}</Fact>
              </dl>
            </div>

            {/* ── Frozen spec ── */}
            {job.specHash && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-purple-300" />
                  <h2 className="font-mono text-sm font-bold text-slate-100">Frozen specification</h2>
                </div>
                <p className="font-sans text-sm leading-relaxed text-slate-400">
                  On approval this job&apos;s specification was frozen to an immutable canonical
                  document. The on-chain contract stores its SHA3-256 hash, so the specification
                  cannot change after funding.
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-3">
                  <Fact label="Spec hash (SHA3-256)">
                    <span className="break-all">{job.specHash}</span>
                  </Fact>
                  <Fact label="Canonical document">
                    <a
                      href={specUrl(job.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300"
                    >
                      <FileJson className="h-3 w-3" />
                      {specUrl(job.id)}
                    </a>
                  </Fact>
                </dl>
              </div>
            )}

            {/* ── Offers ── */}
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
                  No offers yet. Curated pilot providers are notified of approved jobs.
                </p>
              )}
              <p className="mt-4 font-mono text-[11px] text-slate-500">
                Prices are in {job.budgetAsset}.
              </p>
              {job.status === 'approved' && (
                <div className="mt-4">
                  <OfferForm
                    jobId={job.id}
                    budgetAsset={job.budgetAsset}
                    providers={providers}
                    onSubmitted={() => void refresh()}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
