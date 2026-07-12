'use client';

// Curated evidence block — the outreach centerpiece. Views cannot expose tx
// hashes, so this block carries them as curated data (extracted from the
// on-chain record of 2026-07-12) with explorer links per leg. Pattern kin of
// ComputeLanding's legs table and CommunityMakerProof.

import { Bot, User } from 'lucide-react';
import proof from '@/data/rfq-first-autonomous-trade.json';

type Leg = { name: string; signer: string; autonomous: boolean; hash: string | null; detail: string };

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

function LegRows({ legs }: { legs: Leg[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      {legs.map((leg, i) => (
        <div
          key={leg.name}
          className={`flex flex-col gap-2 px-5 py-3 md:flex-row md:items-center md:gap-4 ${i > 0 ? 'border-t border-white/5' : ''}`}
        >
          <span className="w-6 shrink-0 font-mono text-xs text-purple-400">{i + 1}</span>
          <span className="w-56 shrink-0 font-mono text-xs text-slate-200">
            <span className="mr-1.5 inline-flex align-middle">
              {leg.autonomous ? (
                <Bot className="h-3.5 w-3.5 text-purple-300" aria-label="autonomous maker leg" />
              ) : (
                <User className="h-3.5 w-3.5 text-slate-500" aria-label="human-signed leg" />
              )}
            </span>
            {leg.name}
          </span>
          <span className="flex-1 font-sans text-xs leading-relaxed text-slate-400">{leg.detail}</span>
          {leg.hash ? (
            <a
              href={`${proof.explorer_tx_base}${leg.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-mono text-[11px] text-purple-300 hover:text-purple-200"
            >
              {short(leg.hash)} ↗
            </a>
          ) : (
            <span className="shrink-0 font-mono text-[11px] text-slate-600">hash pending capture</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FirstTradeProof() {
  return (
    <div id="first-autonomous-trade">
      <p className="mb-4 font-sans text-sm leading-relaxed text-slate-400 max-w-3xl">
        On {proof.date_utc}, this market&apos;s maker priced, escrowed and settled a trade with no
        human in the loop. Every leg marked <Bot className="inline h-3.5 w-3.5 text-purple-300" />{' '}
        below was decided and signed by the autonomous maker; the{' '}
        <User className="inline h-3.5 w-3.5 text-slate-500" /> legs are the human counterparty.
        All on {proof.network}, all independently verifiable.
      </p>
      <h3 className="mb-2 font-mono text-sm text-slate-200">
        Trade — REQ #{proof.settle.request_id}: {proof.settle.amount_in} → {proof.settle.amount_out}
      </h3>
      <LegRows legs={proof.settle.legs as Leg[]} />
      <h3 className="mb-2 mt-6 font-mono text-sm text-slate-200">
        Discipline check — REQ #{proof.reclaim.request_id}: quote expired unaccepted
      </h3>
      <LegRows legs={proof.reclaim.legs as Leg[]} />
    </div>
  );
}
