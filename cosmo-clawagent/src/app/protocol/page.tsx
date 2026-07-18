import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'COSMO — Protocol Archive',
  description:
    'Index of earlier COSMO protocol stages — RFQ live view, community experiment, maker-capital research draft, mainnet replay and holder gate. Kept online as a record; not the current product surface.',
};

type ArchiveEntry = {
  href: string;
  title: string;
  description: string;
  chip?: string;
};

const ENTRIES: ArchiveEntry[] = [
  {
    href: '/rfq/',
    title: 'RFQ Live',
    description:
      'Live read of an autonomous maker quoting, funding and settling RFQ trades on Supra Mainnet, reconstructed from public on-chain view functions.',
  },
  {
    href: '/community-rfq/',
    title: 'Community RFQ',
    description:
      'Stage-1 controlled community experiment: an allowlisted wallet previews a small intent-only RFQ. No funds move.',
  },
  {
    href: '/maker-capital/',
    title: 'Maker Capital',
    description:
      'Research draft on community-provided capital as maker inventory. Not live — no deposits, no launch decision.',
  },
  {
    href: '/demo/',
    title: 'Mainnet Demo',
    description:
      'Click-through replay of a controlled Mainnet RFQ round-trip with full transaction evidence. Static on-chain data.',
  },
  {
    href: '/access/',
    title: 'Holder Access',
    chip: 'holder-gated',
    description:
      'StarKey wallet gate that verifies COSMO NFT holder access. No trades, no on-chain transactions.',
  },
];

export default function ProtocolArchivePage() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          <header className="max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-slate-500" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Protocol archive
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold text-white md:text-5xl">
              Protocol archive
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              These pages document earlier stages of the COSMO protocol. They stay
              online as a record — every link keeps working — but they are not the
              current product surface. For that, use Market, Trust and Network in
              the navigation.
            </p>
          </header>

          <div className="mt-10 flex flex-col gap-4">
            {ENTRIES.map((entry) => (
              <div
                key={entry.href}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-mono text-sm font-bold text-white">
                    {entry.title}
                  </h2>
                  {entry.chip && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                      {entry.chip}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {entry.description}
                </p>
                <Link
                  href={entry.href}
                  className="mt-3 inline-block font-mono text-[11px] text-purple-300 hover:text-purple-200"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
