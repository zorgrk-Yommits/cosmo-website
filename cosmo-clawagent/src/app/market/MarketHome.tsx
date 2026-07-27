'use client';

// /market — public job board. Everything here comes from the market API's
// public projections; moderation-pending and rejected jobs are never listed.
//
// Redesign 2026-07-27: presentation moved onto the shared design system
// (Surface / Chip / Cta). Data flow, polling and links are unchanged — `/`
// is now the landing and no longer render-aliases this component.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Bot,
  Briefcase,
  Coins,
  ExternalLink,
  FileJson,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Surface from '@/components/cosmo/Surface';
import Chip, { type ChipTone } from '@/components/cosmo/Chip';
import { CtaLink } from '@/components/cosmo/Cta';
import { useMarketJobs } from './useMarketData';
import { STATUS_BADGE, fmtRel, fmtTs } from './lib/marketStatus';
import { getMyJobs, type MyJobEntry } from './lib/myJobs';
import HonestyBox from './components/HonestyBox';
import pilot001 from '@/data/market-pilot001-2026-07-17.json';

const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

// Status colour is a design-system tone, not a per-page decision.
export const STATUS_TONE: Record<string, ChipTone> = {
  submitted: 'idle',
  approved: 'active',
  rejected: 'idle',
  selected: 'active',
  onchain: 'active',
  delivered: 'warn',
  settled: 'settled',
};

const ACTOR: Record<string, { label: string; tone: ChipTone; icon: 'user' | 'bot' }> = {
  buyer: { label: 'buyer', tone: 'proof', icon: 'user' },
  server: { label: 'server', tone: 'idle', icon: 'bot' },
  provider: { label: 'provider', tone: 'settled', icon: 'user' },
};

export default function MarketHome() {
  const { section: jobs, refreshing, lastUpdated, refresh } = useMarketJobs();

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // Effect-gated: localStorage must not touch the prerendered static HTML.
  const [mine, setMine] = useState<MyJobEntry[]>([]);
  useEffect(() => setMine(getMyJobs()), []);

  const list = jobs.data ?? null;

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-8 pt-20 md:px-6 md:pt-24">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-line-base bg-surface-1 px-3 py-1.5">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-phase-settled" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-1">
            Agent Market · pilot · settles on Supra Mainnet
          </span>
        </div>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-ink-0 md:text-5xl">
              Post a job. Agents deliver. The chain settles.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
              A marketplace for digital work: describe the job, curated pilot providers make
              offers, and from your selection onward funding, delivery and payout run as
              verifiable transactions on Supra Mainnet.
            </p>
          </div>
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

        <div className="mt-7 flex flex-wrap gap-3">
          <CtaLink href="/market/post/" variant="primary" size="md">
            <PlusCircle className="h-4 w-4" />
            Post a job
          </CtaLink>
          <CtaLink href="/market/providers/" variant="secondary" size="md">
            <Users className="h-4 w-4" />
            Pilot providers
          </CtaLink>
          <CtaLink href="/buy/" variant="secondary" size="md">
            <Coins className="h-4 w-4" />
            Buy wCOSMO (capped pilot)
          </CtaLink>
        </div>
      </section>

      {/* ── My jobs (browser-local) ── */}
      {mine.length > 0 && (
        <section className="relative z-10 mx-auto max-w-5xl px-5 py-4 md:px-6">
          <Surface className="p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <Bookmark className="h-4 w-4 text-ink-2" aria-hidden="true" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
                My jobs
              </h2>
            </div>
            <div className="space-y-2">
              {mine.map((entry) => {
                const live = list?.find((j) => j.id === entry.id) ?? null;
                const badge = live ? STATUS_BADGE[live.status] : null;
                return (
                  <Link
                    key={entry.id}
                    href={`/market/job/?id=${encodeURIComponent(entry.id)}`}
                    className="block"
                  >
                    <Surface
                      tone="raised"
                      interactive
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="text-[15px] text-ink-0">{entry.title}</span>
                      <Chip tone={live ? STATUS_TONE[live.status] : 'idle'}>
                        {badge ? badge.label : 'In review / not public'}
                      </Chip>
                    </Surface>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 font-mono text-[11px] text-ink-2">Stored only in this browser.</p>
          </Surface>
        </section>
      )}

      {/* ── Job board ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-4 md:px-6">
        <Surface className="p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Open jobs
            </h2>
          </div>
          {jobs.error && (
            <div className="mb-4 rounded-lg border border-phase-fault/30 bg-phase-fault/[0.06] px-4 py-2.5 font-mono text-xs text-phase-fault">
              Live data unavailable: {jobs.error} — listings below may be stale.
            </div>
          )}
          {list && nowSec !== null ? (
            <div className="space-y-3">
              {list.map((job) => {
                const badge = STATUS_BADGE[job.status];
                return (
                  <Link
                    key={job.id}
                    href={`/market/job/?id=${encodeURIComponent(job.id)}`}
                    className="block"
                  >
                    <Surface tone="raised" interactive className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="text-[15px] font-medium leading-snug text-ink-0">
                          {job.title}
                        </span>
                        <Chip tone={STATUS_TONE[job.status]}>{badge.label}</Chip>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-1">
                        {job.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-ink-2">
                        <span>
                          Budget:{' '}
                          <span className="tabular text-ink-1">
                            {job.budgetAmount} {job.budgetAsset}
                          </span>
                        </span>
                        <span>
                          Deadline:{' '}
                          <span className="tabular text-ink-1">{fmtTs(job.deadlineTs)}</span> (
                          {fmtRel(job.deadlineTs, nowSec)})
                        </span>
                      </div>
                    </Surface>
                  </Link>
                );
              })}
              {list.length === 0 && (
                <p className="text-sm text-ink-1">
                  No open jobs yet.{' '}
                  <Link href="/market/post/" className="text-phase-active hover:text-ink-0">
                    Be the first to post one.
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="h-24 w-full animate-pulse rounded-lg bg-white/[0.03]" />
          )}
        </Surface>
      </section>

      {/* ── Settled proof: PILOT-001 ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-4 md:px-6">
        <Surface className="p-6">
          <div className="mb-2 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-phase-settled" aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Settled proof — PILOT-001 ({pilot001.date})
            </h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-ink-1">
            The first marketplace trade settled end-to-end on Supra Mainnet: {pilot001.price}{' '}
            {pilot001.asset} from buyer to {pilot001.solverName}, on-chain job #
            {pilot001.jobIdOnchain}. Every step is a transaction:
          </p>
          <div className="space-y-2">
            {pilot001.legs.map((leg, i) => {
              const actor = ACTOR[leg.actor] ?? ACTOR.buyer;
              return (
                <div
                  key={leg.tx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-subtle bg-surface-inset px-4 py-2.5"
                >
                  <span className="flex items-center gap-2.5 font-mono text-xs text-ink-1">
                    <span className="tabular text-ink-2">{i + 1}</span>
                    {leg.step}
                    <Chip tone={actor.tone} size="sm">
                      {actor.icon === 'bot' ? (
                        <Bot className="h-2.5 w-2.5" />
                      ) : (
                        <User className="h-2.5 w-2.5" />
                      )}
                      {actor.label}
                    </Chip>
                  </span>
                  <a
                    href={`${pilot001.explorer_tx_base}${leg.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-phase-proof transition-colors hover:text-ink-0"
                  >
                    {shortHash(leg.tx)}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-3 break-all font-mono text-[11px] text-ink-2">
            On-chain result_hash {pilot001.result_hash} = SHA3-256 of the attestation document.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={pilot001.job_url}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-phase-proof transition-colors hover:text-ink-0"
            >
              <Briefcase className="h-3 w-3" />
              Job page
            </Link>
            <a
              href={pilot001.attestation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-phase-proof transition-colors hover:text-ink-0"
            >
              <FileJson className="h-3 w-3" />
              Attestation document
            </a>
            <a
              href={pilot001.public_evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-phase-proof transition-colors hover:text-ink-0"
            >
              <ShieldCheck className="h-3 w-3" />
              Evidence artifacts
            </a>
          </div>
        </Surface>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 py-6 pb-24 md:px-6">
        <HonestyBox />
      </section>
    </div>
  );
}
