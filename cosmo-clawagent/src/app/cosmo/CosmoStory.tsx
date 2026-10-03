'use client';

// /cosmo — what the $COSMO token is and what it is used for today.
//
// Rewritten in the site-clarity refactor (positioning v6.1). The earlier page
// told the v5 "institutional layer" story with an eight-agent swarm; what is
// kept from it is stated with its real maturity: one agent runs, seven are
// planned, staking rewards are not active. No token figure appears here that
// the page cannot back; supply and distribution are linked, not restated.

import { ArrowLeftRight, ArrowRight, Banknote, Bot, Coins, Lock, ShieldCheck } from 'lucide-react';
import { COSMO_META, COSMOCLAW_ADDR, WCOSMO_META } from '@/lib/mainnetOnchain';
import { CtaLink } from '@/components/cosmo/Cta';
import MaturityBadge, { type Maturity } from '@/components/cosmo/MaturityBadge';
import PageIntro from '@/components/cosmo/PageIntro';
import Reveal from '@/components/cosmo/Reveal';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import TechDetails from '@/components/cosmo/TechDetails';

const USES: {
  icon: typeof Coins;
  title: string;
  body: string;
  maturity: Maturity;
  detail?: string;
  href: string;
  cta: string;
}[] = [
  {
    icon: ShieldCheck,
    title: 'Safety deposits',
    body: 'A provider puts down wCOSMO before taking jobs. If the provider does not deliver, part of it goes to the buyer.',
    maturity: 'pilot',
    href: '/compute/bond/',
    cta: 'How the deposit works',
  },
  {
    icon: Banknote,
    title: 'Paying for jobs',
    body: 'A job on the market can be priced in wCOSMO. CASH and SUPRA are accepted as well.',
    maturity: 'pilot',
    href: '/market/',
    cta: 'See the job board',
  },
  {
    icon: ArrowLeftRight,
    title: 'Deposits for token trades',
    body: 'In the earlier trading track, the operators who offered token trades put down wCOSMO as their deposit.',
    maturity: 'archive',
    href: '/vault/',
    cta: 'Where deposits are held',
  },
];

const NOT_YET: { title: string; body: string }[] = [
  {
    title: 'Rewards for staking',
    body: 'Not active in this version. There is nothing to claim, and no yield is promised.',
  },
  {
    title: 'A track record on the operator license',
    body: 'The license is built to count completed trades and missed deadlines. Today that record lives in the transactions, not on the license.',
  },
  {
    title: 'Seven of the eight agents',
    body: 'The project was designed as a group of eight agents. One runs today: the one that carries out transactions. The other seven are designs.',
  },
  {
    title: 'An open market for everyone',
    body: 'Providers are hand-picked, limits are low, and offers reach the contract through a signing service we run.',
  },
];

export default function CosmoStory() {
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Intro: what this is, the picture, the next action ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-20 md:px-6 md:pt-24">
        <PageIntro
          maturity="live"
          maturityDetail="token on Supra Mainnet"
          title="$COSMO: the token behind the deposits and the payments."
          lead="$COSMO is this project's token on Supra. Wrapped 1 to 1 as wCOSMO, it is what providers put down as a safety deposit and what a job can be paid in."
          flow={[
            { id: 'cosmo', icon: Coins, label: '$COSMO' },
            { id: 'wcosmo', icon: ArrowLeftRight, label: 'wCOSMO, 1 to 1' },
            { id: 'deposit', icon: ShieldCheck, label: 'Safety deposit' },
            { id: 'pay', icon: Banknote, label: 'Job payment' },
          ]}
          flowLabel="$COSMO is wrapped 1 to 1 into wCOSMO, which is used for safety deposits and for paying jobs."
        >
          <CtaLink href="/buy/" variant="primary" size="lg">
            Buy wCOSMO
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CtaLink>
          <CtaLink href="/wcosmo/" variant="secondary" size="lg">
            Why two tokens?
          </CtaLink>
        </PageIntro>
        <p className="mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-ink-2">
          A token for using this system, not an investment product. No yield and no rising price
          is promised.
        </p>
      </section>

      {/* ── What it is used for today ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <SectionHeader
          kicker="What it is used for"
          title="Three uses. Each is labelled with how real it is."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {USES.map((u, i) => {
            const Icon = u.icon;
            return (
              <Reveal key={u.title} delay={i * 0.06}>
                <Surface className="flex h-full flex-col p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-base bg-surface-2 text-ink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink-0">{u.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-1">{u.body}</p>
                  <div className="mt-4">
                    <MaturityBadge level={u.maturity} detail={u.detail} size="sm" />
                  </div>
                  <a
                    href={u.href}
                    className="mt-4 inline-flex items-center gap-2 font-mono text-[13px] text-phase-active transition-colors hover:text-ink-0"
                  >
                    {u.cta}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </Surface>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Where it sits ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <Surface className="p-6 md:p-8">
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink-0">Built on Supra.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-1 md:text-base">
            Supra provides the chain, and its own products cover how agents are coordinated
            (SupraOS) and where assets are traded (SupraFX). COSMO adds the part that makes paid
            work binding between two parties who do not know each other: a payment locked up
            front, a safety deposit behind the provider, and a public record of every step. It
            is meant to complement those products.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaLink href="/#flow" variant="secondary" size="md">
              How a job works
            </CtaLink>
            <CtaLink href="/assurance/" variant="ghost" size="md">
              Proof overview
            </CtaLink>
          </div>
        </Surface>
      </section>

      {/* ── What is not there yet ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 md:px-6">
        <SectionHeader
          kicker="Honest limits"
          title="What the token does not do yet."
          lead="Earlier versions of this page described a larger design. These parts of it are not running."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {NOT_YET.map((n, i) => (
            <Reveal key={n.title} delay={i * 0.05}>
              <Surface tone="quiet" className="h-full p-6">
                <MaturityBadge level="planned" size="sm" />
                <h3 className="mt-3 text-base font-semibold text-ink-0">{n.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-1">{n.body}</p>
              </Surface>
            </Reveal>
          ))}
        </div>

        <Surface className="mt-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Bot className="h-5 w-5 text-ink-1" aria-hidden="true" />
            <h3 className="text-base font-semibold text-ink-0">The operator license</h3>
            <MaturityBadge level="archive" detail="token-trade track" size="sm" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-1">
            In the token-trade track, an on-chain license decided which operator could trade and
            how large a trade could be. Its three checks ran in the trade that was completed on
            Supra Mainnet.
          </p>
          <a
            href="/demo/"
            className="mt-3 inline-flex items-center gap-2 font-mono text-[13px] text-phase-active transition-colors hover:text-ink-0"
          >
            Replay that trade (archive)
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <TechDetails title="Technical details: what the license checks" className="mt-4">
            <ul className="space-y-2">
              <li>
                <span className="text-ink-0">Operator identity.</span> Only the agent&apos;s designated
                operator can have its quote accepted; a mismatch is rejected on-chain.
              </li>
              <li>
                <span className="text-ink-0">Active and pausable.</span> An inactive or
                guardian-paused agent can neither quote nor settle. The check runs again at
                acceptance.
              </li>
              <li>
                <span className="text-ink-0">Trade-size cap.</span> Every trade is checked against
                the agent&apos;s notional ceiling before it can be accepted.
              </li>
            </ul>
            <p className="mt-3">
              Agent #0:{' '}
              <a
                href="https://suprascan.io/account/0xabd7c1df1767a626c213ffb6942c4d39158f7c2f75dbd5669b25dd6e9bd06084?network=mainnet"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-phase-proof hover:text-ink-0"
              >
                0xabd7c1df…6084
              </a>
              . Stake and slashing tiers are designed into the license; staking is Phase-2 scope.
            </p>
          </TechDetails>
        </Surface>
      </section>

      {/* ── How to get it, and the limits ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-10 pb-24 md:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Surface className="p-6">
            <h2 className="text-lg font-semibold text-ink-0">How to get it</h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-1">
              <li>· Buy wCOSMO with SUPRA from the project&apos;s own stock, in a capped sale.</li>
              <li>· Or trade on Atmos, where little money sits in the pool and prices move easily.</li>
              <li>· For the amounts a provider needs, write to us through the community channel.</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <CtaLink href="/buy/" variant="primary" size="md">
                Buy wCOSMO
              </CtaLink>
              <CtaLink href="/wcosmo/" variant="secondary" size="md">
                wCOSMO guide
              </CtaLink>
              <CtaLink
                href="https://www.tadfi.online/community-tokens/COSMO"
                variant="ghost"
                size="md"
                external
              >
                Token distribution (external)
              </CtaLink>
            </div>
          </Surface>
          <div className="rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-phase-warn" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink-0">Read this before buying</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-1">
              <li>· Nothing on this page is financial advice.</li>
              <li>· Selling is only possible on Atmos, at whatever liquidity exists there. There is no promise to buy back.</li>
              <li>· The markets that use the token are small pilots with low limits. Their rules can be changed by the 2-of-3 admin group.</li>
              <li>· Buyer and provider in several of the paid jobs so far were accounts of the operating team.</li>
            </ul>
          </div>
        </div>
        <TechDetails title="Technical details: token addresses" className="mt-4">
          <dl className="space-y-1.5 font-mono text-[11px]">
            <div className="break-all">$COSMO FA: {COSMO_META}</div>
            <div className="break-all">wCOSMO FA: {WCOSMO_META}</div>
            <div className="break-all">wrap / unwrap module: {COSMOCLAW_ADDR}::wcosmo</div>
          </dl>
          <p className="mt-3">
            $COSMO is a dispatchable fungible asset on Supra Mainnet (chain 8); wCOSMO is its
            plain 1:1 wrapper. The backing is read live on the wCOSMO guide.
          </p>
        </TechDetails>
      </section>
    </div>
  );
}
