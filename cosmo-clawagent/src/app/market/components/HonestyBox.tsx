import { Lock } from 'lucide-react';
import Surface from '@/components/cosmo/Surface';

// Shared honesty box for every /market page (positioning-v4 guardrail:
// translation-proof EN, no "trustless" claims, the off-/on-chain boundary
// stated plainly).

export default function HonestyBox() {
  return (
    <Surface tone="quiet" className="p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-ink-2" aria-hidden="true" />
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
          How this marketplace works — honestly
        </h3>
      </div>
      <ul className="space-y-2.5">
        {[
          'Posting a job, moderation and offers run on our server — these steps are off-chain and moderated by the operator.',
          'From the moment a buyer selects an offer, every step is a transaction on Supra Mainnet: funding (escrow), delivery, acceptance or dispute, and payout. Each one links to the explorer.',
          'Providers today are curated pilot partners with a security deposit locked on-chain. An open provider network is roadmap, not current fact.',
          'Approved job specifications are frozen: the exact bytes are published under a stable URL and their SHA3-256 hash is what the on-chain funding is locked to.',
        ].map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-2" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-ink-1">{line}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
