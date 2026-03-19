'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Coins, TrendingUp, Shield, Zap, Users, Lock, Vote, Star, Clock, RefreshCw } from 'lucide-react';
import BentoItem from '@/components/ui/terminal-bento-grid';

const ATMOS_ENDPOINT = 'https://prod-gw.atmosprotocol.com/graphql/';
const ATMOS_API_KEY = 'dbe5b13196357b6d2fc2c8aebe04ae464e7d7bc56063b297d22d8e0f9bf56aa';
const SUPRA_EVM = 'https://rpc-multivm.supra.com/rpc/v1/eth/wallet_integration';
const CONTRACT = '0x184eBF0D92dBAE5529d803908195A67E8Ff653AF';
const DEAD = '0x000000000000000000000000000000000000dead';

const ATMOS_QUERY = `{
  pump_coins(where: { symbol: { _eq: "COSMO" } }) {
    market_cap updated_price graduation_mc is_crowned
    virtual_supra_reserves virtual_token_reserves
  }
}`;

async function evmCall(data: string, id: number): Promise<string | null> {
  const res = await fetch(SUPRA_EVM, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: CONTRACT, data }, 'latest'], id }),
  });
  const json = await res.json();
  return json.result ?? null;
}

async function fetchLiveData(): Promise<LiveData> {
  const [atmosRes, totalSupplyHex, burnedHex] = await Promise.all([
    fetch(ATMOS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ATMOS_API_KEY },
      body: JSON.stringify({ query: ATMOS_QUERY }),
    }),
    evmCall('0x18160ddd', 1),
    evmCall(`0x70a08231000000000000000000000000${DEAD.slice(2).padStart(64, '0')}`, 2),
  ]);

  const atmosJson = await atmosRes.json();
  const coin = atmosJson?.data?.pump_coins?.[0] ?? null;

  const DECIMALS = BigInt(10 ** 18);
  const totalSupply = totalSupplyHex ? Number(BigInt(totalSupplyHex) / DECIMALS) : null;
  const burned = burnedHex ? Number(BigInt(burnedHex) / DECIMALS) : null;

  const OCTAS = 1e8;
  const priceOctas = coin?.updated_price ?? null;
  const marketCapOctas = coin?.market_cap ?? null;
  const graduationMc = coin?.graduation_mc ? Number(coin.graduation_mc) : null;

  return {
    priceSupra: priceOctas !== null ? priceOctas / OCTAS : null,
    marketCapSupra: marketCapOctas !== null ? marketCapOctas / OCTAS : null,
    bondingCurvePct:
      marketCapOctas !== null && graduationMc && graduationMc > 0
        ? Math.min(100, (marketCapOctas / graduationMc) * 100)
        : null,
    isGraduated: coin?.is_crowned ?? null,
    totalSupply,
    burned,
    fetchedAt: new Date().toISOString(),
  };
}

const supplyData = [
  { label: 'Ecosystem & Rewards', pct: 35, color: '#8b5cf6', desc: 'Staking rewards, Risk Agent incentives, co-signing fees' },
  { label: 'Protocol Treasury', pct: 20, color: '#06b6d4', desc: 'Grants, partnerships, future development' },
  { label: 'Community & Airdrop', pct: 15, color: '#10b981', desc: 'Early adopters, governance bootstrapping' },
  { label: 'Team & Advisors', pct: 15, color: '#f59e0b', desc: '3-year vesting, 1-year cliff' },
  { label: 'Public Sale', pct: 10, color: '#ec4899', desc: 'Initial liquidity and price discovery' },
  { label: 'Liquidity Pools', pct: 5, color: '#64748b', desc: 'DEX liquidity provision, locked 2 years' },
];

const utilityItems = [
  {
    icon: Shield,
    title: 'Risk Agent Staking',
    desc: 'Stake $COSMO to become a Risk Agent. Co-sign Tier 2 operations and earn a share of protocol fees for every approved transaction.',
    reward: '4–12% APY',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/25',
  },
  {
    icon: Vote,
    title: 'Governance Voting',
    desc: 'Vote on protocol upgrades, risk thresholds, new chain deployments, and treasury allocations. 1 $COSMO = 1 vote.',
    reward: 'Voting Power',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/25',
  },
  {
    icon: Zap,
    title: 'Gas Subsidization',
    desc: 'Hold $COSMO to receive gas rebates on Tier 1 operations. The more you hold, the lower your execution costs.',
    reward: 'Up to 80% rebate',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  {
    icon: Star,
    title: 'NFT Tier Access',
    desc: 'Burn $COSMO to mint governance NFTs granting Tier 3 co-signature rights. NFT-holders are the final human safeguard.',
    reward: 'Tier 3 Rights',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/25',
  },
  {
    icon: Lock,
    title: 'Protocol Fee Capture',
    desc: '30% of all protocol fees are used to buy back and burn $COSMO. Deflationary pressure increases with protocol usage.',
    reward: 'Deflationary',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/25',
  },
  {
    icon: TrendingUp,
    title: 'Yield Boost Multiplier',
    desc: 'Staked $COSMO multiplies yield farming returns in partnered protocols — up to 3x on approved liquidity pools.',
    reward: 'Up to 3× boost',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/25',
  },
];

const loopSteps = [
  { n: '01', title: 'Users stake $COSMO', desc: 'Becoming Risk Agents for Tier 2 consensus', icon: Users, color: 'text-cyan-400' },
  { n: '02', title: 'Risk Agents co-sign ops', desc: 'Approving medium-risk DeFi operations in real time', icon: Shield, color: 'text-purple-400' },
  { n: '03', title: 'Protocol generates fees', desc: 'From swaps, rebalancing, and execution across all tiers', icon: Coins, color: 'text-emerald-400' },
  { n: '04', title: '30% buyback & burn', desc: '$COSMO supply reduces — increasing scarcity', icon: TrendingUp, color: 'text-amber-400' },
  { n: '05', title: 'Stakers earn rewards', desc: '70% of fees distributed to Risk Agents & stakers', icon: Star, color: 'text-rose-400' },
  { n: '06', title: 'Value accrues to $COSMO', desc: 'More usage → more burns → higher staking APY', icon: Zap, color: 'text-indigo-400' },
];

interface LiveData {
  priceSupra: number | null;
  marketCapSupra: number | null;
  bondingCurvePct: number | null;
  isGraduated: boolean | null;
  totalSupply: number | null;
  burned: number | null;
  fetchedAt: string | null;
}

function fmt(n: number | null, decimals = 0): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function fmtSupra(n: number | null): string {
  if (n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M SUPRA`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K SUPRA`;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 4 })} SUPRA`;
}

const POLL_INTERVAL = 30_000; // 30 s
const STALE_AFTER = 60_000;   // mark stale after 60 s

export default function TokenomicsPage() {
  const [live, setLive] = useState<LiveData>({
    priceSupra: null,
    marketCapSupra: null,
    bondingCurvePct: null,
    isGraduated: null,
    totalSupply: null,
    burned: null,
    fetchedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchLiveData();
      setLive(data);
      setIsLive(true);
    } catch {
      // silently keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Mark stale if we haven't refreshed recently
  useEffect(() => {
    if (!live.fetchedAt) return;
    const check = setInterval(() => {
      const age = Date.now() - new Date(live.fetchedAt!).getTime();
      setIsLive(age < STALE_AFTER);
    }, 5_000);
    return () => clearInterval(check);
  }, [live.fetchedAt]);

  const supplyDisplay = live.totalSupply !== null
    ? fmt(live.totalSupply)
    : '—';

  const burnedDisplay = live.burned !== null
    ? fmt(live.burned)
    : '—';

  const priceDisplay = live.priceSupra !== null
    ? `${live.priceSupra.toFixed(6)} SUPRA`
    : '—';

  const mcDisplay = fmtSupra(live.marketCapSupra);

  const bcPct = live.bondingCurvePct !== null
    ? Math.round(live.bondingCurvePct)
    : null;

  const stats = [
    {
      label: 'Total Supply',
      value: loading ? '…' : supplyDisplay,
      unit: '$COSMO',
      color: 'text-purple-400',
    },
    {
      label: 'Current Price',
      value: loading ? '…' : priceDisplay,
      unit: 'on Atmos',
      color: 'text-cyan-400',
    },
    {
      label: 'Total Burned',
      value: loading ? '…' : burnedDisplay,
      unit: '$COSMO',
      color: 'text-rose-400',
    },
    {
      label: 'Staking APY',
      value: '4–12%',
      unit: 'Variable',
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Header */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-12 text-center">
        {/* Hero image — hidden on small screens */}
        <div className="hidden lg:block absolute top-8 right-6 z-20">
          <Image
            src="/images/cosmo1.jpg"
            alt="COSMO Agent"
            width={240}
            height={240}
            className="rounded-2xl object-cover drop-shadow-xl opacity-90"
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-6">
          <Coins className="w-3 h-3 text-purple-400" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            $COSMO Token — On-chain Supply
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-4">
          {'>'} TOKEN<span className="neon-text-purple">OMICS</span>
          <span className="blinking-cursor" />
        </h1>
        <p className="text-slate-400 font-sans text-lg max-w-2xl mx-auto">
          $COSMO is the economic backbone of the ClawAgent swarm — aligning stakers, agents,
          and protocol growth through a closed utility loop.
        </p>
      </section>

      {/* Live Market Data Panel */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-[#0a0a18]/80 border border-purple-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-widest">
              Live Market Data — Atmos Protocol + Supra EVM
            </div>
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs text-emerald-400 font-bold">LIVE</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                  <span className="font-mono text-xs text-slate-500">UPDATING…</span>
                </>
              )}
              {live.fetchedAt && (
                <span className="font-mono text-xs text-slate-600 ml-2">
                  {new Date(live.fetchedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Price */}
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-cyan-400">
                {loading ? <span className="text-slate-600">…</span> : priceDisplay}
              </div>
              <div className="font-mono text-xs text-slate-600 mt-1 uppercase tracking-wider">Price</div>
            </div>
            {/* Market Cap */}
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-purple-400">
                {loading ? <span className="text-slate-600">…</span> : mcDisplay}
              </div>
              <div className="font-mono text-xs text-slate-600 mt-1 uppercase tracking-wider">Market Cap</div>
            </div>
            {/* Bonding Curve */}
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-amber-400">
                {loading ? (
                  <span className="text-slate-600">…</span>
                ) : live.isGraduated ? (
                  <span className="text-emerald-400">GRADUATED ✓</span>
                ) : bcPct !== null ? (
                  `${bcPct}%`
                ) : '—'}
              </div>
              <div className="font-mono text-xs text-slate-600 mt-1 uppercase tracking-wider">Bonding Curve</div>
              {!loading && bcPct !== null && !live.isGraduated && (
                <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-1000"
                    style={{ width: `${bcPct}%` }}
                  />
                </div>
              )}
            </div>
            {/* Total Supply */}
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-emerald-400">
                {loading ? <span className="text-slate-600">…</span> : fmt(live.totalSupply)}
              </div>
              <div className="font-mono text-xs text-slate-600 mt-1 uppercase tracking-wider">Total Supply</div>
            </div>
          </div>
        </div>
      </section>

      {/* Token Stats */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center">
              <div className={`font-mono text-2xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="font-mono text-xs text-slate-600 uppercase tracking-wider">{s.label}</div>
              <div className={`font-mono text-xs ${s.color} mt-1 opacity-60`}>{s.unit}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Utility Loop */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <h2 className="font-mono text-2xl font-bold text-white mb-2">
            {'>'} $COSMO TOKEN UTILITY LOOP
          </h2>
          <p className="text-slate-500 font-mono text-sm">
            A self-reinforcing flywheel — every operation strengthens the network
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {loopSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.n}
                className="bg-[#0a0a18]/80 border border-white/[0.08] rounded-2xl p-5 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-slate-600 font-bold">{step.n}</span>
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                <h3 className={`font-mono text-sm font-bold ${step.color} mb-1`}>{step.title}</h3>
                <p className="font-sans text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-[#0a0a18]/80 border border-purple-500/20 rounded-2xl p-6 text-center">
          <div className="font-mono text-xs text-slate-500 mb-4 uppercase tracking-widest">Flywheel Effect</div>
          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm">
            {['Usage ↑', '→', 'Fees ↑', '→', 'Burns ↑', '→', 'Scarcity ↑', '→', 'APY ↑', '→', 'Stakers ↑', '→', 'Security ↑', '→', 'Usage ↑'].map((item, i) => (
              <span
                key={i}
                className={item === '→' ? 'text-slate-600' : 'text-purple-400 font-bold'}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Utility Cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <h2 className="font-mono text-2xl font-bold text-white mb-2">
            {'>'} UTILITY BREAKDOWN
          </h2>
          <p className="text-slate-500 font-mono text-sm">Six core use cases for $COSMO</p>
        </div>

        <div className="bento-grid">
          {utilityItems.map((item) => {
            const Icon = item.icon;
            return (
              <BentoItem key={item.title}>
                <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.border} border flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <h3 className={`font-mono text-sm font-bold ${item.color} mb-2`}>{item.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-sans mb-4">{item.desc}</p>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-bold ${item.bg} ${item.color} ${item.border} border`}>
                  <Star className="w-3 h-3" />
                  {item.reward}
                </div>
              </BentoItem>
            );
          })}
        </div>
      </section>

      {/* Token Distribution */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-8">
          <h2 className="font-mono text-2xl font-bold text-white mb-2">
            {'>'} TOKEN DISTRIBUTION
          </h2>
          <p className="text-slate-500 font-mono text-sm">
            Total supply:{' '}
            {loading
              ? '…'
              : live.totalSupply !== null
              ? `${live.totalSupply.toLocaleString()} $COSMO`
              : '1,000,000,000 $COSMO'}{' '}
            — fixed, no inflation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-[#0a0a18]/80 border border-white/[0.08] rounded-2xl p-6">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-6">Allocation</div>
            <div className="space-y-4">
              {supplyData.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs text-slate-300">{item.label}</span>
                    <span className="font-mono text-xs font-bold" style={{ color: item.color }}>
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                  <div className="font-mono text-xs text-slate-600 mt-1">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Numbers */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#0a0a18]/80 border border-white/[0.08] rounded-2xl p-6 flex-1">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-6">Key Numbers</div>
              <div className="space-y-4">
                {[
                  {
                    label: 'Max Supply',
                    val: loading ? '…' : live.totalSupply !== null ? `${live.totalSupply.toLocaleString()} $COSMO` : '—',
                    icon: Lock,
                  },
                  { label: 'Inflation Rate', val: '0% — Hard cap', icon: Shield },
                  { label: 'Burn Mechanism', val: '30% of protocol fees', icon: TrendingUp },
                  {
                    label: 'Total Burned',
                    val: loading ? '…' : live.burned !== null ? `${live.burned.toLocaleString()} $COSMO` : '—',
                    icon: Coins,
                  },
                  { label: 'Vesting (Team)', val: '3yr vest / 1yr cliff', icon: Clock },
                  { label: 'Governance', val: '1 token = 1 vote', icon: Vote },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                        <Icon className="w-3.5 h-3.5 text-purple-400" />
                        {item.label}
                      </div>
                      <span className="font-mono text-xs text-purple-300 font-bold">{item.val}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-purple-600/10 border border-purple-500/25 rounded-2xl p-5">
              <h3 className="font-mono text-sm font-bold text-purple-300 mb-2">
                Become a Risk Agent
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed font-sans mb-4">
                Stake $COSMO, co-sign Tier 2 operations, and earn a share of every fee generated by the swarm.
              </p>
              <Link
                href="/launch"
                className="flex items-center gap-2 text-purple-400 font-mono text-xs hover:text-purple-300 transition-colors"
              >
                Launch App <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
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
