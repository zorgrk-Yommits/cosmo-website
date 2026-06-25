'use client';

import Image from 'next/image';
import { Cpu, ShieldCheck, Layers, ArrowRight } from 'lucide-react';

// "The roles" — the controlled Mainnet proof has SEPARATED roles, and this section
// makes the separation legible:
//   Taker   = the requesting agent (figure asset, founder-provided)
//   Kahless = the Maker-Agent that quotes
//   K1      = the bonded Maker-Operator BEHIND Kahless (technical, not a big figure)
//   COSMO   = the settlement layer / engine (NOT a counterparty)
//   Supra   = Mainnet finality
export default function Roles() {
  return (
    <section className="mt-16" aria-label="The roles">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">The roles</h2>
      <p className="mt-3 font-sans text-lg text-slate-300">
        <span className="text-slate-100">SupraOS</span> asks.{' '}
        <span className="text-purple-300">Kahless</span> quotes.{' '}
        <span className="text-emerald-300">COSMO</span> settles.{' '}
        <span className="text-cyan-300">Supra</span> finalizes.
      </p>

      {/* ── two-party flow: Taker (left) → COSMO engine (center) → Kahless+K1 (right) ── */}
      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Requesting Agent party (demand side, left) */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <Image
            src="/images/requesting-agent.jpg"
            alt="Requesting agent"
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg border border-white/20 object-cover"
          />
          <h3 className="mt-4 font-mono text-sm text-slate-100">Requesting Agent</h3>
          <p className="mt-1 font-sans text-sm text-slate-400">
            A SupraOS-side demand agent that starts the RFQ. Represents the demand side — the future
            SupraOS demand surface.
          </p>
        </div>

        {/* COSMO engine in the middle (layer, not a party) */}
        <div className="flex flex-row items-center justify-center gap-2 md:flex-col">
          <ArrowRight className="hidden h-5 w-5 rotate-90 text-slate-600 md:block md:rotate-0" />
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-emerald-300" />
            <div className="mt-1 font-mono text-xs text-emerald-200">COSMO</div>
            <div className="font-mono text-[10px] text-slate-500">settlement layer</div>
          </div>
          <ArrowRight className="hidden h-5 w-5 rotate-90 text-slate-600 md:block md:rotate-0" />
        </div>

        {/* Maker party (right): Kahless, with K1 operator BEHIND it */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <Image
            src="/images/k1-maker-operator.jpeg"
            alt="K1 — Maker-Operator behind Kahless"
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg border border-purple-500/30 object-cover"
          />
          <h3 className="mt-4 font-mono text-sm text-slate-100">
            Kahless <span className="text-slate-500">· Maker-Agent</span>
          </h3>
          <p className="mt-1 font-sans text-sm text-slate-400">
            Represents the Maker side and returns the quote.
          </p>
          {/* K1 — technical operator behind Kahless (deliberately small) */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] px-3 py-2">
            <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
            <p className="font-mono text-[11px] leading-relaxed text-slate-400">
              <span className="text-cyan-200">K1</span> — the bonded Maker-Operator behind Kahless. K1
              executed the Maker side in this Mainnet proof; its bond stayed untouched.
            </p>
          </div>
        </div>
      </div>

      {/* ── COSMO + Supra description cards ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <h3 className="font-mono text-sm text-slate-100">COSMO</h3>
          </div>
          <p className="mt-1 font-sans text-sm text-slate-400">
            The RFQ settlement layer. It locks, checks and settles the exchange atomically — it is not
            the Maker or the requester.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-300" />
            <h3 className="font-mono text-sm text-slate-100">Supra</h3>
          </div>
          <p className="mt-1 font-sans text-sm text-slate-400">
            The Mainnet finality layer. Supra finalizes the trade on chain 8.
          </p>
        </div>
      </div>
    </section>
  );
}
