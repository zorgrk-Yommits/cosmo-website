import Link from 'next/link';

// Small archive banner rendered at the top of every archived protocol page.
export default function ProtocolNotice() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line-base bg-surface-1 px-4 py-2.5 font-mono text-[11px] text-ink-2">
      <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-ink-2" />
      <span>Part of the COSMO protocol archive — not the current product surface.</span>
      <Link href="/protocol/" className="text-phase-active hover:text-phase-active">
        Protocol archive →
      </Link>
    </div>
  );
}
