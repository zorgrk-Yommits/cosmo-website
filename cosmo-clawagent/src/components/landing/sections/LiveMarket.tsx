'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Chip, { type ChipTone } from '@/components/cosmo/Chip';
import { CtaLink } from '@/components/cosmo/Cta';
import { useMarketJobs } from '@/app/market/useMarketData';
import { STATUS_BADGE, fmtRel, fmtTs } from '@/app/market/lib/marketStatus';
import HonestyBox from '@/app/market/components/HonestyBox';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import { deriveMarketSummary } from '../lib/marketSummary';

// Section 5 — the live market.
//
// Everything here is read from the market API at runtime. There are no
// hard-coded counts: if the API cannot be reached the section says so
// instead of showing a number. A "0" on this page would be a claim about
// the market, and we only make claims we can back.

const TONE: Record<string, ChipTone> = {
  submitted: 'idle',
  approved: 'active',
  rejected: 'idle',
  selected: 'active',
  onchain: 'active',
  delivered: 'warn',
  settled: 'settled',
};

export default function LiveMarket() {
  const { section, refreshing, lastUpdated, refresh } = useMarketJobs();
  const summary = deriveMarketSummary(section.data);
  const jobs = section.data ?? [];

  // Relative deadlines need a clock, and the clock must not exist during the
  // static render (it would bake a build-time "now" into the HTML). The first
  // value arrives from a timer callback; until then only absolute timestamps
  // are shown.
  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowSec(Math.floor(Date.now() / 1000));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const open = jobs.filter((j) => j.status === 'approved');
  const settled = jobs
    .filter((j) => j.status === 'settled')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <section className="relative border-t border-line-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            kicker="Live market"
            title="Real jobs, in a supervised pilot."
            lead="Small budgets, curated providers, every settled job auditable. This is what exists today — not a projection of what the network could be."
          />
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-mono text-[11px] tabular text-ink-2">
                Updated {new Date(lastUpdated).toLocaleTimeString('en-US')}
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-1.5 font-mono text-[11px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* counters */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Stat label="Settled end-to-end" value={summary?.settled} tone="settled" />
          <Stat label="Open for offers" value={summary?.open} tone="active" />
          <Stat label="In execution" value={summary?.inExecution} tone="proof" />
        </div>

        {section.error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-phase-fault/30 bg-phase-fault/[0.06] px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-phase-fault" aria-hidden="true" />
            <p className="font-mono text-xs leading-relaxed text-phase-fault">
              Live market data unavailable ({section.error}). Nothing above is being estimated —
              figures are shown only while the market API answers.
            </p>
          </div>
        )}

        <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
          {/* open jobs */}
          <Surface className="p-6">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Open for offers
            </h3>
            <div className="mt-5 space-y-3">
              {section.data === null ? (
                <div className="h-20 animate-pulse rounded-lg bg-white/[0.03]" />
              ) : open.length === 0 ? (
                <p className="text-sm leading-relaxed text-ink-1">
                  No job is open for offers right now.{' '}
                  <Link href="/market/post/" className="text-phase-active hover:text-ink-0">
                    Post one
                  </Link>{' '}
                  and providers can bid on it.
                </p>
              ) : (
                open.map((job) => (
                  <Link
                    key={job.id}
                    href={`/market/job/?id=${encodeURIComponent(job.id)}`}
                    className="block"
                  >
                    <Surface tone="raised" interactive className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2.5">
                        <span className="text-[15px] font-medium leading-snug text-ink-0">
                          {job.title}
                        </span>
                        <Chip tone={TONE[job.status]}>{STATUS_BADGE[job.status].label}</Chip>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-ink-2">
                        <span>
                          Budget{' '}
                          <span className="tabular text-ink-1">
                            {job.budgetAmount} {job.budgetAsset}
                          </span>
                        </span>
                        <span>
                          Deadline{' '}
                          <span className="tabular text-ink-1">
                            {fmtTs(job.deadlineTs)}
                            {nowSec !== null && ` (${fmtRel(job.deadlineTs, nowSec)})`}
                          </span>
                        </span>
                      </div>
                    </Surface>
                  </Link>
                ))
              )}
            </div>
          </Surface>

          {/* settled proofs */}
          <Surface className="p-6">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Settled — with transactions
            </h3>
            <div className="mt-5 space-y-3">
              {section.data === null ? (
                <div className="h-20 animate-pulse rounded-lg bg-white/[0.03]" />
              ) : settled.length === 0 ? (
                <p className="text-sm text-ink-1">No settled jobs recorded yet.</p>
              ) : (
                settled.map((job) => (
                  <Surface key={job.id} tone="raised" className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2.5">
                      <Link
                        href={`/market/job/?id=${encodeURIComponent(job.id)}`}
                        className="text-[15px] font-medium leading-snug text-ink-0 hover:text-phase-active"
                      >
                        {job.title}
                      </Link>
                      <Chip tone="settled">settled</Chip>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[11px] text-ink-2">
                      <span className="tabular">
                        {job.budgetAmount} {job.budgetAsset}
                      </span>
                      {job.txRefs.settle && (
                        <a
                          href={`${EXPLORER_TX}${job.txRefs.settle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-phase-proof hover:text-ink-0"
                        >
                          settlement tx
                          <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </Surface>
                ))
              )}
            </div>
          </Surface>
        </div>

        <div className="mt-6">
          <HonestyBox />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href="/market/" variant="primary" size="md">
            Explore the live market
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
          <CtaLink href="/market/providers/" variant="secondary" size="md">
            Pilot providers
          </CtaLink>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone: 'active' | 'proof' | 'settled';
}) {
  const TONE_TEXT = {
    active: 'text-phase-active',
    proof: 'text-phase-proof',
    settled: 'text-phase-settled',
  } as const;

  return (
    <Surface className="p-6">
      <div className={cn('font-mono text-4xl tabular', value === undefined ? 'text-ink-2' : TONE_TEXT[tone])}>
        {/* An em dash, never a zero: no data must not read as "none". */}
        {value === undefined ? '—' : value}
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
        {label}
      </div>
    </Surface>
  );
}
