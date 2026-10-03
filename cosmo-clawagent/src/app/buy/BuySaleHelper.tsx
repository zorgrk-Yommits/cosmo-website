'use client';

// /buy — SUPRA -> wCOSMO seller sale. LIVE on Supra mainnet (chain 8).
//
// Follows the proven ProviderBondHelper pattern (chain 8, StarKey
// prepare/review/sign, live views, no keys ever). Differences: the price
// comes from the sale-quoter (/api/sale/quote) as a SIGNED quote, and the
// on-chain cosmo_sale::buy call enforces floor/limits/signature in the VM —
// what the server signs is an offer, what the chain checks is the law.
//
// Naming discipline (binding): the price shown is an "Atmos-referenced
// seller ask with protected minimum" — never an "oracle price", never a
// "guaranteed market price". The four price terms (twap, spread, floor,
// effective ask) are always shown individually, plus which term won.
//
// NEXT_PUBLIC_SALE_LIVE gate: when unset, this page builds with the buy path
// DISABLED at build time — banner up, buttons off, no transaction reachable.
//
// THE FLAG MUST LIVE IN .env.local, NEVER INLINE ON THE BUILD COMMAND.
// Incident 2026-08-20: it was set inline for the 2026-07-19 build (two real
// mainnet buys, one external), then silently lost on the next unrelated
// rebuild. The buy path stayed dead for a month while the contract was
// published, funded and unpaused, and the quoter kept signing on request.
// A rebuild must never be able to close the sale by accident again.
//
// Defense in depth is unchanged and does NOT depend on this flag: the chain
// enforces floor, caps, buyer/chain binding, TTL and replay in cosmo_sale::buy,
// and the quoter fails closed when it cannot read the on-chain floor.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Plug,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CHAIN_ID,
  COSMOCLAW_ADDR,
  WCOSMO_META,
  type SupraProvider,
  bcsBytes,
  bcsU64,
  faBalance,
  fetchSeqNum,
  fmtAmt,
  fmtSupraAmt,
  getSupra,
  hexToBytes,
  parseSupraAmount,
  shortAddr,
} from '@/lib/mainnetOnchain';
import { pingSaleTelemetry } from './telemetry';
import { ArrowLeftRight, Coins, Tag, Wallet as WalletIcon } from 'lucide-react';
import { explainAbort, explainSignError, fetchTxStatus, type TxStage } from '@/lib/txStatus';
import FlowStrip from '@/components/cosmo/FlowStrip';
import MaturityBadge from '@/components/cosmo/MaturityBadge';
import TechDetails from '@/components/cosmo/TechDetails';
import TxStatus from '@/components/cosmo/TxStatus';

const SALE_LIVE = process.env.NEXT_PUBLIC_SALE_LIVE === '1';
const ZERO = BigInt(0);

// ---- sale-quoter API shapes ------------------------------------------------------
type SaleTiles = {
  twap: string;
  spreadBps: string;
  marketAsk: string;
  floor: string;
  effectiveAsk: string;
  askSource: 'market' | 'floor';
};

type GateRow = { gate: string; hit: boolean; measured: string; threshold: string };

type SaleStatusResp = {
  module: string;
  chain: { available: boolean; reason?: string; status?: Record<string, unknown> };
  probe:
    | { ok: true; tiles: SaleTiles; gates: GateRow[] }
    | { ok: false; gateReason: string; gates?: GateRow[] };
  sampler: { windowSamples: number; oracleAgeSecs: string } | null;
  serverPubkey: string;
};

type QuoteResp =
  | {
      ok: true;
      quote: {
        buyer: string;
        amountInRaw: string;
        amountOutRaw: string;
        nonce: string;
        askVersion: string;
        expirySecs: string;
        chainId: number;
        moduleAddr: string;
      };
      signature: string;
      serverPubkey: string;
      tiles: SaleTiles;
      gates: GateRow[];
    }
  | { ok: false; gateReason: string; gates?: GateRow[] };

async function fetchSaleStatus(): Promise<SaleStatusResp> {
  const r = await fetch('/api/sale/status', { cache: 'no-store' });
  if (!r.ok) throw new Error(`status HTTP ${r.status}`);
  return (await r.json()) as SaleStatusResp;
}

async function requestQuote(buyer: string, amountInSupra: string): Promise<QuoteResp> {
  const r = await fetch('/api/sale/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ buyer, amountInSupra }),
  });
  if (!r.ok && r.status !== 429) throw new Error(`quote HTTP ${r.status}`);
  return (await r.json()) as QuoteResp;
}

// ---- Price terms card (the four lines, always individually) ----------------------
function PriceTerms({ tiles }: { tiles: SaleTiles }) {
  const rows: Array<{ label: string; value: string; hint?: string; won: boolean }> = [
    {
      label: 'Market price on Atmos (30-minute middle value)',
      value: `${tiles.twap} SUPRA / COSMO`,
      won: false,
    },
    {
      label: 'Plus the seller markup',
      value: `+${Number(tiles.spreadBps) / 100}% = ${tiles.marketAsk}`,
      won: tiles.askSource === 'market',
    },
    {
      label: 'Minimum price, fixed in the contract',
      value: `${tiles.floor} SUPRA / COSMO`,
      won: tiles.askSource === 'floor',
    },
    {
      label: 'Your price',
      value: `${tiles.effectiveAsk} SUPRA / COSMO`,
      won: false,
    },
  ];
  return (
    <div className="rounded-lg border border-line-base bg-surface-inset p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-ink-1">
        How the price is formed
      </p>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="font-sans text-xs text-ink-1">
              {r.label}
              {r.won && (
                <span className="ml-2 rounded-full border border-phase-active/40 bg-phase-active/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-phase-active">
                  decides the price
                </span>
              )}
            </dt>
            <dd className="font-mono text-xs text-ink-0">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 font-mono text-[10px] text-ink-2">
        The higher of the two wins: market price plus markup, or the minimum price.
      </p>
    </div>
  );
}

// ---- Main helper -----------------------------------------------------------------
export default function BuySaleHelper() {
  const providerRef = useRef<SupraProvider | null>(null);
  const preparedRef = useRef<{ data: unknown } | null>(null);

  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainMsg, setChainMsg] = useState<string | null>(null);

  const [status, setStatus] = useState<SaleStatusResp | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [amountInput, setAmountInput] = useState('');
  const [quote, setQuote] = useState<Extract<QuoteResp, { ok: true }> | null>(null);
  const [gateReason, setGateReason] = useState<string | null>(null);
  const [gates, setGates] = useState<GateRow[]>([]);
  const [secsLeft, setSecsLeft] = useState(0);

  const [payloadText, setPayloadText] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'quote' | 'prepare' | 'sign'>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  // outcome of the purchase transaction, read from the chain
  const [txStage, setTxStage] = useState<TxStage>('idle');
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; tone: 'info' | 'ok' | 'bad' } | null>(null);

  // -- status ----------------------------------------------------------------------
  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      setStatus(await fetchSaleStatus());
      setStatusErr(null);
    } catch (e) {
      setStatus(null);
      setStatusErr((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    pingSaleTelemetry('view', 'buy-page');
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- quote expiry countdown; an expired quote is dropped, never reused ----------
  useEffect(() => {
    if (!quote) return;
    const tick = () => {
      const left = Number(quote.quote.expirySecs) - Math.floor(Date.now() / 1000);
      setSecsLeft(left);
      if (left <= 0) {
        setQuote(null);
        setPayloadText(null);
        preparedRef.current = null;
        setLog({ text: 'The price expired. Ask for a new one.', tone: 'info' });
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [quote]);

  // Any amount change invalidates the quote and prepared payload.
  useEffect(() => {
    setQuote(null);
    setGateReason(null);
    setGates([]);
    setPayloadText(null);
    preparedRef.current = null;
  }, [amountInput]);

  // -- connect (proven M2/bond flow) ----------------------------------------------
  const connect = useCallback(async () => {
    const p = getSupra();
    if (!p) {
      setNotFound(true);
      return;
    }
    providerRef.current = p;
    setNotFound(false);
    setConnecting(true);
    setChainMsg(null);
    try {
      const accounts = await p.connect();
      const addr = Array.isArray(accounts) ? String(accounts[0]) : String(accounts);
      let cid: string | null = null;
      try {
        const c = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
        cid = String((c as { chainId?: unknown })?.chainId ?? c);
      } catch {
        /* keep null */
      }
      if (cid !== CHAIN_ID) {
        try {
          await p.changeNetwork?.({ chainId: CHAIN_ID });
          const c2 = (await p.getChainId?.()) as { chainId?: unknown } | string | number | null;
          cid = String((c2 as { chainId?: unknown })?.chainId ?? c2);
        } catch {
          /* fall through */
        }
      }
      if (cid !== CHAIN_ID) {
        setChainMsg(`Wrong network (${cid ?? '?'}). Switch StarKey to Supra Mainnet.`);
        setAccount(null);
        return;
      }
      setAccount(addr);
      pingSaleTelemetry('connect', 'starkey-connected');
    } catch (e) {
      setLog({ text: `Could not connect: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setConnecting(false);
    }
  }, []);

  // -- quote -----------------------------------------------------------------------
  const amountRaw = parseSupraAmount(amountInput);
  const amountValid = amountRaw !== null && amountRaw > ZERO;

  const getQuote = useCallback(async () => {
    if (!SALE_LIVE || !account || !amountValid) return;
    setBusy('quote');
    setGateReason(null);
    setGates([]);
    try {
      const resp = await requestQuote(account, amountInput.trim().replace(',', '.'));
      if (resp.ok) {
        setQuote(resp);
        pingSaleTelemetry('quote', 'quote-received');
      } else {
        // Gate active: show the plain-language reason. NEVER a price.
        setQuote(null);
        setGateReason(resp.gateReason);
        setGates(resp.gates ?? []);
        pingSaleTelemetry('quote', 'quote-refused');
      }
    } catch (e) {
      setGateReason(`Quote service unreachable: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }, [account, amountInput, amountValid]);

  // -- prepare / sign (exact payload shape from the proven bond helper) ------------
  const prepare = useCallback(async () => {
    const p = providerRef.current;
    if (!SALE_LIVE || !p || !account || !quote) return;
    setBusy('prepare');
    try {
      const q = quote.quote;
      const seq = await fetchSeqNum(account);
      const rawTxPayload = [
        account,
        seq,
        COSMOCLAW_ADDR,
        'cosmo_sale',
        'buy',
        [], // no type args
        [
          bcsU64(BigInt(q.amountInRaw)),
          bcsU64(BigInt(q.amountOutRaw)),
          bcsU64(BigInt(q.nonce)),
          bcsU64(BigInt(q.askVersion)),
          bcsU64(BigInt(q.expirySecs)),
          bcsBytes(hexToBytes(quote.signature)),
        ],
        { txExpiryTime: Number(q.expirySecs) },
      ];
      const data = await p.createRawTransactionData(rawTxPayload);
      preparedRef.current = { data };
      setPayloadText(
        [
          `Sender          : ${account}`,
          `Function-ID     : ${COSMOCLAW_ADDR}::cosmo_sale::buy`,
          'Type-Args       : (none)',
          `Arg 1 amount_in : ${q.amountInRaw}  (= ${fmtSupraAmt(q.amountInRaw)} SUPRA)`,
          `Arg 2 amount_out: ${q.amountOutRaw}  (= ${fmtAmt(q.amountOutRaw)} wCOSMO)`,
          `Arg 3 nonce     : ${q.nonce}`,
          `Arg 4 askVersion: ${q.askVersion}`,
          `Arg 5 expiry    : ${q.expirySecs}`,
          `Arg 6 signature : 0x${quote.signature.slice(0, 24)}… (64 bytes, server quote signature)`,
          `Sequence-Number : ${seq}`,
          'Chain           : 8 (Supra Mainnet)',
          '',
          'The chain re-checks buyer, chain id, module address, floor,',
          'limits and signature — a mismatched quote cannot settle.',
        ].join('\n'),
      );
      pingSaleTelemetry('review', 'payload-prepared');
      setLog({ text: 'Ready. Check what will be signed, then pay.', tone: 'info' });
    } catch (e) {
      setLog({ text: `Could not prepare the transaction: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setBusy(null);
    }
  }, [account, quote]);

  const sign = useCallback(async () => {
    const p = providerRef.current;
    const prepared = preparedRef.current;
    if (!SALE_LIVE || !p || !account || !prepared || !quote) return;
    setBusy('sign');
    let sent = false;
    try {
      const before = await faBalance(account, WCOSMO_META).catch(() => ZERO);
      setTxStage('signing');
      setTxMessage(null);
      setLog(null);
      const hash = await p.sendTransaction({
        data: prepared.data,
        from: account,
        to: COSMOCLAW_ADDR,
        chainId: Number(CHAIN_ID),
        value: '',
      });
      preparedRef.current = null;
      setPayloadText(null);
      setTxHash(hash);
      pingSaleTelemetry('sign', 'tx-sent');
      sent = true;
      setTxStage('sent');
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        // The chain's own verdict first: a failed purchase must say so.
        const verdict = await fetchTxStatus(hash).catch(() => null);
        if (verdict?.status === 'Fail') {
          pingSaleTelemetry('error', 'tx-failed');
          setTxStage('failed');
          setTxMessage(explainAbort(verdict.vmStatus));
          setQuote(null);
          return;
        }
        const bal = await faBalance(account, WCOSMO_META).catch(() => null);
        if (bal !== null && bal > before) {
          pingSaleTelemetry('settle', 'wcosmo-received');
          setTxStage('confirmed');
          setTxMessage('Done. The wCOSMO arrived in your wallet.');
          setQuote(null);
          return;
        }
      }
      setTxStage('unconfirmed');
      setTxMessage('Sent, but not confirmed yet. Open the transaction to check. Nothing is assumed.');
    } catch (e) {
      pingSaleTelemetry('error', 'sign-failed');
      if (sent) {
        setTxStage('unconfirmed');
        setTxMessage('Sent, but the result could not be read. Open the transaction to check.');
      } else {
        setTxStage('idle');
        setLog({ text: explainSignError(e), tone: 'bad' });
      }
    } finally {
      setBusy(null);
    }
  }, [account, quote]);

  // -- render ----------------------------------------------------------------------
  const probeTiles =
    status && status.probe.ok ? status.probe.tiles : quote ? quote.tiles : null;

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          <header className="max-w-2xl">
            <MaturityBadge level="pilot" detail="capped sale on Supra Mainnet" />
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink-0 md:text-5xl">
              Buy wCOSMO with SUPRA
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
              You pay SUPRA and get wCOSMO from the project&apos;s own stock. The price can never
              go below a fixed minimum, and the amounts are capped. The contract enforces both.
            </p>
          </header>
          <div className="mt-6">
            <FlowStrip
              steps={[
                { id: 'wallet', icon: WalletIcon, label: 'Connect wallet' },
                { id: 'price', icon: Tag, label: 'Get a price' },
                { id: 'pay', icon: ArrowLeftRight, label: 'Pay SUPRA' },
                { id: 'receive', icon: Coins, label: 'Receive wCOSMO' },
              ]}
              label="How buying works: connect your wallet, get a price, pay SUPRA, receive wCOSMO."
              className="justify-start"
            />
          </div>

          {/* Buy path disabled banner — build-time gate.
              HONESTY RULE: this banner may only describe THIS BUILD, never the
              chain. The contract is published and funded (see "Live status"
              below, read from the chain on every load) — a build without the
              flag says nothing about that. The earlier wording claimed the
              contract was not deployed; that became false at G2 and stayed up
              for a month. Do not reintroduce claims about chain state here. */}
          {!SALE_LIVE && (
            <div className="mt-8 rounded-lg border border-phase-warn/40 bg-phase-warn/10 p-4">
              <p className="flex items-start gap-2 font-mono text-xs leading-relaxed text-phase-warn">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-bold">Buy path disabled in this build.</span> The
                  connect, price and pay steps are switched off in this version of the site,
                  so no transaction can be started from this page. That says nothing about
                  the sale itself: the live status below is read from the chain.
                </span>
              </p>
            </div>
          )}

          {/* status */}
          <section className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold text-ink-0">Live status</h2>
              <button
                type="button"
                onClick={() => void refreshStatus()}
                className="inline-flex items-center gap-1.5 rounded border border-line-base px-2.5 py-1 font-mono text-[11px] text-ink-1 hover:border-line-strong"
              >
                <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                Refresh
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {statusErr && (
                <p className="font-mono text-xs text-phase-warn">
                  The price service cannot be reached ({statusErr}). No price can be shown.
                </p>
              )}
              {status && !status.chain.available && (
                <p className="font-mono text-xs text-phase-warn">
                  The sale contract cannot be read right now
                  {status.chain.reason ? ` (${status.chain.reason.slice(0, 90)}…)` : ''}. No price
                  is shown until it can.
                </p>
              )}
              {status && status.probe.ok === false && status.chain.available && (
                <p className="font-mono text-xs text-phase-warn">
                  No price right now: {status.probe.gateReason}
                </p>
              )}
              {probeTiles && <PriceTerms tiles={probeTiles} />}
            </div>
          </section>

          {/* flow */}
          <section className="mt-6 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-mono text-sm font-bold text-ink-0">Buy</h2>

            {/* connect */}
            <div className="mt-4">
              {account ? (
                <p className="flex items-center gap-2 font-mono text-xs text-ink-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-phase-settled" />
                  Connected: {shortAddr(account)}
                </p>
              ) : (
                <button
                  type="button"
                  disabled={!SALE_LIVE || connecting}
                  onClick={() => void connect()}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs',
                    SALE_LIVE
                      ? 'border-phase-active/50 bg-phase-active/10 text-phase-active hover:bg-phase-active/20'
                      : 'cursor-not-allowed border-line-base bg-surface-inset text-ink-2',
                  )}
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                  {SALE_LIVE ? 'Connect wallet' : 'Connect (switched off in this build)'}
                </button>
              )}
              {notFound && (
                <p className="mt-2 font-mono text-xs text-phase-warn">
                  The StarKey wallet was not found:{' '}
                  <a href="https://starkey.app" target="_blank" rel="noopener noreferrer" className="text-phase-proof">
                    install it
                  </a>{' '}
                  and reload.
                </p>
              )}
              {chainMsg && <p className="mt-2 font-mono text-xs text-phase-warn">{chainMsg}</p>}
            </div>

            {/* amount + quote */}
            <div className="mt-5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-ink-1">
                Amount you pay (SUPRA)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="1000"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-2 focus:border-phase-active/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!SALE_LIVE || !account || !amountValid || busy !== null}
                  onClick={() => void getQuote()}
                  className={cn(
                    'shrink-0 rounded-lg border px-4 py-2 font-mono text-xs',
                    SALE_LIVE && account && amountValid && busy === null
                      ? 'border-phase-active/50 bg-phase-active/10 text-phase-active hover:bg-phase-active/20'
                      : 'cursor-not-allowed border-line-base bg-surface-inset text-ink-2',
                  )}
                >
                  {busy === 'quote' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get price'}
                </button>
              </div>
              {amountInput !== '' && !amountValid && (
                <p className="mt-1.5 font-mono text-[11px] text-phase-warn">
                  Enter a number above zero (at most 8 digits after the point).
                </p>
              )}
            </div>

            {/* gate reason — never a price */}
            {gateReason && (
              <div className="mt-4 rounded-lg border border-phase-warn/40 bg-phase-warn/10 p-3">
                <p className="flex items-start gap-2 font-mono text-xs text-phase-warn">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  No price: {gateReason}
                </p>
                {gates.filter((g) => g.hit).length > 0 && (
                  <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-ink-1">
                    {gates
                      .filter((g) => g.hit)
                      .map((g) => (
                        <li key={g.gate}>
                          {g.gate}: measured {g.measured} (limit {g.threshold})
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}

            {/* review card */}
            {quote && (
              <div className="mt-4 space-y-3">
                <PriceTerms tiles={quote.tiles} />
                <div className="rounded-lg border border-line-base bg-surface-inset p-4 font-mono text-xs text-ink-1">
                  <p>
                    You pay{' '}
                    <span className="font-bold text-ink-0">
                      {fmtSupraAmt(quote.quote.amountInRaw)} SUPRA
                    </span>{' '}
                    and receive{' '}
                    <span className="font-bold text-ink-0">
                      {fmtAmt(quote.quote.amountOutRaw)} wCOSMO
                    </span>
                    .
                  </p>
                  <p className={cn('mt-1', secsLeft < 30 ? 'text-phase-warn' : 'text-phase-settled')}>
                    This price is valid for {secsLeft} more seconds (price version {quote.quote.askVersion})
                  </p>
                </div>
                {!payloadText && (
                  <button
                    type="button"
                    disabled={!SALE_LIVE || busy !== null}
                    onClick={() => void prepare()}
                    className="inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/10 px-4 py-2 font-mono text-xs text-phase-active hover:bg-phase-active/20"
                  >
                    {busy === 'prepare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    Prepare transaction
                  </button>
                )}
              </div>
            )}

            {/* what will be signed + pay */}
            {payloadText && quote && (
              <div className="mt-4 space-y-3">
                <TechDetails title="Technical details: exactly what you will sign" defaultOpen>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-line-base bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
                    {payloadText}
                  </pre>
                </TechDetails>
                <button
                  type="button"
                  disabled={!SALE_LIVE || busy !== null}
                  onClick={() => void sign()}
                  className="inline-flex items-center gap-2 rounded-lg border border-phase-settled/50 bg-phase-settled/10 px-4 py-2 font-mono text-xs text-phase-settled hover:bg-phase-settled/20"
                >
                  {busy === 'sign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Pay {fmtSupraAmt(quote.quote.amountInRaw)} SUPRA
                </button>
              </div>
            )}

            <TxStatus stage={txStage} message={txMessage ?? undefined} txHash={txHash} className="mt-4" />
            {log && (
              <p
                className={cn(
                  'mt-4 font-mono text-xs',
                  log.tone === 'ok' && 'text-phase-settled',
                  log.tone === 'info' && 'text-ink-1',
                  log.tone === 'bad' && 'text-phase-fault',
                )}
              >
                {log.text}
              </p>
            )}
          </section>

          {/* honesty box */}
          <section className="mt-6 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-mono text-sm font-bold text-ink-0">
              Read this before buying anything
            </h2>
            <ul className="mt-3 space-y-2 font-sans text-sm leading-relaxed text-ink-1">
              <li>
                <span className="text-ink-0">This is a sale by the project.</span> You buy wCOSMO
                from the project&apos;s own stock, not from other traders. The seller fixed a
                minimum price in the contract. No trade can happen below it.
              </li>
              <li>
                <span className="text-ink-0">The price is shown piece by piece:</span> the market
                price on Atmos, the seller markup, the minimum price and the price you get, plus
                which of them decided. The Atmos pool is small (about $9.4k at design time; moving
                its price by 1% costs roughly $23). It is a reference, not a reliable price
                source. The minimum price and the caps are what actually protect.
              </li>
              <li>
                <span className="text-ink-0">Caps fixed in the contract:</span> 250,000 wCOSMO per
                trade, 1,000,000 per rolling 24 hours, 2,000,000 in total. Then the contract
                closes itself for good. No admin can raise these without publishing a new
                contract version.
              </li>
              <li>
                <span className="text-ink-0">What our server does and what the contract checks:</span>{' '}
                the server only signs prices. The contract checks the buyer, the network, its own
                address, the minimum price, all caps, the expiry of the price and the signature
                by itself. A price that breaks any of these cannot go through.
              </li>
              <li>
                <span className="text-ink-0">Remaining risk, stated plainly:</span> if the
                server&apos;s signing key were stolen, an attacker could sell the remaining capped
                stock at the minimum price, never below. The worst case is the remaining cap
                times the gap between market price and minimum price. It is limited only because
                minimum and caps are in the contract.
              </li>
              <li>
                <span className="text-ink-0">Getting out:</span> wCOSMO can be turned back into
                $COSMO 1 to 1 at any time (see the{' '}
                <Link href="/wcosmo/" className="text-phase-proof hover:text-phase-proof">
                  wCOSMO guide
                </Link>
                ). Selling is only possible on Atmos, at whatever liquidity exists there. There
                is no promise to buy back.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
