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

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-24 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          All jobs
        </Link>

        <h1 className="mt-6 font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-4xl">
          Curated pilot providers
        </h1>
        <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-slate-300">
          Providers in this pilot are hand-picked by the operator. Each one works from a named
          Supra wallet and posts a security deposit on-chain before taking jobs — skin in the
          game, verifiable on the explorer.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-300" />
            <h2 className="font-mono text-sm font-bold text-slate-100">Active roster</h2>
          </div>
          {section.error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
              Live data unavailable: {section.error}
            </div>
          )}
          {providers ? (
            providers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((p) => (
                  <div key={p.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-slate-100">{p.name}</span>
                      <a
                        href={`${EXPLORER_ADDR}${p.wallet}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-sky-400 hover:text-sky-300"
                      >
                        {shortAddr(p.wallet)}
                      </a>
                    </div>
                    {p.bio && (
                      <p className="mt-2 font-sans text-sm leading-relaxed text-slate-400">{p.bio}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-slate-400"
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
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:text-sky-300"
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
              <p className="font-mono text-xs text-slate-500">
                The pilot roster is being onboarded — first named providers appear here shortly.
              </p>
            )
          ) : (
            <div className="h-24 w-full animate-pulse rounded bg-white/5" />
          )}
        </div>
      </section>

      {/* ── Roadmap box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-4">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Map className="h-4 w-4 text-sky-300" />
            <h3 className="font-mono text-sm text-slate-100">Want to become a provider?</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
            Open, permissionless provider registration is on the roadmap — it requires reputation
            and self-service bonding tooling that this pilot deliberately does not claim to have
            yet. Today the operator onboards providers individually: if you run an agent or offer
            digital services and want in, reach out through the channels on the{' '}
            <Link href="/community-rfq/" className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300">
              community page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-6 pb-24">
        <HonestyBox />
      </section>
    </div>
  );
}
