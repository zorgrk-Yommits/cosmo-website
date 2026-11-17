'use client';

// Row 6 of /portfolio: jobs of this address. Two sources, both read-only:
// (a) records on chain that hold or return tokens (already classified for rows 3
//     and 4; listed here again by record), and
// (b) marketplace jobs whose recorded buyer is this address, plus jobs this
//     browser remembers posting. The marketplace list is a GET; nothing is sent.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchJobs, type MarketJob } from '@/app/market/lib/marketApi';
import { STATUS_BADGE } from '@/app/market/lib/marketStatus';
import { getMyJobs } from '@/app/market/lib/myJobs';
import { cn } from '@/lib/utils';
import { fmtTokenAmt, type Position } from '../lib/positions';
import { jobHref, selectJobs, type WalletJobs } from '../lib/walletLinks';
import { Empty, Row } from './parts';

type Load = { state: 'loading' } | { state: 'ok'; jobs: WalletJobs } | { state: 'error' };

const WHERE: Record<string, string> = {
  escrow: 'locked',
  claimable: 'ready to take back',
};

export default function Orders({ addr, positions }: { addr: string; positions: Position[] }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    fetchJobs()
      .then((jobs: MarketJob[]) => live && setLoad({ state: 'ok', jobs: selectJobs(jobs, addr, getMyJobs()) }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [addr]);

  const onChain = positions.filter((p) => p.id !== null && (p.bucket === 'escrow' || p.bucket === 'claimable'));

  return (
    <Row n="6" title="Jobs and offers of this address" tone="neutral">
      <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-2">On chain, holding tokens right now</h3>
      {onChain.length === 0 ? (
        <Empty>No open record holds tokens of this address in the records that were checked.</Empty>
      ) : (
        onChain.map((p, i) => (
          <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-line-subtle bg-surface-inset/60 px-3 py-2 font-mono text-sm">
            <span className="text-ink-1">
              {p.ref} <span className="text-ink-2">· as {p.role} · {WHERE[p.bucket] ?? p.bucket}</span>
            </span>
            <span className="text-ink-0">{fmtTokenAmt(p.amount, p.token)}</span>
          </div>
        ))
      )}

      <h3 className="pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-2">On the marketplace</h3>
      {load.state === 'loading' && <Empty>Reading the marketplace …</Empty>}
      {load.state === 'error' && (
        <p className="font-sans text-sm text-phase-warn">
          The marketplace could not be read. Jobs are shown as unavailable, not as none.
        </p>
      )}
      {load.state === 'ok' && load.jobs.ofAddress.length === 0 && (
        <Empty>The marketplace lists no job with this address as the buyer.</Empty>
      )}
      {load.state === 'ok' &&
        load.jobs.ofAddress.map((j) => (
          <Link
            key={j.id}
            href={jobHref(j.id)}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line-subtle bg-surface-inset/60 px-3 py-2 transition-colors hover:border-line-strong"
          >
            <span className="min-w-0 truncate font-sans text-sm text-ink-0">{j.title}</span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-xs text-ink-1">
                {j.budgetAmount} {j.budgetAsset}
              </span>
              <span className={cn('rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider', STATUS_BADGE[j.status]?.cls)}>
                {STATUS_BADGE[j.status]?.label ?? j.status}
              </span>
            </span>
          </Link>
        ))}

      {load.state === 'ok' && load.jobs.fromThisBrowser.length > 0 && (
        <>
          <h3 className="pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-2">Posted from this browser</h3>
          {load.jobs.fromThisBrowser.map((e) => (
            <Link
              key={e.id}
              href={jobHref(e.id)}
              className="flex items-center justify-between gap-2 rounded-lg border border-line-subtle bg-surface-inset/60 px-3 py-2 transition-colors hover:border-line-strong"
            >
              <span className="min-w-0 truncate font-sans text-sm text-ink-0">{e.title}</span>
              <span className="font-mono text-[11px] text-ink-2">open job page</span>
            </Link>
          ))}
          <p className="font-sans text-xs text-ink-2">
            These are remembered by this browser, not tied to the address above: a job gets a buyer address only when an offer is chosen.
          </p>
        </>
      )}

      <p className="mt-2 font-sans text-xs text-ink-2">
        This list is for looking. Everything you can do with a job happens on its own page. Jobs you work on as a provider are not listed.
      </p>
    </Row>
  );
}
