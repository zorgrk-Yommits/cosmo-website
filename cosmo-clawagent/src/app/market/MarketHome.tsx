'use client';

// /market — public job board. Everything here comes from the market API's
// public projections; moderation-pending and rejected jobs are never listed.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, PlusCircle, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketJobs } from './useMarketData';
import { STATUS_BADGE, fmtRel, fmtTs } from './lib/marketStatus';
import HonestyBox from './components/HonestyBox';

export default function MarketHome() {
  const { section: jobs, refreshing, lastUpdated, refresh } = useMarketJobs();

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

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
              offers, and from your selection onward escrow, delivery and payout run as
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
        </div>
      </section>

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

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
