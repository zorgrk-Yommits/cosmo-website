'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Activity,
  ArrowRight,
  Brain,
  Crown,
  Database,
  Radar,
  ScrollText,
  Search,
  Wallet,
  Zap,
} from 'lucide-react';
import BentoItem from '@/components/ui/terminal-bento-grid';
import IntelligenceLoop from '@/components/IntelligenceLoop';

const agents = [
  {
    id: 'KAHLESS-1',
    name: 'Kahless',
    type: 'FLOW',
    role: 'Governance Root',
    category: 'Governance',
    icon: Crown,
    accent: 'purple',
    description:
      'Designed as the master of EOM: will hold 24-hour veto power over all protocol actions, the root of trust for the entire agent hierarchy.',
  },
  {
    id: 'GOV-2',
    name: 'Gov. Architect',
    type: 'FLOW',
    role: 'Proposal Execution',
    category: 'Governance',
    icon: ScrollText,
    accent: 'purple',
    description:
      'Will execute on-chain governance proposals once approved, translating council decisions into protocol state changes.',
  },
  {
    id: 'ORACLE-3',
    name: 'Oracle Node',
    type: 'GET',
    role: 'Price Feed Validation',
    category: 'Intelligence',
    icon: Radar,
    accent: 'cyan',
    description:
      'Designed to validate price feeds from Supra DORA oracles — the foundation of the execution loop; without reliable data, no downstream agent can reason correctly.',
  },
  {
    id: 'ARBITER-4',
    name: 'Arbiter',
    type: 'GET',
    role: 'Opportunity Scanner',
    category: 'Intelligence',
    icon: Search,
    accent: 'cyan',
    description:
      'Will scan Atmos pools and external chain prices for raw spreads — pure sensing, no judgement; signals routed to the Strategist for evaluation.',
  },
  {
    id: 'STRAT-5',
    name: 'Strategist',
    type: 'THINK',
    role: 'Signal Generation',
    category: 'Intelligence',
    icon: Brain,
    accent: 'cyan',
    description:
      'Designed to evaluate every opportunity — does the spread cover costs, inventory, and risk appetite? — producing actionable signals or discarding noise, and triggering COSMO on confirmation.',
  },
  {
    id: 'LIQ-6',
    name: 'Liquidity General',
    type: 'ACT',
    role: 'Vault Management',
    category: 'Capital',
    icon: Wallet,
    accent: 'green',
    description:
      'Will manage maker-side vault inventory across chains, ensuring COSMO always has the capital to accept inbound RFQs and execute outbound opportunities.',
  },
  {
    id: 'KEEPER-7',
    name: 'Keeper',
    type: 'THINK + ACT',
    role: 'Learning Layer',
    category: 'Memory',
    icon: Database,
    accent: 'cyan',
    description:
      'Will archive each settlement outcome as a labelled training example, closing the loop by feeding the Learning Layer — compounding execution quality with every trade.',
  },
  {
    id: 'COSMO-8',
    name: 'COSMO',
    type: 'TRANSACT',
    role: 'Settlement Provider',
    category: 'Execution',
    icon: Zap,
    accent: 'purple',
    featured: true,
    description:
      'The eighth agent and the only one that acts on-chain. Live on Supra Mainnet: receives a confirmed quote and settles the RFQ atomically through audited Move modules.',
  },
];

const accentMap = {
  green: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  cyan: {
    border: 'border-cyan-500/30',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    dot: 'bg-cyan-400',
    badge: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  },
  purple: {
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  },
};

export default function HomePage() {
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="flex flex-row items-center gap-8">

          {/* Left: Text block */}
          <div className="flex-1 pl-4 lg:pl-8">
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
                  COSMO live on Supra Mainnet
                </span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tight mb-6 text-left">
              <span className="neon-text-purple">COSMO</span>
              <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
                Execution Layer for Agent Economies on Supra
              </span>
            </h1>

            <p className="text-slate-200 text-xl leading-relaxed mb-6 font-mono max-w-xl">
              COSMO turns agent intent into enforceable on-chain settlement — RFQs, bonds,
              capabilities, and atomic execution.
            </p>

            <p className="text-slate-400 text-lg leading-relaxed mb-10 font-sans max-w-xl">
              COSMO explores the execution layer for the emerging Agent Economy on Supra —
              complementary to SupraOS and SupraFX, not a competitor. SupraOS coordinates agents,
              SupraFX provides market and liquidity rails, and COSMO turns autonomous intent into
              accountable, atomic execution. Built on Supra, the settlement layer is live on
              Mainnet today, proven for value-for-value RFQ settlement.
            </p>

            <div className="flex flex-wrap items-center justify-start gap-4">
              <Link
                href="/demo/"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                <Activity className="w-4 h-4" />
                See the proof — live Mainnet round-trip
              </Link>
              <a
                href="/COSMO_Manifesto_v4.0_DRAFT.pdf"
                download
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
              >
                Read the Manifesto — v4.0
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right: Image */}
          <div className="hidden lg:block flex-shrink-0">
            <Image
              src="/images/cosmo3.jpg"
              alt="COSMO Agent"
              width={340}
              height={340}
              className="animate-float rounded-2xl object-cover drop-shadow-2xl opacity-90"
            />
          </div>

        </div>

        {/* Live stats bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
          {[
            { label: 'Supra Mainnet', value: 'Live' },
            { label: 'Move modules deployed', value: '5' },
            { label: 'Agents — architecture', value: '8' },
            { label: 'round-trip settled', value: '1' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-center backdrop-blur"
            >
              <div className="font-mono text-xl font-bold text-white">{stat.value}</div>
              <div className="font-mono text-xs text-slate-500 mt-1 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Primitive — positioning: COSMO is the settlement primitive, not the venue */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-8">
        <div className="rounded-2xl border border-purple-500/20 bg-white/[0.02] p-8 md:p-10 backdrop-blur">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-purple-300/80">
              The primitive, not the venue
            </span>
          </div>

          <h2 className="font-mono text-2xl md:text-3xl font-bold text-white mb-2 leading-snug max-w-4xl">
            COSMO does not compete to be the venue. COSMO defines the primitive:{' '}
            <span className="neon-text-purple">
              request, bond, capability, atomic settlement, accountability.
            </span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <p className="text-slate-300 text-base leading-relaxed font-sans">
              COSMO works at the settlement-primitive layer: how an autonomous agent posts a
              request, how a maker collateralizes its commitment with a bond, and how both legs
              settle atomically on Supra Move, with no trusted operator in the settlement path.
            </p>
            <p className="text-slate-400 text-base leading-relaxed font-sans">
              Today, that primitive is proven for value-for-value execution. The next step is
              digitally verifiable work: data access, signed outputs, API responses, capabilities,
              and other machine-to-machine obligations where delivery can be checked
              cryptographically or on-chain. Longer term, COSMO can extend toward compute and
              service settlement through dedicated attestation layers.
            </p>
          </div>

          <p className="mt-8 max-w-4xl font-mono text-[11px] leading-relaxed text-slate-600">
            Venue-level agentic cross-chain trading is handled by institutional venues in the Supra
            ecosystem. COSMO works one layer down as the settlement and execution primitive. The
            current proven capability is atomic value-for-value RFQ settlement; compute and service
            settlement are roadmap, not current capability — and COSMO is not permissionless yet.
          </p>
        </div>
      </section>

      {/* EOM Intelligence Loop - SupraOS-style node graph */}
      <IntelligenceLoop />

      {/* Agent Cards Bento Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-mono text-3xl font-bold text-white mb-2">
            {'>'} The EOM Swarm
          </h2>
          <p className="text-slate-300 font-mono text-sm max-w-3xl mx-auto leading-relaxed">
            An agent swarm doesn&apos;t need another chat layer. It needs a way to make commitments
            enforceable. COSMO gives agents that primitive:{' '}
            <span className="text-slate-100">
              request, quote, bond, capability, atomic settlement, accountability.
            </span>
            <span className="blinking-cursor" />
          </p>
          <p className="mt-4 text-slate-500 font-mono text-xs max-w-3xl mx-auto leading-relaxed">
            The eight agents below are the user-facing story, expressed in SupraOS Bot Builder
            syntax: WHEN, GET, THINK, FLOW, ACT, TRANSACT. The swarm sits on top; COSMO is the
            settlement layer underneath it. Only one agent runs today — COSMO, the TRANSACT layer,
            live on Supra Mainnet and proven for value-for-value RFQ settlement. The seven thinking
            agents are the roadmap, and digitally verifiable work — API responses, data access and
            capabilities — is where the primitive is built to extend next.
          </p>
        </div>

        <div className="bento-grid">
          {agents.map((agent) => {
            const colors = accentMap[agent.accent as keyof typeof accentMap];
            const Icon = agent.icon;
            const featured = agent.featured === true;

            return (
              <BentoItem
                key={agent.id}
                className={featured ? 'col-span-2 cosmo-featured glow-border-purple' : ''}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`} />
                    <span className={`font-mono text-xs ${colors.text}`}>{agent.category.toUpperCase()}</span>
                  </div>
                </div>

                {/* Agent ID */}
                <div className="font-mono text-xs text-slate-500 mb-1">[{agent.id}]</div>
                <h3 className={`font-mono text-xl font-bold mb-2 ${featured ? 'neon-text-purple' : 'text-white'}`}>
                  {agent.name}
                </h3>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className={`tier-badge ${colors.badge}`}>
                    {agent.type}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{agent.role}</span>
                  {featured ? (
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-600">planned</span>
                  )}
                </div>

                <p className="text-slate-400 text-sm leading-relaxed font-sans">
                  {agent.description}
                </p>

                {featured && (
                  <Link
                    href="/demo/"
                    className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    See the live round-trip
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </BentoItem>
            );
          })}

          {/* CTA Bento */}
          <BentoItem className="col-span-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="font-mono text-2xl font-bold text-white mb-2">
                  {'>'} BIND TO THE SWARM
                </h3>
                <p className="text-slate-400 font-sans text-sm max-w-lg">
                  Stake $COSMO to secure the settlement layer, earn protocol rewards, and participate in
                  the future of autonomous DeFi governance under the Imperium Protocol.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="https://www.tadfi.online/community-tokens/COSMO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-mono text-sm hover:border-purple-400 transition-all"
                >
                  Tokenomics
                </a>
                <Link
                  href="/demo/"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                >
                  Walk through the round-trip →
                </Link>
              </div>
            </div>
          </BentoItem>
        </div>
      </section>

      {/* The Operator License — Agent NFT */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-mono text-3xl font-bold text-white mb-2">
            {'>'} The Operator License
          </h2>
          <p className="text-slate-400 font-mono text-sm max-w-3xl mx-auto leading-relaxed">
            COSMO settles for no one by default. Every quote is bound to a COSMO Operator License —
            an on-chain operator credential. Not a collectible: today it decides, on-chain, who may
            settle and how large a trade may be.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Enforced today */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300/80">
                Enforced on Supra Mainnet today
              </span>
            </div>
            <ul className="space-y-4">
              <li>
                <div className="font-mono text-sm font-bold text-white">Operator identity</div>
                <p className="text-slate-400 text-sm font-sans leading-relaxed">
                  Only the agent&apos;s designated operator can have its quote accepted. A quote whose
                  operator does not match the license is rejected on-chain.
                </p>
              </li>
              <li>
                <div className="font-mono text-sm font-bold text-white">Active &amp; pausable</div>
                <p className="text-slate-400 text-sm font-sans leading-relaxed">
                  An inactive or guardian-paused agent can neither quote nor settle. The check runs
                  again at acceptance, so a pause mid-flight stops the trade.
                </p>
              </li>
              <li>
                <div className="font-mono text-sm font-bold text-white">Trade-size cap</div>
                <p className="text-slate-400 text-sm font-sans leading-relaxed">
                  Every trade is checked against the agent&apos;s notional ceiling before it can be
                  accepted — over-cap quotes abort.
                </p>
              </li>
            </ul>
            <Link
              href="/demo/"
              className="mt-5 inline-flex items-center gap-1 font-mono text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              All three gates fired and passed in the live round-trip
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* By design — roadmap */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                By design — roadmap
              </span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-slate-600">planned</span>
            </div>
            <ul className="space-y-4">
              <li>
                <div className="font-mono text-sm font-bold text-slate-300">History &amp; reputation</div>
                <p className="text-slate-500 text-sm font-sans leading-relaxed">
                  The license is built to accumulate a settled-trade count, missed-deadline tracking
                  and a reputation score. The fields live on-chain; wiring them into settlement is the
                  next step — today the trade record lives in the transaction events, not yet on the
                  license.
                </p>
              </li>
              <li>
                <div className="font-mono text-sm font-bold text-slate-300">Stake &amp; slashing</div>
                <p className="text-slate-500 text-sm font-sans leading-relaxed">
                  Tiered notional limits and slashable stake are designed into the license; tier
                  magnitudes are still illustrative and staking is Phase-2 scope.
                </p>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-slate-600">
          Agent #0 ·{' '}
          <a
            href="https://suprascan.io/account/0xabd7c1df1767a626c213ffb6942c4d39158f7c2f75dbd5669b25dd6e9bd06084?network=mainnet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            0xabd7c1df…6084
          </a>{' '}
          · live on Supra Mainnet
        </p>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          © 2026 COSMO — Execution Layer for Agent Economies on Supra{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
