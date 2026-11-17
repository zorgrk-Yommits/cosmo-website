// Row 9 of /portfolio: the place where agent functions for this wallet will go.
// Deliberately empty in v0.1: no button, no request, no data.

import Chip from '@/components/cosmo/Chip';

export default function IntelPlaceholder() {
  return (
    <section
      className="mt-6 rounded-xl border border-dashed border-line-base bg-white/[0.02] p-5 opacity-60"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2">
          <span>9 ·</span> Intel agent
        </h2>
        <Chip tone="idle">Not available yet</Chip>
      </div>
      <p className="mt-3 font-sans text-sm text-ink-2">
        Later, an agent can explain what happened with this wallet. Nothing is connected here today and no data is read for it.
      </p>
    </section>
  );
}
