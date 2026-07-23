'use client';

// /market/work?id=<id> — the PROVIDER page (role split 2026-07-23: one page
// per role; buyers act on /market/job). Everything a provider does lives
// here: submit an offer while the job is open, register and deliver the
// result once the job is on-chain, get paid. The buyer's activity collapses
// into a single waiting node. Deliberately does NOT mount useMarketFlow —
// auto-arm and the buyer polls have no business on this page; the wallet is
// picked up passively, the server's next-steps document drives the rest.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Route, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketJob, useMarketProviders } from '../useMarketData';
import { STATUS_BADGE, buildProviderSteps } from '../lib/marketStatus';
import { useNextStepsDoc, usePassiveWallet } from '../lib/useNextStepsDoc';
import { connectWallet, markWalletSeen } from '../lib/marketWallet';
import FlowRail from '../components/FlowRail';
import OfferForm from '../components/OfferForm';
import DeliverPanel from '../components/DeliverPanel';
import TurnStatusLine from '../components/TurnStatusLine';
import { BlockerCards } from '../components/NextStepPanel';
import { FrozenSpecCard, JobFactsCard, TxRecord } from '../components/JobInfoSections';
import HonestyBox from '../components/HonestyBox';

export default function WorkDetail() {
  const params = useSearchParams();
  const id = params.get('id');
  const { section, refreshing, refresh } = useMarketJob(id);
  const { section: providersSection } = useMarketProviders();

  const job = section.data?.job ?? null;
  const providers = providersSection.data ?? [];

  const { wallet, setWallet } = usePassiveWallet();
  const { doc } = useNextStepsDoc(job?.id ?? null, wallet);
  const providerBlock = doc?.roles.find((r) => r.role === 'provider') ?? null;

  const [connectError, setConnectError] = useState<string | null>(null);
  const connect = async () => {
    setConnectError(null);
    try {
      const addr = await connectWallet();
      markWalletSeen();
      setWallet(addr);
    } catch (e) {
      setConnectError((e as Error).message ?? String(e));
    }
  };

  const [nowSec, setNowSec] = useState<number | null>(null);
  useEffect(() => {
    setNowSec(Math.floor(Date.now() / 1000));
    const tick = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(tick);
  }, []);

  const buyerUrl = id ? `/market/job/?id=${encodeURIComponent(id)}` : '/market/job/';
  const showDeliverPanel = !!job && job.jobIdOnchain != null && job.status !== 'settled';
  const showOfferForm = !!job && job.status === 'approved';

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

        {id && !!section.error && !job && (
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
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-purple-300">
                  Provider view
                </p>
                <h1 className="mt-1 font-mono text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
                  {job.title}
                </h1>
              </div>
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
              ownRole="provider"
              doc={doc}
              wallet={wallet}
              buyerWallet={job.buyerWallet ?? null}
              providers={providers}
              onConnect={() => void connect()}
            />
            {connectError && (
              <p className="mt-2 font-mono text-xs text-amber-300">{connectError}</p>
            )}

            {/* ── Provider next step ── */}
            {showOfferForm ? (
              <div className="mt-4 rounded-xl border border-purple-500/25 bg-purple-500/[0.04] p-6">
                <div className="mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-purple-300" />
                  <h2 className="font-mono text-sm font-bold text-slate-100">Your next step</h2>
                </div>
                <p className="mb-4 font-sans text-sm leading-relaxed text-slate-300">
                  This job is open for offers. Sign your offer terms with your provider wallet —
                  the buyer selects among the offers on their side.
                </p>
                {providerBlock && providerBlock.blockers.length > 0 && (
                  <div className="mb-4">
                    <BlockerCards blockers={providerBlock.blockers} />
                  </div>
                )}
                <OfferForm
                  jobId={job.id}
                  budgetAsset={job.budgetAsset}
                  providers={providers}
                  onSubmitted={() => void refresh()}
                />
              </div>
            ) : showDeliverPanel ? (
              <div className="mt-4">
                <DeliverPanel
                  job={job}
                  providers={providers}
                  block={providerBlock}
                  onChanged={() => void refresh()}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <p className="font-sans text-sm leading-relaxed text-slate-300">
                  {providerBlock?.headline ?? 'Nothing for providers to do on this job right now.'}
                </p>
                {providerBlock && providerBlock.blockers.length > 0 && (
                  <div className="mt-3">
                    <BlockerCards blockers={providerBlock.blockers} />
                  </div>
                )}
              </div>
            )}

            {/* ── Your steps (provider-only rail) ── */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-center gap-2">
                <Route className="h-4 w-4 text-purple-300" />
                <h2 className="font-mono text-sm font-bold text-slate-100">Your steps</h2>
              </div>
              <FlowRail steps={buildProviderSteps(job)} txRefs={job.txRefs} />
              <TxRecord txRefs={job.txRefs} />
            </div>

            <JobFactsCard job={job} nowSec={nowSec} />
            <FrozenSpecCard job={job} />

            {/* ── Machine-readable footer + cross-link ── */}
            <p className="mt-6 font-mono text-xs text-slate-500">
              Agents: this job is machine-readable at{' '}
              <a
                href={`/api/market/jobs/${encodeURIComponent(job.id)}/next-steps`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300"
              >
                /next-steps
              </a>{' '}
              — the same document that drives this page.
            </p>
            <p className="mt-2 font-mono text-xs text-slate-500">
              Are you the buyer? Selection, funding and approval live on the{' '}
              <Link href={buyerUrl} className="text-sky-400 hover:text-sky-300">
                buyer view →
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
