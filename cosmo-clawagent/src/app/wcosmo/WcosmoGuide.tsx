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
  ArrowLeftRight,
  ArrowRight,
  Check,
  Coins,
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
import PageIntro from '@/components/cosmo/PageIntro';
import TechDetails from '@/components/cosmo/TechDetails';

const OTC_TEMPLATE = [
  'COSMO — $COSMO acquisition request (OTC / community)',
  '',
  'Wallet (Supra, chain 8): 0x…',
  'Intended use (provider safety deposit / maker safety deposit / other): …',
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
      setPegErr(`The values could not be read right now (${(e as Error).message}).`);
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

      {/* ── Intro ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-24 md:px-6">
        <PageIntro
          maturity="live"
          maturityDetail="Supra Mainnet"
          title="wCOSMO: $COSMO in a form contracts can hold."
          lead="wCOSMO is $COSMO, wrapped 1 to 1. Safety deposits are held in it. Anyone can turn $COSMO into wCOSMO and back at any time, and the 1 to 1 backing can be checked on-chain."
          flow={[
            { id: 'cosmo', icon: Coins, label: '$COSMO' },
            { id: 'wrap', icon: ArrowLeftRight, label: 'Wrap or unwrap, 1 to 1' },
            { id: 'wcosmo', icon: ShieldCheck, label: 'wCOSMO' },
          ]}
          flowLabel="$COSMO and wCOSMO convert into each other, 1 to 1, in both directions."
        />
      </section>

      {/* ── What / why ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">What it is</h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              Wrapping puts your $COSMO into a reserve and gives you the same amount of wCOSMO.
              Unwrapping does the reverse. Nobody can create wCOSMO any other way, not even an
              admin, so every wCOSMO is backed by one $COSMO. Anyone can do both, without asking.
            </p>
            <TechDetails className="mt-4">
              <p>
                $COSMO is a dispatchable fungible asset. wCOSMO is its plain, non-dispatchable
                1:1 wrapper: <code className="font-mono text-[12px]">wcosmo::wrap</code> pulls
                $COSMO into an on-chain reserve and mints the same amount of wCOSMO;{' '}
                <code className="font-mono text-[12px]">unwrap</code> burns wCOSMO and releases
                $COSMO. There is no admin mint path. 6 decimals on mainnet.
              </p>
              <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
                <div className="break-all">wCOSMO FA: {WCOSMO_META}</div>
                <div className="break-all">$COSMO FA: {COSMO_META}</div>
                <div className="break-all">Module: {COSMOCLAW_ADDR}::wcosmo</div>
              </dl>
            </TechDetails>
          </div>
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">
                Why safety deposits are held in wCOSMO
              </h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              A deposit contract needs a token that moves in a simple, predictable way. $COSMO has
              extra transfer logic built in, and the deposit contracts refuse such tokens on
              purpose. wCOSMO is worth exactly the same but moves simply. If a provider or maker
              does the job, the deposit comes back out 1 to 1. If they fail to deliver, a fixed
              part of it goes to the other side.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live peg widget ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-phase-active" />
              <h3 className="font-mono text-sm text-ink-0">The backing, checked live</h3>
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
            The $COSMO in the reserve covers all wCOSMO in existence. This is read from the
            contract right now, and anyone can read the same values.
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
                Backed 1 to 1
              </div>
              <div
                className={cn(
                  'mt-1 font-mono text-lg font-bold',
                  peg === null ? 'text-ink-1' : peg.pegHolds ? 'text-phase-settled' : 'text-phase-fault',
                )}
              >
                {peg === null ? '—' : peg.pegHolds ? 'yes' : 'NO'}
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
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <h3 className="font-mono text-sm text-ink-0 mb-3">Wrap and unwrap</h3>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            With $COSMO in a StarKey wallet on Supra Mainnet, wrapping is one transaction (
            <code className="font-mono text-[12px] text-ink-1">
              {COSMOCLAW_ADDR.slice(0, 10)}…::wcosmo::wrap(amount)
            </code>
            ). Unwrapping works the same way in reverse at any time, as long as the wCOSMO is not
            placed as a safety deposit right now.
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
            If you want to become a provider, the deposit page does the conversion and the
            deposit as two separate transactions, shows exactly what you sign, and lets you
            confirm both in your wallet:
          </p>
          <Link
            href="/compute/bond/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/20 px-4 py-2 font-mono text-xs text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/30"
          >
            Place your safety deposit
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── Unwrap self-service (G1b-3) ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <UnwrapHelper />
      </section>

      {/* ── Getting $COSMO — honest ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <h3 className="font-mono text-sm text-ink-0 mb-3">How to get $COSMO or wCOSMO</h3>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            Three ways, in honest order.{' '}
            <span className="text-ink-0">Direct sale (capped pilot):</span> buy wCOSMO with
            SUPRA from the project&apos;s own stock on the{' '}
            <Link href="/buy/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
              buy page
            </Link>
            . The stock is small, the amounts are capped, the price has a fixed minimum and
            there is no promise to buy back. All limits are on that page.{' '}
            <span className="text-ink-0">Atmos:</span> a COSMO/SUPRA pool exists, but little
            money sits in it, so prices there move easily.{' '}
            <span className="text-ink-0">Directly from us or the community:</span> for the
            amounts a provider or maker needs, copy the template below and write to us through
            the COSMO community channel (see{' '}
            <Link href="/compute/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
              How earning works
            </Link>
            ).
          </p>
          <div className="mt-4">
            <CopyTemplateButton template={OTC_TEMPLATE} label="Copy the template" />
          </div>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-line-base bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
            {OTC_TEMPLATE}
          </pre>
        </div>
      </section>

      {/* ── Where wCOSMO is used ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <h3 className="font-mono text-sm text-ink-0 mb-3">Where wCOSMO is used: jobs</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>
                · Providers put down their safety deposit in wCOSMO. The current minimum is shown
                live on the deposit page.
              </li>
              <li>· Jobs are paid in the token the job names: wCOSMO, CASH or SUPRA.</li>
              <li>
                · If a provider does not deliver, part of the required deposit goes to the buyer.
                The exact share is shown live on the earning page.
              </li>
            </ul>
            <Link
              href="/compute/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              How earning works <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-line-base bg-surface-1 p-6">
            <h3 className="font-mono text-sm text-ink-0 mb-3">Where wCOSMO is used: trading (archive)</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>· Makers, who offer token trades, put down their safety deposit in wCOSMO.</li>
              <li>· The tokens a maker puts behind an offer are held in wCOSMO.</li>
              <li>
                · Becoming a maker is not self-service. The second place is kept for the first
                outside operator and is set up together.
              </li>
            </ul>
            <Link
              href="/community-rfq/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              About the trading experiment <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 md:px-6 pb-24">
        <div className="rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-phase-warn" />
            <h3 className="font-mono text-sm text-ink-0">Read this before wrapping anything</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            wCOSMO is a tool, not an investment product. Nothing on this page is financial
            advice, and no yield or rising price is promised or implied. The markets that use
            wCOSMO are small on purpose, with low limits, and their rules can be changed by the
            2-of-3 admin group. Wrap what you need for a safety deposit, not more. Built on Supra.
          </p>
        </div>
      </section>
    </div>
  );
}
