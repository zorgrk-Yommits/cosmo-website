'use client';

import Hero from './sections/Hero';
import Problem from './sections/Problem';
import Flow from './sections/Flow';
import LiveMarket from './sections/LiveMarket';
import Liquidity from './sections/Liquidity';
import Audiences from './sections/Audiences';
import Evidence from './sections/Evidence';
import TreasurySale from './sections/TreasurySale';
import Closing from './sections/Closing';

// The landing, in the order a first-time visitor needs it (positioning v6.1):
// what this is -> why it is needed -> how a job works -> that it is real ->
// the second use (liquidity) -> where you come in -> proof -> token -> close.

export default function Landing() {
  return (
    <div className="terminal-theme-scope relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="grid-bg absolute inset-x-0 top-0 h-[140vh]" />
      </div>
      <div className="relative">
        <Hero />
        <Problem />
        <Flow />
        <LiveMarket />
        <Liquidity />
        <Audiences />
        <Evidence />
        <TreasurySale />
        <Closing />
      </div>
    </div>
  );
}
