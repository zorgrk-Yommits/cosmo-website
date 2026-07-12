'use client';

// /rfq — public, live view of the autonomous maker's ON-CHAIN footprint.
// Everything rendered here comes from public rfq_engine/maker_vault view
// functions; the operator's private infrastructure is never exposed. First
// page on this site with interval polling (20s, visibility-gated).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Lock, Radio, RefreshCw, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRfqActivity } from './useRfqActivity';
import { deriveDisplayPhase } from './lib/rfqActivity';
import MakerVitals from './components/MakerVitals';
import RequestCard from './components/RequestCard';
import FirstTradeProof from './components/FirstTradeProof';

function ErrorStrip({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
      Live data unavailable: {msg} — figures below may be stale.
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Activity;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-purple-300" />
          <h2 className="font-mono text-sm font-bold text-slate-100">{title}</h2>
        </div>
        {children}
      </div>
      {subtitle && (
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-slate-500">{subtitle}</p>
      )}
    </div>
  );
}

export default function RfqActivity() {
  const { vitals, feed, refreshing, lastUpdated, refresh } = useRfqActivity();

  // One shared 1s clock for countdowns and timeout derivation across all cards
  // (FounderCockpit precedent). Initialized in effect — no Date.now() in the
  // prerendered output.
  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const requests = feed.data?.requests ?? null;
  const openFunded =
    requests && nowSec !== null
      ? requests.filter(
          (r) => deriveDisplayPhase(r.status, r.expiresAt, nowSec, r.accepted) === 'FUNDED',
        ).length
      : null;

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
            RFQ · Supra Mainnet (chain 8) · live
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
              An autonomous maker is quoting this market.
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-slate-300">
              Everything below is read directly from public on-chain view functions —
              nothing comes from a private server.
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
        <p className="mt-2 font-mono text-[10px] text-slate-600">
          auto-refreshes every 20s while this tab is visible
        </p>
      </section>

      {/* ── Maker vitals ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={Radio}
            title="Maker vitals — on-chain facts"
            subtitle="Licensed agent, quoting eligibility, security deposit and inventory of the autonomous maker — each read live from view functions."
          />
          {vitals.error && (
            <div className="mb-4">
              <ErrorStrip msg={vitals.error} />
            </div>
          )}
          <MakerVitals vitals={vitals.data} openFunded={openFunded} />
        </div>
      </section>

      {/* ── Live activity feed ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={Activity}
            title="Requests on this market"
            subtitle="Newest first. Lifecycle per request: Request → Quoted → Funded → Accepted → Settled — with honest terminal states for expiry and reclaim."
          />
          {feed.error && (
            <div className="mb-4">
              <ErrorStrip msg={feed.error} />
            </div>
          )}
          {requests && nowSec !== null ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <RequestCard key={req.requestId.toString()} req={req} nowSec={nowSec} />
              ))}
              {requests.length === 0 && (
                <p className="font-mono text-xs text-slate-500">No requests yet.</p>
              )}
            </div>
          ) : (
            <div className="h-24 w-full animate-pulse rounded bg-white/5" />
          )}
        </div>
      </section>

      {/* ── Curated proof ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={ScrollText}
            title="The first autonomous trade — full evidence"
            subtitle="View functions expose no transaction hashes, so this block carries them as curated, independently verifiable evidence."
          />
          <FirstTradeProof />
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-300" />
            <h3 className="font-mono text-sm text-slate-100">What this page shows — and does not</h3>
          </div>
          <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-slate-400">
            <li>
              · The maker&apos;s operating thresholds (inventory floor, quote-rate limits) are
              operator policy, not on-chain rules — only derivable numbers are shown here.
            </li>
            <li>
              · View functions expose no settlement timestamps and no transaction hashes: live
              cards link to explorer address pages, and transaction-level evidence lives in the
              curated block above.
            </li>
            <li>
              · This is a deliberately guarded v1 on an isolated test pair (tINTEST → wCOSMO);
              amounts are small by design.
            </li>
            <li>
              · Timeout states (&quot;Expired unserved&quot;, &quot;Awaiting reclaim&quot;) are
              derived client-side from each request&apos;s expiry versus your clock — the chain
              itself never writes timeouts.
            </li>
          </ul>
          <p className="mt-3 font-sans text-sm text-slate-400">
            Custody and security deposits live on the{' '}
            <Link href="/vault/" className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300">
              vault dashboard
            </Link>
            ; how to participate is on{' '}
            <Link href="/community-rfq/" className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300">
              community
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
