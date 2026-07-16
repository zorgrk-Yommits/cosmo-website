'use client';

// /market/job?id=<id> — job detail (query-param routing: static export has no
// dynamic segments). Lifecycle rail with the off-/on-chain boundary, frozen
// spec + hash once approved, offers, explorer links once transactions exist.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, FileJson, Fingerprint, ListChecks, RefreshCw, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import { useMarketJob, useMarketProviders } from '../useMarketData';
import { STATUS_BADGE, buildSteps, fmtRel, fmtTs } from '../lib/marketStatus';
import { specUrl, type TxRefs } from '../lib/marketApi';
import StepRail from '../components/StepRail';
import OfferCard from '../components/OfferCard';
import HonestyBox from '../components/HonestyBox';

const TX_LABELS: { key: keyof TxRefs; label: string }[] = [
  { key: 'create', label: 'Escrow created' },
  { key: 'submitQuote', label: 'Quote submitted' },
  { key: 'accept', label: 'Quote accepted' },
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

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const job = section.data?.job ?? null;
  const offers = section.data?.offers ?? [];
  const providers = providersSection.data ?? [];

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-8">
        <Link
          href="/market/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        {!id && (
          <p className="mt-8 font-mono text-sm text-slate-400">
            No job selected — pick one from{' '}
            <Link href="/market/" className="text-sky-400 hover:text-sky-300">
              the job board
            </Link>
            .
          </p>
        )}

        {id && section.error && !job && (
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

            {/* ── Lifecycle ── */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Lifecycle</h2>
              </div>
              <StepRail steps={buildSteps(job)} />
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
                  document. Its SHA3-256 hash is what the on-chain escrow commits to.
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
                Prices are in {job.budgetAsset}. Offer selection and the on-chain escrow flow
                arrive in the next release stage of this pilot.
              </p>
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
