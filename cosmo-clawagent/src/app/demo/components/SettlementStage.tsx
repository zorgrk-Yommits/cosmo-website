'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { ECONOMICS, formatToken, formatTokenWithSymbol, TOKEN_SYMBOL } from '../lib/lifecycle';

interface SettlementStageProps {
  // armed = the settlement step is the active step; triggers the one big moment.
  armed: boolean;
}

// THE climax. Two value streams cross simultaneously: the taker's amount_in and
// the maker's amount_out move in the same instant — "both sides, or neither".
// This is the only large motion sequence on the page. Honors reduced-motion.
export default function SettlementStage({ armed }: SettlementStageProps) {
  const reduce = useReducedMotion();
  const { amountIn, amountOut, minAmountOut, spreadBps, spreadPct, settlementGas, escrowAfterSettle } =
    ECONOMICS;

  // When reduced motion is requested, snap straight to the settled state.
  const animate = armed && !reduce;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-[rgba(8,20,16,0.6)] p-6 backdrop-blur">
      {/* atmosphere */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(16,185,129,0.10) 0%, transparent 70%)',
        }}
      />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Atomic settlement
          </span>
          <span className="font-mono text-[11px] text-slate-500">SettlementRecorded</span>
        </div>

        {/* the two crossing legs */}
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
          {/* taker leg — flows right */}
          <motion.div
            initial={false}
            animate={animate ? { x: [-18, 0], opacity: [0.4, 1] } : { x: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-4"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-purple-300/70">
              Taker sends
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-purple-100">
              {formatToken(amountIn)}{' '}
              <span className="text-sm font-normal text-purple-300/70">{TOKEN_SYMBOL}</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">token_in · 0x70c1</div>
          </motion.div>

          {/* simultaneity marker */}
          <div className="flex items-center justify-center">
            <motion.span
              initial={false}
              animate={
                animate
                  ? { scale: [0.7, 1.15, 1], opacity: [0, 1, 1] }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ duration: 1.1, times: [0, 0.6, 1], ease: 'easeOut' }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.5)]"
              aria-hidden
            >
              <ArrowRight className="h-5 w-5" />
            </motion.span>
          </div>

          {/* maker leg — flows left (i.e. arrives to taker) */}
          <motion.div
            initial={false}
            animate={animate ? { x: [18, 0], opacity: [0.4, 1] } : { x: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-right md:text-left"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-cyan-300/70">
              Taker receives
            </div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-cyan-100">
              {formatToken(amountOut)}{' '}
              <span className="text-sm font-normal text-cyan-300/70">{TOKEN_SYMBOL}</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">token_out · 0x70c2</div>
          </motion.div>
        </div>

        {/* economics strip — spread computed client-side, floor from the request */}
        <motion.div
          initial={false}
          animate={animate ? { opacity: [0, 1], y: [8, 0] } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: animate ? 0.9 : 0 }}
          className="mt-5 grid grid-cols-3 gap-3"
        >
          <Metric label="Spread (computed)" value={`${spreadBps} bps`} sub={`${spreadPct.toFixed(2)}%`} accent="emerald" />
          <Metric label="Min out (floor)" value={formatTokenWithSymbol(minAmountOut)} sub="from RequestCreated" accent="slate" />
          <Metric
            label="Delivered ≥ floor"
            value={amountOut >= minAmountOut ? 'yes' : 'no'}
            sub={`${formatToken(amountOut)} ≥ ${formatToken(minAmountOut)} ${TOKEN_SYMBOL}`}
            accent="emerald"
          />
        </motion.div>

        {/* Settlement guarantees: gas + escrow-empty invariant. Static values backfilled
            from the capture run (see lifecycle.ts / JSON _provenance) — the escrow figure is a
            capture-asserted on-chain check, NOT a live readout. */}
        {(settlementGas !== null || escrowAfterSettle !== null) && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {settlementGas !== null && (
              <Metric
                label="Settlement gas"
                value={settlementGas.toLocaleString('en-US')}
                sub="total_charge_gas_units @ gup 100000"
                accent="slate"
              />
            )}
            {escrowAfterSettle !== null && (
              <Metric
                label="Escrow after settle"
                value="empty"
                sub={`capture-asserted · ${escrowAfterSettle.tokenIn} / ${escrowAfterSettle.tokenOut}`}
                accent="emerald"
              />
            )}
          </div>
        )}

        <p className="mt-4 font-mono text-[11px] leading-relaxed text-slate-500">
          Both legs are recorded in one settlement transaction. 30 bps is not a stored field — it is
          derived: (amount_in − amount_out) / amount_in.
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: 'emerald' | 'slate';
}) {
  const valueColor = accent === 'emerald' ? 'text-emerald-200' : 'text-slate-200';
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-mono text-lg font-bold tabular-nums ${valueColor}`}>{value}</div>
      <div className="font-mono text-[10px] text-slate-600">{sub}</div>
    </div>
  );
}
