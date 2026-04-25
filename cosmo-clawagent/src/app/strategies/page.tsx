'use client';

import { useRouter } from 'next/navigation';
import { Lock, Zap, CheckCircle, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useWallet } from '@context/WalletContext';

interface StrategyCard {
  title: string;
  badge: string;
  tag: string;
  subtitle: string;
  desc: string;
  stats: { label: string; value: string }[];
}

const strategies: StrategyCard[] = [
  {
    title: 'Taker Strategy',
    badge: 'TIER 1',
    tag: 'SupraFX',
    subtitle: 'Autonomous · <$50 USDC',
    desc: 'CosmoClaw autonomously responds to incoming SupraFX RFQs as Taker. Immediate on-chain execution within the 60-second settlement window.',
    stats: [
      { label: 'Settlement', value: '+1 Rep/Trade' },
      { label: 'Co-Signer', value: 'CosmoClaw' },
      { label: 'Notional', value: '<$50' },
    ],
  },
  {
    title: 'Maker Strategy',
    badge: 'TIER 1',
    tag: 'SupraFX',
    subtitle: 'Vault Liquidity · Passive Yield',
    desc: 'CosmoClaw provides liquidity as Maker in SupraFX Vaults. $COSMO as collateral — passive yield on idle collateral during settlement standby.',
    stats: [
      { label: 'Yield', value: 'Passive' },
      { label: 'Collateral', value: '$COSMO' },
      { label: 'Risk', value: 'Low' },
    ],
  },
  {
    title: 'Hybrid Strategy',
    badge: 'TIER 1',
    tag: 'SupraFX',
    subtitle: 'Taker + Maker · Balanced',
    desc: 'Dynamically combines Taker execution and Maker liquidity. CosmoClaw switches between both roles based on market conditions for maximum capital efficiency.',
    stats: [
      { label: 'Mode', value: 'Dynamic' },
      { label: 'Co-Signer', value: 'CosmoClaw' },
      { label: 'Risk', value: 'Medium' },
    ],
  },
];

export default function StrategiesPage() {
  const router = useRouter();
  const { address, connected, isNFTHolder, nftCount, nftCheckLoading, notFound } = useWallet();

  const shortAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const canActivate = connected && isNFTHolder;

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Page Header */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-6">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
                CosmoClaw Strategy Hub
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-4">
              {'>'} STRATE<span className="neon-text-purple">GIES</span>
              <span className="blinking-cursor" />
            </h1>
            <p className="text-slate-400 font-sans text-lg max-w-2xl">
              Select a strategy and let CosmoClaw handle execution autonomously within your authorized scope.
            </p>
          </div>
          <div className="hidden lg:block flex-shrink-0">
            <Image
              src="/images/cosmo2.jpg"
              alt="COSMO Agent"
              width={240}
              height={240}
              className="rounded-2xl object-cover drop-shadow-xl opacity-90"
            />
          </div>
        </div>
      </section>

      {/* Wallet Banner */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0a0a18]/80 border border-purple-500/20 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <div className="font-mono text-sm">
              {connected ? (
                <span className="text-emerald-400">
                  StarKey connected{' '}
                  <span className="text-slate-400 text-xs ml-2">{shortAddress(address!)}</span>
                </span>
              ) : (
                <span className="text-slate-400">Wallet not connected</span>
              )}
            </div>

            {/* NFT holder badge */}
            {connected && !nftCheckLoading && isNFTHolder && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[0.65rem] text-emerald-300 font-bold tracking-widest uppercase">
                <CheckCircle className="w-3 h-3" />
                COSMO Holder ✓{nftCount > 1 ? ` ×${nftCount}` : ''}
              </span>
            )}

            {/* NFT check loading */}
            {connected && nftCheckLoading && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Checking NFT…
              </span>
            )}
          </div>

          {!connected && (
            <button
              onClick={() => router.push('/launch')}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] flex-shrink-0"
            >
              Connect via LaunchApp →
            </button>
          )}
        </div>
      </section>

      {/* NFT Gate Overlay — connected but not a holder */}
      {connected && !nftCheckLoading && !isNFTHolder && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-6 py-5">
            <div>
              <p className="font-mono text-sm font-bold text-rose-400 mb-1">
                COSMO NFT required to activate strategies
              </p>
              <p className="font-sans text-xs text-slate-400">
                You need at least one COSMO ClawAgent NFT in this wallet to unlock the Strategy Hub.
              </p>
            </div>
            <a
              href="https://www.tradeport.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
            >
              Mint on TradePort →
            </a>
          </div>
        </section>
      )}

      {/* Strategy Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          {strategies.map((strategy) => (
            <div
              key={strategy.title}
              className={`bento-item relative flex flex-col transition-all duration-300 ${
                !canActivate ? 'opacity-70' : ''
              }`}
            >
              {/* Lock overlay — not activated */}
              {!canActivate && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="w-7 h-7 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Badges row */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono text-[0.65rem] font-bold tracking-widest uppercase">
                  {strategy.badge}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono text-[0.65rem] font-bold tracking-widest uppercase">
                  {strategy.tag}
                </span>
              </div>

              {/* Title + subtitle */}
              <h3 className="font-mono text-lg font-bold text-white mb-1">{strategy.title}</h3>
              <p className="font-mono text-xs text-purple-400 mb-4">{strategy.subtitle}</p>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed font-sans mb-6 flex-1">
                {strategy.desc}
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06] mb-5">
                {strategy.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="font-mono text-xs font-bold text-purple-300">{stat.value}</div>
                    <div className="font-mono text-[0.6rem] text-slate-600 mt-0.5 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Activate button */}
              <button
                disabled={!canActivate}
                className={`w-full py-2.5 rounded-xl font-mono text-sm font-semibold transition-all duration-200 ${
                  canActivate
                    ? 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed border border-white/[0.06]'
                }`}
              >
                {canActivate ? 'Activate' : 'Locked'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Hint — only when not connected */}
      {!connected && (
        <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16 text-center">
          <p className="font-mono text-xs text-slate-500 mb-1">
            Connect your StarKey Wallet via LaunchApp to activate strategies
          </p>
          <p className="font-mono text-xs text-purple-500/70">NFT holders only</p>
        </section>
      )}

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          © 2025 CosmoClawAgent — Autonomous DeFi Intelligence{' '}
          <span className="text-purple-500">|</span> $COSMO
        </p>
      </footer>
    </div>
  );
}
