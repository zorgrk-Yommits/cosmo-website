'use client';

import { ArrowRight, KeyRound, Landmark, ScrollText, ShieldCheck } from 'lucide-react';
import Chip from '@/components/cosmo/Chip';
import { CtaLink } from '@/components/cosmo/Cta';
import Reveal from '@/components/cosmo/Reveal';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';

// Content source: docs/POSITIONING.md v6.0 — wording stays within the approved
// claims. The EVM-MICRO-001 numbers are on-chain facts (both transactions are
// publicly visible on Ethereum); the case bundles themselves are NOT published,
// so nothing here claims "published evidence" for them.

const GAPS = [
  {
    title: 'An unrestricted private key',
    body: 'Whoever holds the key can do everything the key can do. Possession is not a mandate.',
  },
  {
    title: 'Signing every transaction by hand',
    body: 'Manual co-signing does not scale to liquidity work and re-centralizes exactly what was delegated.',
  },
  {
    title: 'Trusting the operator’s own reports',
    body: 'Reporting is produced by the party being measured. It is an account, not a proof.',
  },
  {
    title: 'Learning about breaches after the loss',
    body: 'Limits that are only checked in hindsight are not limits. They are forensics.',
  },
  {
    title: 'Reassembling the story from three systems',
    body: 'Authorization, execution and settlement live in different tools — and disagree exactly when it matters.',
  },
];

const MANDATE_BINDS = [
  'The capital owner and the operator — market maker or liquidity agent',
  'Permitted markets and venues, pinned by address and runtime code hash',
  'Amount, position and inventory limits',
  'Slippage and gas bounds',
  'Duration and number of actions',
  'Retry and stop rules',
  'One-shot or time-bounded authorization',
  'The actual execution and its settlement',
  'An independently checkable receipt',
];

const LIFECYCLE = [
  {
    step: '01',
    name: 'Mandate',
    body: 'The capital owner’s terms become one signed, one-shot mandate: venue, amount, limits, expiry. No mandate, no action.',
  },
  {
    step: '02',
    name: 'Policy',
    body: 'Rules are hash-pinned before anything runs. Default-REJECT: a venue drift, a moved code hash or a breached cap ends the case, fail-closed.',
  },
  {
    step: '03',
    name: 'Ceremony',
    body: 'The engine stops at AWAITING_ARM. A human arms the irreversible step — case-bound, fresh, exactly once. Autonomy ends where capital moves.',
  },
  {
    step: '04',
    name: 'Execution',
    body: 'Fresh quote, simulation and gas check against the mandated bounds — then exactly one submit. No automatic retry.',
  },
  {
    step: '05',
    name: 'Settlement',
    body: 'The case watches the chain until the transaction is canonical with the mandated confirmations, and validates what settled against what was signed.',
  },
  {
    step: '06',
    name: 'Receipt & verification',
    body: 'A signed receipt closes the case over hash-chained evidence. An independent standalone verifier re-checks the whole case from the files alone.',
  },
];

const TRADES = [
  {
    label: 'Trade 1',
    tx: '0xdeed939cc5c25da5fc1cca8d9bc23771b1aa3e541f0bd78fc7b19c26edf7655e',
    block: '25,796,272',
    out: '1,155.33 SUPRA',
  },
  {
    label: 'Trade 2',
    tx: '0x64a4e4e6c616b0f619620d4aef73f13e59f92500b81f9227e25ae7b4fc078203',
    block: '25,796,695',
    out: '1,154.71 SUPRA',
  },
];

const PILOT = [
  'One capital owner',
  'One market maker or agent',
  'One trading pair',
  'One approved venue',
  'One bounded capital mandate',
  'One concrete liquidity or rebalancing action',
  'One independently checkable closing record',
];

const NOT_LIST = [
  'Not the market maker, and not a trading strategy',
  'Not a DEX, and not a custodian',
  'Not merely an agent wallet',
  'Not a profitability promise',
  'Not a general trading bot',
  'No guaranteed capital safety, no regulatory or legal compliance claim',
  'No best-execution claim while no reference-market comparison data exists',
  'Not production-ready market making — the proof below is a bounded pilot',
];

export default function Mandates() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-6 md:py-24">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="active">Controlled Liquidity Pilot</Chip>
            <Chip tone="neutral">For market makers &amp; liquidity managers</Chip>
          </div>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-ink-0 md:text-5xl">
            Verifiable Liquidity Mandates
          </h1>
          <p className="mt-5 font-mono text-lg tracking-tight text-ink-0/90">
            Delegate liquidity operations without delegating blind trust.
          </p>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
            Capital owners define the markets, limits and authority. Agents execute.
            COSMO proves every action. Built for capital entrusted by protocols,
            foundations, DAOs, treasuries and investors — where a wallet key with
            blanket authority was never an acceptable answer.
          </p>
        </section>

        {/* ── The delegation gap ──────────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16">
          <SectionHeader
            kicker="The problem"
            title="Delegation today means handing over too much."
            lead="A capital owner who wants liquidity work done has had five bad options. A mandate replaces all five."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {GAPS.map((g, i) => (
              <Reveal key={g.title} delay={i * 0.05}>
                <Surface className="h-full p-6">
                  <KeyRound className="h-4 w-4 text-ink-2" aria-hidden="true" />
                  <h3 className="mt-3 font-mono text-sm uppercase tracking-[0.14em] text-ink-0">
                    {g.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-1">{g.body}</p>
                </Surface>
              </Reveal>
            ))}
            <Reveal delay={0.25}>
              <Surface className="flex h-full flex-col justify-center border-phase-settled/30 bg-phase-settled/[0.04] p-6">
                <p className="font-mono text-sm leading-relaxed text-ink-0">
                  Delegation without blanket authority.
                  <br />
                  Autonomy without free disposal.
                  <br />
                  Proof instead of reporting.
                </p>
              </Surface>
            </Reveal>
          </div>
        </section>

        {/* ── What one mandate binds ──────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16">
          <SectionHeader
            kicker="The instrument"
            title="One mandate binds the whole engagement."
            lead="Not a policy PDF and a spreadsheet — one signed object the execution engine enforces and a verifier can re-check."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MANDATE_BINDS.map((item, i) => (
              <Reveal key={item} delay={i * 0.04}>
                <div className="flex items-start gap-3 rounded-xl border border-line-subtle bg-white/[0.02] p-4">
                  <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-ink-1">{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Lifecycle ───────────────────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16">
          <SectionHeader
            kicker="How a mandate runs"
            title="Six stages, fail-closed at every one."
            lead="Other systems can limit what an agent may spend. A mandate additionally proves what applied, what ran, and what settled."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {LIFECYCLE.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.05}>
                <Surface className="h-full p-6">
                  <span className="font-mono text-[11px] tracking-[0.22em] text-ink-2">{s.step}</span>
                  <h3 className="mt-2 font-mono text-base font-semibold text-ink-0">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-1">{s.body}</p>
                </Surface>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Proof ───────────────────────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16">
          <SectionHeader
            kicker="Proof, not projection"
            title="A real mandate has already run on Ethereum mainnet."
            lead="EVM-MICRO-001: real capital, a hard-pinned pool and router, bounded amount, slippage and gas caps, a human-armed irreversible step, exactly one submit — and settlement both an internal and an independent standalone verifier ACCEPT."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {TRADES.map((t, i) => (
              <Reveal key={t.tx} delay={i * 0.06}>
                <Surface className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-2">
                      {t.label} · 0.0001 ETH → SUPRA
                    </span>
                    <Chip tone="settled" size="sm">
                      EXECUTED
                    </Chip>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-2">Block</dt>
                      <dd className="font-mono text-ink-1">{t.block}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-2">Received</dt>
                      <dd className="font-mono text-ink-1">{t.out}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-2">Submit attempts</dt>
                      <dd className="font-mono text-ink-1">1 — no automatic retry</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-2">Verification</dt>
                      <dd className="font-mono text-ink-1">internal + standalone ACCEPT</dd>
                    </div>
                  </dl>
                  <a
                    href={`https://etherscan.io/tx/${t.tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-phase-active transition-colors hover:text-ink-0"
                  >
                    Open the transaction on Etherscan
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Surface>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.14}>
            <div className="mt-6 rounded-xl border border-line-subtle bg-white/[0.02] p-5">
              <p className="text-sm leading-relaxed text-ink-2">
                Honest scope: this proves the mandate mechanics end-to-end on a bounded pilot.
                It is not a production-ready market-making system and not a best-execution
                product — no reference-market comparison data exists yet. Further live
                execution requires a new explicit operator decision.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── Pilot offer ─────────────────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16">
          <SectionHeader
            kicker="The offer"
            title="COSMO Controlled Liquidity Pilot"
            lead="Deliberately small, deliberately concrete: run one bounded liquidity mandate with real capital and independently verify the result."
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PILOT.map((item, i) => (
              <Reveal key={item} delay={i * 0.04}>
                <div className="flex items-start gap-3 rounded-xl border border-line-subtle bg-white/[0.02] p-4">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-ink-1">{item}</span>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <div className="flex h-full items-center justify-center rounded-xl border border-phase-active/30 bg-phase-active/[0.06] p-4">
                <span className="text-center font-mono text-sm text-phase-active">
                  1 mandate. 1 action. 1 proof.
                </span>
              </div>
            </Reveal>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href="/institutional/" variant="primary" size="lg">
              The framework behind it
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
            <CtaLink href="/assurance/" variant="secondary" size="lg">
              COSMO Trust
            </CtaLink>
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-2">
            The pilot is curated: one engagement at a time, scoped together with the capital
            owner before any mandate is signed.
          </p>
        </section>

        {/* ── What COSMO is not ───────────────────────────────────────── */}
        <section className="mt-20 border-t border-line-subtle pt-16 pb-8">
          <SectionHeader
            kicker="Honest limits"
            title="What COSMO is not."
            lead="A mandate layer earns trust by stating its edges as plainly as its claims."
          />
          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {NOT_LIST.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-line-subtle bg-white/[0.02] p-4"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-ink-1">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
