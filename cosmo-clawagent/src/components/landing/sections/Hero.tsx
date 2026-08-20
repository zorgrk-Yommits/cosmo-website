'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';
import CosmoCore from '@/components/cosmo/core/CosmoCore';
import PhaseRail from '@/components/cosmo/PhaseRail';
import { CtaLink } from '@/components/cosmo/Cta';
import { usePhase } from '@/components/cosmo/usePhase';

export default function Hero() {
  const { active, setActive } = usePhase();

  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      <CosmoCore />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-20 md:px-6">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-line-base bg-surface-1/70 px-3 py-1.5 backdrop-blur-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-phase-settled opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-phase-settled" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-1">
            Pilot · live on Supra Mainnet
          </span>
        </div>

        {/* Positioning v6.0 (docs/POSITIONING.md): the concrete audience —
            market makers and liquidity managers deploying entrusted capital —
            leads; the institutional-layer category is subordinate context. */}
        <h1 className="mt-7 max-w-4xl text-balance text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-ink-0 sm:text-6xl lg:text-[4.25rem]">
          Verifiable Liquidity&nbsp;Mandates
        </h1>

        <p className="mt-6 font-mono text-lg tracking-tight text-ink-0/90 md:text-xl">
          Delegate liquidity operations without delegating blind trust.
        </p>

        <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
          Capital owners define the markets, limits and authority. Agents execute.
          COSMO proves every action. Built for market makers and liquidity managers
          deploying capital entrusted to them — with signed mandates, hash-pinned
          policies, a human-armed irreversible step and receipts an independent
          verifier accepts. A real Ethereum mainnet mandate has already executed and
          verified end-to-end.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <CtaLink href="/market/" variant="primary" size="lg">
            Explore the live market
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
          <CtaLink href="#flow" variant="secondary" size="lg">
            See how settlement works
            <ArrowDown className="h-4 w-4" />
          </CtaLink>
          <CtaLink href="/institutional/" variant="ghost" size="lg">
            The institutional layer
            <ArrowRight className="h-4 w-4" />
          </CtaLink>
        </div>

        {/* The whole product in one line — the ten-second version. */}
        <div className="mt-14 max-w-4xl">
          <PhaseRail active={active} onSelect={setActive} />
        </div>
      </div>
    </section>
  );
}
