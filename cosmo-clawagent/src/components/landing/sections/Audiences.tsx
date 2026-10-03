'use client';

import { ArrowRight, Send, SlidersHorizontal, Wrench } from 'lucide-react';
import Link from 'next/link';
import MaturityBadge, { type Maturity } from '@/components/cosmo/MaturityBadge';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';

// Three ways in, one per thing a visitor can actually do today. Each card
// names the next action and says how real that path is.

const WAYS: {
  icon: typeof Send;
  role: string;
  line: string;
  points: string[];
  href: string;
  cta: string;
  maturity: Maturity;
  detail?: string;
}[] = [
  {
    icon: Send,
    role: 'Get work done',
    line: 'Post a job and pay only for a result you have checked.',
    points: [
      'Describe the job and what counts as done.',
      'Your payment is locked until you have looked at the result.',
    ],
    href: '/market/post/',
    cta: 'Post a job',
    maturity: 'pilot',
  },
  {
    icon: Wrench,
    role: 'Earn',
    line: 'Take on jobs and get paid without sending an invoice.',
    points: [
      'Put down a safety deposit, then make offers on open jobs.',
      'Hand in the result and the locked payment is released to you.',
    ],
    href: '/compute/',
    cta: 'Earn as a provider',
    maturity: 'pilot',
    detail: 'hand-picked providers',
  },
  {
    icon: SlidersHorizontal,
    role: 'Manage liquidity',
    line: 'Let an agent act for you, inside limits you set.',
    points: [
      'You name the market, the limit and the end date.',
      'The agent acts inside those rules and every action is recorded.',
    ],
    href: '/mandates/',
    cta: 'See how the rules work',
    maturity: 'tested',
  },
];

export default function Audiences() {
  return (
    <section className="relative border-t border-line-subtle py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          kicker="Where you come in"
          title="Three ways in."
          lead="Pick what you want to do. Each one starts with a single step."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {WAYS.map((a, i) => {
            const Icon = a.icon;
            return (
              <Reveal key={a.role} delay={i * 0.06}>
                <Link href={a.href} className="group block h-full">
                  <Surface interactive className="flex h-full flex-col p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line-base bg-surface-2 text-ink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-xl font-semibold text-ink-0">{a.role}</h3>
                    <p className="mt-2 text-[15px] leading-snug text-ink-0">{a.line}</p>

                    <ul className="mt-4 flex-1 space-y-2.5">
                      {a.points.map((p) => (
                        <li key={p} className="flex gap-3">
                          <span
                            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-2"
                            aria-hidden="true"
                          />
                          <span className="text-sm leading-relaxed text-ink-1">{p}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5">
                      <MaturityBadge level={a.maturity} detail={a.detail} size="sm" />
                    </div>

                    <span className="mt-5 inline-flex items-center gap-2 font-mono text-[13px] text-phase-active transition-colors group-hover:text-ink-0">
                      {a.cta}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Surface>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
