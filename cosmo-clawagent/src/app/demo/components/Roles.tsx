'use client';

import Image from 'next/image';
import { Cpu, ShieldCheck, Layers, ArrowRight } from 'lucide-react';

// "The roles" — the controlled Mainnet proof has SEPARATED roles, and this section
// makes the separation legible:
//   Taker   = the requesting agent (figure asset, founder-provided)
//   Kahless = the Maker-Agent that quotes
//   K1      = the bonded Maker-Operator BEHIND Kahless (technical, not a big figure)
//   COSMO   = the execution & accountability layer / engine (NOT a counterparty)
//   Supra   = Mainnet finality
export default function Roles() {
  return (
    <section className="mt-16" aria-label="The roles">
      <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">The roles</h2>
      <p className="mt-3 font-sans text-lg text-ink-1">
        <span className="text-ink-0">SupraOS</span> asks.{' '}
        <span className="text-phase-active">Kahless</span> quotes.{' '}
        <span className="text-phase-settled">COSMO</span> settles.{' '}
        <span className="text-phase-proof">Supra</span> finalizes.
      </p>

      {/* ── two-party flow: Taker (left) → COSMO engine (center) → Kahless+K1 (right) ── */}
      <div className="mt-8 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        {/* Requesting Agent party (demand side, left) */}
        <div className="rounded-xl border border-line-base bg-surface-1 p-5">
          <Image
            src="/images/requesting-agent.jpg"
            alt="Requesting agent"
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg border border-line-base object-cover"
          />
          <h3 className="mt-4 font-mono text-sm text-ink-0">Requesting Agent</h3>
          <p className="mt-1 font-sans text-sm text-ink-1">
            A SupraOS-side demand agent that starts the RFQ. Represents the demand side — the future
            SupraOS demand surface.
          </p>
        </div>

        {/* COSMO engine in the middle (layer, not a party) */}
        <div className="flex flex-row items-center justify-center gap-2 md:flex-col">
          <ArrowRight className="hidden h-5 w-5 rotate-90 text-ink-2 md:block md:rotate-0" />
          <div className="rounded-xl border border-phase-settled/30 bg-phase-settled/[0.06] px-4 py-3 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-phase-settled" />
            <div className="mt-1 font-mono text-xs text-phase-settled">COSMO</div>
            <div className="font-mono text-[10px] text-ink-2">execution layer</div>
          </div>
          <ArrowRight className="hidden h-5 w-5 rotate-90 text-ink-2 md:block md:rotate-0" />
        </div>

        {/* Maker party (right): Kahless, with K1 operator BEHIND it */}
        <div className="rounded-xl border border-line-base bg-surface-1 p-5">
          <Image
            src="/images/k1-maker-operator.jpeg"
            alt="K1 — Maker-Operator behind Kahless"
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg border border-phase-active/30 object-cover"
          />
          <h3 className="mt-4 font-mono text-sm text-ink-0">
            Kahless <span className="text-ink-2">· Maker-Agent</span>
          </h3>
          <p className="mt-1 font-sans text-sm text-ink-1">
            Represents the Maker side and returns the quote.
          </p>
          {/* K1 — technical operator behind Kahless (deliberately small) */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-phase-proof/20 bg-phase-proof/[0.05] px-3 py-2">
            <Cpu className="mt-0.5 h-4 w-4 flex-shrink-0 text-phase-proof" />
            <p className="font-mono text-[11px] leading-relaxed text-ink-1">
              <span className="text-phase-proof">K1</span> — the bonded Maker-Operator behind Kahless. K1
              executed the Maker side in this Mainnet proof; its bond stayed untouched.
            </p>
          </div>
        </div>
      </div>

      {/* ── COSMO + Supra description cards ── */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line-base bg-surface-1 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-phase-settled" />
            <h3 className="font-mono text-sm text-ink-0">COSMO</h3>
          </div>
          <p className="mt-1 font-sans text-sm text-ink-1">
            COSMO&apos;s execution and accountability layer. It locks, checks and settles the exchange
            atomically — it is not the Maker or the requester.
          </p>
        </div>
        <div className="rounded-xl border border-line-base bg-surface-1 p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-phase-proof" />
            <h3 className="font-mono text-sm text-ink-0">Supra</h3>
          </div>
          <p className="mt-1 font-sans text-sm text-ink-1">
            The Mainnet finality layer. Supra finalizes the trade on chain 8.
          </p>
        </div>
      </div>
    </section>
  );
}
