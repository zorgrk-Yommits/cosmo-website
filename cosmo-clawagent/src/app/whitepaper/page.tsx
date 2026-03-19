'use client';

import Link from 'next/link';
import { FileText, ArrowRight, Shield, Zap, Network, Brain, ChevronRight, Download, ExternalLink } from 'lucide-react';

const sections = [
  {
    id: '01',
    title: 'Abstract',
    content: `CosmoClawAgent introduces a novel multi-tier autonomous agent architecture for decentralized finance (DeFi). The protocol deploys a coordinated swarm of AI agents — each operating within cryptographically enforced authorization scopes — to autonomously execute financial operations with risk-graduated human oversight.

The system addresses the core tension in DeFi automation: efficiency versus security. By routing every operation through the appropriate trust tier (autonomous, consensus, or human-supervised), CosmoClawAgent achieves institutional-grade execution reliability without sacrificing decentralized control.

$COSMO, the native protocol token, aligns all participants — agents, stakers, and NFT-holders — through a deflationary fee-capture loop that grows stronger with every operation executed.`,
  },
  {
    id: '02',
    title: 'Problem Statement',
    content: `Current DeFi automation suffers from three fundamental failures:

**All-or-nothing trust models.** Existing protocols either run fully automated (high risk, no oversight) or require constant human approval (inefficient, slow). There is no graduated middle ground.

**Misaligned incentives.** Automation tools capture protocol value without distributing it to security participants. Users who provide oversight receive nothing.

**Single point of failure.** Centralized bots and keeper networks present attack surfaces. A single compromised agent can drain protocol funds.

CosmoClawAgent solves all three with a tiered agent swarm architecture backed by a deflationary token economy.`,
  },
  {
    id: '03',
    title: 'Architecture Overview',
    content: `The CosmoClawAgent system consists of six specialized agents operating in a coordinated swarm:

**Intake Agent** — SupraFX RFQ-Listener. Parses incoming RFQ-IDs, classifies trade intent, and routes operations to the correct tier. First contact point for all market signals.

**Analysis Agent** — Mistral AI + Supra Oracle integration. Non-deterministic reasoning layer that evaluates trade quality, risk exposure, and market context. Powers all Tier 2 decisions.

**Risk Manager** — Co-signing guardian for Tier 2 trades. $COSMO stakers register as Risk Agents, provide collateral, and earn co-signing rewards. Enforces 2-of-3 cryptographic approval.

**Liquidity Scout** — Cross-chain liquidity discovery via OpenBlocks.ai. Finds optimal execution routes across chains, protocols, and liquidity pools for every operation.

**Gas Monitor** — Deterministic rule-based execution timing. Monitors gas prices, mempool conditions, and block availability to optimize transaction submission across all tiers.

**Negotiation Agent** — Dual-mode closer. Tier 1: fully autonomous for trades under $50. Tier 3: pre-packages complex deals for NFT-holder co-signature via Discord/Telegram (Disco protocol).

All agents communicate via a signed message bus with replay protection. No agent can act outside its defined authorization scope.`,
  },
  {
    id: '04',
    title: 'The Three-Tier Trust Model',
    subsections: [
      {
        title: 'Tier 1 — Fully Autonomous Execution',
        content: `Operations classified as low-risk are handled by the Intake Agent and Gas Monitor. The Intake Agent classifies the RFQ, the Gas Monitor selects the optimal submission window, and the Negotiation Agent signs autonomously for trades under $50.

For sub-threshold operations the classification engine evaluates: transaction size (< $10,000), target protocol (whitelist), slippage bounds, and current market volatility index. No human involvement, no committee vote — pure execution velocity for routine operations.`,
      },
      {
        title: 'Tier 2 — Multi-Agent Consensus',
        content: `Medium-risk operations require Analysis Agent evaluation followed by Risk Manager co-signing. The Analysis Agent (Mistral AI + Supra Oracle) assesses trade quality and risk exposure. The Risk Manager then broadcasts to registered $COSMO stakers for cryptographic co-signature within the consensus window (default: 30 seconds).

$COSMO stakers who register as Risk Agents receive transaction-level alerts. Co-signing earns a fraction of the operation's protocol fee — creating a passive income stream tied directly to protocol usage.`,
      },
      {
        title: 'Tier 3 — Human Co-Signature',
        content: `High-stakes operations are coordinated by the Negotiation Agent operating in Disco mode. The full swarm pre-packages the execution context: simulation results, risk analysis from the Analysis Agent, Liquidity Scout routing data, and worst-case scenarios.

The package is delivered via Discord and Telegram to all registered NFT-holders. The first qualifying holder to review and co-sign authorizes execution. The human approves once; the swarm executes precisely.`,
      },
    ],
  },
  {
    id: '05',
    title: 'Token Economy ($COSMO)',
    content: `$COSMO is the sole governance and utility token of CosmoClawAgent. Total supply is fixed at 100,000,000 — no inflation, ever.

**Fee Distribution:** 30% of all protocol fees are used to purchase $COSMO on open markets and burn them permanently, creating constant deflationary pressure proportional to protocol usage.

**Staking Rewards:** 70% of protocol fees are distributed to active Risk Agents (Tier 2 stakers) proportional to their co-signing activity.

**Governance:** All protocol parameter changes — risk thresholds, fee percentages, supported chains, agent authorization scopes — require $COSMO governance votes.

**NFT Minting:** Tier 3 co-signature rights require burning $COSMO to mint governance NFTs. This creates a permanent supply sink while distributing oversight responsibility.

The economic flywheel: More protocol usage → more fee burns → reduced supply → higher per-token value → more staking incentive → more security → more protocol usage.`,
  },
  {
    id: '06',
    title: 'Security Model',
    content: `**Cryptographic Authorization Scopes.** Each agent holds a key pair with a capability token defining its maximum authorization. Tier 1 agents cannot sign transactions above their threshold — the smart contract enforces this at verification time.

**Replay Protection.** All agent messages include monotonic nonces and chain-specific domain separators. Replaying a valid message on another chain or block produces an invalid signature.

**Watchtower Network.** Independent watchtower nodes monitor all agent transactions and can trigger emergency halts if anomalous patterns are detected.

**Multi-Sig Treasury.** Protocol treasury funds are held in a 5-of-9 multisig. No single agent or team member can unilaterally move treasury assets.

**Formal Verification.** Core authorization contracts are formally verified using the K Framework. Agent capability tokens are provably bounded.

**Bug Bounty.** A $500,000 USDC bug bounty program is active at launch. Critical findings receive 50% of the bounty pool.`,
  },
  {
    id: '07',
    title: 'Roadmap',
    phases: [
      { phase: 'Phase 1', label: 'Q1 2025', title: 'Foundation', items: ['Mainnet deploy (ETH)', 'Tier 1 agent live', '$COSMO token launch', 'Risk Agent staking'] },
      { phase: 'Phase 2', label: 'Q2 2025', title: 'Consensus', items: ['Analysis Agent + Risk Manager', '2-of-3 consensus network', 'NFT governance mint', 'Discord/Telegram alerts'] },
      { phase: 'Phase 3', label: 'Q3 2025', title: 'Expansion', items: ['Arbitrum deployment', 'Base deployment', 'Cross-chain Tier 3 approvals', 'Oracle agent launch'] },
      { phase: 'Phase 4', label: 'Q4 2025', title: 'Autonomy', items: ['Full agent swarm live', 'Formal verification complete', 'DAO governance launch', '$10M TVL target'] },
    ],
  },
];

export default function WhitepaperPage() {
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Header */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-6">
          <FileText className="w-3 h-3 text-purple-400" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            Technical Whitepaper — v2.0.0
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-4">
              {'>'} WHITE<span className="neon-text-purple">PAPER</span>
            </h1>
            <p className="text-slate-400 font-sans text-lg max-w-2xl">
              CosmoClawAgent: A Multi-Tier Autonomous Agent Architecture for Decentralized Finance
            </p>
            <div className="flex items-center gap-4 mt-4 font-mono text-xs text-slate-600">
              <span>Published: March 2025</span>
              <span className="text-purple-500">|</span>
              <span>Version 2.0.0</span>
              <span className="text-purple-500">|</span>
              <span>23 pages</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <a href="/COSMO_Whitepaper_v2_0.pdf" download className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all">
              <Download className="w-4 h-4" />
              Download PDF
            </a>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-mono text-sm hover:border-purple-400 transition-all">
              <ExternalLink className="w-4 h-4" />
              View on IPFS
            </button>
          </div>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-10">
        <div className="bg-[#0a0a18]/80 border border-purple-500/20 rounded-2xl p-6">
          <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-4">
            Table of Contents
          </div>
          <div className="grid md:grid-cols-2 gap-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#section-${s.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-all group"
              >
                <span className="font-mono text-xs text-purple-500">{s.id}</span>
                <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
                <span className="font-mono text-xs text-slate-400 group-hover:text-white transition-colors">
                  {s.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <article className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="space-y-12">
          {sections.map((section) => (
            <div
              key={section.id}
              id={`section-${section.id}`}
              className="bg-[#0a0a18]/60 border border-white/[0.07] rounded-2xl p-8 scroll-mt-24"
            >
              {/* Section Header */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/[0.06]">
                <span className="font-mono text-xs text-purple-500 font-bold">[{section.id}]</span>
                <h2 className="font-mono text-xl font-bold text-white">{section.title}</h2>
              </div>

              {/* Roadmap Section */}
              {'phases' in section && (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {section.phases!.map((p) => (
                    <div key={p.phase} className="bg-black/30 border border-purple-500/15 rounded-xl p-4">
                      <div className="font-mono text-xs text-purple-400 font-bold mb-0.5">{p.phase}</div>
                      <div className="font-mono text-xs text-slate-500 mb-3">{p.label} — {p.title}</div>
                      <ul className="space-y-1.5">
                        {p.items.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <ChevronRight className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
                            <span className="font-mono text-xs text-slate-400">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Subsections */}
              {'subsections' in section && (
                <div className="space-y-6">
                  {section.subsections!.map((sub) => (
                    <div key={sub.title}>
                      <h3 className="font-mono text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
                        <ChevronRight className="w-3 h-3" />
                        {sub.title}
                      </h3>
                      <div className="font-sans text-slate-400 text-sm leading-relaxed pl-5">
                        {sub.content.split('\n\n').map((para, i) => (
                          <p key={i} className="mb-3 last:mb-0">{para}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Regular Content */}
              {'content' in section && (
                <div className="font-sans text-slate-400 text-sm leading-relaxed space-y-4">
                  {section.content!.split('\n\n').map((para, i) => {
                    const formatted = para.replace(/\*\*(.+?)\*\*/g, '<span class="font-semibold text-slate-200">$1</span>');
                    return (
                      <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-purple-600/10 border border-purple-500/25 rounded-2xl p-8 text-center">
          <h2 className="font-mono text-2xl font-bold text-white mb-3">
            {'>'} JOIN THE SWARM
          </h2>
          <p className="text-slate-400 font-sans text-sm max-w-xl mx-auto mb-6">
            CosmoClawAgent is live on mainnet. Stake $COSMO, become a Risk Agent,
            and earn rewards while securing the future of autonomous DeFi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/launch"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-semibold transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
            >
              <Zap className="w-4 h-4" />
              Launch App
            </Link>
            <Link
              href="/tokenomics"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 font-mono hover:border-purple-400 transition-all"
            >
              View Tokenomics
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </article>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          © 2025 CosmoClawAgent — Autonomous DeFi Intelligence{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
