'use client';

// /market/providers — the curated pilot roster, honestly framed: these are
// hand-picked partners with on-chain bonds, not an open network (yet).

import Link from 'next/link';
import { ArrowLeft, ExternalLink, Map, Users } from 'lucide-react';
import { EXPLORER_ADDR, shortAddr } from '@/lib/mainnetOnchain';
import { useMarketProviders } from '../useMarketData';
import HonestyBox from '../components/HonestyBox';

export default function ProvidersView() {
  const { section } = useMarketProviders();
  const providers = section.data ?? null;

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-24 md:px-6">
        <Link
          href="/market/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-1 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink-0 md:text-4xl">
          The providers who do the jobs
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ink-1">
          In this pilot we choose the providers by hand. Each one works from a wallet you can
          look up, and puts down a safety deposit before taking jobs. If a provider does not
          deliver, part of that deposit goes to the buyer.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-4 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-phase-active" />
            <h2 className="font-mono text-sm font-bold text-ink-0">Providers right now</h2>
          </div>
          {section.error && (
            <div className="mb-4 rounded-lg border border-phase-fault/30 bg-phase-fault/10 px-4 py-2.5 font-mono text-xs text-phase-fault">
              The list cannot be loaded right now ({section.error}).
            </div>
          )}
          {providers ? (
            providers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line-base bg-surface-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-ink-0">{p.name}</span>
                      <a
                        href={`${EXPLORER_ADDR}${p.wallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-phase-proof hover:text-phase-proof"
                      >
                        {shortAddr(p.wallet)}
                      </a>
                    </div>
                    {p.bio && (
                      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">{p.bio}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-line-base bg-surface-1 px-2 py-0.5 font-mono text-[10px] text-ink-1"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    {p.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {p.links.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-phase-proof hover:text-phase-proof"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {new URL(link).hostname}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-xs text-ink-2">
                No provider is listed yet. The first ones appear here once they are onboarded.
              </p>
            )
          ) : (
            <div className="h-24 w-full animate-pulse rounded bg-surface-2" />
          )}
        </div>
      </section>

      {/* ── Roadmap box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-4 md:px-6">
        <div className="rounded-xl border border-phase-proof/20 bg-phase-proof/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Map className="h-4 w-4 text-phase-proof" />
            <h3 className="font-mono text-sm text-ink-0">Want to become a provider?</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            Open sign-up for providers is planned, not built: it needs a track-record system
            this pilot does not have yet. Today we onboard providers one by one. If you run an
            agent or offer digital services and want in,{' '}
            {/* plain <a>, not next/link: cross-route #hash links don't reliably
                navigate via the client router in this static export */}
            <a href="/compute/#journey" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
              see how providers get onboarded
            </a>
            . The safety deposit, the personal onboarding and the template are all there.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6">
        <HonestyBox />
      </section>
    </div>
  );
}
