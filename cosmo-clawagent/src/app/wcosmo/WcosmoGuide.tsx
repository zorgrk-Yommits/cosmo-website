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
      className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2 font-mono text-xs text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30"
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 mb-8">
          <span className="inline-flex h-2 w-2 rounded-full bg-purple-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
            wCOSMO · Supra Mainnet (chain 8)
          </span>
        </div>
        <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight text-slate-100">
          wCOSMO — the security-deposit asset
        </h1>
        <p className="mt-5 max-w-3xl font-sans text-lg leading-relaxed text-slate-300">
          wCOSMO is a plain 1:1 wrapper around $COSMO. Every security deposit in the COSMO system
          — compute provider deposits and maker operator deposits — is denominated in it. Wrapping
          and unwrapping are permissionless, and the peg is verifiable on-chain at any time.
        </p>
      </section>

      {/* ── What / why ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-purple-300" />
              <h3 className="font-mono text-sm text-slate-100">What it is</h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              $COSMO itself is a dispatchable fungible asset. wCOSMO is its plain, non-dispatchable
              1:1 wrapper: <code className="font-mono text-[12px] text-slate-300">wcosmo::wrap</code>{' '}
              pulls $COSMO into an on-chain reserve and mints the same amount of wCOSMO;{' '}
              <code className="font-mono text-[12px] text-slate-300">unwrap</code> burns wCOSMO and
              releases $COSMO. There is no admin mint path — wrapping is the only way wCOSMO comes
              into existence. Both directions are permissionless. 6 decimals on mainnet.
            </p>
            <dl className="mt-4 space-y-1.5 font-mono text-[11px] text-slate-500">
              <div className="break-all">wCOSMO FA: {WCOSMO_META}</div>
              <div className="break-all">$COSMO FA: {COSMO_META}</div>
              <div className="break-all">Module: {COSMOCLAW_ADDR}::wcosmo</div>
            </dl>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-purple-300" />
              <h3 className="font-mono text-sm text-slate-100">
                Why security deposits live in wCOSMO
              </h3>
            </div>
            <p className="font-sans text-sm leading-relaxed text-slate-400">
              Holding deposits and applying penalty deductions needs an asset with plain,
              hook-free transfer semantics. The dispatchable $COSMO cannot be held by the vaults
              by construction — they reject dispatchable assets. wCOSMO keeps the economic
              exposure of $COSMO while giving both vaults — the{' '}
              <span className="text-slate-300">maker vault</span> (operator deposits) and the
              separate <span className="text-slate-300">provider vault</span> (compute deposits) —
              a predictable settlement surface. If a provider or maker behaves, the deposit comes
              back out 1:1; on a failure to deliver, a defined penalty deduction goes to the
              counterparty.
            </p>
          </div>
        </div>
      </section>

      {/* ── Live peg widget ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-purple-300" />
              <h3 className="font-mono text-sm text-slate-100">Peg — live, on-chain</h3>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-400 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400 mb-4">
            Invariant: the $COSMO reserve fully backs the wCOSMO supply. Not a claim — a view
            function anyone can call.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={cn(
                'rounded-lg border px-4 py-3',
                peg === null
                  ? 'border-white/10 bg-black/20'
                  : peg.pegHolds
                    ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                    : 'border-rose-500/40 bg-rose-500/[0.06]',
              )}
            >
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                peg_holds()
              </div>
              <div
                className={cn(
                  'mt-1 font-mono text-lg font-bold',
                  peg === null ? 'text-slate-400' : peg.pegHolds ? 'text-emerald-300' : 'text-rose-300',
                )}
              >
                {peg === null ? '—' : peg.pegHolds ? 'true' : 'FALSE'}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                wCOSMO supply
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                {peg ? fmtAmt(peg.supply) : '—'}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                $COSMO reserve
              </div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-200">
                {peg ? fmtAmt(peg.reserve) : '—'}
              </div>
            </div>
          </div>
          {pegErr && <p className="mt-3 font-mono text-xs text-rose-400">{pegErr}</p>}
        </div>
      </section>

      {/* ── How to wrap ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-mono text-sm text-slate-100 mb-3">Wrap / unwrap</h3>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
            With $COSMO in a StarKey wallet on Supra Mainnet, wrapping is a single transaction:{' '}
            <code className="font-mono text-[12px] text-slate-300">
              {COSMOCLAW_ADDR.slice(0, 10)}…::wcosmo::wrap(amount)
            </code>
            . Unwrapping works the same way in reverse at any time — as long as the wCOSMO is not
            currently placed as a security deposit.
          </p>
          <p className="mt-3 font-sans text-sm leading-relaxed text-slate-400">
            If you are onboarding as a compute provider, the deposit helper builds the conversion
            and the deposit as two separate transactions, shows each payload in full, and lets
            you sign both in StarKey:
          </p>
          <Link
            href="/compute/bond/"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-4 py-2 font-mono text-xs text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30"
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
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="font-mono text-sm text-slate-100 mb-3">Getting $COSMO — the honest part</h3>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
            There is currently <span className="text-slate-200">no public listing and no DEX pool</span>{' '}
            for $COSMO. The token is held by a small community, and acquisition happens over the
            counter — you talk to us. That is not a growth hack; it is where a deliberately guarded
            v1 honestly stands. If you want to participate as a provider or maker, copy the template
            and reach out through the contact channel on{' '}
            <Link href="/compute/" className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300">
              /compute
            </Link>
            .
          </p>
          <div className="mt-4">
            <CopyTemplateButton template={OTC_TEMPLATE} label="Copy acquisition template" />
          </div>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-slate-700 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-400">
            {OTC_TEMPLATE}
          </pre>
        </div>
      </section>

      {/* ── Where wCOSMO is used ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-mono text-sm text-slate-100 mb-3">Compute track</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-slate-400">
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
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:text-sky-300"
            >
              About the compute market <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-mono text-sm text-slate-100 mb-3">Maker track (RFQ)</h3>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-slate-400">
              <li>· Maker operators place their operator security deposit in wCOSMO.</li>
              <li>· Quote escrows on the RFQ rail settle in wCOSMO.</li>
              <li>
                · Maker onboarding is not self-service — slot 2 is reserved for the first committed
                external operator and set up together.
              </li>
            </ul>
            <Link
              href="/community-rfq/"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:text-sky-300"
            >
              About the RFQ rail <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Honesty box ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-6 pb-24">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-amber-300" />
            <h3 className="font-mono text-sm text-slate-100">Read this before wrapping anything</h3>
          </div>
          <p className="font-sans text-sm leading-relaxed text-slate-400">
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
