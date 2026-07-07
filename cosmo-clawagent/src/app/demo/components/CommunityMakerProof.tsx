// Community Maker Proof — static content section (Phase 6, M2 Slot-1).
//
// Pure content from the committed on-chain capture
// (docs/smoke/m2-slot1-roundtrip-2026-07-04.json, cosmo-contracts-move). No RPC,
// no wallet, no live data — export-compatible by construction. Wording stays
// inside the positioning guardrails: maker-execution primitive / agent-native
// RFQ settlement / bonded execution infrastructure; no third-party integration
// claims.

import { CheckCircle2, ShieldCheck, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

const EXPLORER_TX = 'https://suprascan.io/tx/';

// From the Phase-6 capture (2026-07-04, Supra Mainnet chain 8, reqId 3 / quoteId 2).
const LEGS = [
  { name: 'create_request', signer: 'Taker', hash: '0x5b5ba0c61974d6e3b98988a37f5495ac1d2842eab9a858a664a6de0d5d9b63b4' },
  { name: 'submit_quote', signer: 'M2 (community maker)', hash: '0xb99e323dc6b5d587af27d52739428a099d47c0164f16cdb2dd9328894863f74f' },
  { name: 'fund_quote', signer: 'M2 (community maker)', hash: '0x6913c411a6b27f56b893bc944b46f67cfa777ddda75efc80d4b87c16dabb93f5' },
  { name: 'accept_quote', signer: 'Taker', hash: '0x6e1d60ee4d7cbacd26fa79fcada597efed7e6d34b69509362bc5feb579da610e' },
  { name: 'execute_settlement', signer: 'M2 (community maker)', hash: '0x3243a581ecf96ae7129f82561cde2ac5e19c2606650675fd9133cd68711c69f7' },
] as const;

const PILLS = [
  'Mainnet',
  'Community Maker Slot 1',
  'Settled',
  'Bonds Intact',
  'Peg Intact',
  'Gate Enforced',
] as const;

const SLOTS = [
  {
    slot: 'Founder / K1',
    status: 'Proven',
    note: 'Separated-operator round-trip (D-14, 2026-06-24)',
    tone: 'ok' as const,
  },
  {
    slot: 'M2 Slot-1',
    status: 'Proven',
    note: 'Phase 6 settled 2026-07-04 — first community maker',
    tone: 'ok' as const,
  },
  {
    slot: 'Slot 2',
    status: 'Reserved',
    note: 'Phase 7 passed 2026-07-07 — opens against the first committed external operator',
    tone: 'pending' as const,
  },
];

function shortHash(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

export default function CommunityMakerProof() {
  return (
    <section className="mt-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-6 md:p-8">
      {/* header */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <h2 className="font-mono text-lg font-bold tracking-tight text-slate-100 md:text-2xl">
          Community Maker Proof — Live on Supra Mainnet
        </h2>
      </div>
      <p className="mt-3 max-w-3xl font-sans text-sm leading-relaxed text-slate-300 md:text-base">
        On 2026-07-04 the first community maker (M2, Slot 1) quoted, funded and settled a
        complete agent-native RFQ settlement on Supra Mainnet — running on COSMO&apos;s bonded
        execution infrastructure, inside the hard 60-second quote window. The
        maker-execution primitive now has its first non-founder proof.
      </p>

      {/* status pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {PILLS.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-200"
          >
            <ShieldCheck className="h-3 w-3" />
            {p}
          </span>
        ))}
      </div>

      {/* 5/5 lifecycle legs */}
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
            Lifecycle — 5/5 legs successful
          </h3>
          <span className="font-mono text-[11px] text-emerald-300">req #3 · quote #2 · settled</span>
        </div>
        <ol className="mt-3 space-y-2">
          {LEGS.map((leg, i) => (
            <li
              key={leg.name}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-300" />
              <span className="font-mono text-xs text-slate-200">
                {i + 1}. {leg.name}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                {leg.signer}
              </span>
              <a
                href={`${EXPLORER_TX}${leg.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto break-all font-mono text-[10px] text-sky-400 underline decoration-sky-400/30 hover:text-sky-300"
              >
                {shortHash(leg.hash)}
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-slate-500">
          Post-verify accounting exact: taker −1.0 tINTEST / +0.997 wCOSMO · M2 +1.0 tINTEST /
          −0.997 wCOSMO. Operator bonds untouched (200M total / 100M available to M2). Peg
          invariant holds. Quote-server gate enforced before signature.
        </p>
      </div>

      {/* maker slots table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-4">
        <h3 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
          Maker slots
        </h3>
        <table className="mt-3 w-full min-w-[480px] border-separate border-spacing-y-1.5 text-left">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-1 font-medium">Slot</th>
              <th className="px-3 py-1 font-medium">Status</th>
              <th className="px-3 py-1 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((s) => (
              <tr key={s.slot} className="rounded-lg bg-white/[0.02]">
                <td className="rounded-l-lg px-3 py-2 font-mono text-xs text-slate-200">{s.slot}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                      s.tone === 'ok'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
                    )}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="rounded-r-lg px-3 py-2 font-sans text-xs text-slate-400">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phase 7 observation card — completed 2026-07-07 */}
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-emerald-300" />
          <h3 className="font-mono text-sm font-semibold text-emerald-200">
            Phase 7 — observation window
          </h3>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Passed
          </span>
        </div>
        <ul className="mt-3 space-y-1.5 font-sans text-xs leading-relaxed text-slate-300">
          <li>Completed 2026-07-07 without incident — 72 hours of daily read-only checks on peg, bonds and gate logs.</li>
          <li>Decision taken (one variable at a time): an anti-spam request fee is now active on the RFQ engine.</li>
          <li>
            Slot 2 stays a prepared governance option — it opens against the first committed
            external operator, not on a timer.
          </li>
        </ul>
      </div>

      {/* honesty line */}
      <p className="mt-5 font-mono text-[11px] leading-relaxed text-slate-500">
        Static snapshot of on-chain results (chain 8; capture 2026-07-04). Controlled slot under
        bond caps and an off-chain quote gate — a maker-execution primitive, not a permissionless
        market.
      </p>
    </section>
  );
}
