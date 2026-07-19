'use client';

// /buy — SUPRA -> wCOSMO seller sale (G1b-3, NOT LIVE until G2/G3).
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
// NEXT_PUBLIC_SALE_LIVE gate: until G2 (module published) / G3 (inventory)
// this page builds with the buy path DISABLED at build time — banner up,
// buttons off, no transaction reachable. Defense in depth: the module is
// not even published, and the quoter refuses to sign pre-G2.

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
  EXPLORER_TX,
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
      label: 'Atmos TWAP (30 min median)',
      value: `${tiles.twap} SUPRA / COSMO`,
      won: false,
    },
    {
      label: 'Maker spread',
      value: `+${tiles.spreadBps} bps -> ${tiles.marketAsk}`,
      won: tiles.askSource === 'market',
    },
    {
      label: 'Protected minimum (on-chain floor)',
      value: `${tiles.floor} SUPRA / COSMO`,
      won: tiles.askSource === 'floor',
    },
    {
      label: 'Effective ask',
      value: `${tiles.effectiveAsk} SUPRA / COSMO`,
      won: false,
    },
  ];
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-4">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
        Atmos-referenced seller ask with protected minimum
      </p>
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="font-sans text-xs text-slate-400">
              {r.label}
              {r.won && (
                <span className="ml-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-purple-300">
                  binding term
                </span>
              )}
            </dt>
            <dd className="font-mono text-xs text-slate-200">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 font-mono text-[10px] text-slate-500">
        ask source: {tiles.askSource} · the higher of market ask and floor wins
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
        setLog({ text: 'Quote expired — request a fresh one.', tone: 'info' });
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
        setChainMsg(`Chain ${cid ?? '?'} — please switch StarKey to Supra Mainnet (8)`);
        setAccount(null);
        return;
      }
      setAccount(addr);
      pingSaleTelemetry('connect', 'starkey-connected');
    } catch (e) {
      setLog({ text: `Connect error: ${(e as Error).message ?? e}`, tone: 'bad' });
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
      setLog({ text: 'Payload ready. Review it, then sign in StarKey.', tone: 'info' });
    } catch (e) {
      setLog({ text: `Payload error: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setBusy(null);
    }
  }, [account, quote]);

  const sign = useCallback(async () => {
    const p = providerRef.current;
    const prepared = preparedRef.current;
    if (!SALE_LIVE || !p || !account || !prepared || !quote) return;
    setBusy('sign');
    try {
      const before = await faBalance(account, WCOSMO_META).catch(() => ZERO);
      setLog({ text: 'Waiting for signature in StarKey …', tone: 'info' });
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
      setLog({ text: 'TX sent. Waiting for on-chain confirmation …', tone: 'info' });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const bal = await faBalance(account, WCOSMO_META).catch(() => null);
        if (bal !== null && bal > before) {
          pingSaleTelemetry('settle', 'wcosmo-received');
          setLog({ text: 'Settled — wCOSMO received.', tone: 'ok' });
          setQuote(null);
          return;
        }
      }
      setLog({ text: 'TX sent — confirmation still pending, check the explorer.', tone: 'info' });
    } catch (e) {
      pingSaleTelemetry('error', 'sign-failed');
      setLog({ text: `Sign/send error: ${(e as Error).message ?? e}`, tone: 'bad' });
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
        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Seller sale · SUPRA -&gt; wCOSMO · Mainnet (chain 8)
              </span>
            </div>
            <h1 className="font-mono text-2xl font-bold text-slate-100 md:text-3xl">
              Buy wCOSMO from the project treasury
            </h1>
            <p className="mt-3 font-sans text-sm leading-relaxed text-slate-400">
              A capped, floor-protected seller sale: you pay SUPRA, the on-chain contract
              pays out wCOSMO from a pre-funded inventory. Every trade needs a signed
              server quote AND passes the on-chain floor, limit and signature checks.
            </p>
          </header>

          {/* NOT LIVE banner — build-time gate */}
          {!SALE_LIVE && (
            <div className="mt-8 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              <p className="flex items-start gap-2 font-mono text-xs leading-relaxed text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="font-bold">Not live.</span> The sale contract is not
                  deployed and no inventory exists. This page is a preview of the exact
                  flow; the buy path is disabled at build time and the quote server signs
                  nothing. Launch happens in stages (publish, funding, first capped sale)
                  — each with its own go decision.
                </span>
              </p>
            </div>
          )}

          {/* status */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold text-slate-100">Live status</h2>
              <button
                type="button"
                onClick={() => void refreshStatus()}
                className="inline-flex items-center gap-1.5 rounded border border-white/15 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-white/30"
              >
                <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                Refresh
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {statusErr && (
                <p className="font-mono text-xs text-amber-300">
                  Quote service unreachable ({statusErr}) — no price can be shown.
                </p>
              )}
              {status && !status.chain.available && (
                <p className="font-mono text-xs text-amber-300">
                  Sale contract not readable on-chain
                  {status.chain.reason ? ` (${status.chain.reason.slice(0, 90)}…)` : ''} —
                  no price is shown while the venue is unavailable.
                </p>
              )}
              {status && status.probe.ok === false && status.chain.available && (
                <p className="font-mono text-xs text-amber-300">
                  Quoting gated: {status.probe.gateReason}
                </p>
              )}
              {probeTiles && <PriceTerms tiles={probeTiles} />}
            </div>
          </section>

          {/* flow */}
          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-mono text-sm font-bold text-slate-100">Buy flow</h2>

            {/* connect */}
            <div className="mt-4">
              {account ? (
                <p className="flex items-center gap-2 font-mono text-xs text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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
                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                      : 'cursor-not-allowed border-white/10 bg-black/20 text-slate-600',
                  )}
                >
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                  {SALE_LIVE ? 'Connect StarKey' : 'Connect (disabled — not live)'}
                </button>
              )}
              {notFound && (
                <p className="mt-2 font-mono text-xs text-amber-300">
                  StarKey not found —{' '}
                  <a href="https://starkey.app" target="_blank" rel="noopener noreferrer" className="text-sky-400">
                    install it
                  </a>{' '}
                  and reload.
                </p>
              )}
              {chainMsg && <p className="mt-2 font-mono text-xs text-amber-300">{chainMsg}</p>}
            </div>

            {/* amount + quote */}
            <div className="mt-5">
              <label className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Amount you pay (SUPRA)
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="1000"
                  inputMode="decimal"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!SALE_LIVE || !account || !amountValid || busy !== null}
                  onClick={() => void getQuote()}
                  className={cn(
                    'shrink-0 rounded-lg border px-4 py-2 font-mono text-xs',
                    SALE_LIVE && account && amountValid && busy === null
                      ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                      : 'cursor-not-allowed border-white/10 bg-black/20 text-slate-600',
                  )}
                >
                  {busy === 'quote' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request quote'}
                </button>
              </div>
              {amountInput !== '' && !amountValid && (
                <p className="mt-1.5 font-mono text-[11px] text-amber-300">
                  Positive number, up to 8 fraction digits.
                </p>
              )}
            </div>

            {/* gate reason — never a price */}
            {gateReason && (
              <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <p className="flex items-start gap-2 font-mono text-xs text-amber-300">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  No quote: {gateReason}
                </p>
                {gates.filter((g) => g.hit).length > 0 && (
                  <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-slate-400">
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
                <div className="rounded-lg border border-white/10 bg-black/30 p-4 font-mono text-xs text-slate-300">
                  <p>
                    You pay{' '}
                    <span className="font-bold text-slate-100">
                      {fmtSupraAmt(quote.quote.amountInRaw)} SUPRA
                    </span>{' '}
                    and receive{' '}
                    <span className="font-bold text-slate-100">
                      {fmtAmt(quote.quote.amountOutRaw)} wCOSMO
                    </span>
                    .
                  </p>
                  <p className={cn('mt-1', secsLeft < 30 ? 'text-amber-300' : 'text-emerald-300')}>
                    Quote valid {secsLeft}s (ask version {quote.quote.askVersion})
                  </p>
                </div>
                {!payloadText && (
                  <button
                    type="button"
                    disabled={!SALE_LIVE || busy !== null}
                    onClick={() => void prepare()}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 font-mono text-xs text-purple-200 hover:bg-purple-500/20"
                  >
                    {busy === 'prepare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                    Prepare transaction
                  </button>
                )}
              </div>
            )}

            {/* payload + sign */}
            {payloadText && (
              <div className="mt-4 space-y-3">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-slate-700 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-400">
                  {payloadText}
                </pre>
                <button
                  type="button"
                  disabled={!SALE_LIVE || busy !== null}
                  onClick={() => void sign()}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs text-emerald-200 hover:bg-emerald-500/20"
                >
                  {busy === 'sign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Sign with StarKey
                </button>
              </div>
            )}

            {txHash && (
              <p className="mt-4 font-mono text-xs text-slate-300">
                TX:{' '}
                <a
                  href={`${EXPLORER_TX}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300"
                >
                  {shortAddr(txHash)}
                </a>
              </p>
            )}
            {log && (
              <p
                className={cn(
                  'mt-4 font-mono text-xs',
                  log.tone === 'ok' && 'text-emerald-300',
                  log.tone === 'info' && 'text-slate-400',
                  log.tone === 'bad' && 'text-rose-300',
                )}
              >
                {log.text}
              </p>
            )}
          </section>

          {/* honesty box */}
          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-mono text-sm font-bold text-slate-100">
              Read this before buying anything
            </h2>
            <ul className="mt-3 space-y-2 font-sans text-xs leading-relaxed text-slate-400">
              <li>
                <span className="text-slate-200">This is a seller sale.</span> You are buying
                wCOSMO from the project treasury, not on an order book. The seller sets a
                protected minimum price (on-chain floor) below which no trade can settle.
              </li>
              <li>
                <span className="text-slate-200">The price terms are shown individually</span>{' '}
                — Atmos TWAP, maker spread, floor and effective ask — plus which term won.
                The Atmos pool is a small market reference (~$9.4k TVL at design time;
                moving its spot ~1% costs roughly $23), NOT an oracle. The floor and the
                hard caps are the actual protection.
              </li>
              <li>
                <span className="text-slate-200">Hard on-chain caps:</span> 250,000 wCOSMO per
                trade, 1,000,000 per rolling 24h, 2,000,000 lifetime — then the contract
                closes itself permanently. No admin can raise these without a package
                upgrade.
              </li>
              <li>
                <span className="text-slate-200">What the server signs vs. what the chain enforces:</span>{' '}
                the quote server only signs offers. The chain independently re-checks
                buyer, chain id, module address, floor, all caps, quote expiry and the
                signature — a quote that violates any of them cannot settle.
              </li>
              <li>
                <span className="text-slate-200">Residual risk, stated plainly:</span> if the
                quote server key were compromised, an attacker could sell the remaining
                capped inventory AT the floor price (never below). Worst case equals the
                remaining cap times the gap between market price and floor — bounded, and
                bounded only because floor and caps are on-chain.
              </li>
              <li>
                <span className="text-slate-200">Exit path:</span> wCOSMO can be unwrapped 1:1
                to $COSMO at any time (see the{' '}
                <Link href="/wcosmo/" className="text-sky-400 hover:text-sky-300">
                  wCOSMO guide
                </Link>
                ); selling is only possible on Atmos at whatever liquidity exists there.
                There is NO buy-back commitment.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
