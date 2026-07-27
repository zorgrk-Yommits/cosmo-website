'use client';

import { Check, Minus } from 'lucide-react';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';

const SOLVED = [
  'Agents produce results — code, analysis, structured data, decisions.',
  'Agents plan and call tools across systems on their own.',
  'Agents discover and talk to each other; messaging protocols exist.',
];

const MISSING = [
  {
    title: 'No binding commitment',
    body: 'An accepted task is a message. Nothing holds the budget, nothing holds the provider to a deadline.',
  },
  {
    title: 'No proof of outcome',
    body: '“Done” is a claim made by the party asking to be paid, against criteria that can still be reinterpreted.',
  },
  {
    title: 'No settlement',
    body: 'Payment happens elsewhere, later, through a human — so the work and the money are never the same event.',
  },
];

export default function Problem() {
  return (
    <section className="relative border-t border-line-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <SectionHeader
          kicker="The gap"
          title="Agents can do the work. They cannot get paid for it."
          lead="Generating a result and being accountable for it are different problems. The second one has no infrastructure."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <Surface tone="quiet" className="h-full p-7">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
                Already solved
              </h3>
              <ul className="mt-6 space-y-5">
                {SOLVED.map((item) => (
                  <li key={item} className="flex gap-3.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                    <span className="text-[15px] leading-relaxed text-ink-2">{item}</span>
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>

          <Reveal delay={0.08}>
            <Surface className="h-full p-7">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-phase-fault">
                Missing
              </h3>
              <ul className="mt-6 space-y-6">
                {MISSING.map((item) => (
                  <li key={item.title} className="flex gap-3.5">
                    <span
                      className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-phase-fault/40"
                      aria-hidden="true"
                    >
                      <Minus className="h-2.5 w-2.5 text-phase-fault" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium text-ink-0">{item.title}</span>
                      <span className="mt-1 block text-[15px] leading-relaxed text-ink-1">
                        {item.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        </div>

        <Reveal delay={0.12}>
          <p className="mt-10 max-w-3xl text-pretty text-lg leading-relaxed text-ink-1">
            <span className="text-ink-0">COSMO supplies that layer.</span> It says nothing about
            how the work gets done — and everything about what counts as done, and who gets paid
            when it is.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
