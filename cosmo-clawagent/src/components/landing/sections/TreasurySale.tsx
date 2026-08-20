'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { CtaLink } from '@/components/cosmo/Cta';
import Chip from '@/components/cosmo/Chip';
import {
  SALE_LIVE,
  deriveSaleAvailability,
  fetchSaleStatus,
  type SaleStatusLike,
} from '@/lib/saleStatus';

// Treasury sale — the discoverability block, directly under the hero.
//
// SCOPE, deliberately narrow: this is a signpost to /buy, not a second sale
// UI. Price terms, caps, worst case, the exit note and the full disclosure
// all live on /buy and are not duplicated here. Copying them would create a
// second place that can go stale.
//
// THE LIVE CLAIM IS NOT STATIC. The "live" badge and the inventory figure are
// rendered only after /api/sale/status answers, from the same endpoint /buy
// reads, which in turn reads cosmo_sale::sale_status on chain. Until then the
// block renders a neutral kicker. That is why the exported HTML contains no
// live claim about the sale: a static one could outlive the fact, which is
// exactly the failure this page was fixed for on 2026-08-20.
//
// The section as a whole is hidden when the build has the buy path disabled —
// a build that cannot buy must not advertise buying.

export default function TreasurySale() {
  const [status, setStatus] = useState<SaleStatusLike | null>(null);

  useEffect(() => {
    if (!SALE_LIVE) return;
    const ac = new AbortController();
    fetchSaleStatus(ac.signal)
      .then(setStatus)
      .catch(() => {
        /* stay neutral: no data means no claim */
      });
    return () => ac.abort();
  }, []);

  const sale = deriveSaleAvailability(status);

  if (!SALE_LIVE) return null;

  return (
    <section
      id="treasury-sale"
      aria-labelledby="treasury-sale-title"
      className="relative border-t border-line-subtle py-12 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-5 md:px-6">
        <div className="flex flex-col gap-6 rounded-xl border border-line-base bg-surface-1 p-6 md:flex-row md:items-center md:justify-between md:gap-8 md:p-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
                Treasury sale
              </span>
              {sale.selling && (
                <Chip tone="settled" size="sm">
                  Live on Supra Mainnet
                </Chip>
              )}
            </div>

            <h2
              id="treasury-sale-title"
              className="mt-3 text-balance text-2xl font-semibold tracking-tight text-ink-0 md:text-3xl"
            >
              Buy wCOSMO with SUPRA
            </h2>

            <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-ink-1 md:text-base">
              Buy wCOSMO directly from the COSMO project treasury. Capped and
              floor-protected on-chain.
            </p>

            <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-2">
              No buy-back commitment · wCOSMO unwraps 1:1 to COSMO
              {sale.selling && sale.inventoryWcosmo !== null && (
                <>
                  {' · '}
                  {/* floor, never round: 23782.60 must read 23,782, not
                      23,783 — an inventory figure may understate what is
                      left, never overstate it. */}
                  <span className="tabular">
                    {Math.floor(sale.inventoryWcosmo).toLocaleString('en-US')}
                  </span>{' '}
                  wCOSMO left
                </>
              )}
            </p>
          </div>

          <div className="shrink-0">
            <CtaLink href="/buy/" variant="primary" size="md" className="w-full md:w-auto">
              Buy wCOSMO
              <ArrowRight className="h-4 w-4" />
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
