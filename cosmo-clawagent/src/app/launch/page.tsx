'use client';

import { Zap, Wallet, LogOut, ExternalLink } from 'lucide-react';
import { useWallet } from '@context/WalletContext';
import Link from 'next/link';
import RFQInterface from './components/RFQInterface';

const shortAddress = (addr: string) =>
  addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

export default function LaunchPage() {
  const { address, connected, notFound, connect, disconnect } = useWallet();

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* Header */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-24 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-8">
          <Zap className="w-3 h-3 text-purple-400" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            ClawAgent — Launch App
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-4">
          {'>'} LAUNCH<span className="neon-text-purple">APP</span>
          <span className="blinking-cursor" />
        </h1>
        <p className="text-slate-400 font-sans text-lg max-w-xl mx-auto">
          Connect your StarKey Wallet to activate ClawBot strategies and access the agent swarm.
        </p>
      </section>

      {/* Wallet Card */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 pb-16">
        <div className="bg-[#0a0a18]/80 border border-purple-500/25 rounded-2xl p-8">

          {/* Status row */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/[0.06]">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <div className="font-mono text-sm">
              {connected ? (
                <span className="text-emerald-400">StarKey connected</span>
              ) : (
                <span className="text-slate-400">Wallet not connected</span>
              )}
            </div>
            {connected && (
              <span className="font-mono text-xs text-slate-500 ml-auto">
                {shortAddress(address!)}
              </span>
            )}
          </div>

          {/* Connected state */}
          {connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-2.5 flex-1 mr-3">
                  <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-0.5">
                    Supra Address
                  </div>
                  <div className="font-mono text-sm text-emerald-300">{shortAddress(address!)}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    href="/strategies"
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-mono text-xs font-semibold transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Strats
                  </Link>
                  <button
                    onClick={disconnect}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:border-white/20 font-mono text-xs transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Not connected state */
            <div className="space-y-3">
              <button
                onClick={connect}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              >
                <Wallet className="w-4 h-4" />
                Connect StarKey Wallet
              </button>

              {/* Inline error — only after a failed connect attempt */}
              {notFound && (
                <p style={{ color: '#f87171', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>
                  StarKey Wallet not found.{' '}
                  <a
                    href="https://starkey.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
                  >
                    Download here <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* RFQ Interface — only shown when wallet is connected */}
      {connected && (
        <section className="relative z-10 max-w-2xl mx-auto px-6 pb-16">
          <RFQInterface />
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
