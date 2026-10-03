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
import PageIntro from '@/components/cosmo/PageIntro';
import TechDetails from '@/components/cosmo/TechDetails';
import { BUYER_FLOW } from '@/components/cosmo/flows';
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

// Plain names for the five recorded steps of PILOT-001, in order. The
// original step names (with the contract calls) are in the technical details.
const LEG_PLAIN = [
  'Payment locked',
  'Offer prepared (automatic)',
  'Job started',
  'Result handed in',
  'Result approved, provider paid',
];

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

      {/* ── Intro: what this is, the picture, the next action ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-20 md:px-6 md:pt-24">
        <PageIntro
          maturity="pilot"
          maturityDetail="payments on Supra Mainnet"
          title="Post a job. A provider does it. You pay after checking."
          lead="A marketplace for digital work. Describe the job, hand-picked pilot providers make offers, and your payment stays locked until you have checked the result."
          flow={BUYER_FLOW.map(({ id, icon, label }) => ({ id, icon, label }))}
          flowLabel="How it works for you: post job, get offer, lock payment, work happens, check result, pay provider."
        >
          <CtaLink href="/market/post/" variant="primary" size="lg">
            <PlusCircle className="h-4 w-4" />
            Post a job
          </CtaLink>
          <CtaLink href="/market/providers/" variant="secondary" size="md">
            <Users className="h-4 w-4" />
            Pilot providers
          </CtaLink>
          <CtaLink href="/buy/" variant="secondary" size="md">
            <Coins className="h-4 w-4" />
            Buy wCOSMO
          </CtaLink>
        </PageIntro>

        <div className="mt-6 flex items-center gap-3">
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
      </section>

      {/* ── My jobs (browser-local) ── */}
      {mine.length > 0 && (
        <section className="relative z-10 mx-auto max-w-5xl px-4 py-4 md:px-6">
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
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-4 md:px-6">
        <Surface className="p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Briefcase className="h-4 w-4 text-ink-2" aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Jobs
            </h2>
          </div>
          {jobs.error && (
            <div className="mb-4 rounded-lg border border-phase-fault/30 bg-phase-fault/[0.06] px-4 py-2.5 font-mono text-xs text-phase-fault">
              Live data is unavailable right now ({jobs.error}). The list below may be out of date.
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
                  No jobs yet.{' '}
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

      {/* ── Proof: the first job that ran from posting to payment ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-4 md:px-6">
        <Surface className="p-6">
          <div className="mb-2 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-phase-settled" aria-hidden="true" />
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              First paid job: PILOT-001 ({pilot001.date})
            </h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-ink-1">
            The first job on this marketplace that ran from posting to payment on Supra Mainnet:{' '}
            {pilot001.price} {pilot001.asset} from the buyer to {pilot001.solverName}. Every step
            is a public transaction you can open:
          </p>
          <div className="space-y-2">
            {pilot001.legs.map((leg, i) => {
              const actor = ACTOR[leg.actor] ?? ACTOR.buyer;
              return (
                <div
                  key={leg.tx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-subtle bg-surface-inset px-4 py-2.5"
                >
                  <span className="flex items-center gap-2.5 text-sm text-ink-1" title={leg.step}>
                    <span className="font-mono text-xs tabular text-ink-2">{i + 1}</span>
                    {LEG_PLAIN[i] ?? leg.step}
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
              The delivered result
            </a>
            <a
              href={pilot001.public_evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-phase-proof transition-colors hover:text-ink-0"
            >
              <ShieldCheck className="h-3 w-3" />
              Evidence files
            </a>
          </div>
          <TechDetails className="mt-5">
            <p className="break-all font-mono text-[11px]">
              On-chain job #{pilot001.jobIdOnchain}. result_hash {pilot001.result_hash} = SHA3-256
              of the delivered document.
            </p>
            <ol className="mt-3 space-y-1 font-mono text-[11px]">
              {pilot001.legs.map((leg, i) => (
                <li key={leg.tx}>
                  {i + 1}. {leg.step}
                </li>
              ))}
            </ol>
          </TechDetails>
        </Surface>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6">
        <HonestyBox />
      </section>
    </div>
  );
}
