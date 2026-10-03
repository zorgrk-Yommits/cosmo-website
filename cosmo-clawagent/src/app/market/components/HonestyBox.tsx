import { Lock } from 'lucide-react';
import Surface from '@/components/cosmo/Surface';

// Shared honesty box for every /market page: what runs where, who the
// providers are, and what the page cannot do yet. Translation-proof English,
// no "trustless" claims, limits stated next to the facts they qualify.

const LINES = [
  'Posting a job, our review and the offers run on our server. We review every job before it is listed.',
  'From the moment you lock the payment, every step is a public transaction on Supra Mainnet: locking, delivery, approval and payout. Each one links to the explorer.',
  'Providers today are hand-picked pilot partners with a safety deposit locked on Supra Mainnet. An open provider network is planned, not built.',
  'An approved job description is fixed: the exact text is published under a stable address, and the locked payment is tied to its fingerprint.',
  'Cancelling a job and disputing a result exist in the contract but have no button here yet. For either one, reply to our email about your job.',
];

export default function HonestyBox() {
  return (
    <Surface tone="quiet" className="p-6">
      <div className="mb-3 flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-ink-2" aria-hidden="true" />
        <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
          How this marketplace works, and its limits
        </h3>
      </div>
      <ul className="space-y-2.5">
        {LINES.map((line) => (
          <li key={line} className="flex gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-2" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-ink-1">{line}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}
