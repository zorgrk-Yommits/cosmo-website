'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

// useLayoutEffect on the client, useEffect on the server — lets a media
// query be answered before the browser paints without an SSR warning.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Single source of truth for "may we move things". Returns false on the
// server and on the first client render so the static HTML is identical for
// everyone; the real answer arrives in an effect.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return reduced;
}

// True when the viewport is wide enough for the scroll choreography. Answered
// before paint so a section can pick its layout without flashing the wrong one.
export function useWideViewport(): boolean {
  const [wide, setWide] = useState(false);

  useIsoLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return wide;
}

// The one question the scroll sections ask: may we choreograph, or do we
// render everything at once? Reduced motion and narrow viewports both mean
// "render it all, plainly".
export function useChoreography(): boolean {
  const [ok, setOk] = useState(false);

  useIsoLayoutEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const width = window.matchMedia('(min-width: 768px)');
    const apply = () => setOk(!motion.matches && width.matches);
    apply();
    motion.addEventListener('change', apply);
    width.addEventListener('change', apply);
    return () => {
      motion.removeEventListener('change', apply);
      width.removeEventListener('change', apply);
    };
  }, []);

  return ok;
}
