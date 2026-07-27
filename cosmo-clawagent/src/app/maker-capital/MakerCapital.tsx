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
import ProtocolNotice from '@/components/ProtocolNotice';

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
  'Maker slot governance remains separate',
  'Remaining gates and legal review come first',
] as const;

export default function MakerCapital() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:py-24">
          <ProtocolNotice />
          {/* header */}
          <header className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-phase-proof shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Future research direction
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-phase-proof/40 bg-phase-proof/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-phase-proof">
                <FlaskConical className="h-3 w-3" />
                Research Draft — Not Live
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-ink-0 md:text-5xl">
              Community Maker Capital
            </h1>
            <div className="mt-5 space-y-3 font-sans text-base leading-relaxed text-ink-1 md:text-lg">
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
            <div className="rounded-xl border border-phase-settled/30 bg-phase-settled/[0.05] p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-phase-settled" />
                <h2 className="font-mono text-sm font-semibold text-ink-0">Maker Vault</h2>
                <span className="ml-auto rounded-full border border-phase-settled/40 bg-phase-settled/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-phase-settled">
                  Live today
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
                Security collateral. Bonded $COSMO that makes maker behavior accountable and
                slashable. Proven on Supra Mainnet through the community-maker settlement.
              </p>
            </div>
            <div className="rounded-xl border border-phase-proof/30 bg-phase-proof/[0.05] p-5">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-phase-proof" />
                <h2 className="font-mono text-sm font-semibold text-ink-0">
                  Community Maker Capital
                </h2>
                <span className="ml-auto rounded-full border border-phase-proof/40 bg-phase-proof/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-phase-proof">
                  Research
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
                Possible future maker inventory. Community-provided capital operating under
                transparent, restrictive rules — strictly separated from the security bond.
              </p>
            </div>
          </section>

          {/* risk split */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Risk split
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {RISK_SPLIT.map((r) => (
                <div
                  key={r.who}
                  className="rounded-lg border border-line-subtle bg-surface-inset px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-sm text-ink-0">{r.who}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-phase-proof">
                      {r.takes}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-xs leading-relaxed text-ink-1">{r.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* why this matters */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
              Why this matters
            </h2>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              The next wave of DeFi market making may be agent-managed and vault-based. Before
              community capital can safely participate, the system needs clear risk separation:
            </p>
            <ul className="mt-3 space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>· capital providers supply inventory</li>
              <li>· operators provide slashable accountability</li>
              <li>· policy envelopes constrain what agents are allowed to do</li>
              <li>· settlement proves the outcome on-chain</li>
            </ul>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              Community Maker Capital is COSMO&apos;s research direction for that future.
            </p>
          </section>

          {/* policy envelope */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Policy-envelope concept
              </h2>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              A future version could restrict maker activity through:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ENVELOPE.map((e) => (
                <span
                  key={e}
                  className="rounded-full border border-line-base bg-surface-2 px-3 py-1 font-mono text-[11px] text-ink-1"
                >
                  {e}
                </span>
              ))}
            </div>
          </section>

          {/* design questions */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Important design questions
              </h2>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {QUESTIONS.map((q) => (
                <li
                  key={q}
                  className="rounded-lg border border-line-subtle bg-surface-inset px-3 py-2 font-sans text-xs leading-relaxed text-ink-1"
                >
                  {q}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] leading-relaxed text-ink-2">
              These questions are structured as decision points in an ADR draft
              (adr-community-maker-capital-DRAFT-2026-07-04). None of them are decided.
            </p>
          </section>

          {/* hard disclaimers */}
          <aside className="mt-8 rounded-xl border border-phase-warn/30 bg-phase-warn/[0.06] p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-phase-warn" />
              <h2 className="font-mono text-sm font-semibold text-phase-warn">Hard boundaries</h2>
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 font-mono text-[12px] text-ink-1 sm:grid-cols-2">
              {DISCLAIMERS.map((d) => (
                <li key={d}>· {d}</li>
              ))}
            </ul>
          </aside>

          {/* footer honesty line */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-ink-2">
            Static research content. No wallet actions, no deposits, no on-chain interaction on
            this page. The live system today is the bonded security vault and the settled
            community-maker proof — nothing on this page changes that.
          </p>
        </div>
      </div>
    </div>
  );
}
