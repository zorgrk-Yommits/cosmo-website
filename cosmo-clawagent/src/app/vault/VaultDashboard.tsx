'use client';

// /vault — graphics-first custody dashboard. Live mainnet reads only, no wallet
// interaction. Three independent sections (maker vault, provider vault, peg);
// a failing module shows an inline error strip, the others keep rendering.

import Link from 'next/link';
import { ArrowRight, Landmark, RefreshCw, Scale, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COSMOCLAW_ADDR,
  MAKER_VAULT_RESOURCE_ADDR,
  WCOSMO_META,
  fmtAmt,
  shortAddr,
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
  title,
  children,
}: {
  icon: typeof Landmark;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-purple-300" />
        <h2 className="font-mono text-sm font-bold text-slate-100">{title}</h2>
      </div>
      {children}
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
        label: 'Custody balance = total locked',
        detail: `${fmtAmt(m.custodyBalance)} = ${fmtAmt(m.totalLocked)} wCOSMO`,
      };
    } else if (m.custodyBalance > m.totalLocked) {
      invariant = {
        state: 'warning',
        label: 'Slashed overhang in custody',
        detail: `${fmtAmt(m.custodyBalance - m.totalLocked)} wCOSMO above total locked`,
      };
    } else {
      invariant = {
        state: 'critical',
        label: 'Custody deficit',
        detail: `${fmtAmt(m.totalLocked - m.custodyBalance)} wCOSMO below total locked`,
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
        label: 'Unattributed / slashed',
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
              Every bonded token, every cap, every peg — read live from mainnet view functions.
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

      {/* ── Custody flow ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-4">
        <CustodyFlowDiagram
          custodyBalance={m?.custodyBalance ?? null}
          operators={m?.operators ?? null}
        />
      </section>

      {/* ── Maker vault ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader icon={Landmark} title="Maker vault — operator bonds">
            <StatusLamp state={invariant.state} label={invariant.label} detail={invariant.detail} />
          </SectionHeader>
          {maker.error && (
            <div className="mb-4">
              <ErrorStrip msg={maker.error} />
            </div>
          )}
          <p className="mb-5 font-sans text-sm leading-relaxed text-slate-400">
            The bar is the custody account&apos;s live wCOSMO balance, split by who bonded it.
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
          <SectionHeader icon={Server} title="Provider vault — compute bonds">
            {pv && (
              <StatusLamp
                state={pv.paused ? 'warning' : 'good'}
                label={pv.paused ? 'Onboarding paused' : 'Onboarding open'}
              />
            )}
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
                label="Global bond cap utilization"
                format={wc}
                markers={[
                  { label: 'min bond', value: pv.minBond },
                  ...(pv.maxPerProvider > ZERO
                    ? [{ label: 'max / provider', value: pv.maxPerProvider }]
                    : []),
                ]}
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatTile label="Min provider bond" value={wc(pv.minBond)} sub="self-service entry" />
                <StatTile
                  label="Max per provider"
                  value={pv.maxPerProvider > ZERO ? wc(pv.maxPerProvider) : 'uncapped'}
                  sub="guarded-launch cap"
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
            Post a provider bond <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* ── wCOSMO peg ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <SectionHeader icon={Scale} title="wCOSMO peg — reserve backing">
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
            No private key exists for the custody account; movements are only possible through
            maker_vault entry functions.
          </p>
          <dl className="space-y-1.5 font-mono text-[11px] text-slate-500">
            <div className="break-all">Module: {COSMOCLAW_ADDR}::maker_vault</div>
            <div className="break-all">Custody resource account: {MAKER_VAULT_RESOURCE_ADDR}</div>
            <div className="break-all">wCOSMO FA: {WCOSMO_META}</div>
            {m?.admin && <div className="break-all">Admin: {m.admin} (2-of-3 multisig)</div>}
          </dl>
        </div>
      </section>
    </div>
  );
}
