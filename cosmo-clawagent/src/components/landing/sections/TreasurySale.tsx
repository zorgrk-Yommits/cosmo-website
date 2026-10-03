"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CtaLink } from "@/components/cosmo/Cta";
import Chip from "@/components/cosmo/Chip";
import {
  SALE_LIVE,
  deriveSaleAvailability,
  fetchSaleStatus,
  formatUnitsFloor,
  soldSharePct,
  type SaleStatusLike,
} from "@/lib/saleStatus";

// Treasury sale — the discoverability block (below the proof section since
// the site-clarity refactor; the nav keeps a direct link to /buy).
//
// SCOPE: a signpost to /buy with a glanceable picture of the treasury --
// three live figures (available, current price, SUPRA in treasury) and a
// sold-vs-available meter. The price DERIVATION (TWAP, spread, floor), caps,
// worst case, the exit note and the full disclosure live on /buy only and
// are not duplicated here: a second copy could go stale.
//
// THE LIVE CLAIM IS NOT STATIC. The "live" badge and every figure are
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
  const soldPct = soldSharePct(sale.soldWcosmo, sale.inventoryWcosmo);

  if (!SALE_LIVE) return null;

  return (
    <section
      id="treasury-sale"
      aria-labelledby="treasury-sale-title"
      className="relative border-t border-line-subtle py-12 md:py-16"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6 md:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
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
              </p>
            </div>

            <div className="shrink-0">
              <CtaLink
                href="/buy/"
                variant="primary"
                size="md"
                className="w-full md:w-auto"
              >
                Buy wCOSMO
                <ArrowRight className="h-4 w-4" />
              </CtaLink>
            </div>
          </div>

          {sale.selling && sale.inventoryWcosmo !== null && (
            <div className="mt-6 border-t border-line-subtle pt-6">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
                <Figure
                  value={formatUnitsFloor(sale.inventoryWcosmo)}
                  label="wCOSMO available"
                />
                <Figure
                  value={
                    sale.effectiveAsk !== null
                      ? trimAsk(sale.effectiveAsk)
                      : "—"
                  }
                  label="SUPRA per wCOSMO, current price"
                />
                <Figure
                  value={
                    sale.treasurySupra !== null
                      ? formatUnitsFloor(sale.treasurySupra)
                      : "—"
                  }
                  label="SUPRA in treasury"
                />
              </dl>

              {soldPct !== null && sale.soldWcosmo !== null && (
                <div className="mt-6">
                  <div
                    role="meter"
                    aria-label="Share of the sale sold so far"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={soldPct}
                    aria-valuetext={`${soldPct}% sold, ${100 - soldPct}% available`}
                    className="h-2.5 w-full overflow-hidden rounded-full bg-phase-active/15"
                  >
                    {/* min width keeps a non-zero share visible; 0 % draws nothing */}
                    <div
                      className="h-full rounded-full bg-phase-active"
                      style={{
                        width: soldPct > 0 ? `max(${soldPct}%, 6px)` : "0",
                      }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between gap-4 font-mono text-[11px] text-ink-2">
                    <span>
                      sold so far{" "}
                      <span className="tabular text-ink-1">
                        {formatUnitsFloor(sale.soldWcosmo)} ({soldPct}%)
                      </span>
                    </span>
                    <span className="text-right">
                      available now{" "}
                      <span className="tabular text-ink-1">
                        {formatUnitsFloor(sale.inventoryWcosmo)} (
                        {100 - soldPct}%)
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Four decimals are enough to read a price at a glance; the binding quote
// and its derivation are on /buy. Digits are cut from the quoter's string
// (no float round-trip), so the tile can sit at most 0.0001 below the ask.
function trimAsk(ask: string): string {
  const m = /^(\d+)(?:\.(\d{0,4}))?/.exec(ask);
  if (!m) return "—";
  return m[2] ? `${m[1]}.${m[2]}` : m[1];
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    // dt before dd in the DOM (valid <dl>), shown label-under-value.
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-1 font-mono text-[11px] text-ink-2">
        {label}
      </dt>
      <dd className="text-3xl font-semibold tracking-tight text-ink-0 md:text-4xl">
        {value}
      </dd>
    </div>
  );
}
