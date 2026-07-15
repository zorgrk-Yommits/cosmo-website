'use client';

import { Fragment } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, Coins, KeyRound, Check, Receipt } from 'lucide-react';

// The primitive itself, as a chain rather than a sentence.
//
// Mechanics follow app/demo/components/LifecycleRail.tsx: a flex row with an absolute
// hairline behind it, stacking to a column on mobile. Static -- there is no active step
// here, so no progress bar, only the base line.
//
// Every link is LIVE: request/bond/settlement are proven by the mainnet round-trip and
// three settled compute jobs; capability by the three operator gates that fired in that
// round-trip; accountability by the slashable bond and the on-chain settlement record.
// What is still roadmap is the reputation SCORE on the license -- that belongs in the
// honesty box, not as an asterisk on a link that does work today.

const LINKS = [
  { id: 'request', title: 'Request', note: 'agent posts intent', icon: FileText },
  { id: 'bond', title: 'Bond', note: 'maker collateralizes', icon: Coins },
  { id: 'capability', title: 'Capability', note: 'license gates the quote', icon: KeyRound },
  {
    id: 'settlement',
    title: 'Atomic settlement',
    note: 'completes in full or reverts',
    icon: Check,
    isSettlement: true,
  },
  { id: 'accountability', title: 'Accountability', note: 'slashable, recorded on-chain', icon: Receipt },
] as const;

export default function PrimitiveChain() {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      role="img"
      aria-label="The COSMO primitive as a five-link chain, every link live on Supra Mainnet: an agent posts a request, a maker collateralizes its commitment with a bond, the operator license gates the quote, both legs settle atomically or the whole trade reverts, and the outcome is recorded on-chain against a slashable bond."
      // md:items-stretch keeps every card the same height even though the notes wrap to
      // different line counts — otherwise the taller links float and the row looks ragged.
      className="flex flex-col items-stretch gap-1 md:flex-row md:items-stretch md:gap-0"
    >
      {LINKS.map((link, i) => {
        const Icon = link.icon;
        const settle = 'isSettlement' in link && link.isSettlement;
        return (
          <Fragment key={link.id}>
            <motion.div
              // Animate on mount, not whileInView: an intersection-observer reveal leaves the
              // links at opacity 0 for anything that never scrolls (crawlers, screenshots,
              // deep links). Same as demo/components/StepNode.tsx.
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.04 * i }}
              className={`flex flex-1 flex-col items-center gap-2 rounded-xl border bg-[rgba(15,15,35,0.7)] px-3 py-3 text-center backdrop-blur ${
                settle ? 'border-emerald-400/50' : 'border-purple-500/40'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  settle ? 'bg-emerald-500/15 text-emerald-300' : 'bg-purple-500/15 text-purple-300'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <span className="font-mono text-[13px] font-bold leading-tight text-white">
                {link.title}
              </span>
              <span className="font-mono text-[11px] leading-tight text-slate-400">{link.note}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live
              </span>
            </motion.div>

            {/* Connector. This is what makes it read as a chain rather than five parallel
                tiles — the order (bond BEFORE settlement) is the whole claim. Glyph, not an
                icon font; rotates with the axis. */}
            {i < LINKS.length - 1 && (
              <span
                aria-hidden="true"
                className="shrink-0 self-center py-0.5 font-mono text-sm text-purple-400/70 md:px-1.5 md:py-0"
              >
                <span className="md:hidden">↓</span>
                <span className="hidden md:inline">→</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
