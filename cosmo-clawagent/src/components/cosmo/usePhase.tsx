'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { PHASE_COUNT } from './phases';

// One number, shared. The WebGL core, the SVG rail and the phase cards all
// read the same active index, so the 3D scene can never disagree with the
// text next to it.

type PhaseCtx = { active: number; setActive: (i: number) => void };

const Ctx = createContext<PhaseCtx>({ active: 0, setActive: () => {} });

export function PhaseProvider({
  children,
  initial = 0,
}: {
  children: React.ReactNode;
  initial?: number;
}) {
  const [active, setActiveRaw] = useState(initial);
  const value = useMemo<PhaseCtx>(
    () => ({
      active,
      setActive: (i) => setActiveRaw(Math.min(PHASE_COUNT - 1, Math.max(0, i))),
    }),
    [active],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePhase = () => useContext(Ctx);
