'use client';

import { PhaseProvider } from '@/components/cosmo/usePhase';
import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Flow from './sections/Flow';
import Evidence from './sections/Evidence';
import LiveMarket from './sections/LiveMarket';
import Audiences from './sections/Audiences';
import Closing from './sections/Closing';

// The landing. One PhaseProvider wraps the whole page, so the hero core and
// the flow section are always describing the same phase — scroll into the
// flow and the visual behind the headline has already moved with you.

export default function Landing() {
  return (
    <PhaseProvider>
      <div className="terminal-theme-scope relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="grid-bg absolute inset-x-0 top-0 h-[140vh]" />
        </div>
        <div className="relative">
          <Hero />
          <Problem />
          <Flow />
          <Evidence />
          <LiveMarket />
          <Audiences />
          <Closing />
        </div>
      </div>
    </PhaseProvider>
  );
}
