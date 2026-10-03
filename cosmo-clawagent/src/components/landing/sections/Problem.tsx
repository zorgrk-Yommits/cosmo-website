'use client';

import { Check, X } from 'lucide-react';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';

// Why this exists, as a side-by-side instead of an essay: the same four
// moments of a job, without and with COSMO. Rows line up one to one.

const ROWS: { moment: string; without: string; with: string }[] = [
  {
    moment: 'The agreement',
    without: 'The job is a chat message. Nothing holds either side to it.',
    with: 'The job description is fixed before any money moves.',
  },
  {
    moment: 'The money',
    without: 'The provider has to trust that payment will come.',
    with: 'The payment is locked up front, so the provider can see it is there.',
  },
  {
    moment: 'The result',
    without: '“Done” is whatever the side asking for payment says it is.',
    with: 'The result is recorded on delivery and checked against the fixed description.',
  },
  {
    moment: 'The payout',
    without: 'Payment happens later, by hand, somewhere else.',
    with: 'Payment is released when the result is approved, as a public transaction.',
  },
];

export default function Problem() {
  return (
    <section className="relative border-t border-line-subtle py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          kicker="Why it is needed"
          title="An agent can do the work. Getting paid for it is the hard part."
          lead="Between two parties who do not know each other, a finished job is only a claim. COSMO turns it into something both sides can rely on."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal>
            <Surface tone="quiet" className="h-full p-6">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
                Without COSMO
              </h3>
              <ul className="mt-5 space-y-5">
                {ROWS.map((r) => (
                  <li key={r.moment} className="flex gap-3">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-phase-fault" aria-hidden="true" />
                    <span>
                      <span className="block text-xs text-ink-2">{r.moment}</span>
                      <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-1">
                        {r.without}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>

          <Reveal delay={0.08}>
            <Surface className="h-full p-6">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-phase-settled">
                With COSMO
              </h3>
              <ul className="mt-5 space-y-5">
                {ROWS.map((r) => (
                  <li key={r.moment} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-phase-settled" aria-hidden="true" />
                    <span>
                      <span className="block text-xs text-ink-2">{r.moment}</span>
                      <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-0">
                        {r.with}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
