// Community Maker Capital — static research-draft page.
//
// Pure content, no hooks, no wallet, no RPC, no backend: export-compatible by
// construction. Presents the ADR draft direction (docs/decisions/
// adr-community-maker-capital-DRAFT-2026-07-04.md, cosmo-contracts-move) as
// future research — explicitly NOT a live product, deposit product or launch
// announcement. Wording stays inside the positioning guardrails: no
// third-party integration claims.

import {
  FlaskConical,
  ShieldCheck,
  Scale,
  SlidersHorizontal,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';

const RISK_SPLIT = [
  {
    who: 'LPs / capital providers',
    takes: 'Market and inventory risk',
    note: 'Capital would act as maker inventory — its value moves with the market.',
  },
  {
    who: 'Operators',
    takes: 'Behavioral and slash risk',
    note: 'Accountability stays with the operator through their own bond. Slash risk is never socialized to capital providers.',
  },
  {
    who: 'Council',
    takes: 'Policy envelopes',
    note: 'Sets and adjusts the rules makers operate under. Does not approve trades one by one.',
  },
] as const;

const ENVELOPE = [
  'Pair allowlist',
  'Notional caps',
  'Oracle price bands',
  'Max inventory imbalance',
  'Kill switch',
] as const;

const QUESTIONS = [
  'How are profits and losses reflected?',
  'How do deposits and withdrawals work?',
  'How is NAV calculated during active settlements?',
  'How should operator compensation work?',
  'One shared pool or multiple pair-specific pools?',
  'What happens if an operator fails or goes offline?',
] as const;

const DISCLAIMERS = [
  'Not live',
  'No deposits',
  'No yield product',
  'No launch decision',
  'No investment offer',
  'Phase 7 observation remains separate',
  'Remaining gates and legal review come first',
] as const;

export default function MakerCapital() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:py-24">
          {/* header */}
          <header className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Future research direction
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-sky-300">
                <FlaskConical className="h-3 w-3" />
                Research Draft — Not Live
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Community Maker Capital
            </h1>
            <div className="mt-5 space-y-3 font-sans text-base leading-relaxed text-slate-300 md:text-lg">
              <p>The current Maker Vault is a security vault.</p>
              <p>
                Bonded $COSMO provides accountability, aligned incentives, and slashable collateral
                for maker behavior. It is not trading capital.
              </p>
              <p>
                Community Maker Capital is a future research direction: a possible second layer
                where community-provided capital could act as maker inventory inside the COSMO
                settlement system.
              </p>
            </div>
          </header>

          {/* core distinction */}
          <section className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                <h2 className="font-mono text-sm font-semibold text-slate-100">Maker Vault</h2>
                <span className="ml-auto rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                  Live today
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
                Security collateral. Bonded $COSMO that makes maker behavior accountable and
                slashable. Proven on Supra Mainnet through the community-maker settlement.
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.05] p-5">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-sky-300" />
                <h2 className="font-mono text-sm font-semibold text-slate-100">
                  Community Maker Capital
                </h2>
                <span className="ml-auto rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-300">
                  Research
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
                Possible future maker inventory. Community-provided capital operating under
                transparent, restrictive rules — strictly separated from the security bond.
              </p>
            </div>
          </section>

          {/* risk split */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-slate-400" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Risk split
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {RISK_SPLIT.map((r) => (
                <div
                  key={r.who}
                  className="rounded-lg border border-white/5 bg-black/20 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm text-slate-100">{r.who}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                      {r.takes}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-slate-400">{r.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* why this matters */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              Why this matters
            </h2>
            <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
              The next wave of DeFi market making may be agent-managed and vault-based. Before
              community capital can safely participate, the system needs clear risk separation:
            </p>
            <ul className="mt-3 space-y-1.5 font-sans text-sm leading-relaxed text-slate-300">
              <li>· capital providers supply inventory</li>
              <li>· operators provide slashable accountability</li>
              <li>· policy envelopes constrain what agents are allowed to do</li>
              <li>· settlement proves the outcome on-chain</li>
            </ul>
            <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
              Community Maker Capital is COSMO&apos;s research direction for that future.
            </p>
          </section>

          {/* policy envelope */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Policy-envelope concept
              </h2>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
              A future version could restrict maker activity through:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ENVELOPE.map((e) => (
                <span
                  key={e}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-slate-300"
                >
                  {e}
                </span>
              ))}
            </div>
          </section>

          {/* design questions */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Important design questions
              </h2>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 font-sans text-xs leading-relaxed text-slate-300"
                >
                  {q}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-slate-500">
              These questions are structured as decision points in an ADR draft
              (adr-community-maker-capital-DRAFT-2026-07-04). None of them are decided.
            </p>
          </section>

          {/* hard disclaimers */}
          <aside className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <h2 className="font-mono text-sm font-semibold text-amber-200">Hard boundaries</h2>
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 font-mono text-[12px] text-slate-300 sm:grid-cols-2">
              {DISCLAIMERS.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </aside>

          {/* footer honesty line */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-slate-600">
            Static research content. No wallet actions, no deposits, no on-chain interaction on
            this page. The live system today is the bonded security vault and the settled
            community-maker proof — nothing on this page changes that.
          </p>
        </div>
      </div>
    </div>
  );
}
