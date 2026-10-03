'use client';

// /portfolio — "Where are my tokens?" Position snapshot for one address.
//
// Stage 2a (plans/portfolio-view-plan.md): reading is READ-ONLY. StarKey is used
// to read the connected address; any address can also be typed in. Every number
// is a live mainnet view call, classified against CHAIN time. Scans are
// window-bounded and labelled as such.
//
// Stage 2b (D-PV-3, separate GO 02.10.2026): return-path buttons. They appear
// ONLY for the StarKey address that is connected (owner signs), only on chain 8,
// and each one re-reads its record live before the payload is built. The payload
// is shown in full before signing. Aborts are mapped to plain text. Two aborts
// after a green precondition lock every button (kill condition).
//
// Six rows: wallet | bonded | in escrow | claimable | gone, with reason |
// not readable per address yet (honesty box).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plug, RefreshCw, Lock, Eye, ShieldCheck, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CHAIN_ID,
  EXPLORER_ADDR,
  bcsU64,
  fetchSeqNum,
  getSupra,
  sameAddr,
  shortAddr,
  fmtAmt,
  type SupraProvider,
} from '@/lib/mainnetOnchain';
import {
  DEFAULT_WINDOW,
  PACKAGE_ADDRS,
  bondPositions,
  fetchChainTime,
  fetchMinBonds,
  fetchWalletSnapshot,
  nextWindow,
  refetchPosition,
  scanPositions,
  waitForTx,
  type ChainTime,
  type MinBonds,
  type ScanReport,
  type ScanWindow,
  type WalletSnapshot,
} from './lib/portfolioData';
import { fmtTokenAmt, fmtUtc, sumByToken, type Position } from './lib/positions';
import type { TxStage } from '@/lib/txStatus';
import MaturityBadge from '@/components/cosmo/MaturityBadge';
import TechDetails from '@/components/cosmo/TechDetails';
import TokenPosition, { type PositionPart } from '@/components/cosmo/TokenPosition';
import TxStatus from '@/components/cosmo/TxStatus';
import {
  buildCall,
  buttonsLocked,
  checkWithdrawAmount,
  explainAbort,
  parseUnits,
  parseVmAbort,
  payloadLines,
  verifyFresh,
  type ClaimCall,
} from './lib/portfolioTx';

type Snapshot = {
  addr: string;
  chain: ChainTime;
  wallet: WalletSnapshot;
  positions: Position[];
  report: ScanReport;
  takenAtMs: number;
  clockSkewSecs: number;
};

// The four places wCOSMO can be, for the picture at the top. Sums the rows
// already classified below; a deposit counts as free only if it can be
// withdrawn right now.
function glance(
  snap: Snapshot,
  rows: { bonded: Position[]; escrow: Position[]; claimable: Position[] },
): PositionPart[] {
  const isW = (p: Position) => p.token.symbol === 'wCOSMO';
  const sum = (ps: Position[]) => ps.filter(isW).reduce((t, p) => t + p.amount, BigInt(0));
  const num = (q: bigint) => Number(q) / 1e6;
  const amt = (q: bigint) => `${fmtAmt(q)} wCOSMO`;
  const dep = rows.bonded.filter(isW);
  const depFree = sum(dep.filter((p) => p.actionable));
  const depLocked = sum(dep.filter((p) => !p.actionable));
  const locked = sum(rows.escrow) + depLocked;
  const free = sum(rows.claimable) + depFree;
  const walletKnown = !snap.wallet.errors.includes('wCOSMO balance unavailable');
  return [
    { kind: 'wallet', amount: walletKnown ? amt(snap.wallet.wcosmo) : null, value: walletKnown ? num(snap.wallet.wcosmo) : undefined },
    {
      kind: 'locked',
      label: 'Locked (jobs, offers, locked deposits)',
      amount: amt(locked),
      value: num(locked),
      hint: locked > BigInt(0) ? 'Each row below says when it comes free.' : undefined,
    },
    {
      kind: 'free',
      label: 'Free to take back (deposits, expired jobs)',
      amount: amt(free),
      value: num(free),
      hint: free > BigInt(0) ? 'Use the buttons in rows 2 and 4 with your own wallet connected.' : undefined,
    },
  ];
}

type Signer = { addr: string; chainOk: boolean; chainId: string | null };

const ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;
const MAX_SKEW_SECS = 60;

export default function PortfolioView() {
  const providerRef = useRef<SupraProvider | null>(null);
  const [addrInput, setAddrInput] = useState('');
  const [addr, setAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [noWallet, setNoWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [minBonds, setMinBonds] = useState<MinBonds>({ operator: null, provider: null });
  const [abortsAfterGreen, setAbortsAfterGreen] = useState(0);
  const windowRef = useRef<ScanWindow>(DEFAULT_WINDOW);

  const load = useCallback(async (a: string) => {
    setLoading(true);
    setErr(null);
    try {
      const chain = await fetchChainTime();
      const browserSecs = Math.floor(Date.now() / 1000);
      const skew = browserSecs - Number(chain.secs);
      const [wallet, scan, mins] = await Promise.all([
        fetchWalletSnapshot(a),
        scanPositions(a, chain.secs, windowRef.current),
        fetchMinBonds(),
      ]);
      windowRef.current = nextWindow(windowRef.current, scan.report.ms);
      setMinBonds(mins);
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
      // Reads are mainnet regardless of the wallet network. Signing (stage 2b)
      // needs chain 8: ask StarKey to switch, then hard-check.
      const readChain = async (): Promise<string | null> => {
        try {
          const c = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
          return String((c as { chainId?: unknown })?.chainId ?? c);
        } catch {
          return null;
        }
      };
      let cid = await readChain();
      if (cid !== CHAIN_ID) {
        try {
          await p.changeNetwork?.({ chainId: CHAIN_ID });
          cid = await readChain();
        } catch {
          /* fall through to the hard check */
        }
      }
      const chainOk = cid === CHAIN_ID;
      if (!chainOk) {
        setErr(`StarKey is on chain ${cid ?? '?'}. Reading works for ${shortAddr(a)}; claim and withdraw buttons need Supra Mainnet (8).`);
      }
      setSigner({ addr: a, chainOk, chainId: cid });
      setAddrInput(a);
      setAddr(a);
      p.on?.('accountChanged', () => {
        setSigner(null);
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

  // Why buttons are hidden or locked for this snapshot (null = buttons allowed).
  const signBlock: string | null = useMemo(() => {
    if (!snap) return 'no snapshot';
    if (!signer) return 'Connect your wallet to get the buttons for taking tokens back. They appear only for your own address.';
    if (!sameAddr(signer.addr, snap.addr)) return `Buttons appear only for the connected wallet (${shortAddr(signer.addr)}). You are looking at another address.`;
    if (!signer.chainOk) return `Your wallet is on the wrong network (${signer.chainId ?? '?'}). Switch StarKey to Supra Mainnet and connect again.`;
    if (Math.abs(snap.clockSkewSecs) > MAX_SKEW_SECS) return `Your device clock differs from chain time by ${Math.abs(snap.clockSkewSecs)} s. Buttons stay locked until the clocks agree.`;
    if (buttonsLocked(abortsAfterGreen)) return 'Two transactions failed although the check before them passed. As a precaution the buttons are locked until you reload this page.';
    return null;
  }, [snap, signer, abortsAfterGreen]);

  const canSign = signBlock === null;
  const hasActionable = (snap?.positions ?? []).some((p) => p.actionable);

  const onConfirmed = useCallback(() => {
    if (snap) void load(snap.addr);
  }, [snap, load]);

  const onAbortAfterGreen = useCallback(() => setAbortsAfterGreen((n) => n + 1), []);

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <header className="max-w-2xl">
            <MaturityBadge level="live" detail="Supra Mainnet" />
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink-0 md:text-5xl">
              Where are my tokens?
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
              Enter an address to see where its tokens are: in the wallet, in a safety deposit,
              locked in a job, ready to take back, or gone, with the reason. Looking needs no
              wallet. Buttons for taking tokens back appear only for your own connected wallet.
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
                className="min-w-0 flex-1 basis-full rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-sm text-ink-0 outline-none focus:border-phase-active sm:basis-0"
              />
              <button
                type="button"
                onClick={lookup}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-phase-proof/50 bg-phase-proof/20 px-4 py-2 font-mono text-xs text-phase-proof transition-all hover:border-phase-proof hover:bg-phase-proof/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Eye className="h-3.5 w-3.5" />
                Show
              </button>
              <button
                type="button"
                onClick={() => void connect()}
                disabled={connecting || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-line-base px-4 py-2 font-mono text-xs text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Connect wallet
              </button>
            </div>
            {noWallet && (
              <p className="mt-3 font-sans text-xs text-phase-warn">
                The StarKey wallet was not found. You can still type any address above: looking needs no wallet.
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
                  {canSign && (
                    <span className="ml-2 inline-flex items-center gap-1 text-phase-settled">
                      <ShieldCheck className="h-3 w-3" /> your wallet is connected
                    </span>
                  )}
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
              {Math.abs(snap.clockSkewSecs) > MAX_SKEW_SECS && (
                <p className="mt-2 font-sans text-xs text-phase-warn">
                  Your device clock differs from chain time by {Math.abs(snap.clockSkewSecs)} s. Deadlines below use chain time.
                </p>
              )}
              {snap.wallet.errors.length > 0 && (
                <p className="mt-2 font-sans text-xs text-phase-warn">{snap.wallet.errors.join(' · ')}. Shown as unavailable, not as 0.</p>
              )}
              {hasActionable && signBlock && signBlock !== 'no snapshot' && (
                <p className="mt-2 font-sans text-xs text-ink-2">{signBlock}</p>
              )}

              {/* at a glance: where the wCOSMO of this address is */}
              <TokenPosition
                className="mt-4"
                title="wCOSMO of this address, at a glance"
                parts={glance(snap, rows)}
              />
              <p className="mt-2 font-sans text-xs text-ink-2">
                The picture counts wCOSMO only. Other tokens appear in the rows below.
              </p>

              {/* 1 wallet */}
              <Row n="1" title="In your wallet" tone="active">
                <KV k="COSMO" v={snap.wallet.errors.includes('COSMO balance unavailable') ? 'unavailable' : `${fmtAmt(snap.wallet.cosmo)} COSMO`} />
                <KV k="wCOSMO" v={snap.wallet.errors.includes('wCOSMO balance unavailable') ? 'unavailable' : `${fmtAmt(snap.wallet.wcosmo)} wCOSMO`} />
                <p className="mt-2 font-sans text-xs text-ink-2">
                  Free to use. Everything below is also yours, but not in the wallet.
                </p>
              </Row>

              {/* 2 bonded */}
              <Row n="2" title="Safety deposits (held by a contract)" tone="proof" total={rows.bonded}>
                {rows.bonded.length === 0 ? (
                  <Empty>This address has no safety deposit.</Empty>
                ) : (
                  rows.bonded.map((p, i) => (
                    <PositionLine key={i} p={p}>
                      {canSign && p.actionable && (
                        <ClaimPanel
                          p={p}
                          signer={signer!.addr}
                          provider={providerRef.current}
                          minBond={p.source === 'maker_vault' ? minBonds.operator : p.source === 'provider_vault' ? minBonds.provider : null}
                          onConfirmed={onConfirmed}
                          onAbortAfterGreen={onAbortAfterGreen}
                        />
                      )}
                    </PositionLine>
                  ))
                )}
                <p className="mt-2 font-sans text-xs text-ink-2">
                  A deposit is held, not spent. You can withdraw it whenever none of your jobs is active. Only a deposit
                  penalty locks it for a while. If you take out only part, at least the minimum must stay; taking out everything is always allowed.
                </p>
              </Row>

              {/* 3 escrow */}
              <Row n="3" title="Locked in open jobs and offers" tone="warn" total={rows.escrow}>
                {rows.escrow.length === 0 ? (
                  <Empty>Nothing locked for this address in the records that were checked.</Empty>
                ) : (
                  rows.escrow.map((p, i) => <PositionLine key={i} p={p} />)
                )}
              </Row>

              {/* 4 claimable */}
              <Row n="4" title="Ready to take back" tone="settled" total={rows.claimable}>
                {rows.claimable.length === 0 ? (
                  <Empty>Nothing to take back in the records that were checked.</Empty>
                ) : (
                  rows.claimable.map((p, i) => (
                    <PositionLine key={i} p={p}>
                      {canSign && p.actionable && (
                        <ClaimPanel
                          p={p}
                          signer={signer!.addr}
                          provider={providerRef.current}
                          minBond={null}
                          onConfirmed={onConfirmed}
                          onAbortAfterGreen={onAbortAfterGreen}
                        />
                      )}
                    </PositionLine>
                  ))
                )}
                <p className="mt-2 font-sans text-xs text-ink-2">
                  Only tokens the contract hands back when asked are listed here. The button checks the record again, live,
                  before it prepares the transaction. The contract function is named in each row for those who use their own tools.
                </p>
              </Row>

              {/* 5 gone */}
              <Row n="5" title="Gone, with the reason" tone="fault" total={rows.gone}>
                {rows.gone.length === 0 ? (
                  <Empty>No fees recorded for this address in the records that were checked.</Empty>
                ) : (
                  rows.gone.map((p, i) => <PositionLine key={i} p={p} />)
                )}
                <KV
                  k="Deposit penalties so far"
                  v={`${snap.wallet.makerSlashCount.toString()} (maker) · ${snap.wallet.providerSlashCount.toString()} (provider)`}
                />
                <p className="mt-2 font-sans text-xs text-ink-2">
                  The chain records how many penalties an address had, not their amounts. Totals for all deposits are on the{' '}
                  <Link href="/vault/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">deposits page</Link>.
                </p>
              </Row>

              {/* 6 honesty */}
              <section className="mt-6 rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-phase-warn" />
                  <h3 className="font-mono text-sm text-ink-0">What this page cannot show yet</h3>
                </div>
                <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
                  <li>· Jobs you work on as a provider: only the buyer side of a job is listed. What you earn arrives in your wallet when the job is paid.</li>
                  <li>· Stakes on agents: the chain shows totals per agent, not per person.</li>
                  <li>· Yield: not active in this version. There is no position, no estimate and nothing to take back.</li>
                  <li>· The penalty reserve: it exists for all deposits together, not per address.</li>
                  <li>· Council deposits: this version has no function to withdraw them.</li>
                </ul>
              </section>

              {/* how much was checked */}
              <p className="mt-6 font-sans text-xs leading-relaxed text-ink-2">
                Only the most recent records are checked, so this is a window, not a full census: older records are
                outside it. Read at {fmtUtc(snap.chain.secs)} in {(snap.report.ms / 1000).toFixed(1)} s.
                {snap.report.unreadable > 0 && ` ${snap.report.unreadable} record(s) could not be read and are not shown.`}
              </p>
              <TechDetails title="Technical details: which records were checked" className="mt-3">
                <p className="font-mono text-[11px] leading-relaxed">
                  RFQ requests #{snap.report.rfqRequests.lo}–{Math.max(0, snap.report.rfqRequests.hi - 1)} of {snap.report.rfqRequests.total},
                  accepted quotes #{snap.report.rfqQuotes.lo}–{Math.max(0, snap.report.rfqQuotes.hi - 1)} of {snap.report.rfqQuotes.total},
                  compute requests #{snap.report.cmpRequests.lo}–{Math.max(0, snap.report.cmpRequests.hi - 1)} of {snap.report.cmpRequests.total},
                  compute jobs #{snap.report.cmpJobs.lo}–{Math.max(0, snap.report.cmpJobs.hi - 1)} of {snap.report.cmpJobs.total}.
                  Block {snap.chain.height.toLocaleString('en-US')}.
                </p>
              </TechDetails>
            </>
          )}

          {!snap && !loading && (
            <p className="mt-8 font-sans text-sm text-ink-2">
              Enter an address or connect your wallet. Nothing is sent to our server: your browser reads Supra Mainnet directly.
            </p>
          )}
          {loading && (
            <p className="mt-8 inline-flex items-center gap-2 font-mono text-xs text-ink-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading balances, deposits and recent records from the chain …
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Stage 2b: one return-path panel per actionable position ----------------------

type Phase = 'idle' | 'verifying' | 'ready' | 'signing' | 'pending' | 'done' | 'failed';

function ClaimPanel({
  p,
  signer,
  provider,
  minBond,
  onConfirmed,
  onAbortAfterGreen,
}: {
  p: Position;
  signer: string;
  provider: SupraProvider | null;
  minBond: bigint | null;
  onConfirmed: () => void;
  onAbortAfterGreen: () => void;
}) {
  const isWithdraw = p.source === 'maker_vault' || p.source === 'provider_vault';
  const [amountInput, setAmountInput] = useState(() => fmtPlain(p.amount, p.token.decimals));
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState<{ text: string; tone: 'info' | 'ok' | 'bad' } | null>(null);
  const [payloadText, setPayloadText] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStage, setTxStage] = useState<TxStage>('idle');
  const preparedRef = useRef<{ data: unknown; call: ClaimCall } | null>(null);

  const amountCheck = useMemo(() => {
    if (!isWithdraw) return null;
    const a = parseUnits(amountInput, p.token.decimals);
    if (a === null) return { ok: false, reason: `Enter an amount with at most ${p.token.decimals} decimals.`, amount: null as bigint | null };
    const c = checkWithdrawAmount(a, p.amount, minBond);
    return { ...c, amount: a };
  }, [isWithdraw, amountInput, p.amount, p.token.decimals, minBond]);

  const reset = () => {
    preparedRef.current = null;
    setPayloadText(null);
  };

  const prepare = useCallback(async () => {
    if (!provider) return;
    reset();
    setPhase('verifying');
    setTxStage('idle');
    setMsg({ text: 'Checking the record again, live …', tone: 'info' });
    try {
      const chain = await fetchChainTime();
      const fresh = await refetchPosition(p, signer, chain.secs);
      const v = verifyFresh(p, fresh);
      if (!v.ok) {
        setPhase('idle');
        setMsg({ text: v.reason, tone: 'bad' });
        return;
      }
      const amount = isWithdraw ? amountCheck?.amount ?? null : undefined;
      if (isWithdraw && (!amountCheck?.ok || amount === null)) {
        setPhase('idle');
        setMsg({ text: amountCheck?.reason ?? 'Invalid amount.', tone: 'bad' });
        return;
      }
      const call = buildCall(p, PACKAGE_ADDRS, amount ?? undefined);
      if (!call) {
        setPhase('idle');
        setMsg({ text: 'These tokens cannot be taken back from this page.', tone: 'bad' });
        return;
      }
      const seq = await fetchSeqNum(signer);
      const expiry = Math.ceil(Date.now() / 1000) + 300;
      const rawTxPayload = [signer, seq, call.moduleAddr, call.modName, call.fnName, [], [bcsU64(call.arg)], { txExpiryTime: expiry }];
      const data = await provider.createRawTransactionData(rawTxPayload);
      preparedRef.current = { data, call };
      const argHuman = call.kind === 'withdraw' ? fmtTokenAmt(call.arg, p.token) : '';
      setPayloadText(payloadLines({ sender: signer, call, seq, expiry, argHuman }).join('\n'));
      setPhase('ready');
      setMsg({ text: `${v.reason} Check what will be signed, then sign.`, tone: 'ok' });
    } catch (e) {
      setPhase('idle');
      setMsg({ text: `Could not prepare: ${(e as Error).message ?? e}`, tone: 'bad' });
    }
  }, [provider, p, signer, isWithdraw, amountCheck]);

  const sign = useCallback(async () => {
    const prepared = preparedRef.current;
    if (!provider || !prepared) return;
    setPhase('signing');
    setTxStage('signing');
    setMsg(null);
    try {
      const hash = await provider.sendTransaction({
        data: prepared.data,
        from: signer,
        to: prepared.call.moduleAddr,
        chainId: Number(CHAIN_ID),
        value: '',
      });
      preparedRef.current = null;
      setPayloadText(null);
      setTxHash(hash);
      setPhase('pending');
      setTxStage('sent');
      const st = await waitForTx(hash);
      if (!st) {
        setPhase('failed');
        setTxStage('unconfirmed');
        setMsg({ text: 'Not confirmed within 90 seconds. Open the transaction, then refresh this page. Nothing is assumed.', tone: 'bad' });
        return;
      }
      if (st.status === 'Success') {
        setPhase('done');
        setTxStage('confirmed');
        setMsg({ text: 'Done. Updating the view …', tone: 'ok' });
        onConfirmed();
        return;
      }
      setPhase('failed');
      setTxStage('failed');
      setMsg({ text: explainAbort(st.vmStatus), tone: 'bad' });
      if (parseVmAbort(st.vmStatus)) onAbortAfterGreen();
    } catch (e) {
      const code = (e as { code?: number })?.code;
      setPhase(preparedRef.current ? 'ready' : 'idle');
      setTxStage('idle');
      setMsg({ text: code === 4001 ? 'You declined in the wallet. Nothing was sent.' : `Could not send: ${(e as Error).message ?? e}`, tone: 'bad' });
    }
  }, [provider, signer, onConfirmed, onAbortAfterGreen]);

  const busy = phase === 'verifying' || phase === 'signing' || phase === 'pending';

  return (
    <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-surface-1/60 p-3">
      {isWithdraw && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`amt-${p.source}`} className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
            Withdraw amount
          </label>
          <input
            id={`amt-${p.source}`}
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              if (phase === 'ready') {
                reset();
                setPhase('idle');
                setMsg(null);
              }
            }}
            disabled={busy}
            spellCheck={false}
            className="w-44 rounded-lg border border-line-base bg-surface-inset px-3 py-1.5 font-mono text-sm text-ink-0 outline-none focus:border-phase-active disabled:opacity-50"
          />
          <span className="font-mono text-xs text-ink-2">{p.token.symbol}</span>
          <button
            type="button"
            onClick={() => setAmountInput(fmtPlain(p.amount, p.token.decimals))}
            disabled={busy}
            className="font-mono text-[11px] text-ink-1 underline decoration-line-strong hover:text-ink-0 disabled:opacity-50"
          >
            all
          </button>
          {amountCheck && (
            <span className={cn('font-sans text-xs', amountCheck.ok ? 'text-ink-2' : 'text-phase-warn')}>{amountCheck.reason}</span>
          )}
          {minBond !== null && (
            <span className="font-mono text-[11px] text-ink-2">minimum {fmtTokenAmt(minBond, p.token)}</span>
          )}
        </div>
      )}
      <div className={cn('flex flex-wrap items-center gap-3', isWithdraw && 'mt-3')}>
        <button
          type="button"
          onClick={() => void prepare()}
          disabled={busy || phase === 'done' || (isWithdraw && !amountCheck?.ok)}
          className="inline-flex items-center gap-2 rounded-lg border border-phase-proof/50 bg-phase-proof/20 px-4 py-2 font-mono text-xs text-phase-proof transition-all hover:border-phase-proof hover:bg-phase-proof/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === 'verifying' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          {phase === 'ready' ? 'Check again' : isWithdraw ? 'Check and prepare withdrawal' : 'Check and prepare'}
        </button>
        <button
          type="button"
          onClick={() => void sign()}
          disabled={phase !== 'ready'}
          className="inline-flex items-center gap-2 rounded-lg border border-phase-warn/50 bg-phase-warn/20 px-4 py-2 font-mono text-xs text-phase-warn transition-all hover:border-phase-warn hover:bg-phase-warn/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === 'signing' || phase === 'pending' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
          {isWithdraw ? 'Withdraw deposit' : 'Take tokens back'}
        </button>
      </div>
      {msg && (
        <p className={cn('mt-2 font-sans text-xs leading-relaxed', msg.tone === 'bad' ? 'text-phase-warn' : msg.tone === 'ok' ? 'text-phase-settled' : 'text-ink-1')}>
          {msg.text}
        </p>
      )}
      {payloadText && (
        <TechDetails title="Technical details: exactly what you will sign" defaultOpen className="mt-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-line-strong bg-surface-inset p-3 font-mono text-[11px] leading-relaxed text-ink-1">
            {payloadText}
          </pre>
        </TechDetails>
      )}
      <TxStatus stage={txStage} txHash={txHash} className="mt-3" />
    </div>
  );
}

// Plain decimal string of a base-unit amount (no thousands separators) for an input field.
function fmtPlain(amount: bigint, decimals: number): string {
  const scale = BigInt(10) ** BigInt(decimals);
  const whole = amount / scale;
  const frac = (amount % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole.toString()}.${frac}` : whole.toString();
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

function PositionLine({ p, children }: { p: Position; children?: React.ReactNode }) {
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
          contract function: <span className="text-ink-1">{p.returnFn}</span>
          {p.returnAfterSecs !== null && p.bucket === 'escrow' && ` from ${fmtUtc(p.returnAfterSecs)}`}
        </p>
      )}
      {children}
    </div>
  );
}

function sourceLabel(s: Position['source']): string {
  switch (s) {
    case 'maker_vault':
      return 'Safety deposit as a maker';
    case 'provider_vault':
      return 'Safety deposit as a provider';
    case 'council_bond':
      return 'Council deposit';
    default:
      return s;
  }
}
