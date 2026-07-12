'use client';

// One card per on-chain request: phase badge + mini lifecycle rail + facts.
// All values live from views; explorer links target ADDRESS pages (views
// expose no tx hashes — see honesty box / proof block on the page).

import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_ADDR, fmtAmt, sameAddr, shortAddr } from '@/lib/mainnetOnchain';
import {
  buildRailNodes,
  deriveDisplayPhase,
  K1_ADDR,
  K1_AUTONOMOUS_SINCE_SECS,
  type DisplayPhase,
  type RfqRequest,
} from '../lib/rfqActivity';
import PhaseRail from './PhaseRail';

const PHASE_BADGE: Record<DisplayPhase, { label: string; cls: string }> = {
  REQUESTED: { label: 'Requested — awaiting quote', cls: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  QUOTED: { label: 'Quoted', cls: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
  FUNDED: { label: 'Quote funded — awaiting accept', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  ACCEPTED_PENDING: { label: 'Accepted — settling', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  SETTLED: { label: 'Settled', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  RECLAIMED: { label: 'Expired — escrow reclaimed', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
  AWAITING_RECLAIM: { label: 'Expired — awaiting reclaim', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
  EXPIRED_UNSERVED: { label: 'Expired unserved', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-400' },
  CANCELLED: { label: 'Cancelled', cls: 'border-slate-500/40 bg-slate-500/10 text-slate-400' },
  VETOED: { label: 'Vetoed', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  FROZEN: { label: 'Frozen', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  UNWOUND: { label: 'Unwound', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  UNKNOWN: { label: 'Unknown state', cls: 'border-white/15 bg-black/20 text-slate-400' },
};

const ts = (secs: bigint) =>
  new Date(Number(secs) * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

function rel(secs: bigint, nowSec: number): string {
  const d = Number(secs) - nowSec;
  const abs = Math.abs(d);
  const fmt =
    abs < 90 ? `${abs}s` : abs < 5400 ? `${Math.round(abs / 60)}m` : abs < 129600 ? `${Math.round(abs / 3600)}h` : `${Math.round(abs / 86400)}d`;
  return d >= 0 ? `in ${fmt}` : `${fmt} ago`;
}

function AddrLink({ addr, tag }: { addr: string; tag?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <a
        href={`${EXPLORER_ADDR}${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-sky-400 hover:text-sky-300"
      >
        {shortAddr(addr)}
      </a>
      {tag && (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-purple-300">
          <Bot className="h-2.5 w-2.5" />
          {tag}
        </span>
      )}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs text-slate-300">{children}</dd>
    </div>
  );
}

export default function RequestCard({ req, nowSec }: { req: RfqRequest; nowSec: number }) {
  const phase = deriveDisplayPhase(req.status, req.expiresAt, nowSec, req.accepted);
  const badge = PHASE_BADGE[phase];
  const nodes = buildRailNodes(phase, req.status);
  const amountOut = req.accepted?.promisedAmountOut ?? req.quote?.amountOut ?? null;
  const maker = req.quote?.makerOperator ?? null;
  const live =
    phase === 'REQUESTED' || phase === 'QUOTED' || phase === 'FUNDED'
      ? { label: 'Request expires', at: req.expiresAt }
      : phase === 'ACCEPTED_PENDING' && req.accepted
        ? { label: 'Settlement deadline', at: req.accepted.settlementDeadlineSecs }
        : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold text-slate-100">REQ #{req.requestId.toString()}</span>
          <span className={cn('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider', badge.cls)}>
            {badge.label}
          </span>
        </div>
        <span className="font-mono text-xs text-slate-300">
          {fmtAmt(req.amountIn)} tINTEST →{' '}
          {amountOut !== null ? `${fmtAmt(amountOut)} wCOSMO` : `min ${fmtAmt(req.minAmountOut)} wCOSMO`}
        </span>
      </div>

      <div className="mt-4">
        <PhaseRail nodes={nodes} />
      </div>

      {live && Number(live.at) > nowSec && (
        <p className="mt-3 font-mono text-[11px] text-amber-300">
          {live.label} {rel(live.at, nowSec)}
        </p>
      )}

      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <Fact label="Requester">
          <AddrLink addr={req.requester} />
        </Fact>
        {maker && (
          <Fact label="Maker">
            {/* tag only quotes signed after the arming timestamp — earlier K1
                quotes were manually driven and must not be claimed as autonomous */}
            <AddrLink
              addr={maker}
              tag={
                sameAddr(maker, K1_ADDR) &&
                req.quote !== null &&
                req.quote.signedAtSecs >= K1_AUTONOMOUS_SINCE_SECS
                  ? 'autonomous maker'
                  : undefined
              }
            />
          </Fact>
        )}
        <Fact label="Created">
          {ts(req.createdAt)} <span className="text-slate-500">({rel(req.createdAt, nowSec)})</span>
        </Fact>
        {req.accepted ? (
          <>
            <Fact label="Accepted at">{ts(req.accepted.acceptedAt)}</Fact>
            <Fact label="Settlement deadline">{ts(req.accepted.settlementDeadlineSecs)}</Fact>
            <Fact label="Locked backers">{req.accepted.lockedBackersCount.toString()}</Fact>
          </>
        ) : (
          <Fact label="Expires">
            {ts(req.expiresAt)} <span className="text-slate-500">({rel(req.expiresAt, nowSec)})</span>
          </Fact>
        )}
      </dl>
    </div>
  );
}
