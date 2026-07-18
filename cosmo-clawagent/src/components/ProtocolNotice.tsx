import Link from 'next/link';

// Small archive banner rendered at the top of every archived protocol page.
export default function ProtocolNotice() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-[11px] text-slate-500">
      <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
      <span>Part of the COSMO protocol archive — not the current product surface.</span>
      <Link href="/protocol/" className="text-purple-300 hover:text-purple-200">
        Protocol archive →
      </Link>
    </div>
  );
}
