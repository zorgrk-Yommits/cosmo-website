'use client';

// One card per offer on the job detail page. Wallet-signed offers arrive in
// M3; admin-entered pilot offers carry their source honestly as a badge.

import { BadgeCheck, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketOffer, MarketProvider } from '../lib/marketApi';
import { fmtDelivery } from '../lib/marketStatus';

export default function OfferCard({
  offer,
  provider,
  selected,
}: {
  offer: MarketOffer;
  provider: MarketProvider | null;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        selected ? 'border-phase-proof/40 bg-phase-proof/[0.06]' : 'border-line-base bg-surface-1',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-ink-0">
            {provider?.name ?? offer.providerId}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
              offer.source === 'wallet'
                ? 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled'
                : 'border-line-base bg-white/[0.02] text-ink-1',
            )}
          >
            {offer.source === 'wallet' ? (
              <BadgeCheck className="h-2.5 w-2.5" />
            ) : (
              <UserCog className="h-2.5 w-2.5" />
            )}
            {offer.source === 'wallet' ? 'wallet-signed' : 'operator-entered'}
          </span>
          {selected && (
            <span className="rounded-full border border-phase-proof/40 bg-phase-proof/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-phase-proof">
              selected
            </span>
          )}
        </div>
        <span className="font-mono text-sm text-ink-0">
          {offer.price} <span className="text-ink-2">in</span>{' '}
          <span className="text-ink-1">{fmtDelivery(offer.deliverySecs)}</span>
        </span>
      </div>
      {offer.note && (
        <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">{offer.note}</p>
      )}
      {provider && provider.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {provider.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-line-base bg-surface-1 px-2 py-0.5 font-mono text-[10px] text-ink-1"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
