'use client';

import { ArrowRight, Bot, Check, FileCheck2, ScrollText, Wallet, X } from 'lucide-react';
import FlowStrip, { type FlowStep } from '@/components/cosmo/FlowStrip';
import MaturityBadge from '@/components/cosmo/MaturityBadge';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import Reveal from '@/components/cosmo/Reveal';
import { CtaLink } from '@/components/cosmo/Cta';

// The second story (positioning v6.1): liquidity under rules. The allowed
// actions and the limits are shown before the word "mandate" appears, and the
// maturity is stated as what it is: tested, not running.

const FLOW: FlowStep[] = [
  { id: 'wallet', icon: Wallet, label: 'Your wallet', note: 'where the funds come from' },
  { id: 'rules', icon: ScrollText, label: 'Rules', note: 'you set them first' },
  { id: 'agent', icon: Bot, label: 'Agent acts', note: 'only inside the rules' },
  { id: 'proof', icon: FileCheck2, label: 'Proof', note: 'a record of every action' },
];

const RULES = ['Which market', 'How much at most', 'Until when', 'Which actions'];
const CANNOT = ['Use a market you did not name', 'Go over your limit', 'Act after the end date'];

export default function Liquidity() {
  return (
    <section className="relative border-t border-line-subtle py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          kicker="Second use: liquidity"
          title="Let an agent manage liquidity without giving it unlimited control."
          lead="You set the rules first. The agent can act only inside them, and every action leaves a record you can check afterwards."
        />

        <Reveal>
          <Surface tone="quiet" className="mt-12 px-2 py-6 md:px-6">
            <FlowStrip
              steps={FLOW}
              highlight="rules"
              label="Liquidity under rules: your wallet, then the rules you set, then the agent acting inside them, then a proof of every action."
            />
          </Surface>
        </Reveal>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Reveal>
            <Surface className="h-full p-6">
              <h3 className="text-base font-semibold text-ink-0">You decide</h3>
              <ul className="mt-4 space-y-3">
                {RULES.map((r) => (
                  <li key={r} className="flex items-center gap-3 text-[15px] text-ink-1">
                    <Check className="h-4 w-4 shrink-0 text-phase-settled" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
          <Reveal delay={0.08}>
            <Surface className="h-full p-6">
              <h3 className="text-base font-semibold text-ink-0">The agent cannot</h3>
              <ul className="mt-4 space-y-3">
                {CANNOT.map((r) => (
                  <li key={r} className="flex items-center gap-3 text-[15px] text-ink-1">
                    <X className="h-4 w-4 shrink-0 text-phase-fault" aria-hidden="true" />
                    {r}
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <MaturityBadge level="tested" explain />
          <p className="max-w-2xl text-pretty text-sm leading-relaxed text-ink-2">
            The test runs used real funds on Ethereum mainnet, at small scale. No promise of profit
            or safety of funds is made. You sign a set of rules (mandate) before the agent can act.
          </p>
          <div>
            <CtaLink href="/mandates/" variant="secondary" size="md">
              See how the rules work
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
