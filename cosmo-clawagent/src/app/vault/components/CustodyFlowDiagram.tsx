'use client';

// Animated custody-flow hero: operator wallets → resource-account custody →
// withdraw / slash exits, with the VaultRegistry authority link (SignerCapability)
// as a dashed hairline. HTML node cards over an SVG edge layer, same technique
// as components/IntelligenceLoop.tsx. One animation mechanism for all moving
// edges (stroke-dashoffset loop), disabled under prefers-reduced-motion.

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownToLine, KeyRound, Lock, Scissors } from 'lucide-react';
import { fmtAmt, shortAddr, MAKER_VAULT_RESOURCE_ADDR, COSMOCLAW_ADDR } from '@/lib/mainnetOnchain';
import type { OperatorState } from '../lib/vaultData';

// Series colors — validated against #030712 (dataviz six checks, ALL PASS)
export const SERIES = { M2: '#8b5cf6', K1: '#0891b2' } as const;

const EXIT_WITHDRAW = '#34d399';
const EXIT_SLASH = '#fbbf24';
const AUTHORITY = '#64748b';

type Props = {
  custodyBalance: bigint | null;
  operators: OperatorState[] | null;
};

const amt = (v: bigint | null | undefined) => (v === null || v === undefined ? '—' : fmtAmt(v));

function FlowEdge({
  d,
  color,
  animated,
  slow,
  dashed,
}: {
  d: string;
  color: string;
  animated: boolean;
  slow?: boolean;
  dashed?: boolean;
}) {
  if (!animated) {
    return (
      <path
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        opacity={0.55}
        strokeDasharray={dashed ? '4 4' : undefined}
      />
    );
  }
  return (
    <motion.path
      d={d}
      stroke={color}
      strokeWidth={2}
      fill="none"
      opacity={0.55}
      strokeDasharray="7 7"
      animate={{ strokeDashoffset: [0, -28] }}
      transition={{ repeat: Infinity, duration: slow ? 3.2 : 1.6, ease: 'linear' }}
    />
  );
}

export default function CustodyFlowDiagram({ custodyBalance, operators }: Props) {
  const reduced = useReducedMotion() ?? false;
  const m2 = operators?.find((o) => o.key === 'M2') ?? null;
  const k1 = operators?.find((o) => o.key === 'K1') ?? null;

  // viewBox 1000x520; container keeps the same aspect ratio so px ≈ svg units.
  const P = {
    registry: { x: 500, y: 52 },
    m2: { x: 140, y: 190 },
    k1: { x: 140, y: 385 },
    custody: { x: 500, y: 290 },
    withdraw: { x: 862, y: 190 },
    slash: { x: 862, y: 385 },
  };
  // half-extents (card px sizes below)
  const OP = { hx: 95, hy: 40 };
  const CU = { hx: 125, hy: 66 };
  const EX = { hx: 88, hy: 40 };

  const edges = (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 520"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <marker id="vault-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M 0 0 L 7 3.5 L 0 7 z" fill="#475569" />
        </marker>
      </defs>

      {/* deposits: operator wallets → custody */}
      <FlowEdge
        d={`M ${P.m2.x + OP.hx},${P.m2.y} C ${P.m2.x + 220},${P.m2.y} ${P.custody.x - CU.hx - 90},${P.custody.y - 30} ${P.custody.x - CU.hx},${P.custody.y - 30}`}
        color={SERIES.M2}
        animated={!reduced}
      />
      <FlowEdge
        d={`M ${P.k1.x + OP.hx},${P.k1.y} C ${P.k1.x + 220},${P.k1.y} ${P.custody.x - CU.hx - 90},${P.custody.y + 30} ${P.custody.x - CU.hx},${P.custody.y + 30}`}
        color={SERIES.K1}
        animated={!reduced}
      />

      {/* exits: custody → withdraw / slash */}
      <FlowEdge
        d={`M ${P.custody.x + CU.hx},${P.custody.y - 30} C ${P.custody.x + CU.hx + 90},${P.custody.y - 30} ${P.withdraw.x - 200},${P.withdraw.y} ${P.withdraw.x - EX.hx},${P.withdraw.y}`}
        color={EXIT_WITHDRAW}
        animated={!reduced}
        slow
      />
      <FlowEdge
        d={`M ${P.custody.x + CU.hx},${P.custody.y + 30} C ${P.custody.x + CU.hx + 90},${P.custody.y + 30} ${P.slash.x - 200},${P.slash.y} ${P.slash.x - EX.hx},${P.slash.y}`}
        color={EXIT_SLASH}
        animated={false}
        dashed
      />

      {/* authority, not asset flow: registry ⇢ custody */}
      <path
        d={`M ${P.registry.x},${P.registry.y + 32} L ${P.custody.x},${P.custody.y - CU.hy}`}
        stroke={AUTHORITY}
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.6}
        fill="none"
        markerEnd="url(#vault-arrow)"
      />
      <text
        x={P.registry.x + 14}
        y={(P.registry.y + P.custody.y) / 2 - 24}
        fill={AUTHORITY}
        fontSize="11"
        fontFamily="monospace"
        letterSpacing="1"
      >
        signer_cap
      </text>
    </svg>
  );

  const opCard = (op: OperatorState | null, fallbackLabel: string, color: string) => (
    <div
      className="rounded-md border bg-black/60 p-3 backdrop-blur-sm"
      style={{ borderColor: `${color}66`, borderWidth: 1 }}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
        Deposit
      </div>
      <div className="font-mono text-[13px] font-bold leading-tight text-white">
        {op?.label ?? fallbackLabel}
      </div>
      <div className="mt-0.5 font-mono text-[11px] leading-tight text-slate-400">
        {op ? `${shortAddr(op.addr)} · ${amt(op.bond?.amount ?? null)} wCOSMO` : '—'}
      </div>
    </div>
  );

  const custodyCard = (
    <div
      className="rounded-md border-[1.5px] border-purple-500 bg-black/70 p-3.5 text-center backdrop-blur-sm"
      style={{ boxShadow: '0 0 16px rgba(139,92,246,0.35)' }}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-purple-300">
        Held in the vault
      </div>
      <div className="font-mono text-[14px] font-bold leading-tight text-white">
        Resource Account
      </div>
      <div className="mt-0.5 font-mono text-[11px] text-slate-400">
        {shortAddr(MAKER_VAULT_RESOURCE_ADDR)}
      </div>
      <div className="mt-1 font-mono text-lg font-bold text-slate-100">
        {amt(custodyBalance)} <span className="text-[11px] font-normal text-slate-400">wCOSMO</span>
      </div>
      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
        <Lock className="h-3 w-3 text-slate-400" />
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
          No private key — SignerCapability only
        </span>
      </div>
    </div>
  );

  const registryCard = (
    <div className="rounded-md border border-white/15 bg-black/60 p-2.5 text-center backdrop-blur-sm">
      <div className="flex items-center justify-center gap-1.5">
        <KeyRound className="h-3 w-3 text-slate-400" />
        <span className="font-mono text-[12px] font-bold text-slate-200">VaultRegistry</span>
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-slate-500">
        @ {shortAddr(COSMOCLAW_ADDR)} · holds SignerCapability
      </div>
    </div>
  );

  const withdrawCard = (
    <div className="rounded-md border border-emerald-500/40 bg-black/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-300" />
        <span className="font-mono text-[13px] font-bold text-white">Withdraw</span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] leading-tight text-slate-400">
        back to operator, after lock
      </div>
    </div>
  );

  const slashCard = (
    <div className="rounded-md border border-amber-500/40 bg-black/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5">
        <Scissors className="h-3.5 w-3.5 text-amber-300" />
        <span className="font-mono text-[13px] font-bold text-white">Penalty deduction</span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] leading-tight text-slate-400">
        misbehavior → penalty pool
      </div>
    </div>
  );

  const place = (pt: { x: number; y: number }, w: number) => ({
    left: `${(pt.x / 1000) * 100}%`,
    top: `${(pt.y / 520) * 100}%`,
    width: w,
  });

  return (
    <div
      className="relative rounded-xl border border-white/10 bg-black/40 p-4 md:p-6"
      role="img"
      aria-label="Maker vault flow: operator security deposits go into the maker vault resource account, which has no private key; funds only leave through withdraw after the lock period or through a penalty deduction."
    >
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        Maker vault only — compute provider deposits live in a separate vault (section 2)
      </p>
      {/* Desktop graph */}
      <div className="relative hidden md:block" style={{ aspectRatio: '1000 / 520', minHeight: 420 }}>
        {edges}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.registry, 260)}>
          {registryCard}
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.m2, 190)}>
          {opCard(m2, 'Operator M2', SERIES.M2)}
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.k1, 190)}>
          {opCard(k1, 'Operator K1', SERIES.K1)}
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.custody, 250)}>
          {custodyCard}
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.withdraw, 176)}>
          {withdrawCard}
        </div>
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={place(P.slash, 176)}>
          {slashCard}
        </div>
      </div>

      {/* Mobile: simplified vertical flow */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {registryCard}
        <div className="text-center font-mono text-[10px] tracking-widest text-slate-500">
          ⇣ signer_cap
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {opCard(m2, 'Operator M2', SERIES.M2)}
          {opCard(k1, 'Operator K1', SERIES.K1)}
        </div>
        <div className="text-center font-mono text-xs text-purple-400/70">↓ deposit</div>
        {custodyCard}
        <div className="text-center font-mono text-xs text-purple-400/70">↓ exit paths</div>
        <div className="grid grid-cols-2 gap-2.5">
          {withdrawCard}
          {slashCard}
        </div>
      </div>
    </div>
  );
}
