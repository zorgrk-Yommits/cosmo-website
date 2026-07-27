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
  REQUESTED: { label: 'Requested — awaiting quote', cls: 'border-phase-active/40 bg-phase-active/10 text-phase-active' },
  QUOTED: { label: 'Quoted', cls: 'border-phase-active/40 bg-phase-active/10 text-phase-active' },
  FUNDED: { label: 'Quote funded — awaiting accept', cls: 'border-phase-proof/40 bg-phase-proof/10 text-phase-proof' },
  ACCEPTED_PENDING: { label: 'Accepted — settling', cls: 'border-phase-warn/40 bg-phase-warn/10 text-phase-warn' },
  SETTLED: { label: 'Settled', cls: 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled' },
  RECLAIMED: { label: 'Expired — escrow reclaimed', cls: 'border-line-base bg-white/[0.02] text-ink-1' },
  AWAITING_RECLAIM: { label: 'Expired — awaiting reclaim', cls: 'border-line-base bg-white/[0.02] text-ink-1' },
  EXPIRED_UNSERVED: { label: 'Expired unserved', cls: 'border-line-base bg-white/[0.02] text-ink-1' },
  CANCELLED: { label: 'Cancelled', cls: 'border-line-base bg-white/[0.02] text-ink-1' },
  VETOED: { label: 'Vetoed', cls: 'border-phase-fault/40 bg-phase-fault/10 text-phase-fault' },
  FROZEN: { label: 'Frozen', cls: 'border-phase-fault/40 bg-phase-fault/10 text-phase-fault' },
  UNWOUND: { label: 'Unwound', cls: 'border-phase-fault/40 bg-phase-fault/10 text-phase-fault' },
  UNKNOWN: { label: 'Unknown state', cls: 'border-line-base bg-surface-inset text-ink-1' },
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
        className="font-mono text-xs text-phase-proof hover:text-phase-proof"
      >
        {shortAddr(addr)}
      </a>
      {tag && (
        <span className="inline-flex items-center gap-1 rounded-full border border-phase-active/40 bg-phase-active/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-phase-active">
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
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-2">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs text-ink-1">{children}</dd>
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
    <div className="rounded-xl border border-line-base bg-surface-1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold text-ink-0">REQ #{req.requestId.toString()}</span>
          <span className={cn('rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider', badge.cls)}>
            {badge.label}
          </span>
        </div>
        <span className="font-mono text-xs text-ink-1">
          {fmtAmt(req.amountIn)} tINTEST →{' '}
          {amountOut !== null ? `${fmtAmt(amountOut)} wCOSMO` : `min ${fmtAmt(req.minAmountOut)} wCOSMO`}
        </span>
      </div>

      <div className="mt-4">
        <PhaseRail nodes={nodes} />
      </div>

      {live && Number(live.at) > nowSec && (
        <p className="mt-3 font-mono text-[11px] text-phase-warn">
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
          {ts(req.createdAt)} <span className="text-ink-2">({rel(req.createdAt, nowSec)})</span>
        </Fact>
        {req.accepted ? (
          <>
            <Fact label="Accepted at">{ts(req.accepted.acceptedAt)}</Fact>
            <Fact label="Settlement deadline">{ts(req.accepted.settlementDeadlineSecs)}</Fact>
            <Fact label="Locked backers">{req.accepted.lockedBackersCount.toString()}</Fact>
          </>
        ) : (
          <Fact label="Expires">
            {ts(req.expiresAt)} <span className="text-ink-2">({rel(req.expiresAt, nowSec)})</span>
          </Fact>
        )}
      </dl>
    </div>
  );
}
