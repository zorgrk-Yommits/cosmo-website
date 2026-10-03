'use client';

import { useEffect, useState } from 'react';

// What this device should be asked to render.
//   'webgl'  — the full settlement core
//   'svg'    — the same rail as SVG, still animated
//   'static' — the same rail, no movement at all
//
// Starts at 'svg' so the server HTML and the first client paint agree and
// something meaningful is on screen immediately; the upgrade (or the
// downgrade to 'static') happens in an effect.
export type Capability = 'webgl' | 'svg' | 'static';

const OVERRIDES: ReadonlySet<string> = new Set(['webgl', 'svg', 'static']);

function detect(): Capability {
  // QA override: ?core=webgl|svg|static forces a path so every rendering can
  // be reviewed on one machine. Never affects a normal visit.
  const forced = new URLSearchParams(window.location.search).get('core');
  if (forced && OVERRIDES.has(forced)) return forced as Capability;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';

  // Small viewports and low-end devices get the cheap path — a phone should
  // not spin up a WebGL context to read a headline.
  if (!window.matchMedia('(min-width: 768px)').matches) return 'svg';

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 4) return 'svg';

  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return 'svg';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    return 'svg';
  }

  return 'webgl';
}

export function useCapability(): Capability {
  const [cap, setCap] = useState<Capability>('svg');

  useEffect(() => {
    const apply = () => setCap(detect());
    apply();
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const width = window.matchMedia('(min-width: 768px)');
    motion.addEventListener('change', apply);
    width.addEventListener('change', apply);
    return () => {
      motion.removeEventListener('change', apply);
      width.removeEventListener('change', apply);
    };
  }, []);

  return cap;
}
