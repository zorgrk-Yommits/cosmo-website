'use client';

import Link from 'next/link';
import { FileText, Download, Clock } from 'lucide-react';

const PDF_URL = '/whitepaper/COSMO_Whitepaper_Holding.pdf';

export default function WhitepaperPage() {
  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-8">
          <FileText className="w-3 h-3 text-purple-400" />
          <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
            Whitepaper — Update in Progress
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-mono font-bold text-white mb-6 leading-tight">
          $COSMO Whitepaper <span className="neon-text-purple">v3</span>
          <span className="block text-xl md:text-2xl text-slate-400 font-normal mt-3">
            in active drafting
          </span>
        </h1>

        <div className="space-y-5 text-slate-300 font-sans leading-relaxed mb-10 max-w-2xl">
          <p>
            <span className="font-semibold text-slate-100">Status (April 2026):</span>{' '}
            Whitepaper v2.1 has been retired.
          </p>
          <p>
            The COSMO project has pivoted to a native Supra stack architecture.
            Settlement, identity, reputation, and token logic now run on-chain
            via SupraEVM AutoFi primitives — not as an external execution layer.
          </p>
          <p>
            CosmoClaw is positioned as the specialized DeFi execution capability
            for the SupraOS agent ecosystem: the trading function that a
            user&apos;s Co-CFO delegates to when an on-chain action is required.
          </p>
          <p>
            Whitepaper v3 is in active drafting and will be published following
            the SupraFX integration alignment with Supra Labs.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/25 mb-10">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-sm text-cyan-300">
            Expected timeline:&nbsp;
            <span className="font-semibold">Q2 2026</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <a
            href={PDF_URL}
            download
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            <Download className="w-4 h-4" />
            Download Holding Statement
          </a>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 font-mono text-sm hover:border-purple-400 transition-all"
          >
            ← Back
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center">
        <p className="font-mono text-xs text-slate-600">
          $COSMO · April 2026 · heros.cloud
        </p>
      </footer>
    </div>
  );
}
