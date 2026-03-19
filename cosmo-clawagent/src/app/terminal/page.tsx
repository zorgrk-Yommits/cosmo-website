'use client';

import { Zap, Network, Shield, CheckCircle, ChevronRight, Users, Bot, Lock } from 'lucide-react';
import BentoItem from '@/components/ui/terminal-bento-grid';
import Link from 'next/link';

const tiers = [
  {
    number: '01',
    label: 'Tier 1',
    title: 'Fully Autonomous',
    subtitle: 'Single Agent — No Approval Required',
    icon: Zap,
    accent: 'green',
    badge: 'tier-1-badge',
    riskLevel: 'LOW RISK',
    riskColor: 'text-emerald-400',
    agent: 'Intake Agent + Gas Monitor',
    description:
      'ClawBot Action Single agent signs and executes. Handles routine swaps, yield rebalancing, and small $COSMO trades. Fully autonomous — zero latency, zero human friction.',
    operations: [
      'Token swaps under $10,000 threshold',
      'Yield rebalancing across approved protocols',
      'Small $COSMO trades (< 0.5% of pool)',
      'Gas optimization & route selection',
      'Slippage protection enforcement',
    ],
    flow: [
      { step: 'Market signal detected', icon: '📡', color: 'text-slate-400' },
      { step: 'Risk threshold verified', icon: '✓', color: 'text-emerald-400' },
      { step: 'Agent signs transaction', icon: '✍', color: 'text-emerald-400' },
      { step: 'On-chain execution', icon: '⚡', color: 'text-emerald-400' },
    ],
    stats: { throughput: '~850 ops/day', avgTime: '142ms', successRate: '99.97%' },
    liveLog: [
      { time: '14:23:01', msg: 'SWAP ETH→USDC $4,200 — route: Uniswap V3', status: 'OK' },
      { time: '14:22:47', msg: 'REBALANCE yield pool AAVE/Compound +2.1%', status: 'OK' },
      { time: '14:22:11', msg: 'TRADE $COSMO 1,200 units — slippage 0.08%', status: 'OK' },
    ],
  },
  {
    number: '02',
    label: 'Tier 2',
    title: 'Multi-Agent Consensus',
    subtitle: '2-of-3 Internal Committee Vote',
    icon: Network,
    accent: 'cyan',
    badge: 'tier-2-badge',
    riskLevel: 'MEDIUM RISK',
    riskColor: 'text-cyan-400',
    agent: 'Analysis Agent + Risk Manager',
    description:
      '2-of-3 internal agent committee vote. $COSMO stakers acting as Risk Agents earn rewards for co-signing. Used for medium-risk operations that require cryptographic multi-party agreement.',
    operations: [
      'Transactions $10K–$500K threshold',
      'New protocol integrations',
      'Liquidity provision decisions',
      'Risk parameter updates',
      'Cross-chain bridge operations',
    ],
    flow: [
      { step: 'Operation proposed', icon: '📋', color: 'text-slate-400' },
      { step: 'Analysis Agent broadcasts to swarm', icon: '📡', color: 'text-cyan-400' },
      { step: '2-of-3 agents co-sign', icon: '✍✍', color: 'text-cyan-400' },
      { step: 'Stakers earn reward', icon: '💰', color: 'text-cyan-400' },
      { step: 'On-chain execution', icon: '⚡', color: 'text-cyan-400' },
    ],
    stats: { throughput: '~120 ops/day', avgTime: '380ms', successRate: '99.94%' },
    liveLog: [
      { time: '14:20:31', msg: 'QUORUM [2/3] LIQUIDITY Curve 3pool $85K', status: 'APPROVED' },
      { time: '14:18:09', msg: 'QUORUM [2/3] BRIDGE ETH→ARB $42,000', status: 'APPROVED' },
      { time: '14:15:44', msg: 'QUORUM [1/3] PARAM risk-factor update — PENDING', status: 'PENDING' },
    ],
  },
  {
    number: '03',
    label: 'Tier 3',
    title: 'Human Co-Signature',
    subtitle: 'NFT-Holder Final Approval',
    icon: Shield,
    accent: 'purple',
    badge: 'tier-3-badge',
    riskLevel: 'HIGH RISK',
    riskColor: 'text-purple-400',
    agent: 'Gas Monitor + Negotiation Agent',
    description:
      'Discord/Telegram alert to NFT-holder. Swarm pre-packages the deal, runs all simulations, and presents a ready-to-sign package. Human hits final approval — one click to authorize.',
    operations: [
      'Large trades > $500K',
      'Smart contract upgrades',
      'New chain deployments',
      'Treasury management decisions',
      'Emergency protocol halts',
    ],
    flow: [
      { step: 'High-stakes op detected', icon: '🚨', color: 'text-slate-400' },
      { step: 'Swarm pre-packages deal', icon: '📦', color: 'text-purple-400' },
      { step: 'Alert sent to NFT-holders', icon: '🔔', color: 'text-purple-400' },
      { step: 'Human reviews & signs', icon: '👤', color: 'text-purple-400' },
      { step: 'Co-signed execution', icon: '🔐', color: 'text-purple-400' },
    ],
    stats: { throughput: '~8 ops/day', avgTime: 'Human', successRate: '100%' },
    liveLog: [
      { time: '12:44:00', msg: 'ALERT sent → #cosmo-alerts — Treasury realloc $900K', status: 'AWAITING' },
      { time: '09:31:12', msg: 'SIGNED by holder 0x4f2a…e91c — Bridge deploy ARB', status: 'EXECUTED' },
      { time: '07:05:55', msg: 'PACKAGED deal — New LP Curve USDC/COSMO $1.2M', status: 'AWAITING' },
    ],
  },
];

const statusColor: Record<string, string> = {
  OK: 'text-emerald-400',
  APPROVED: 'text-cyan-400',
  PENDING: 'text-yellow-400',
  AWAITING: 'text-purple-400',
  EXECUTED: 'text-emerald-400',
};

export default function TerminalPage() {
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Header */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-300 tracking-widest uppercase">
            Terminal — Execution Layer Active
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-4">
          {'>'} EXECUTION <span className="neon-text-purple">TIERS</span>
          <span className="blinking-cursor" />
        </h1>
        <p className="text-slate-400 font-sans text-lg max-w-2xl mx-auto">
          Three graduated trust layers. From fully autonomous micro-ops to human-governed
          macro-decisions — the right agent for every risk level.
        </p>
      </section>

      {/* Tier Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="flex flex-col gap-8">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isGreen = tier.accent === 'green';
            const isCyan = tier.accent === 'cyan';
            const isPurple = tier.accent === 'purple';

            const glowBorder = isGreen
              ? 'border-emerald-500/40 hover:border-emerald-400/60'
              : isCyan
              ? 'border-cyan-500/40 hover:border-cyan-400/60'
              : 'border-purple-500/40 hover:border-purple-400/60';

            const iconBg = isGreen
              ? 'bg-emerald-500/15 border-emerald-500/30'
              : isCyan
              ? 'bg-cyan-500/15 border-cyan-500/30'
              : 'bg-purple-500/15 border-purple-500/30';

            const iconColor = isGreen
              ? 'text-emerald-400'
              : isCyan
              ? 'text-cyan-400'
              : 'text-purple-400';

            const accentLine = isGreen
              ? 'from-emerald-500/60'
              : isCyan
              ? 'from-cyan-500/60'
              : 'from-purple-500/60';

            return (
              <div
                key={tier.number}
                className={`relative bg-[#0a0a18]/80 backdrop-blur-xl border ${glowBorder} rounded-2xl overflow-hidden transition-all duration-300`}
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${accentLine} via-transparent to-transparent`} />

                <div className="p-8">
                  {/* Tier Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${iconBg} border flex items-center justify-center shrink-0`}>
                        <Icon className={`w-7 h-7 ${iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`tier-badge ${tier.badge}`}>{tier.label}</span>
                          <span className={`font-mono text-xs font-bold ${tier.riskColor}`}>
                            {tier.riskLevel}
                          </span>
                        </div>
                        <h2 className="font-mono text-2xl font-bold text-white">{tier.title}</h2>
                        <p className="font-mono text-sm text-slate-500">{tier.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-500">
                      <div className={`${iconColor} font-bold text-lg`}>{tier.stats.throughput}</div>
                      <div>avg {tier.stats.avgTime} · {tier.stats.successRate} success</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Description + Operations */}
                    <div className="md:col-span-1">
                      <p className="text-slate-400 text-sm leading-relaxed font-sans mb-5">
                        {tier.description}
                      </p>
                      <div className="space-y-2">
                        {tier.operations.map((op) => (
                          <div key={op} className="flex items-start gap-2">
                            <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${iconColor}`} />
                            <span className="font-mono text-xs text-slate-400">{op}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Execution Flow */}
                    <div className="md:col-span-1">
                      <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-4">
                        Execution Flow
                      </div>
                      <div className="space-y-3">
                        {tier.flow.map((step, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                              i === 0
                                ? 'border-slate-600 text-slate-500'
                                : `border-current ${step.color}`
                            }`}>
                              {i + 1}
                            </div>
                            <span className={`font-mono text-xs ${step.color}`}>{step.step}</span>
                            <span className="text-sm">{step.icon}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Log */}
                    <div className="md:col-span-1">
                      <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-4">
                        Live Log
                      </div>
                      <div className="bg-black/40 border border-white/8 rounded-xl p-4 space-y-3">
                        {tier.liveLog.map((log, i) => (
                          <div key={i} className="font-mono text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-slate-600">{log.time}</span>
                              <span className={statusColor[log.status] || 'text-slate-400'}>
                                [{log.status}]
                              </span>
                            </div>
                            <div className="text-slate-400 leading-relaxed">{log.msg}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Agent Tag */}
                  <div className={`mt-6 pt-6 border-t border-white/6 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Bot className={`w-4 h-4 ${iconColor}`} />
                      <span className={`font-mono text-xs ${iconColor}`}>{tier.agent}</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      &nbsp;ONLINE
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Summary Bento */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-6 text-center">
          System Overview
        </div>
        <div className="bento-grid">
          <BentoItem>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-mono text-sm font-bold text-white">Tier 1 Stats</span>
            </div>
            <div className="space-y-2 font-mono text-xs text-slate-400">
              <div className="flex justify-between"><span>Daily ops</span><span className="text-emerald-400">~850</span></div>
              <div className="flex justify-between"><span>Avg latency</span><span className="text-emerald-400">142ms</span></div>
              <div className="flex justify-between"><span>Success rate</span><span className="text-emerald-400">99.97%</span></div>
              <div className="flex justify-between"><span>Max tx size</span><span className="text-emerald-400">$10,000</span></div>
            </div>
          </BentoItem>

          <BentoItem>
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <span className="font-mono text-sm font-bold text-white">Tier 2 Stats</span>
            </div>
            <div className="space-y-2 font-mono text-xs text-slate-400">
              <div className="flex justify-between"><span>Daily ops</span><span className="text-cyan-400">~120</span></div>
              <div className="flex justify-between"><span>Avg latency</span><span className="text-cyan-400">380ms</span></div>
              <div className="flex justify-between"><span>Consensus</span><span className="text-cyan-400">2-of-3</span></div>
              <div className="flex justify-between"><span>Max tx size</span><span className="text-cyan-400">$500,000</span></div>
            </div>
          </BentoItem>

          <BentoItem>
            <div className="flex items-center gap-3 mb-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <span className="font-mono text-sm font-bold text-white">Tier 3 Stats</span>
            </div>
            <div className="space-y-2 font-mono text-xs text-slate-400">
              <div className="flex justify-between"><span>Daily ops</span><span className="text-purple-400">~8</span></div>
              <div className="flex justify-between"><span>Approval</span><span className="text-purple-400">Human</span></div>
              <div className="flex justify-between"><span>Alert channels</span><span className="text-purple-400">Discord/TG</span></div>
              <div className="flex justify-between"><span>Min holder</span><span className="text-purple-400">NFT</span></div>
            </div>
          </BentoItem>

          <BentoItem className="col-span-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-mono text-xl font-bold text-white mb-2">
                  {'>'} INTELLIGENT RISK ROUTING
                </h3>
                <p className="text-slate-400 font-sans text-sm max-w-xl">
                  Every operation is automatically classified and routed to the appropriate tier.
                  Tier 1 handles volume, Tier 2 handles value, Tier 3 handles consequence.
                  The swarm never escalates unnecessarily — and never under-escalates.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/tokenomics"
                  className="px-5 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-mono text-sm hover:border-purple-400 transition-all"
                >
                  View Tokenomics
                </Link>
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all"
                >
                  Meet the Agents
                </Link>
              </div>
            </div>
          </BentoItem>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          © 2025 CosmoClawAgent — Autonomous DeFi Intelligence{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
