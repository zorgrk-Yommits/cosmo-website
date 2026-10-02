'use client';

// /portfolio — "Where are my tokens?" Position snapshot for one address.
//
// Stage 2a (plans/portfolio-view-plan.md): READ-ONLY. This page never asks for
// a signature. StarKey is used only to read the connected address; any address
// can also be typed in. Every number is a live mainnet view call, classified
// against CHAIN time. Scans are window-bounded and labelled as such.
//
// Six rows: wallet | bonded | in escrow | claimable | gone, with reason |
// not readable per address yet (honesty box). "Claimable" lists only positions
// an entry function returns on a click (stage 2b adds the buttons).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plug, RefreshCw, Lock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CHAIN_ID, EXPLORER_ADDR, getSupra, shortAddr, fmtAmt, type SupraProvider } from '@/lib/mainnetOnchain';
import {
  DEFAULT_WINDOW,
  bondPositions,
  fetchChainTime,
  fetchWalletSnapshot,
  nextWindow,
  scanPositions,
  type ChainTime,
  type ScanReport,
  type ScanWindow,
  type WalletSnapshot,
} from './lib/portfolioData';
import { fmtTokenAmt, fmtUtc, sumByToken, type Position } from './lib/positions';

type Snapshot = {
  addr: string;
  chain: ChainTime;
  wallet: WalletSnapshot;
  positions: Position[];
  report: ScanReport;
  takenAtMs: number;
  clockSkewSecs: number;
};

const ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;

export default function PortfolioView() {
  const providerRef = useRef<SupraProvider | null>(null);
  const [addrInput, setAddrInput] = useState('');
  const [addr, setAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [noWallet, setNoWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const windowRef = useRef<ScanWindow>(DEFAULT_WINDOW);

  const load = useCallback(async (a: string) => {
    setLoading(true);
    setErr(null);
    try {
      const chain = await fetchChainTime();
      const browserSecs = Math.floor(Date.now() / 1000);
      const skew = browserSecs - Number(chain.secs);
      const [wallet, scan] = await Promise.all([
        fetchWalletSnapshot(a),
        scanPositions(a, chain.secs, windowRef.current),
      ]);
      windowRef.current = nextWindow(windowRef.current, scan.report.ms);
      setSnap({
        addr: a,
        chain,
        wallet,
        positions: [...bondPositions(wallet, chain.secs), ...scan.positions],
        report: scan.report,
        takenAtMs: Date.now(),
        clockSkewSecs: skew,
      });
    } catch (e) {
      setErr(`Could not read the chain: ${(e as Error).message ?? e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (addr) void load(addr);
  }, [addr, load]);

  const connect = useCallback(async () => {
    const p = getSupra();
    if (!p) {
      setNoWallet(true);
      return;
    }
    providerRef.current = p;
    setNoWallet(false);
    setConnecting(true);
    try {
      const accounts = await p.connect();
      const a = Array.isArray(accounts) ? String(accounts[0]) : String(accounts);
      let cid: string | null = null;
      try {
        const c = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
        cid = String((c as { chainId?: unknown })?.chainId ?? c);
      } catch {
        /* keep null */
      }
      if (cid !== CHAIN_ID) {
        // Reads are mainnet regardless of the wallet's network; just say so.
        setErr(`StarKey is on chain ${cid ?? '?'}; this page reads Supra Mainnet (8) for ${shortAddr(a)}.`);
      }
      setAddrInput(a);
      setAddr(a);
      p.on?.('accountChanged', () => {
        setAddr(null);
        setSnap(null);
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== 4001) setErr(`Connect error: ${(e as Error).message ?? e}`);
    } finally {
      setConnecting(false);
    }
  }, []);

  const lookup = useCallback(() => {
    const a = addrInput.trim();
    if (!ADDR_RE.test(a)) {
      setErr('Enter a Supra address (0x…).');
      return;
    }
    setErr(null);
    setAddr(a);
  }, [addrInput]);

  const rows = useMemo(() => {
    const ps = snap?.positions ?? [];
    return {
      bonded: ps.filter((p) => p.bucket === 'bonded'),
      escrow: ps.filter((p) => p.bucket === 'escrow'),
      claimable: ps.filter((p) => p.bucket === 'claimable'),
      gone: ps.filter((p) => p.bucket === 'gone'),
    };
  }, [snap]);

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />
        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-phase-active shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Position snapshot · Mainnet (chain 8) · read-only
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-ink-0 md:text-5xl">
              Where are my tokens?
            </h1>
            <p className="mt-4 font-sans text-base leading-relaxed text-ink-1">
              One address, five places tokens can be: in the wallet, held as a security deposit,
              held in escrow for an open quote or job, claimable now, or gone with a reason. Every
              line is a live on-chain read. This page never asks you to sign anything.
            </p>
          </header>

          {/* address input */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <label htmlFor="portfolio-addr" className="font-mono text-xs uppercase tracking-wider text-ink-2">
              Address
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                id="portfolio-addr"
                value={addrInput}
                onChange={(e) => setAddrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookup()}
                placeholder="0x…"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-sm text-ink-0 outline-none focus:border-phase-active"
              />
              <button
                type="button"
                onClick={lookup}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-phase-proof/50 bg-phase-proof/20 px-4 py-2 font-mono text-xs text-phase-proof transition-all hover:border-phase-proof hover:bg-phase-proof/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </button>
              <button
                type="button"
                onClick={() => void connect()}
                disabled={connecting || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-line-base px-4 py-2 font-mono text-xs text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Use StarKey address
              </button>
            </div>
            {noWallet && (
              <p className="mt-3 font-sans text-xs text-phase-warn">
                StarKey not found. You can still type any address above; nothing on this page needs a wallet.
              </p>
            )}
            {err && <p className="mt-3 font-mono text-xs text-phase-warn">{err}</p>}
          </section>

          {snap && (
            <>
              {/* snapshot header */}
              <section className="mt-6 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-ink-2">
                <span>
                  <a
                    href={`${EXPLORER_ADDR}${snap.addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-1 underline decoration-line-strong hover:text-ink-0"
                  >
                    {shortAddr(snap.addr)}
                  </a>{' '}
                  · block {snap.chain.height.toLocaleString('en-US')} · chain time {fmtUtc(snap.chain.secs)}
                </span>
                <button
                  type="button"
                  onClick={() => void load(snap.addr)}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-1.5 text-[11px] text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
                  Refresh
                </button>
              </section>
              {Math.abs(snap.clockSkewSecs) > 60 && (
                <p className="mt-2 font-sans text-xs text-phase-warn">
                  Your device clock differs from chain time by {Math.abs(snap.clockSkewSecs)} s. Deadlines below use chain time.
                </p>
              )}
              {snap.wallet.errors.length > 0 && (
                <p className="mt-2 font-sans text-xs text-phase-warn">{snap.wallet.errors.join(' · ')} — shown as unavailable, not as 0.</p>
              )}

              {/* 1 wallet */}
              <Row n="1" title="In your wallet" tone="active">
                <KV k="COSMO" v={snap.wallet.errors.includes('COSMO balance unavailable') ? 'unavailable' : `${fmtAmt(snap.wallet.cosmo)} COSMO`} />
                <KV k="wCOSMO" v={snap.wallet.errors.includes('wCOSMO balance unavailable') ? 'unavailable' : `${fmtAmt(snap.wallet.wcosmo)} wCOSMO`} />
                <p className="mt-2 font-sans text-xs text-ink-2">
                  Free to move. Everything below is also yours but not in the wallet.
                </p>
              </Row>

              {/* 2 bonded */}
              <Row n="2" title="Security deposits (held in a vault)" tone="proof" total={rows.bonded}>
                {rows.bonded.length === 0 ? (
                  <Empty>No security deposit for this address in the maker vault, provider vault or council.</Empty>
                ) : (
                  rows.bonded.map((p, i) => <PositionLine key={i} p={p} />)
                )}
                <p className="mt-2 font-sans text-xs text-ink-2">
                  A deposit makes you eligible; it is not spent. A penalty deduction locks withdrawal for 14 days; a deposit itself starts no lock.
                </p>
              </Row>

              {/* 3 escrow */}
              <Row n="3" title="In escrow (open quotes and jobs)" tone="warn" total={rows.escrow}>
                {rows.escrow.length === 0 ? (
                  <Empty>No open leg for this address in the scanned window.</Empty>
                ) : (
                  rows.escrow.map((p, i) => <PositionLine key={i} p={p} />)
                )}
              </Row>

              {/* 4 claimable */}
              <Row n="4" title="Claimable now" tone="settled" total={rows.claimable}>
                {rows.claimable.length === 0 ? (
                  <Empty>Nothing waiting for a claim in the scanned window.</Empty>
                ) : (
                  rows.claimable.map((p, i) => <PositionLine key={i} p={p} />)
                )}
                <p className="mt-2 font-sans text-xs text-ink-2">
                  Only positions an on-chain function returns on a call are listed here. Claim buttons are not on this page yet; the function name is shown so you can call it from any Supra tool.
                </p>
              </Row>

              {/* 5 gone */}
              <Row n="5" title="Gone, with reason" tone="fault" total={rows.gone}>
                {rows.gone.length === 0 ? (
                  <Empty>No fees recorded for this address in the scanned window.</Empty>
                ) : (
                  rows.gone.map((p, i) => <PositionLine key={i} p={p} />)
                )}
                <KV
                  k="Penalty deductions"
                  v={`${snap.wallet.makerSlashCount.toString()} (maker) · ${snap.wallet.providerSlashCount.toString()} (provider)`}
                />
                <p className="mt-2 font-sans text-xs text-ink-2">
                  Penalty amounts are not recorded per address on-chain, only the count. Vault-wide totals are on the{' '}
                  <Link href="/vault/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">vault page</Link>.
                </p>
              </Row>

              {/* 6 honesty */}
              <section className="mt-6 rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-phase-warn" />
                  <h3 className="font-mono text-sm text-ink-0">Not readable per address yet</h3>
                </div>
                <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
                  <li>· Stakes on agents: the chain exposes totals per agent, not per staker.</li>
                  <li>· Yield accounting not active in v1: no position, no estimate, nothing claimable.</li>
                  <li>· Penalty reserve: vault-wide only; no per-address claim exists.</li>
                  <li>· Council bond: no withdraw function in v1.</li>
                </ul>
              </section>

              {/* window label */}
              <p className="mt-6 font-mono text-[11px] leading-relaxed text-ink-2">
                Checked RFQ requests #{snap.report.rfqRequests.lo}–{Math.max(0, snap.report.rfqRequests.hi - 1)} of {snap.report.rfqRequests.total},
                accepted quotes #{snap.report.rfqQuotes.lo}–{Math.max(0, snap.report.rfqQuotes.hi - 1)} of {snap.report.rfqQuotes.total},
                compute requests #{snap.report.cmpRequests.lo}–{Math.max(0, snap.report.cmpRequests.hi - 1)} of {snap.report.cmpRequests.total},
                compute jobs #{snap.report.cmpJobs.lo}–{Math.max(0, snap.report.cmpJobs.hi - 1)} of {snap.report.cmpJobs.total}
                {' '}in {(snap.report.ms / 1000).toFixed(1)} s at {fmtUtc(snap.chain.secs)}.
                {snap.report.unreadable > 0 && ` ${snap.report.unreadable} record(s) could not be read and are not shown.`}
                {' '}This is a window, not a full census; older records are outside it.
              </p>
            </>
          )}

          {!snap && !loading && (
            <p className="mt-8 font-sans text-sm text-ink-2">
              Enter an address or use StarKey to load a snapshot. Nothing is sent to a server; your browser reads Supra Mainnet directly.
            </p>
          )}
          {loading && (
            <p className="mt-8 inline-flex items-center gap-2 font-mono text-xs text-ink-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading chain time, balances, deposits and the scan window …
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  n,
  title,
  tone,
  total,
  children,
}: {
  n: string;
  title: string;
  tone: 'active' | 'proof' | 'warn' | 'settled' | 'fault';
  total?: Position[];
  children: React.ReactNode;
}) {
  const sums = total ? sumByToken(total) : [];
  return (
    <section
      className={cn(
        'mt-6 rounded-xl border p-5',
        tone === 'active' && 'border-phase-active/25 bg-phase-active/[0.04]',
        tone === 'proof' && 'border-phase-proof/25 bg-phase-proof/[0.04]',
        tone === 'warn' && 'border-phase-warn/25 bg-phase-warn/[0.04]',
        tone === 'settled' && 'border-phase-settled/25 bg-phase-settled/[0.04]',
        tone === 'fault' && 'border-phase-fault/25 bg-phase-fault/[0.04]',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-1">
          <span className="text-ink-2">{n} ·</span> {title}
        </h2>
        {sums.length > 0 && (
          <span className="font-mono text-sm text-ink-0">{sums.map((s) => fmtTokenAmt(s.amount, s.token)).join(' + ')}</span>
        )}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
      <dt className="text-[12px] text-ink-2">{k}</dt>
      <dd className="text-ink-0">{v}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-sm text-ink-2">{children}</p>;
}

function PositionLine({ p }: { p: Position }) {
  return (
    <div className="rounded-lg border border-line-subtle bg-surface-inset/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-sm">
        <span className="text-ink-1">
          {p.ref || sourceLabel(p.source)} <span className="text-ink-2">· as {p.role}</span>
        </span>
        <span className="text-ink-0">{fmtTokenAmt(p.amount, p.token)}</span>
      </div>
      <p className="mt-1 font-sans text-xs leading-relaxed text-ink-1">{p.next}</p>
      {p.returnFn && (
        <p className="mt-1 font-mono text-[11px] text-ink-2">
          returns via <span className="text-ink-1">{p.returnFn}</span>
          {p.returnAfterSecs !== null && p.bucket === 'escrow' && ` from ${fmtUtc(p.returnAfterSecs)}`}
        </p>
      )}
    </div>
  );
}

function sourceLabel(s: Position['source']): string {
  switch (s) {
    case 'maker_vault':
      return 'Maker vault (operator deposit)';
    case 'provider_vault':
      return 'Provider vault (compute deposit)';
    case 'council_bond':
      return 'Council bond';
    default:
      return s;
  }
}
