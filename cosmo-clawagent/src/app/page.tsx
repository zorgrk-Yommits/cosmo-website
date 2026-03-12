'use client';

import Link from 'next/link';
import { Bot, Brain, Shield, Zap, ArrowRight, Activity, Network, Lock } from 'lucide-react';
import BentoItem from '@/components/ui/terminal-bento-grid';

const agents = [
  {
    id: 'ALPHA-7',
    name: 'ClawBot Alpha',
    role: 'Execution Agent',
    tier: 'Tier 1',
    status: 'ACTIVE',
    icon: Zap,
    accent: 'green',
    description:
      'Fully autonomous execution engine. Handles routine DeFi operations — swaps, yield rebalancing, and small $COSMO trades — without human intervention. Signs and executes on-chain in real time.',
    stats: { ops: '12,847', uptime: '99.97%', latency: '142ms' },
  },
  {
    id: 'QUORUM-3',
    name: 'ClawBot Quorum',
    role: 'Consensus Agent',
    tier: 'Tier 2',
    status: 'ACTIVE',
    icon: Network,
    accent: 'cyan',
    description:
      'Multi-agent consensus coordinator. Orchestrates 2-of-3 internal committee votes for mid-risk operations. $COSMO stakers acting as Risk Agents co-sign and earn protocol rewards.',
    stats: { ops: '3,291', uptime: '99.94%', latency: '380ms' },
  },
  {
    id: 'SENTINEL-1',
    name: 'ClawBot Sentinel',
    role: 'Guardian Agent',
    tier: 'Tier 3',
    status: 'STANDBY',
    icon: Shield,
    accent: 'purple',
    description:
      'Human-in-the-loop safeguard for high-stakes decisions. Packages complex deals, alerts NFT-holders via Discord/Telegram, and waits for the final human co-signature before execution.',
    stats: { ops: '247', uptime: '100%', latency: 'Human' },
  },
  {
    id: 'ORACLE-9',
    name: 'ClawBot Oracle',
    role: 'Intelligence Agent',
    tier: 'System',
    status: 'ACTIVE',
    icon: Brain,
    accent: 'purple',
    description:
      'On-chain data intelligence layer. Continuously monitors market conditions, risk signals, and protocol health to feed all agents with real-time context for better decision-making.',
    stats: { ops: '891,234', uptime: '99.99%', latency: '18ms' },
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
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            System Online — All Agents Active
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-mono font-bold tracking-tight mb-6">
          <span className="text-white">COSMO</span>
          <span className="neon-text-purple">CLAW</span>
          <span className="block text-2xl md:text-3xl text-slate-400 font-normal mt-2 tracking-wide">
            Autonomous DeFi Intelligence
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-slate-400 text-lg leading-relaxed mb-10 font-sans">
          A multi-tier agent swarm that autonomously executes DeFi operations,
          coordinates consensus, and escalates to human oversight — only when it matters.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/terminal"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            <Activity className="w-4 h-4" />
            Open Terminal
          </Link>
          <Link
            href="/whitepaper"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 hover:border-purple-400 hover:text-purple-200 font-mono transition-all"
          >
            Read Whitepaper
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live stats bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { label: 'Total Operations', value: '907,619' },
            { label: 'TVL Managed', value: '$4.2M' },
            { label: 'Agents Online', value: '4 / 4' },
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
            const isWide = i === 2 || i === 3;

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
                <Link
                  href="/tokenomics"
                  className="px-5 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-mono text-sm hover:border-purple-400 transition-all"
                >
                  Tokenomics
                </Link>
                <Link
                  href="/terminal"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                >
                  Launch Terminal
                </Link>
              </div>
            </div>
          </BentoItem>
        </div>
      </section>

      {/* Feature Row */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Bot,
              title: 'Fully Autonomous Execution',
              desc: 'AI agents handle routine DeFi operations end-to-end — no human needed for standard swaps and rebalancing.',
              color: 'text-emerald-400',
            },
            {
              icon: Lock,
              title: 'Cryptographic Consensus',
              desc: '2-of-3 agent committee for medium-risk ops. Stakers co-sign and earn $COSMO rewards for every approved transaction.',
              color: 'text-cyan-400',
            },
            {
              icon: Shield,
              title: 'Human Safeguard Layer',
              desc: 'High-value decisions always require NFT-holder approval via Discord/Telegram. The swarm prepares — you confirm.',
              color: 'text-purple-400',
            },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-all"
              >
                <Icon className={`w-8 h-8 ${f.color} mb-4`} />
                <h3 className="font-mono text-base font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-sans">{f.desc}</p>
              </div>
            );
          })}
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
