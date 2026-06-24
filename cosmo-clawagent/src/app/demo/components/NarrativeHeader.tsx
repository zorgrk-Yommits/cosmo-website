'use client';

import { motion } from 'framer-motion';
import { META } from '../lib/lifecycle';

// OBEN — the explainer. Three short ideas, no whitepaper tone:
// what an RFQ is, what atomic means, why atomic is the whole point.
export default function NarrativeHeader() {
  return (
    <header className="relative max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-5"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
          On-chain replay · {META.network} · chain {META.chainId}
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.05 }}
        className="font-mono text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]"
      >
        <span className="neon-text-purple">One settlement.</span>{' '}
        <span className="text-slate-100">Both legs, or neither.</span>
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.12 }}
        className="mt-6 space-y-3 text-slate-300 font-sans text-lg leading-relaxed max-w-2xl"
      >
        <p>
          An <span className="text-purple-300 font-medium">RFQ</span> — request for quote — is a
          two-party trade: a <span className="text-slate-100">taker</span> asks for a price, a{' '}
          <span className="text-slate-100">maker</span> quotes one, and the two assets change hands.
        </p>
        <p>
          The settlement is <span className="text-emerald-300 font-medium">atomic</span>: both legs
          move in a single transaction, or the whole thing reverts. There is no in-between state and
          no moment where one side is exposed.
        </p>
        <p className="text-slate-400">
          That is the mechanism — <span className="text-slate-200">atomic settlement, enforced on-chain</span>. Below is a
          real one, replayed step by step from a <span className="text-slate-200">controlled Supra Mainnet RFQ proof
          with separated roles</span>: a SupraOS-side requesting agent (the demand side) initiates the RFQ,{' '}
          <span className="text-purple-300 font-medium">Kahless</span> represents the Maker side, and behind Kahless{' '}
          <span className="text-cyan-300 font-medium">K1</span> acts as the bonded Maker-Operator.{' '}
          <span className="text-emerald-300 font-medium">COSMO</span> locks, checks and settles the exchange atomically
          on Supra Mainnet. The founder no longer signs the Maker leg — this proves role separation and the
          settlement mechanism, not market activity.
        </p>
      </motion.div>
    </header>
  );
}
