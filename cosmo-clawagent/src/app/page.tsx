'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Bot, Brain, Shield, Zap, ArrowRight, Activity, Network } from 'lucide-react';
import BentoItem from '@/components/ui/terminal-bento-grid';

const agents = [
  {
    id: 'INTAKE-1',
    name: 'Intake Agent',
    role: 'RFQ Listener',
    tier: 'Tier 1',
    status: 'ACTIVE',
    icon: Zap,
    accent: 'green',
    description:
      'SupraFX RFQ-Listener. Parses incoming RFQ-IDs, classifies trade intent, and routes operations to the correct agent tier. First contact point for all market signals entering the swarm.',
    stats: { ops: '12,847', uptime: '99.97%', latency: '18ms' },
  },
  {
    id: 'ANALYSIS-2',
    name: 'Analysis Agent',
    role: 'Intelligence Engine',
    tier: 'Tier 2',
    status: 'ACTIVE',
    icon: Brain,
    accent: 'cyan',
    description:
      'Mistral AI + Supra Oracle integration. Non-deterministic reasoning layer that evaluates trade quality, risk exposure, and market context before routing to execution.',
    stats: { ops: '8,412', uptime: '99.94%', latency: '340ms' },
  },
  {
    id: 'RISK-3',
    name: 'Risk Manager',
    role: 'Consensus Guardian',
    tier: 'Tier 2',
    status: 'ACTIVE',
    icon: Shield,
    accent: 'cyan',
    description:
      'Co-signs all Tier 2 trades. $COSMO stakers acting as Risk Agents provide collateral and earn co-signing rewards. Enforces cryptographic 2-of-3 approval for medium-risk operations.',
    stats: { ops: '3,291', uptime: '99.94%', latency: '380ms' },
  },
  {
    id: 'LIQUIDITY-4',
    name: 'Liquidity Scout',
    role: 'Cross-Chain Router',
    tier: 'System',
    status: 'ACTIVE',
    icon: Network,
    accent: 'purple',
    description:
      'Cross-chain liquidity discovery via OpenBlocks.ai. Finds optimal execution routes across chains, protocols, and liquidity pools to minimize slippage for every trade.',
    stats: { ops: '24,891', uptime: '99.99%', latency: '52ms' },
  },
  {
    id: 'GAS-5',
    name: 'Gas Monitor',
    role: 'Execution Timer',
    tier: 'Tier 1',
    status: 'ACTIVE',
    icon: Activity,
    accent: 'green',
    description:
      'Deterministic rule-based execution timing. Monitors gas prices, mempool conditions, and block availability to optimize transaction submission windows across all tiers.',
    stats: { ops: '891,234', uptime: '99.99%', latency: '8ms' },
  },
  {
    id: 'NEGO-6',
    name: 'Negotiation Agent',
    role: 'Deal Closer',
    tier: 'Tier 1 / 3',
    status: 'ACTIVE',
    icon: Bot,
    accent: 'purple',
    description:
      'Dual-mode execution agent. Tier 1: fully autonomous for trades under $50. Tier 3: pre-packages complex deals for NFT-holder co-signature via Discord/Telegram (Disco protocol).',
    stats: { ops: '5,447', uptime: '100%', latency: 'Variable' },
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
                  System Online — All Agents Active
                </span>
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tight mb-6 text-left">
              <span className="text-white">COSMO</span>
              <span className="neon-text-purple">CLAW</span>
              <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
                Autonomous DeFi Intelligence
              </span>
            </h1>

            <p className="text-slate-400 text-lg leading-relaxed mb-10 font-sans max-w-xl">
              A multi-tier agent swarm that autonomously executes DeFi operations,
              coordinates consensus, and escalates to human oversight — only when it matters.
            </p>

            <div className="flex flex-wrap items-center justify-start gap-4">
              <Link
                href="/launch"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
              >
                <Activity className="w-4 h-4" />
                Launch App
              </Link>
              <Link
                href="/whitepaper"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
              >
                Read Whitepaper
                <ArrowRight className="w-4 h-4" />
              </Link>
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
            { label: 'Agents Online', value: '6 / 6' },
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

      {/* Agent Cards Bento Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="font-mono text-3xl font-bold text-white mb-2">
            {'>'} AGENT REGISTRY
          </h2>
          <p className="text-slate-500 font-mono text-sm">
            Initializing agent protocols... <span className="blinking-cursor" />
          </p>
        </div>

        <div className="bento-grid">
          {agents.map((agent, i) => {
            const colors = accentMap[agent.accent as keyof typeof accentMap];
            const Icon = agent.icon;
            const isWide = false;

            return (
              <BentoItem
                key={agent.id}
                className={isWide ? 'col-span-2' : ''}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${colors.dot} ${agent.status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
                    <span className={`font-mono text-xs ${colors.text}`}>{agent.status}</span>
                  </div>
                </div>

                {/* Agent ID */}
                <div className="font-mono text-xs text-slate-500 mb-1">[{agent.id}]</div>
                <h3 className="font-mono text-xl font-bold text-white mb-1">{agent.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`tier-badge ${colors.badge}`}>
                    {agent.tier}
                  </span>
                  <span className="font-mono text-xs text-slate-500">{agent.role}</span>
                </div>

                <p className="text-slate-400 text-sm leading-relaxed font-sans mb-5">
                  {agent.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06]">
                  <div className="text-center">
                    <div className={`font-mono text-sm font-bold ${colors.text}`}>
                      {agent.stats.ops}
                    </div>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">OPS</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-mono text-sm font-bold ${colors.text}`}>
                      {agent.stats.uptime}
                    </div>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">UPTIME</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-mono text-sm font-bold ${colors.text}`}>
                      {agent.stats.latency}
                    </div>
                    <div className="font-mono text-xs text-slate-600 mt-0.5">LATENCY</div>
                  </div>
                </div>
              </BentoItem>
            );
          })}

          {/* CTA Bento */}
          <BentoItem className="col-span-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-left">
                <h3 className="font-mono text-2xl font-bold text-white mb-2">
                  {'>'} DEPLOY YOUR SWARM
                </h3>
                <p className="text-slate-400 font-sans text-sm max-w-lg">
                  Stake $COSMO to become a Risk Agent, earn co-signing rewards, and participate in
                  the future of autonomous DeFi governance.
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
          © 2025 CosmoClawAgent — Autonomous DeFi Intelligence{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
