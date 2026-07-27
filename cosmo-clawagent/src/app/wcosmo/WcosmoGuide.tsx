'use client';

// /wcosmo — public guide: what wCOSMO is, why bonds are denominated in it,
// the live peg status (read-only on-chain views), how to wrap/unwrap, and the
// honest answer on obtaining $COSMO (no public listing — OTC / community).
// Serves both the compute track (provider bond) and the maker track (operator
// bond) descriptively. Client component for the live peg widget, the
// copy-template button and (since G1b-3) the self-service UnwrapHelper —
// the only wallet interaction on this page lives in that helper.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Landmark,
  Lock,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COSMOCLAW_ADDR,
  COSMO_META,
  WCOSMO_META,
  fmtAmt,
  rpcView,
} from '@/lib/mainnetOnchain';
import UnwrapHelper from './UnwrapHelper';

const OTC_TEMPLATE = [
  'COSMO — $COSMO acquisition request (OTC / community)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Intended use (compute provider security deposit / maker operator security deposit / other): …',
  'Amount of $COSMO I am looking for: …',
  'Background (infra / DePIN / agents / community): …',
  'Contact: …',
].join('\n');

type PegStatus = {
  pegHolds: boolean;
  supply: bigint;
  reserve: bigint;
};

async function fetchPeg(): Promise<PegStatus> {
  const W = `${COSMOCLAW_ADDR}::wcosmo`;
  const [pegHolds, supply, reserve] = await Promise.all([
    rpcView(`${W}::peg_holds`, [], []),
    rpcView(`${W}::wcosmo_supply`, [], []),
    rpcView(`${W}::reserve_balance`, [], []),
  ]);
  return {
    pegHolds: pegHolds === true,
    supply: BigInt(String(supply ?? 0)),
    reserve: BigInt(String(reserve ?? 0)),
  };
}

function CopyTemplateButton({ template, label }: { template: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable — the template stays visible below */
    }
  }, [template]);
  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/20 px-4 py-2 font-mono text-xs text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/30"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function WcosmoGuide() {
  const [peg, setPeg] = useState<PegStatus | null>(null);
  const [pegErr, setPegErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPeg(await fetchPeg());
      setPegErr(null);
    } catch (e) {
      setPegErr(`Status error: ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-phase-active/10 border border-phase-active/25 mb-8">
          <span className="inline-flex h-2 w-2 rounded-full bg-phase-active" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-1">
            wCOSMO · Supra Mainnet (chain 8)
          </span>
        </div>
        <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight text-ink-0">
          wCOSMO — the security-deposit asset
        </h1>
        <p className="mt-5 max-w-3xl font-sans text-lg leading-relaxed text-ink-1">
          wCOSMO is a plain 1:1 wrapper around $COSMO. Every security deposit in the COSMO system
          — compute provider deposits and maker operator deposits — is denominated in it. Wrapping
          and unwrapping are permissionless, and the peg is verifiable on-chain at any time.
        </p>
      </section>

      {/* ── What / why ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">What it is</h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              $COSMO itself is a dispatchable fungible asset. wCOSMO is its plain, non-dispatchable
              1:1 wrapper: <code className="font-mono text-[12px] text-ink-1">wcosmo::wrap</code>{' '}
              pulls $COSMO into an on-chain reserve and mints the same amount of wCOSMO;{' '}
              <code className="font-mono text-[12px] text-ink-1">unwrap</code> burns wCOSMO and
              releases $COSMO. There is no admin mint path — wrapping is the only way wCOSMO comes
              into existence. Both directions are permissionless. 6 decimals on mainnet.
            </p>
            <dl className="mt-4 space-y-1.5 font-mono text-[11px] text-ink-2">
              <div className="break-all">wCOSMO FA: {WCOSMO_META}</div>
              <div className="break-all">$COSMO FA: {COSMO_META}</div>
              <div className="break-all">Module: {COSMOCLAW_ADDR}::wcosmo</div>
            </dl>
          </div>
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">
                Why security deposits live in wCOSMO
              </h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              Holding deposits and applying penalty deductions needs an asset with plain,
              hook-free transfer semantics. The dispatchable $COSMO cannot be held by the vaults
              by construction — they reject dispatchable assets. wCOSMO keeps the economic
              exposure of $COSMO while giving both vaults — the{' '}
              <span className="text-ink-1">maker vault</span> (operator deposits) and the
              separate <span className="text-ink-1">provider vault</span> (compute deposits) —
              a predictable settlement surface. If a provider or maker behaves, the deposit comes
              back out 1:1; on a failure to deliver, a defined penalty deduction goes to the
              counterparty.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live peg widget ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">Peg — live, on-chain</h3>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-1.5 font-mono text-[11px] text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <p className="font-sans text-sm leading-relaxed text-ink-1 mb-4">
            Invariant: the $COSMO reserve fully backs the wCOSMO supply. Not a claim — a view
            function anyone can call.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={cn(
                'rounded-lg border px-4 py-3',
                peg === null
                  ? 'border-line-base bg-surface-inset'
                  : peg.pegHolds
                    ? 'border-phase-settled/40 bg-phase-settled/[0.06]'
                    : 'border-phase-fault/40 bg-phase-fault/[0.06]',
              )}
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
                peg_holds()
              </div>
              <div
                className={cn(
                  'mt-1 font-mono text-lg font-bold',
                  peg === null ? 'text-ink-1' : peg.pegHolds ? 'text-phase-settled' : 'text-phase-fault',
                )}
              >
                {peg === null ? '—' : peg.pegHolds ? 'true' : 'FALSE'}
              </div>
            </div>
            <div className="rounded-lg border border-line-base bg-surface-inset px-4 py-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
                wCOSMO supply
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-ink-0">
                {peg ? fmtAmt(peg.supply) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-line-base bg-surface-inset px-4 py-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
                $COSMO reserve
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-ink-0">
                {peg ? fmtAmt(peg.reserve) : '—'}
              </div>
            </div>
          </div>
          {pegErr && <p className="mt-3 font-mono text-xs text-phase-fault">{pegErr}</p>}
        </div>
      </section>

      {/* ── How to wrap ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <h3 className="font-mono text-sm text-ink-0 mb-3">Wrap / unwrap</h3>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            With $COSMO in a StarKey wallet on Supra Mainnet, wrapping is a single transaction:{' '}
            <code className="font-mono text-[12px] text-ink-1">
              {COSMOCLAW_ADDR.slice(0, 10)}…::wcosmo::wrap(amount)
            </code>
            . Unwrapping works the same way in reverse at any time — as long as the wCOSMO is not
            currently placed as a security deposit.
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
            If you are onboarding as a compute provider, the deposit helper builds the conversion
            and the deposit as two separate transactions, shows each payload in full, and lets
            you sign both in StarKey:
          </p>
          <Link
            href="/compute/bond/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/20 px-4 py-2 font-mono text-xs text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/30"
          >
            Place your provider security deposit
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Unwrap self-service (G1b-3) ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <UnwrapHelper />
      </section>

      {/* ── Getting $COSMO — honest ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <h3 className="font-mono text-sm text-ink-0 mb-3">Getting $COSMO — the honest part</h3>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            Three ways, honestly ranked.{' '}
            <span className="text-ink-0">Direct sale (new, capped pilot):</span> you can buy
            wCOSMO against SUPRA straight from the project treasury on{' '}
            <Link href="/buy/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
              /buy
            </Link>{' '}
            — small inventory, hard on-chain caps, floor-protected price, no buy-back commitment;
            all caveats are on that page.{' '}
            <span className="text-ink-0">Atmos:</span> a COSMO/SUPRA pool exists but its
            liquidity is thin — treat quotes there accordingly.{' '}
            <span className="text-ink-0">OTC / community:</span> for provider- or
            maker-scale amounts, acquisition still happens over the counter — copy the template
            and reach out through the contact channel on{' '}
            <Link href="/compute/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
              /compute
            </Link>
            .
          </p>
          <div className="mt-4">
            <CopyTemplateButton template={OTC_TEMPLATE} label="Copy acquisition template" />
          </div>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-line-base bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
            {OTC_TEMPLATE}
          </pre>
        </div>
      </section>

      {/* ── Where wCOSMO is used ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <h3 className="font-mono text-sm text-ink-0 mb-3">Compute track</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>
                · Provider security deposits are denominated in wCOSMO (self-service; the required
                minimum is read live on the deposit page).
              </li>
              <li>
                · Jobs are paid in the payment asset of the request — wCOSMO, CASH or SUPRA on the
                current allowlist (V2 multi-asset path).
              </li>
              <li>
                · On a no-delivery, a penalty deduction of 10% of the required deposit goes to the
                buyer (fixed at accept time).
              </li>
            </ul>
            <Link
              href="/compute/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              About the compute market <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <h3 className="font-mono text-sm text-ink-0 mb-3">Maker track (RFQ)</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>· Maker operators place their operator security deposit in wCOSMO.</li>
              <li>· Quote escrows on the RFQ rail settle in wCOSMO.</li>
              <li>
                · Maker onboarding is not self-service — slot 2 is reserved for the first committed
                external operator and set up together.
              </li>
            </ul>
            <Link
              href="/community-rfq/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              About the RFQ rail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6 pb-24">
        <div className="rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-phase-warn" />
            <h3 className="font-mono text-sm text-ink-0">Read this before wrapping anything</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            wCOSMO is infrastructure, not an investment product. Nothing on this page is financial
            advice, and no yield or price appreciation is promised or implied. The markets that use
            wCOSMO are deliberately small, guarded v1 systems with low caps; parameters can change
            through governance. Wrap what you need for a security deposit — not more. Built on
            Supra.
          </p>
        </div>
      </section>
    </div>
  );
}
