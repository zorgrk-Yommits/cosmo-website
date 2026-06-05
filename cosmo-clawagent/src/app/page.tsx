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
      'Master of EOM. Holds 24-hour veto power over all protocol actions. Root of trust for the entire agent hierarchy.',
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
      'Executes on-chain governance proposals once approved. Translates council decisions into protocol state changes.',
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
      'Validates price feeds from Supra DORA oracles. Foundation of the execution loop — without reliable data, no downstream agent can reason correctly.',
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
      'Scans Atmos pools and external chain prices for raw spreads. Pure sensing, no judgement. Signals flow to the Strategist for evaluation.',
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
      'Evaluates every opportunity: does this spread cover costs, inventory, and risk appetite? Produces actionable signals — or discards noise. Triggers COSMO directly on confirmation.',
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
      'Manages maker-side vault inventory across chains. Ensures COSMO always has the capital to accept inbound RFQs and execute outbound opportunities.',
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
      'Archives every settlement outcome as a labelled training example. Closes the loop by feeding the Learning Layer — compounding execution quality with every trade.',
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
      'The eighth agent. The only one that acts on-chain. Receives confirmed signals from the Strategist and executes RFQ settlement via audited Move modules on Supra L1.',
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
                  System Online — EOM Swarm Active
                </span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tight mb-6 text-left">
              <span className="neon-text-purple">COSMO</span>
              <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
                Autonomous DeFi Intelligence
              </span>
            </h1>

            <p className="text-slate-200 text-xl leading-relaxed mb-6 font-mono max-w-xl">
              EOM denkt. COSMO handelt. <span className="neon-text-purple">$COSMO</span> bindet beides.
            </p>

            <p className="text-slate-400 text-lg leading-relaxed mb-10 font-sans max-w-xl">
              Eight agents in the EOM Swarm. Seven think — one acts.
              COSMO is the on-chain settlement layer for the SupraOS agent economy.
            </p>

            <div className="flex flex-wrap items-center justify-start gap-4">
              <Link
                href="/launch"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                <Activity className="w-4 h-4" />
                Launch App
              </Link>
              <a
                href="/COSMO_Whitepaper_v3.1_DRAFT.pdf"
                download
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
              >
                Read Whitepaper v3.1
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
            { label: 'Total Operations', value: '907,619' },
            { label: 'TVL Managed', value: '$4.2M' },
            { label: 'EOM Agents', value: '8 / 8' },
            { label: '$COSMO Staked', value: '18.3M' },
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

      {/* EOM Intelligence Loop - SupraOS-style node graph */}
      <IntelligenceLoop />

      {/* Agent Cards Bento Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-mono text-3xl font-bold text-white mb-2">
            {'>'} The EOM Swarm
          </h2>
          <p className="text-slate-400 font-mono text-sm">
            Eight agents. One execution layer. Seven think. One acts.
            <span className="blinking-cursor" />
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
                </div>

                <p className="text-slate-400 text-sm leading-relaxed font-sans">
                  {agent.description}
                </p>
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
                  href="/launch"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                >
                  Launch App
                </Link>
              </div>
            </div>
          </BentoItem>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          © 2026 COSMO — Autonomous DeFi Intelligence{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
