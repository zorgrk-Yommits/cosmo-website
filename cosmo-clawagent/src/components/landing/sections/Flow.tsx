'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Chip, { ChainChip } from '@/components/cosmo/Chip';
import PhaseRail from '@/components/cosmo/PhaseRail';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import { PHASES, type Phase } from '@/components/cosmo/phases';
import { usePhase } from '@/components/cosmo/usePhase';
import { useChoreography } from '@/components/cosmo/useReducedMotion';

// The centrepiece: one job walked through all six phases.
//
// The pinning is done with CSS `position: sticky`, not with GSAP's pin — no
// pin-spacer, no layout surprises after hydration. GSAP only reports scroll
// progress and that progress becomes the active phase index, which the rail,
// the card and the WebGL core all read from the same context.
//
// Without choreography (reduced motion, or a narrow viewport) the section
// degrades into six plain cards. Same content, no movement, no tall spacer
// to scroll past.

export default function Flow() {
  const choreographed = useChoreography();
  const { active, setActive } = usePhase();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!choreographed) return;
    const track = trackRef.current;
    if (!track) return;

    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: track,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            const i = Math.min(PHASES.length - 1, Math.floor(self.progress * PHASES.length));
            setActive(i);
          },
        });
      }, track);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [choreographed, setActive]);

  const phase = PHASES[active] ?? PHASES[0];

  return (
    <section id="flow" className="relative border-t border-line-subtle">
      <div className="mx-auto max-w-6xl px-5 pt-24 md:px-6 md:pt-32">
        <SectionHeader
          kicker="The COSMO flow"
          title="Six phases. Each one has a status, an action and something you can check."
          lead="This is the actual lifecycle of a job on the market — the same steps the buyer and provider pages walk through, not an illustration of them."
        />
      </div>

      {choreographed ? (
        <div
          ref={trackRef}
          style={{ height: `${PHASES.length * 72}vh` }}
          className="relative mt-12"
        >
          <div className="sticky top-16 flex min-h-[calc(100svh-4rem)] flex-col justify-center">
            <div className="mx-auto w-full max-w-6xl px-5 md:px-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
                  Job lifecycle · scroll to advance
                </span>
                <span className="font-mono text-[11px] tabular text-ink-2">
                  {String(active + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
                </span>
              </div>
              <PhaseRail active={active} onSelect={setActive} />
              <div className="mt-10">
                <PhaseCard key={phase.id} phase={phase} index={active} animate />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-5 pb-24 md:px-6">
          <div className="mt-10 hidden md:block">
            <PhaseRail active={PHASES.length - 1} showBoundary />
          </div>
          <ol className="mt-10 space-y-4">
            {PHASES.map((p, i) => (
              <li key={p.id}>
                <PhaseCard phase={p} index={i} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function PhaseCard({
  phase,
  index,
  animate = false,
}: {
  phase: Phase;
  index: number;
  animate?: boolean;
}) {
  return (
    <Surface
      className={cn('p-7 md:p-9', animate && 'animate-in fade-in slide-in-from-bottom-2 duration-500')}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] tabular text-ink-2">
          {String(index + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
        </span>
        <h3 className="font-mono text-xl font-bold tracking-tight text-ink-0">{phase.label}</h3>
        <Chip tone={phase.tone}>{phase.status}</Chip>
        <ChainChip onchain={phase.onchain} size="md" />
        <span className="w-full font-mono text-[11px] uppercase tracking-[0.16em] text-ink-2 md:ml-auto md:w-auto">
          Whose turn: <span className="text-ink-0">{phase.actor}</span>
        </span>
      </div>

      <div className="mt-7 grid gap-7 md:grid-cols-2">
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">Action</h4>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-0 md:text-base">
            {phase.action}
          </p>
        </div>
        <div>
          <h4 className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">Proof</h4>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-1 md:text-base">
            {phase.proof}
          </p>
        </div>
      </div>

      {phase.call && (
        <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-line-subtle pt-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-2">
            On-chain call
          </span>
          <code className="rounded-md border border-line-subtle bg-surface-inset px-2.5 py-1 font-mono text-xs text-phase-settled">
            {phase.call}
          </code>
        </div>
      )}
    </Surface>
  );
}
