import { Lock } from 'lucide-react';

// Shared honesty box for every /market page (positioning-v4 guardrail:
// translation-proof EN, no "trustless" claims, the off-/on-chain boundary
// stated plainly).

export default function HonestyBox() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-300" />
        <h3 className="font-mono text-sm text-slate-100">How this marketplace works — honestly</h3>
      </div>
      <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-slate-400">
        <li>
          · Posting a job, moderation and offers run on our server — these steps are
          off-chain and moderated by the operator.
        </li>
        <li>
          · From the moment a buyer selects an offer, every step is a transaction on Supra
          Mainnet: escrow, delivery, acceptance or dispute, and payout. Each one links to
          the explorer.
        </li>
        <li>
          · Providers today are curated pilot partners with a security deposit bonded
          on-chain. An open, permissionless provider network is roadmap, not current fact.
        </li>
        <li>
          · Approved job specifications are frozen: the exact bytes are published under a
          stable URL and their SHA3-256 hash is what the on-chain escrow commits to.
        </li>
      </ul>
    </div>
  );
}
