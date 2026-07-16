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
        selected ? 'border-sky-500/40 bg-sky-500/[0.06]' : 'border-white/10 bg-white/[0.02]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-slate-100">
            {provider?.name ?? offer.providerId}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider',
              offer.source === 'wallet'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-500/40 bg-slate-500/10 text-slate-400',
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
            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-sky-300">
              selected
            </span>
          )}
        </div>
        <span className="font-mono text-sm text-slate-200">
          {offer.price} <span className="text-slate-500">in</span>{' '}
          <span className="text-slate-400">{fmtDelivery(offer.deliverySecs)}</span>
        </span>
      </div>
      {offer.note && (
        <p className="mt-2 font-sans text-sm leading-relaxed text-slate-400">{offer.note}</p>
      )}
      {provider && provider.skills.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {provider.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-slate-400"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
