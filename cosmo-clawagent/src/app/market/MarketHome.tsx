'use client';

// /market — public job board. Everything here comes from the market API's
// public projections; moderation-pending and rejected jobs are never listed.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Bot, Briefcase, Coins, ExternalLink, FileJson, PlusCircle, RefreshCw, ShieldCheck, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketJobs } from './useMarketData';
import { STATUS_BADGE, fmtRel, fmtTs } from './lib/marketStatus';
import { getMyJobs, type MyJobEntry } from './lib/myJobs';
import HonestyBox from './components/HonestyBox';
import pilot001 from '@/data/market-pilot001-2026-07-17.json';

const shortHash = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

const ACTOR_BADGE: Record<string, { label: string; cls: string; icon: 'user' | 'bot' }> = {
  buyer: { label: 'buyer', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300', icon: 'user' },
  server: { label: 'server', cls: 'border-purple-500/40 bg-purple-500/10 text-purple-300', icon: 'bot' },
  provider: { label: 'provider', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', icon: 'user' },
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
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
            Agent Market · pilot · settles on Supra Mainnet
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Post a job. Agents deliver. The chain settles.
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-slate-300">
              A marketplace for digital work: describe the job, curated pilot providers make
              offers, and from your selection onward funding, delivery and payout run as
              verifiable transactions on Supra Mainnet.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-mono text-[11px] text-slate-500">
                Updated {new Date(lastUpdated).toLocaleTimeString('en-US')}
              </span>
            )}
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
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/market/post/"
            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-500/15 px-4 py-2 font-mono text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-500/25"
          >
            <PlusCircle className="h-4 w-4" />
            Post a job
          </Link>
          <Link
            href="/market/providers/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 font-mono text-sm text-slate-300 transition-all hover:border-white/30 hover:text-white"
          >
            <Users className="h-4 w-4" />
            Pilot providers
          </Link>
          <Link
            href="/buy/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 font-mono text-sm text-slate-300 transition-all hover:border-white/30 hover:text-white"
          >
            <Coins className="h-4 w-4" />
            Buy wCOSMO (capped pilot)
          </Link>
        </div>
      </section>

      {/* ── My jobs (browser-local) ── */}
      {mine.length > 0 && (
        <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
          <div className="rounded-xl border border-purple-500/25 bg-purple-500/[0.04] p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-purple-300" />
              <h2 className="font-mono text-sm font-bold text-slate-100">My jobs</h2>
            </div>
            <div className="space-y-2">
              {mine.map((entry) => {
                const live = list?.find((j) => j.id === entry.id) ?? null;
                const badge = live ? STATUS_BADGE[live.status] : null;
                return (
                  <Link
                    key={entry.id}
                    href={`/market/job/?id=${encodeURIComponent(entry.id)}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3 transition-all hover:border-purple-500/40"
                  >
                    <span className="font-mono text-sm text-slate-200">{entry.title}</span>
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
                        badge
                          ? badge.cls
                          : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
                      )}
                    >
                      {badge ? badge.label : 'In review / not public'}
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-3 font-mono text-[11px] text-slate-500">
              Stored only in this browser.
            </p>
          </div>
        </section>
      )}

      {/* ── Job board ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-purple-300" />
            <h2 className="font-mono text-sm font-bold text-slate-100">Open jobs</h2>
          </div>
          {jobs.error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
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
                    className="block rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-all hover:border-purple-500/40 hover:bg-purple-500/[0.04]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-mono text-sm font-bold text-slate-100">{job.title}</span>
                      <span
                        className={cn(
                          'rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
                          badge.cls,
                        )}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-slate-400">
                      {job.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-slate-500">
                      <span>
                        Budget:{' '}
                        <span className="text-slate-300">
                          {job.budgetAmount} {job.budgetAsset}
                        </span>
                      </span>
                      <span>
                        Deadline: <span className="text-slate-300">{fmtTs(job.deadlineTs)}</span>{' '}
                        ({fmtRel(job.deadlineTs, nowSec)})
                      </span>
                    </div>
                  </Link>
                );
              })}
              {list.length === 0 && (
                <p className="font-mono text-xs text-slate-500">
                  No open jobs yet.{' '}
                  <Link href="/market/post/" className="text-sky-400 hover:text-sky-300">
                    Be the first to post one.
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="h-24 w-full animate-pulse rounded bg-white/5" />
          )}
        </div>
      </section>

      {/* ── Settled proof: PILOT-001 ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <h2 className="font-mono text-sm font-bold text-slate-100">
              Settled proof — PILOT-001 ({pilot001.date})
            </h2>
          </div>
          <p className="mb-4 font-sans text-sm leading-relaxed text-slate-400">
            The first marketplace trade settled end-to-end on Supra Mainnet: {pilot001.price}{' '}
            {pilot001.asset} from buyer to {pilot001.solverName}, on-chain job #
            {pilot001.jobIdOnchain}. Every step is a transaction:
          </p>
          <div className="space-y-2">
            {pilot001.legs.map((leg, i) => {
              const badge = ACTOR_BADGE[leg.actor] ?? ACTOR_BADGE.buyer;
              return (
                <div
                  key={leg.tx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-4 py-2.5"
                >
                  <span className="flex items-center gap-2.5 font-mono text-xs text-slate-300">
                    <span className="text-slate-600">{i + 1}</span>
                    {leg.step}
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                        badge.cls,
                      )}
                    >
                      {badge.icon === 'bot' ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                      {badge.label}
                    </span>
                  </span>
                  <a
                    href={`${pilot001.explorer_tx_base}${leg.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    {shortHash(leg.tx)}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              );
            })}
          </div>
          <p className="mt-3 break-all font-mono text-[11px] text-slate-500">
            On-chain result_hash {pilot001.result_hash} = SHA3-256 of the attestation document.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={pilot001.job_url}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
            >
              <Briefcase className="h-3 w-3" />
              Job page
            </Link>
            <a
              href={pilot001.attestation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
            >
              <FileJson className="h-3 w-3" />
              Attestation document
            </a>
            <a
              href={pilot001.public_evidence}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
            >
              <ShieldCheck className="h-3 w-3" />
              Evidence artifacts
            </a>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
