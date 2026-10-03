'use client';

// /vault — graphics-first custody dashboard. Live mainnet reads only, no wallet
// interaction. Three independent sections (maker vault, provider vault, peg);
// a failing module shows an inline error strip, the others keep rendering.

import Link from 'next/link';
import { ArrowRight, Landmark, RefreshCw, Scale, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageIntro from '@/components/cosmo/PageIntro';
import TechDetails from '@/components/cosmo/TechDetails';
import {
  COSMOCLAW_ADDR,
  COMPUTE_PKG_ADDR,
  MAKER_VAULT_RESOURCE_ADDR,
  PROVIDER_VAULT_RESOURCE_ADDR,
  WCOSMO_META,
  fmtAmt,
} from '@/lib/mainnetOnchain';
import { useVaultData } from './useVaultData';
import CustodyFlowDiagram, { SERIES } from './components/CustodyFlowDiagram';
import CompositionBar, { type BarSegment } from './components/CompositionBar';
import UtilizationMeter from './components/UtilizationMeter';
import StatusLamp, { type LampState } from './components/StatusLamp';
import StatTile from './components/StatTile';
import OperatorCard from './components/OperatorCard';

const ZERO = BigInt(0);
const wc = (v: bigint) => `${fmtAmt(v)} wCOSMO`;

function ErrorStrip({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-phase-fault/30 bg-phase-fault/10 px-4 py-2.5 font-mono text-xs text-phase-fault">
      Live data unavailable: {msg} — figures below may be stale.
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  index,
  title,
  subtitle,
  children,
}: {
  icon: typeof Landmark;
  index?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {index && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-line-base bg-surface-inset font-mono text-[11px] text-ink-1">
              {index}
            </span>
          )}
          <Icon className="h-4 w-4 text-phase-active" />
          <h2 className="font-mono text-sm font-bold text-ink-0">{title}</h2>
        </div>
        {children}
      </div>
      {subtitle && (
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-ink-2">{subtitle}</p>
      )}
    </div>
  );
}

// Two single-hue bars on one shared scale (dataviz: never two axes).
function PairBars({
  rows,
  format,
}: {
  rows: { label: string; value: bigint }[];
  format: (v: bigint) => string;
}) {
  const max = rows.reduce((m, r) => (r.value > m ? r.value : m), ZERO);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const pct = max > ZERO ? Number((r.value * BigInt(10000)) / max) / 100 : 0;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-ink-2">{r.label}</span>
              <span className="font-mono text-xs text-ink-1">{format(r.value)}</span>
            </div>
            <div className="h-3 w-full rounded bg-phase-active/15">
              <div
                className="h-full rounded bg-phase-active transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VaultDashboard() {
  const { maker, provider, peg, refreshing, lastUpdated, refresh } = useVaultData();

  const m = maker.data;
  const pv = provider.data;
  const pg = peg.data;

  // maker-vault invariant: custody balance vs bookkeeping total
  let invariant: { state: LampState; label: string; detail?: string } = {
    state: 'unknown',
    label: 'Checking invariant…',
  };
  if (m) {
    if (m.custodyBalance === m.totalLocked) {
      invariant = {
        state: 'good',
        label: 'Held in the vault = total deposited',
        detail: `${fmtAmt(m.custodyBalance)} = ${fmtAmt(m.totalLocked)} wCOSMO`,
      };
    } else if (m.custodyBalance > m.totalLocked) {
      invariant = {
        state: 'warning',
        label: 'Penalty remainder held in the vault',
        detail: `${fmtAmt(m.custodyBalance - m.totalLocked)} wCOSMO above total deposited`,
      };
    } else {
      invariant = {
        state: 'critical',
        label: 'Vault holds less than total deposited',
        detail: `${fmtAmt(m.totalLocked - m.custodyBalance)} wCOSMO missing`,
      };
    }
  }

  // provider-vault invariant: custody balance vs bookkeeping total
  let pvInvariant: { state: LampState; label: string; detail?: string } = {
    state: 'unknown',
    label: 'Checking invariant…',
  };
  if (pv) {
    if (pv.custodyBalance === pv.totalBonded) {
      pvInvariant = {
        state: 'good',
        label: 'Held in the vault = total deposited',
        detail: `${fmtAmt(pv.custodyBalance)} = ${fmtAmt(pv.totalBonded)} wCOSMO`,
      };
    } else if (pv.custodyBalance > pv.totalBonded) {
      pvInvariant = {
        state: 'warning',
        label: 'Surplus held in the vault',
        detail: `${fmtAmt(pv.custodyBalance - pv.totalBonded)} wCOSMO above total deposited`,
      };
    } else {
      pvInvariant = {
        state: 'critical',
        label: 'Vault holds less than total deposited',
        detail: `${fmtAmt(pv.totalBonded - pv.custodyBalance)} wCOSMO missing`,
      };
    }
  }

  const bondSegments: BarSegment[] = [];
  if (m) {
    let attributed = ZERO;
    for (const op of m.operators) {
      const v = op.bond?.amount ?? ZERO;
      attributed += v;
      bondSegments.push({
        key: op.key,
        label: op.label,
        value: v,
        color: SERIES[op.key as keyof typeof SERIES] ?? '#757E8C',
      });
    }
    const rest = m.custodyBalance - attributed;
    if (rest > ZERO) {
      bondSegments.push({
        key: 'rest',
        label: 'Not assigned to an operator (incl. penalty remainder)',
        value: rest,
        color: '#4A5260',
      });
    }
  }

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Intro ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-24 md:px-6">
        <PageIntro
          maturity="live"
          maturityDetail="read from Supra Mainnet"
          title="Where deposits are held."
          lead="Safety deposits sit in contract accounts that have no private key. Tokens can leave only through a withdrawal by their owner or through a deposit penalty. This page reads the balances and limits live."
        />
        <div className="mt-6 flex items-center gap-3">
          {lastUpdated && (
            <span className="font-mono text-[11px] text-ink-2">
              Updated {new Date(lastUpdated).toLocaleTimeString('en-US')}
            </span>
          )}
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
      </section>

      {/* ── 1 · Maker vault ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <SectionHeader
            icon={Landmark}
            index="1"
            title="Maker deposits: operators K1 and M2"
            subtitle="Held by the maker contract. Tokens can leave only through its functions. This section covers the trading side only; provider deposits are section 2."
          >
            <StatusLamp state={invariant.state} label={invariant.label} detail={invariant.detail} />
          </SectionHeader>
          {maker.error && (
            <div className="mb-4">
              <ErrorStrip msg={maker.error} />
            </div>
          )}
          <div className="mb-5">
            <CustodyFlowDiagram
              custodyBalance={m?.custodyBalance ?? null}
              operators={m?.operators ?? null}
            />
          </div>
          <p className="mb-5 font-sans text-sm leading-relaxed text-ink-1">
            The bar is the wCOSMO held right now, split by the operator who deposited it. Operator
            K1 runs by itself:{' '}
            <Link
              href="/rfq/"
              className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
            >
              see its live trading activity
            </Link>
            .
          </p>
          {m ? (
            <CompositionBar
              total={m.custodyBalance}
              segments={bondSegments}
              format={wc}
              ariaLabel={`Who deposited the wCOSMO held by the maker contract: ${bondSegments
                .map((s) => `${s.label} ${fmtAmt(s.value)} wCOSMO`)
                .join(', ')}`}
            />
          ) : (
            <div className="h-6 w-full animate-pulse rounded bg-surface-2" />
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(m?.operators ?? []).map((op) => (
              <OperatorCard
                key={op.key}
                op={op}
                color={SERIES[op.key as keyof typeof SERIES] ?? '#757E8C'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider vault ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <SectionHeader
            icon={Server}
            index="2"
            title="Provider safety deposits"
            subtitle="A separate contract with its own account. Providers put down deposits here to be able to take jobs. Not connected to the maker deposits above."
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusLamp
                state={pvInvariant.state}
                label={pvInvariant.label}
                detail={pvInvariant.detail}
              />
              {pv && (
                <StatusLamp
                  state={pv.paused ? 'warning' : 'good'}
                  label={pv.paused ? 'Sign-up paused' : 'Sign-up open'}
                />
              )}
            </div>
          </SectionHeader>
          {provider.error && (
            <div className="mb-4">
              <ErrorStrip msg={provider.error} />
            </div>
          )}
          {pv ? (
            <>
              <UtilizationMeter
                value={pv.totalBonded}
                max={pv.globalCap}
                label="Limit for all providers together: how much is used"
                format={wc}
                markers={[
                  { label: 'minimum deposit', value: pv.minBond },
                  ...(pv.maxPerProvider > ZERO
                    ? [{ label: 'limit per provider', value: pv.maxPerProvider }]
                    : []),
                ]}
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatTile
                  label="Held by the contract (live balance)"
                  value={wc(pv.custodyBalance)}
                  sub="balance of the contract account"
                />
                <StatTile
                  label="Total deposited (the contract's own count)"
                  value={wc(pv.totalBonded)}
                  sub="what the contract has recorded"
                />
                <StatTile
                  label="Minimum deposit"
                  value={wc(pv.minBond)}
                  sub="anyone can place it"
                />
                <StatTile
                  label="Limit per provider"
                  value={pv.maxPerProvider > ZERO ? wc(pv.maxPerProvider) : 'no limit'}
                  sub="pilot limit"
                />
              </div>
            </>
          ) : (
            <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
          )}
          <Link
            href="/compute/bond/"
            className="mt-5 inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
          >
            Place your safety deposit <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── wCOSMO peg ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="rounded-xl border border-line-base bg-surface-1 p-6">
          <SectionHeader
            icon={Scale}
            index="3"
            title="wCOSMO reserve: backed 1 to 1"
            subtitle="Every wCOSMO is backed by exactly one $COSMO in the reserve. That covers all wCOSMO in existence, including both deposit accounts above. The reserve itself is not a safety deposit."
          >
            {pg && (
              <StatusLamp
                state={pg.pegHolds ? 'good' : 'critical'}
                label={pg.pegHolds ? 'Backed 1 to 1, checked live' : 'Backing is broken'}
              />
            )}
          </SectionHeader>
          {peg.error && (
            <div className="mb-4">
              <ErrorStrip msg={peg.error} />
            </div>
          )}
          {pg ? (
            <PairBars
              rows={[
                { label: 'wCOSMO supply', value: pg.supply },
                { label: '$COSMO reserve', value: pg.reserve },
              ]}
              format={wc}
            />
          ) : (
            <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
          )}
          <div className="mt-5 flex flex-wrap gap-4">
            <Link
              href="/wcosmo/"
              className="inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              About wCOSMO <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/buy/"
              className="inline-flex items-center gap-1 font-mono text-xs text-phase-proof hover:text-phase-proof"
            >
              Buy wCOSMO <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Addresses, for those who want to check ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6">
        <p className="mb-3 font-sans text-sm leading-relaxed text-ink-1">
          Neither deposit account has a private key. Tokens can move only through the functions of
          the contract that owns the account.
        </p>
        <TechDetails title="Technical details: contract and account addresses">
          <dl className="space-y-1.5 font-mono text-[11px]">
            <div className="text-ink-0">Maker vault (section 1):</div>
            <div className="break-all pl-3">Module: {COSMOCLAW_ADDR}::maker_vault</div>
            <div className="break-all pl-3">Custody account: {MAKER_VAULT_RESOURCE_ADDR}</div>
            <div className="mt-2 text-ink-0">Provider vault (section 2):</div>
            <div className="break-all pl-3">Module: {COMPUTE_PKG_ADDR}::provider_vault</div>
            <div className="break-all pl-3">Custody account: {PROVIDER_VAULT_RESOURCE_ADDR}</div>
            <div className="mt-2 break-all">wCOSMO FA: {WCOSMO_META}</div>
            {m?.admin && <div className="break-all">Admin: {m.admin} (2-of-3 multisig)</div>}
          </dl>
          <p className="mt-3">
            Provider values come from provider_vault views (get_total_bonded, get_min_provider_bond,
            get_max_bond_per_provider, get_global_bond_cap, is_onboarding_paused) and the fungible
            asset balance of the custody account. The reserve check reads wcosmo::peg_holds,
            wcosmo_supply and reserve_balance.
          </p>
        </TechDetails>
      </section>
    </div>
  );
}
