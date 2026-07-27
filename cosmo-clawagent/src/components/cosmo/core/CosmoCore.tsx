'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PHASES } from '../phases';
import { usePhase } from '../usePhase';
import { useCapability } from './useCapability';
import CoreFallback from './CoreFallback';

// The hero visual. three.js is imported inside an effect and only on devices
// that asked for it, so the WebGL chunk never touches the first load. If the
// import fails or the context is refused, the SVG rail stays on screen —
// there is no state in which the visitor sees an empty box.
//
// The canvas is aria-hidden: a decorative rendering of information that is
// spelled out in text right next to it. The screen-reader description below
// carries the same six phases.

export default function CosmoCore({ className }: { className?: string }) {
  const capability = useCapability();
  const { active } = usePhase();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<{ setPhase(i: number): void; dispose(): void } | null>(null);
  const [webglLive, setWebglLive] = useState(false);

  useEffect(() => {
    if (capability !== 'webgl') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    void (async () => {
      try {
        const { createCore } = await import('./scene');
        if (cancelled || !canvasRef.current) return;
        handleRef.current = createCore(canvasRef.current, active);
        setWebglLive(true);
      } catch {
        // WebGL refused or the chunk failed — the SVG rail below stays.
        setWebglLive(false);
      }
    })();

    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
      setWebglLive(false);
    };
    // `active` is intentionally not a dependency: the scene is created once
    // and updated through setPhase in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capability]);

  useEffect(() => {
    handleRef.current?.setPhase(active);
  }, [active]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* The visual lives in the lower right on wide screens and along the
          bottom on narrow ones — it is never allowed to run through the
          headline. The scrim below guarantees the copy wins regardless. */}
      <div className="absolute inset-x-0 bottom-0 top-[45%] md:inset-y-0 md:left-[38%] md:top-0">
        {capability === 'webgl' && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className={cn(
              'h-full w-full transition-opacity duration-700',
              webglLive ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}

        {/* Always mounted until WebGL is actually painting: no empty frame. */}
        {!webglLive && <CoreFallback active={active} animated={capability !== 'static'} />}
      </div>

      <div
        className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/55 to-transparent md:bg-gradient-to-r md:via-surface-0/70"
        aria-hidden="true"
      />

      <p className="sr-only">
        Diagram: a settlement rail with six phases —{' '}
        {PHASES.map((p) => `${p.label} (${p.onchain ? 'on-chain' : 'off-chain'})`).join(', ')}.
        Jobs travel along the rail from left to right; the current phase is{' '}
        {PHASES[active]?.label ?? PHASES[0].label}.
      </p>
    </div>
  );
}
