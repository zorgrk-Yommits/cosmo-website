'use client';

import { Banknote, Hammer, Lock, Search, Send, Tags, type LucideIcon } from 'lucide-react';
import { ChainChip } from '@/components/cosmo/Chip';
import FlowStrip from '@/components/cosmo/FlowStrip';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import TechDetails from '@/components/cosmo/TechDetails';
import { PHASES, type Phase } from '@/components/cosmo/phases';

// How a job works: the six real steps (phases.ts, held against the buyer
// lifecycle by phases.test.ts) as a picture, then one plain sentence per
// step. What each step records on-chain sits in the technical details below.

const ICON: Record<string, LucideIcon> = {
  request: Send,
  quote: Tags,
  fund: Lock,
  deliver: Hammer,
  verify: Search,
  settle: Banknote,
};

const WHO: Record<Phase['actor'], string> = {
  Buyer: 'You',
  Provider: 'Provider',
  Marketplace: 'COSMO',
  Chain: 'Automatic',
};

export default function Flow() {
  return (
    <section id="flow" className="relative scroll-mt-16 border-t border-line-subtle py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          kicker="How a job works"
          title="Six steps from posting a job to paying for it."
          lead="These are the same steps the job page walks you through. At every step it says whose turn it is."
        />

        {/* The picture. On small screens the cards below are the picture. */}
        <div className="mt-12 hidden md:block">
          <FlowStrip
            steps={PHASES.map((p) => ({ id: p.id, icon: ICON[p.id], label: p.label }))}
            label="The six steps of a job: post job, get offer, lock payment, work happens, check result, pay provider."
          />
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PHASES.map((p, i) => {
            const Icon = ICON[p.id];
            return (
              <li key={p.id}>
                <Surface className="flex h-full flex-col p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-base bg-surface-2 text-ink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <span className="block font-mono text-[11px] tabular-nums text-ink-2">
                        Step {i + 1} of {PHASES.length}
                      </span>
                      <h3 className="text-lg font-semibold leading-tight text-ink-0">{p.label}</h3>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-1">{p.action}</p>
                  <p className="mt-4 text-xs text-ink-2">
                    Whose turn: <span className="font-medium text-ink-0">{WHO[p.actor]}</span>
                  </p>
                </Surface>
              </li>
            );
          })}
        </ol>

        <TechDetails title="Technical details: what each step records" className="mt-6">
          <ol className="space-y-4">
            {PHASES.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink-0">
                    {i + 1}. {p.label}
                  </span>
                  <ChainChip onchain={p.onchain} />
                  {p.call && (
                    <code className="rounded-md border border-line-subtle bg-surface-inset px-2 py-0.5 font-mono text-xs text-phase-settled">
                      {p.call}
                    </code>
                  )}
                </span>
                <span>{p.technical}</span>
              </li>
            ))}
          </ol>
        </TechDetails>
      </div>
    </section>
  );
}
