import Chip, { type ChipTone } from './Chip';

// How real is this? One scale for the whole site, one definition per level,
// so "live" on one page can never mean something else on another. The
// definition travels with the badge (title attribute, or visible via
// `explain`) instead of living in a footnote.

export type Maturity = 'live' | 'pilot' | 'tested' | 'experimental' | 'planned' | 'archive';

export const MATURITY: Record<Maturity, { label: string; tone: ChipTone; meaning: string }> = {
  live: {
    label: 'Live',
    tone: 'settled',
    meaning: 'Runs on mainnet today and is open to use.',
  },
  pilot: {
    label: 'Pilot',
    tone: 'active',
    meaning: 'Runs on mainnet today with real funds, supervised and with limits.',
  },
  tested: {
    label: 'Tested',
    tone: 'proof',
    meaning: 'Was run for real at least once and the evidence is published. Not running now.',
  },
  experimental: {
    label: 'Experimental',
    tone: 'warn',
    meaning: 'Works in a limited trial form. May change or stop.',
  },
  planned: {
    label: 'Planned',
    tone: 'idle',
    meaning: 'Not built yet.',
  },
  archive: {
    label: 'Archive',
    tone: 'neutral',
    meaning: 'No longer developed. Kept for reference.',
  },
};

export default function MaturityBadge({
  level,
  detail,
  explain = false,
  size = 'md',
  className,
}: {
  level: Maturity;
  // short qualifier shown after the label, e.g. "curated providers"
  detail?: string;
  // render the definition as visible text next to the badge
  explain?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const m = MATURITY[level];
  const chip = (
    <Chip tone={m.tone} size={size} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      <span title={m.meaning}>
        {m.label}
        {detail ? ` · ${detail}` : ''}
      </span>
    </Chip>
  );
  if (!explain) return chip;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {chip}
      <span className="text-sm text-ink-2">{m.meaning}</span>
    </span>
  );
}
