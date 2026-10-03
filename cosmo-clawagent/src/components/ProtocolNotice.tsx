import Link from 'next/link';
import MaturityBadge from '@/components/cosmo/MaturityBadge';

// The one header every archived page opens with: the Archive label, one
// sentence that says what the page was, and the way back to what COSMO does
// today. Archived pages keep their original content and vocabulary below it.
export default function ProtocolNotice({ what }: { what?: string }) {
  return (
    <div className="mb-8 rounded-xl border border-line-base bg-surface-1 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <MaturityBadge level="archive" size="sm" />
        <span className="text-sm text-ink-1">
          {what ?? 'An earlier track of the project.'} It is no longer developed and is kept for
          reference. The text below uses the technical words of that time.
        </span>
      </div>
      <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        <Link href="/" className="text-phase-active hover:text-ink-0">
          What COSMO does today →
        </Link>
        <Link href="/protocol/" className="text-phase-active hover:text-ink-0">
          All archived pages →
        </Link>
      </p>
    </div>
  );
}
