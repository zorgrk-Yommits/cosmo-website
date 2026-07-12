'use client';

// /vault — graphics-first custody dashboard. Live mainnet reads only, no wallet
// interaction. Three independent sections (maker vault, provider vault, peg);
// a failing module shows an inline error strip, the others keep rendering.

import Link from 'next/link';
import { ArrowRight, Landmark, RefreshCw, Scale, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-mono text-xs text-rose-300">
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
            <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-white/15 bg-black/30 font-mono text-[11px] text-slate-300">
              {index}
            </span>
          )}
          <Icon className="h-4 w-4 text-purple-300" />
          <h2 className="font-mono text-sm font-bold text-slate-100">{title}</h2>
        </div>
        {children}
      </div>
      {subtitle && (
        <p className="mt-1.5 font-sans text-xs leading-relaxed text-slate-500">{subtitle}</p>
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
              <span className="font-mono text-[11px] text-slate-500">{r.label}</span>
              <span className="font-mono text-xs text-slate-300">{format(r.value)}</span>
            </div>
            <div className="h-3 w-full rounded bg-purple-500/15">
              <div
                className="h-full rounded bg-purple-500 transition-[width] duration-500"
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
        color: SERIES[op.key as keyof typeof SERIES] ?? '#64748b',
      });
    }
    const rest = m.custodyBalance - attributed;
    if (rest > ZERO) {
      bondSegments.push({
        key: 'rest',
        label: 'Unattributed / penalty remainder',
        value: rest,
        color: '#475569',
      });
    }
  }

  return (
    <div className="terminal-container terminal-theme-scope">
      <div className="grid-bg" />

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-purple-400" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-slate-300">
            Vault · Supra Mainnet (chain 8)
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-4xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Custody, verifiable.
            </h1>
            <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-slate-300">
              Every security deposit, every limit, every peg — read live from mainnet view
              functions, in three clearly separated sections.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-mono text-[11px] text-slate-500">
                Updated {new Date(lastUpdated).toLocaleTimeString('en-US')}
              </span>
            )}
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
        </div>
      </section>

      {/* ── 1 · Maker vault ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={Landmark}
            index="1"
            title="Maker security deposits — operators K1 & M2"
            subtitle="Held in the maker vault; movable only through maker_vault entry functions. This section shows the RFQ maker side only — compute providers are section 2."
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
          <p className="mb-5 font-sans text-sm leading-relaxed text-slate-400">
            The bar is the live wCOSMO held in the vault, split by which operator deposited it.
          </p>
          {m ? (
            <CompositionBar
              total={m.custodyBalance}
              segments={bondSegments}
              format={wc}
              ariaLabel={`Maker vault custody composition: ${bondSegments
                .map((s) => `${s.label} ${fmtAmt(s.value)} wCOSMO`)
                .join(', ')}`}
            />
          ) : (
            <div className="h-6 w-full animate-pulse rounded bg-white/5" />
          )}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(m?.operators ?? []).map((op) => (
              <OperatorCard
                key={op.key}
                op={op}
                color={SERIES[op.key as keyof typeof SERIES] ?? '#64748b'}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Provider vault ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={Server}
            index="2"
            title="Compute provider security deposits"
            subtitle="A separate vault with its own custody account — providers place deposits to become eligible for compute jobs. Not related to the maker vault above."
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
                  label={pv.paused ? 'Onboarding paused' : 'Onboarding open'}
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
                label="Global deposit limit — utilization"
                format={wc}
                markers={[
                  { label: 'required minimum', value: pv.minBond },
                  ...(pv.maxPerProvider > ZERO
                    ? [{ label: 'per-provider limit', value: pv.maxPerProvider }]
                    : []),
                ]}
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatTile
                  label="Held in the vault (live balance)"
                  value={wc(pv.custodyBalance)}
                  sub="faBalance of the custody account"
                />
                <StatTile
                  label="Total deposited (bookkeeping)"
                  value={wc(pv.totalBonded)}
                  sub="get_total_bonded"
                />
                <StatTile
                  label="Required minimum deposit"
                  value={wc(pv.minBond)}
                  sub="self-service entry"
                />
                <StatTile
                  label="Per-provider limit"
                  value={pv.maxPerProvider > ZERO ? wc(pv.maxPerProvider) : 'uncapped'}
                  sub="guarded-launch limit"
                />
              </div>
            </>
          ) : (
            <div className="h-3 w-full animate-pulse rounded bg-white/5" />
          )}
          <Link
            href="/compute/bond/"
            className="mt-5 inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:text-sky-300"
          >
            Place your security deposit <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── wCOSMO peg ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader
            icon={Scale}
            index="3"
            title="wCOSMO reserve — 1:1 backing"
            subtitle="Every wCOSMO is backed by exactly one $COSMO held in the reserve. This backs the ENTIRE supply — including both vaults above — and is not a security deposit itself."
          >
            {pg && (
              <StatusLamp
                state={pg.pegHolds ? 'good' : 'critical'}
                label={pg.pegHolds ? 'Peg holds — 1:1 verified' : 'Peg broken'}
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
            <div className="h-3 w-full animate-pulse rounded bg-white/5" />
          )}
          <Link
            href="/wcosmo/"
            className="mt-5 inline-flex items-center gap-1 font-mono text-xs text-sky-400 hover:text-sky-300"
          >
            About wCOSMO <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── Address footer ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6 pb-24">
        <div className="rounded-xl border border-dashed border-slate-700 bg-black/40 p-5">
          <p className="mb-3 font-sans text-sm leading-relaxed text-slate-400">
            No private key exists for either custody account; movements are only possible through
            the vaults&apos; entry functions.
          </p>
          <dl className="space-y-1.5 font-mono text-[11px] text-slate-500">
            <div className="text-slate-400">Maker vault (section 1):</div>
            <div className="break-all pl-3">Module: {COSMOCLAW_ADDR}::maker_vault</div>
            <div className="break-all pl-3">Custody account: {MAKER_VAULT_RESOURCE_ADDR}</div>
            <div className="mt-2 text-slate-400">Provider vault (section 2):</div>
            <div className="break-all pl-3">Module: {COMPUTE_PKG_ADDR}::provider_vault</div>
            <div className="break-all pl-3">Custody account: {PROVIDER_VAULT_RESOURCE_ADDR}</div>
            <div className="mt-2 break-all">wCOSMO FA: {WCOSMO_META}</div>
            {m?.admin && <div className="break-all">Admin: {m.admin} (2-of-3 multisig)</div>}
          </dl>
        </div>
      </section>
    </div>
  );
}
