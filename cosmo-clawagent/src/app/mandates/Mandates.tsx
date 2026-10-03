'use client';

import { ArrowRight, Bot, FileCheck2, KeyRound, Landmark, ScrollText, ShieldCheck, Wallet } from 'lucide-react';
import Chip from '@/components/cosmo/Chip';
import { CtaLink } from '@/components/cosmo/Cta';
import MaturityBadge from '@/components/cosmo/MaturityBadge';
import PageIntro from '@/components/cosmo/PageIntro';
import Reveal from '@/components/cosmo/Reveal';
import RulesDiagram from '@/components/cosmo/RulesDiagram';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import TechDetails from '@/components/cosmo/TechDetails';

// Liquidity under rules (positioning v6.1, second story). The allowed actions
// and the limits are shown before the technical word appears; the product
// name and the canonical vocabulary live in the technical details.
//
// Claims stay inside docs/POSITIONING.md. The EVM-MICRO-001 numbers are
// on-chain facts (both transactions are public on Ethereum); its case bundles
// are NOT published, so nothing here claims published evidence for them. The
// VLM-001 rows are taken from public/mandates/vlm-001/index.html.

const GAPS = [
  {
    title: 'Hand over the key',
    body: 'Whoever holds the key can do everything the key can do. Holding a key says nothing about what you are allowed to do.',
  },
  {
    title: 'Sign every step by hand',
    body: 'That does not keep up with liquidity work, and it puts the owner back in the middle of everything.',
  },
  {
    title: 'Trust the reports',
    body: 'Reports are written by the party being measured. They are an account, not a proof.',
  },
  {
    title: 'Find out after the loss',
    body: 'A limit that is only checked afterwards is not a limit.',
  },
  {
    title: 'Piece it together from three systems',
    body: 'Permission, action and outcome live in different tools, and they disagree exactly when it matters.',
  },
];

const RULES_COVER = [
  'Who owns the funds and who acts for them',
  'Which markets and trading places are allowed, fixed by address',
  'How much: limits on amount and position',
  'How far the price may move, and the highest fee',
  'How long, and how many actions',
  'When to retry and when to stop',
  'One action only, or a time window',
  'What was actually done and how it ended',
  'A record that can be checked afterwards',
];

const STAGES = [
  {
    step: '01',
    name: 'Rules',
    body: 'The owner\u2019s terms become one signed set of rules: place, amount, limits, end date. No rules, no action.',
  },
  {
    step: '02',
    name: 'Checks fixed in advance',
    body: 'What will be checked is fixed before anything runs. If the trading place changed, its code changed or a limit would be broken, the run stops.',
  },
  {
    step: '03',
    name: 'A person releases the step that cannot be undone',
    body: 'The program stops and waits. A person releases the one step that moves funds: for this run only, and exactly once.',
  },
  {
    step: '04',
    name: 'Action',
    body: 'A fresh price, a dry run and a fee check against the limits, then exactly one transaction. No automatic retry.',
  },
  {
    step: '05',
    name: 'Completion',
    body: 'The run watches the chain until the transaction is final, and compares what happened with what was signed.',
  },
  {
    step: '06',
    name: 'Record and check',
    body: 'A signed record closes the run. A separate checking program, which anyone can download, re-checks the whole run from the files alone.',
  },
];

// VLM-001: what the rules allowed, and what happened.
const ALLOWED = [
  {
    rule: 'How much',
    allowed: 'EUR 20 per side, EUR 40 in total',
    happened: 'Funded to the exact amount. Each side stayed at or under its cap.',
  },
  {
    rule: 'Which actions',
    allowed: 'Open once, collect fees at most once, close once, reset approvals',
    happened: 'Opened, approvals reset, closed. Fees were never collected separately.',
  },
  {
    rule: 'Until when',
    allowed: '5 Sep 2026',
    happened: 'Opened 22 Aug, closed 28 Aug, permission ended 5 Sep 2026.',
  },
  {
    rule: 'Who owns the position',
    allowed: 'The owner of the funds',
    happened: 'Created directly in the owner\u2019s wallet. On closing, the proceeds went straight back to the owner.',
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
  'One owner of funds',
  'One market maker or agent',
  'One trading pair',
  'One approved trading place',
  'One set of rules with a fixed budget',
  'One concrete action',
  'One closing record that can be checked',
];

const NOT_LIST = [
  'Not the market maker, and not a trading strategy',
  'Not an exchange, and not a custodian of your funds',
  'Not just a wallet for an agent',
  'No promise of profit',
  'Not a general trading bot',
  'No promise that funds are safe, and no claim of legal or regulatory compliance',
  'No claim of the best possible price, as long as no comparison data exists',
  'Not ready for production market making: the proof below is a small, limited test',
];

export default function Mandates() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:px-6 md:py-24">
          {/* ── Intro: what this is, the picture, the next action ── */}
          <PageIntro
            maturity="tested"
            maturityDetail="Ethereum mainnet, ended"
            title="Let an agent manage liquidity without giving it unlimited control."
            lead="You set the rules first: which market, how much, which actions, until when. The agent can act only inside them, and every action leaves a record that can be checked."
            flow={[
              { id: 'wallet', icon: Wallet, label: 'Your wallet' },
              { id: 'rules', icon: ScrollText, label: 'Rules' },
              { id: 'agent', icon: Bot, label: 'Agent acts' },
              { id: 'proof', icon: FileCheck2, label: 'Proof' },
            ]}
            flowLabel="Your wallet, then the rules you set, then the agent acting inside them, then a proof of every action."
            flowHighlight="rules"
          >
            <CtaLink href="#proof" variant="primary" size="lg">
              See the test run
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaLink>
            <CtaLink href="/mandates/vlm-001/" variant="secondary" size="lg">
              Full proof page
            </CtaLink>
          </PageIntro>
          <p className="mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-ink-2">
            Tested with real funds at small scale. No run is active now, and a new one needs a
            new decision by us. No promise of profit or of safe funds is made. The technical name
            is Verifiable Liquidity Mandates.
          </p>

          {/* ── The rules, shown ── */}
          <section className="mt-16 border-t border-line-subtle pt-14">
            <SectionHeader
              kicker="The rules"
              title="What the agent may do is fixed before it does anything."
              lead="Not a document next to the software: one signed set of rules (mandate) that the software enforces and a checking program can re-check."
            />
            <div className="mt-10">
              <RulesDiagram />
            </div>
            <h3 className="mt-10 text-base font-semibold text-ink-0">What a set of rules can fix</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {RULES_COVER.map((item, i) => (
                <Reveal key={item} delay={i * 0.04}>
                  <div className="flex items-start gap-3 rounded-xl border border-line-subtle bg-white/[0.02] p-4">
                    <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                    <span className="text-sm leading-relaxed text-ink-1">{item}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Why ── */}
          <section className="mt-16 border-t border-line-subtle pt-14">
            <SectionHeader
              kicker="Why it is needed"
              title="Until now, letting someone else act meant one of five bad options."
              lead="An owner of funds who wants liquidity work done had to pick one of these. Rules replace all five."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {GAPS.map((g, i) => (
                <Reveal key={g.title} delay={i * 0.05}>
                  <Surface className="h-full p-6">
                    <KeyRound className="h-4 w-4 text-ink-2" aria-hidden="true" />
                    <h3 className="mt-3 text-base font-semibold text-ink-0">{g.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-1">{g.body}</p>
                  </Surface>
                </Reveal>
              ))}
              <Reveal delay={0.25}>
                <Surface className="flex h-full flex-col justify-center border-phase-settled/30 bg-phase-settled/[0.04] p-6">
                  <p className="text-base leading-relaxed text-ink-0">
                    Let someone act without handing over everything.
                    <br />
                    Let a program run without letting it do as it likes.
                    <br />
                    Proof instead of reports.
                  </p>
                </Surface>
              </Reveal>
            </div>
          </section>

          {/* ── How a run works ── */}
          <section className="mt-16 border-t border-line-subtle pt-14">
            <SectionHeader
              kicker="How a run works"
              title="Six stages. At each one, a failed check stops the run."
              lead="Other systems can limit what an agent may spend. Here there is also a record of which rules applied, what ran and how it ended."
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {STAGES.map((s, i) => (
                <Reveal key={s.step} delay={i * 0.05}>
                  <Surface className="h-full p-6">
                    <span className="font-mono text-[11px] tracking-[0.22em] text-ink-2">{s.step}</span>
                    <h3 className="mt-2 text-base font-semibold text-ink-0">{s.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-1">{s.body}</p>
                  </Surface>
                </Reveal>
              ))}
            </div>
            <TechDetails title="Technical details: the six stages by their canonical names" className="mt-6">
              <ol className="space-y-2">
                <li><span className="text-ink-0">01 Mandate.</span> One signed, one-shot mandate: venue, amount, limits, expiry.</li>
                <li><span className="text-ink-0">02 Policy.</span> Rules are hash-pinned before anything runs. Default-REJECT: a venue drift, a moved code hash or a breached cap ends the case, fail-closed.</li>
                <li><span className="text-ink-0">03 Ceremony.</span> The engine stops at AWAITING_ARM. A human arms the irreversible step: case-bound, fresh, exactly once.</li>
                <li><span className="text-ink-0">04 Execution.</span> Fresh quote, simulation and gas check against the mandated bounds, then exactly one submit.</li>
                <li><span className="text-ink-0">05 Settlement.</span> The case watches the chain until the transaction is canonical with the mandated confirmations, and validates what settled against what was signed.</li>
                <li><span className="text-ink-0">06 Receipt and verification.</span> A signed receipt closes the case over hash-chained evidence. The published standalone verifier re-checks the whole case from the files alone; it checks internal consistency and is written by COSMO, not by a third party.</li>
              </ol>
            </TechDetails>
          </section>

          {/* ── Proof ── */}
          <section id="proof" className="mt-16 scroll-mt-24 border-t border-line-subtle pt-14">
            <SectionHeader
              kicker="Proof"
              title="It was tested with real funds on Ethereum mainnet."
              lead="Two runs so far. Both are over. Their transactions are public."
            />
            <div className="mt-6">
              <MaturityBadge level="tested" explain />
            </div>

            <Reveal delay={0.05}>
              <div className="mt-8 rounded-xl border border-phase-active/30 bg-phase-active/[0.06] p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink-0">VLM-001: a full run, from start to end</h3>
                  <Chip tone="proof" size="sm">
                    ended · checked twice
                  </Chip>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-1">
                  A liquidity position was opened directly in the owner&apos;s wallet, approvals were
                  reset, and the position was closed with the proceeds paid straight back to the
                  owner. The program&apos;s wallet sent four transactions in its whole life. After the
                  end date, the permission was shown to have ended and the signing key was retired.
                </p>
                <div className="mt-5 overflow-hidden rounded-lg border border-line-base">
                  <div className="hidden grid-cols-[0.8fr_1.3fr_1.5fr] gap-4 border-b border-line-base bg-surface-inset px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-ink-2 md:grid">
                    <span>Rule</span>
                    <span>Allowed</span>
                    <span>What happened</span>
                  </div>
                  {ALLOWED.map((r) => (
                    <div
                      key={r.rule}
                      className="grid gap-1 border-b border-line-subtle px-4 py-3 last:border-b-0 md:grid-cols-[0.8fr_1.3fr_1.5fr] md:gap-4"
                    >
                      <span className="text-sm font-semibold text-ink-0">{r.rule}</span>
                      <span className="text-sm leading-relaxed text-ink-1">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2 md:hidden">
                          Allowed:{' '}
                        </span>
                        {r.allowed}
                      </span>
                      <span className="text-sm leading-relaxed text-ink-0">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2 md:hidden">
                          What happened:{' '}
                        </span>
                        {r.happened}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-1">
                  The opening, the reset and the closing each passed all 10 checks of two checking
                  programs, one of them published for anyone to run.
                </p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <a
                    href="/mandates/vlm-001/"
                    className="inline-flex items-center gap-2 font-mono text-xs text-phase-active transition-colors hover:text-ink-0"
                  >
                    Read the proof page
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href="/evidence/vlm-001/"
                    className="inline-flex items-center gap-2 font-mono text-xs text-phase-active transition-colors hover:text-ink-0"
                  >
                    Evidence files
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href="/verifier/"
                    className="inline-flex items-center gap-2 font-mono text-xs text-phase-active transition-colors hover:text-ink-0"
                  >
                    The checking program
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </Reveal>

            <h3 className="mt-10 text-lg font-semibold text-ink-0">EVM-MICRO-001: two single trades under rules</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-1">
              Real funds, a fixed trading place, a capped amount and fee, a person releasing the
              step that cannot be undone, and exactly one transaction each.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {TRADES.map((t, i) => (
                <Reveal key={t.tx} delay={i * 0.06}>
                  <Surface className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-2">
                        {t.label} · 0.0001 ETH → SUPRA
                      </span>
                      <Chip tone="settled" size="sm">
                        done
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
                        <dt className="text-ink-2">Attempts</dt>
                        <dd className="font-mono text-ink-1">1, no automatic retry</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-ink-2">Check</dt>
                        <dd className="font-mono text-ink-1">accepted by both checking programs</dd>
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
                <p className="text-sm leading-relaxed text-ink-1">
                  <span className="font-semibold text-ink-0">Honest limit:</span> these runs show
                  that the mechanics work from start to end at small scale. They are not a market
                  making system ready for production and say nothing about the best possible
                  price: no comparison data exists yet. The evidence files of EVM-MICRO-001 are
                  not published; its two transactions are. Another live run needs a new decision
                  by us.
                </p>
              </div>
            </Reveal>
          </section>

          {/* ── Pilot offer ── */}
          <section className="mt-16 border-t border-line-subtle pt-14">
            <SectionHeader
              kicker="The offer"
              title="A small, concrete pilot."
              lead="Run one set of rules with real funds and a fixed budget, and check the result yourself."
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
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
                    1 set of rules. 1 action. 1 proof.
                  </span>
                </div>
              </Reveal>
            </div>
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-2">
              We take one engagement at a time and agree its scope with the owner of the funds
              before any rules are signed.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CtaLink href="/assurance/" variant="primary" size="lg">
                Proof overview
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </CtaLink>
              <CtaLink href="/institutional/" variant="secondary" size="lg">
                The framework behind it
              </CtaLink>
              <CtaLink href="/manifesto/" variant="secondary" size="lg">
                Manifesto v6.0
              </CtaLink>
            </div>
          </section>

          {/* ── What COSMO is not ── */}
          <section className="mt-16 border-t border-line-subtle pb-8 pt-14">
            <SectionHeader
              kicker="Honest limits"
              title="What COSMO is not."
              lead="The edges, stated as plainly as the claims."
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
    </div>
  );
}
