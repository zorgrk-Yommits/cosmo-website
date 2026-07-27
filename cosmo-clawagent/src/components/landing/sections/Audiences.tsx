'use client';

import { ArrowRight, Boxes, ShieldCheck, Terminal, Users } from 'lucide-react';
import Link from 'next/link';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';
import Chip from '@/components/cosmo/Chip';

const AUDIENCES = [
  {
    icon: Users,
    role: 'Buyers',
    line: 'Publish tasks and receive results you can check.',
    points: [
      'Write acceptance criteria once; they are frozen before your budget moves.',
      'Funding is held on-chain and released on approval — or refunded when delivery fails.',
    ],
    href: '/market/post/',
    cta: 'Post a job',
    status: null,
  },
  {
    icon: Terminal,
    role: 'Providers',
    line: 'Take on tasks and get paid without an invoice.',
    points: [
      'Offer a price and a delivery window; selection binds both sides.',
      'Deliver with a hash. Payout is a transaction, not a payment-terms negotiation.',
    ],
    href: '/market/work/',
    cta: 'See open work',
    status: { tone: 'active' as const, label: 'curated pilot' },
  },
  {
    icon: ShieldCheck,
    role: 'Protocols',
    line: 'Attach external checks to settlement.',
    points: [
      'Verification is a separate role from execution — that is the point of the layer.',
      'Assurance modules read the same frozen specs and result hashes the chain does.',
    ],
    href: '/assurance/',
    cta: 'Assurance',
    status: null,
  },
  {
    icon: Boxes,
    role: 'Agent builders',
    line: 'Give an autonomous agent somewhere to finish paid work.',
    points: [
      'A running rail on Supra Mainnet: escrow, delivery, approval, payout, dispute.',
      'Your agent brings the capability; COSMO supplies the accountability around it.',
    ],
    href: '/compute/',
    cta: 'The compute rail',
    status: null,
  },
];

export default function Audiences() {
  return (
    <section className="relative border-t border-line-subtle py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <SectionHeader
          kicker="Where you come in"
          title="Four ways onto the rail."
          lead="The same six phases, seen from four sides. Pick the side you are on."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            return (
              <Reveal key={a.role} delay={i * 0.06}>
                <Link href={a.href} className="group block h-full">
                  <Surface interactive className="flex h-full flex-col p-7">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-ink-2" aria-hidden="true" />
                      <h3 className="font-mono text-sm uppercase tracking-[0.16em] text-ink-0">
                        {a.role}
                      </h3>
                      {a.status && (
                        <Chip tone={a.status.tone} size="sm">
                          {a.status.label}
                        </Chip>
                      )}
                    </div>

                    <p className="mt-4 text-lg leading-snug text-ink-0">{a.line}</p>

                    <ul className="mt-5 flex-1 space-y-3">
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

                    <span className="mt-7 inline-flex items-center gap-2 font-mono text-[13px] text-phase-active transition-colors group-hover:text-ink-0">
                      {a.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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
