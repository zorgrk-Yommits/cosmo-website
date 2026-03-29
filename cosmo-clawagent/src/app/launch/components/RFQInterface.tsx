'use client';

/**
 * RFQInterface.tsx
 * 3-step RFQ trading interface for ClawBot.
 *
 * Step 1 — Form:     Pair, amount, direction, deadline, slippage → POST /api/rfq/submit
 * Step 2 — Polling:  Poll GET /api/rfq/:id every 3s until QUOTED (or FAILED/EXPIRED)
 * Step 3 — Quote:    Show quote details + countdown → sign with StarKey EVM → POST /accept
 * Done  — Result:    Show MATCHED / SETTLED state
 *
 * Signing:
 *   Uses window.starkey.evm (EIP-1193) for EVM address + personal_sign.
 *   Message format: "Accept RFQ {id} quote {quoteAmount} {quoteAsset} for {amount} {baseAsset}"
 *   Backend verifies via ethers.verifyMessage().
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, Loader2, CheckCircle2, XCircle, Clock,
  ArrowUpDown, Zap, AlertTriangle, RefreshCw,
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────────
const CLAWBOT_URL =
  process.env.NEXT_PUBLIC_CLAWBOT_URL ?? 'http://localhost:4000';
const POLL_INTERVAL_MS = 3_000;

const SUPPORTED_PAIRS = [
  'ETH/USDC', 'ETH/USDT',
  'BTC/USDC', 'BTC/USDT',
  'SUPRA/USDC', 'COSMO/USDC',
] as const;
type Pair = typeof SUPPORTED_PAIRS[number];

// ── Types ──────────────────────────────────────────────────────────────────────
interface RFQQuote {
  quotePrice: number;
  quoteAmount: number;
  spreadBps: number;
  quotedAt: string;
  validUntil: string;
}

interface RFQ {
  id: string;
  status: string;
  pair: string;
  amount: number;
  direction: 'buy' | 'sell';
  deadline: number;
  takerAddress: string;
  maxSlippageBps: number;
  expiresAt: number;
  quote: RFQQuote | null;
  takerSignature: string | null;
  matchedAt: number | null;
  txHash: string | null;
  errorMsg: string | null;
}

type Step = 'form' | 'polling' | 'quoted' | 'accepting' | 'done' | 'error';

// ── Helpers ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEvmProvider = (): any =>
  typeof window !== 'undefined' ? (window as any).starkey?.evm ?? null : null;

async function getEvmAddress(): Promise<string | null> {
  const p = getEvmProvider();
  if (!p) return null;
  try {
    const accounts: string[] = await p.request({ method: 'eth_accounts' });
    return accounts?.[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

/** Encode a string as 0x-prefixed hex for personal_sign */
function toHex(str: string): string {
  return (
    '0x' +
    Array.from(new TextEncoder().encode(str))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
}

async function signMessage(message: string, address: string): Promise<string> {
  const p = getEvmProvider();
  if (!p) throw new Error('StarKey EVM provider not found');
  return p.request({
    method: 'personal_sign',
    params: [toHex(message), address],
  });
}

function buildAcceptMessage(rfq: RFQ): string {
  const [base, quote] = rfq.pair.split('/');
  return `Accept RFQ ${rfq.id} quote ${rfq.quote!.quoteAmount} ${quote} for ${rfq.amount} ${base}`;
}

function secondsLeft(expiresAt: number): number {
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; dot: string }> = {
    PENDING:   { color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10', dot: 'bg-yellow-400 animate-pulse' },
    QUOTED:    { color: 'text-blue-300 border-blue-500/40 bg-blue-500/10',       dot: 'bg-blue-400 animate-pulse' },
    MATCHED:   { color: 'text-purple-300 border-purple-500/40 bg-purple-500/10', dot: 'bg-purple-400' },
    EXECUTING: { color: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10',       dot: 'bg-cyan-400 animate-pulse' },
    SETTLED:   { color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', dot: 'bg-emerald-400' },
    CANCELLED: { color: 'text-slate-300 border-slate-500/40 bg-slate-500/10',    dot: 'bg-slate-400' },
    FAILED:    { color: 'text-rose-300 border-rose-500/40 bg-rose-500/10',       dot: 'bg-rose-400' },
    EXPIRED:   { color: 'text-orange-300 border-orange-500/40 bg-orange-500/10', dot: 'bg-orange-400' },
  };
  const { color, dot } = cfg[status] ?? cfg.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-xs font-bold tracking-widest ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

// ── Stepper Header ─────────────────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const steps = [
    { key: 'form',    label: 'RFQ Form' },
    { key: 'polling', label: 'Quote' },
    { key: 'done',    label: 'Settlement' },
  ] as const;

  const stepIndex = (s: Step) => {
    if (s === 'form') return 0;
    if (s === 'polling' || s === 'quoted' || s === 'accepting') return 1;
    return 2;
  };
  const current = stepIndex(step);

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-all ${
                i < current
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : i === current
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-transparent border-white/10 text-slate-600'
              }`}
            >
              {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`font-mono text-[10px] tracking-wider uppercase whitespace-nowrap ${
              i === current ? 'text-purple-300' : i < current ? 'text-slate-400' : 'text-slate-700'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-2 mb-4 transition-all ${i < current ? 'bg-purple-600' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Form ───────────────────────────────────────────────────────────────
interface FormStepProps {
  evmAddress: string | null;
  onSubmit: (fields: {
    pair: Pair; amount: number; direction: 'buy' | 'sell';
    deadline: number; maxSlippageBps: number;
  }) => void;
  loading: boolean;
  error: string | null;
}

function FormStep({ evmAddress, onSubmit, loading, error }: FormStepProps) {
  const [pair, setPair] = useState<Pair>('ETH/USDC');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'buy' | 'sell'>('sell');
  const [deadline, setDeadline] = useState(60);
  const [maxSlippageBps, setMaxSlippageBps] = useState(50);
  const [amountErr, setAmountErr] = useState('');

  const handleSubmit = () => {
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0 || n > 1_000_000) {
      setAmountErr('Enter a valid amount (0 < amount ≤ 1,000,000)');
      return;
    }
    setAmountErr('');
    onSubmit({ pair, amount: n, direction, deadline, maxSlippageBps });
  };

  const [base] = pair.split('/');

  return (
    <div className="space-y-5">
      {/* Pair */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Trading Pair
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_PAIRS.map((p) => (
            <button
              key={p}
              onClick={() => setPair(p)}
              className={`px-3 py-2 rounded-lg font-mono text-xs font-semibold border transition-all ${
                pair === p
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Direction */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Direction
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['sell', 'buy'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-bold border transition-all ${
                direction === d
                  ? d === 'sell'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {d.toUpperCase()} {base}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Amount ({base})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setAmountErr(''); }}
          placeholder="0.00"
          min="0"
          step="any"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all"
        />
        {amountErr && (
          <p className="mt-1.5 font-mono text-xs text-rose-400">{amountErr}</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Deadline
          </label>
          <span className="font-mono text-xs text-purple-300">{deadline}s</span>
        </div>
        <input
          type="range" min={10} max={300} step={10}
          value={deadline}
          onChange={(e) => setDeadline(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[10px] text-slate-700">10s</span>
          <span className="font-mono text-[10px] text-slate-700">300s</span>
        </div>
      </div>

      {/* Max Slippage */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
            Max Slippage
          </label>
          <span className="font-mono text-xs text-purple-300">{maxSlippageBps} bps ({(maxSlippageBps / 100).toFixed(2)}%)</span>
        </div>
        <input
          type="range" min={10} max={500} step={10}
          value={maxSlippageBps}
          onChange={(e) => setMaxSlippageBps(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[10px] text-slate-700">10 bps</span>
          <span className="font-mono text-[10px] text-slate-700">500 bps</span>
        </div>
      </div>

      {/* EVM Address */}
      {evmAddress ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-1">Taker (EVM)</div>
          <div className="font-mono text-xs text-slate-400 break-all">{evmAddress}</div>
        </div>
      ) : (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-yellow-300">
            StarKey EVM provider not found. Make sure StarKey is connected to SupraEVM network.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <p className="font-mono text-xs text-rose-300">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !evmAddress}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-sm font-bold transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.4)]"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
        ) : (
          <><Zap className="w-4 h-4" />Submit RFQ<ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}

// ── Step 2: Polling ────────────────────────────────────────────────────────────
function PollingStep({ rfq }: { rfq: RFQ }) {
  return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
        <p className="font-mono text-sm text-slate-400">Fetching quote from market…</p>
        <p className="font-mono text-xs text-slate-600 mt-1">Polling every 3 seconds</p>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">RFQ ID</span>
          <span className="font-mono text-xs text-slate-400 truncate ml-4">{rfq.id.slice(0, 18)}…</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Pair</span>
          <span className="font-mono text-xs text-white">{rfq.pair}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Amount</span>
          <span className="font-mono text-xs text-white">{rfq.amount} {rfq.pair.split('/')[0]}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Direction</span>
          <span className={`font-mono text-xs font-bold ${rfq.direction === 'sell' ? 'text-rose-300' : 'text-emerald-300'}`}>
            {rfq.direction.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Status</span>
          <StatusBadge status={rfq.status} />
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Quote ──────────────────────────────────────────────────────────────
interface QuoteStepProps {
  rfq: RFQ;
  onAccept: () => void;
  loading: boolean;
  error: string | null;
}

function QuoteStep({ rfq, onAccept, loading, error }: QuoteStepProps) {
  const [secs, setSecs] = useState(() => secondsLeft(rfq.expiresAt));

  useEffect(() => {
    const t = setInterval(() => setSecs(secondsLeft(rfq.expiresAt)), 1000);
    return () => clearInterval(t);
  }, [rfq.expiresAt]);

  const q = rfq.quote!;
  const [base, quote] = rfq.pair.split('/');
  const expired = secs === 0;

  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-purple-400 mb-3">Quote Received</div>
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`font-mono text-2xl font-bold ${rfq.direction === 'sell' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {rfq.direction === 'sell' ? '+' : '−'}{q.quoteAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })}
            </span>
            <span className="font-mono text-sm text-slate-400 ml-2">{quote}</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-slate-500">for</div>
            <div className="font-mono text-sm text-white font-semibold">{rfq.amount} {base}</div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Mid Price</span>
          <span className="font-mono text-xs text-white">${q.quotePrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Spread</span>
          <span className="font-mono text-xs text-yellow-300">{q.spreadBps} bps ({(q.spreadBps / 100).toFixed(2)}%)</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Max Slippage</span>
          <span className={`font-mono text-xs ${q.spreadBps <= rfq.maxSlippageBps ? 'text-emerald-300' : 'text-rose-300'}`}>
            {rfq.maxSlippageBps} bps
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Expires In</span>
          <span className={`font-mono text-sm font-bold flex items-center gap-1 ${secs < 15 ? 'text-rose-400' : secs < 30 ? 'text-yellow-300' : 'text-emerald-300'}`}>
            <Clock className="w-3.5 h-3.5" />{secs}s
          </span>
        </div>
      </div>

      {/* Signed message preview */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Message to Sign</div>
        <div className="font-mono text-[11px] text-slate-400 break-all leading-relaxed">
          {buildAcceptMessage(rfq)}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <p className="font-mono text-xs text-rose-300">{error}</p>
        </div>
      )}

      <button
        onClick={onAccept}
        disabled={loading || expired}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-bold transition-all ${
          expired
            ? 'bg-rose-600/20 border border-rose-500/30 text-rose-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {expired ? (
          <><XCircle className="w-4 h-4" />Quote Expired</>
        ) : loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Signing…</>
        ) : (
          <><CheckCircle2 className="w-4 h-4" />Accept Quote &amp; Sign<ChevronRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}

// ── Done State ─────────────────────────────────────────────────────────────────
function DoneStep({ rfq, onReset }: { rfq: RFQ; onReset: () => void }) {
  const isSettled = rfq.status === 'SETTLED';
  const isFailed = rfq.status === 'FAILED' || rfq.status === 'EXPIRED' || rfq.status === 'CANCELLED';
  const [base, quote] = rfq.pair.split('/');

  return (
    <div className="space-y-5 text-center">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
        isSettled ? 'bg-emerald-500/10' : isFailed ? 'bg-rose-500/10' : 'bg-purple-500/10'
      }`}>
        {isSettled ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        ) : isFailed ? (
          <XCircle className="w-8 h-8 text-rose-400" />
        ) : (
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        )}
      </div>

      <div>
        <div className="mb-2"><StatusBadge status={rfq.status} /></div>
        <h3 className="font-mono text-lg font-bold text-white mb-1">
          {isSettled ? 'Trade Complete' : isFailed ? 'Trade Failed' : 'Settlement in Progress'}
        </h3>
        <p className="font-mono text-xs text-slate-400">
          {rfq.amount} {base} {rfq.direction.toUpperCase()} → {rfq.quote?.quoteAmount.toLocaleString('en-US', { maximumFractionDigits: 6 })} {quote}
        </p>
      </div>

      {rfq.txHash && rfq.txHash !== 'stub-settled' && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-left">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-1">TX Hash (indexing)</div>
          <div className="font-mono text-xs text-slate-400 break-all">{rfq.txHash}</div>
          <p className="font-mono text-[10px] text-slate-700 mt-1">
            Note: SupraEVM returns indexing hash — not final on-chain hash
          </p>
        </div>
      )}

      {rfq.errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-left">
          <p className="font-mono text-xs text-rose-300">{rfq.errorMsg}</p>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-mono text-sm transition-all"
      >
        <RefreshCw className="w-4 h-4" />
        New RFQ
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RFQInterface() {
  const [step, setStep] = useState<Step>('form');
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resolve EVM address on mount and on provider events ─────────────────────
  useEffect(() => {
    getEvmAddress().then(setEvmAddress);

    const p = getEvmProvider();
    if (!p) return;

    const onAccountsChanged = (accounts: string[]) => {
      setEvmAddress(accounts[0]?.toLowerCase() ?? null);
    };
    p.on?.('accountsChanged', onAccountsChanged);
    return () => p.removeListener?.('accountsChanged', onAccountsChanged);
  }, []);

  // ── Polling ──────────────────────────────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPoll = useCallback((id: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${CLAWBOT_URL}/api/rfq/${id}`);
        const data = await res.json();
        if (!data.ok) return;
        const updated: RFQ = data.rfq;
        setRfq(updated);

        if (updated.status === 'QUOTED') {
          stopPoll();
          setStep('quoted');
        } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(updated.status)) {
          stopPoll();
          setStep('done');
        } else if (['MATCHED', 'EXECUTING', 'SETTLED'].includes(updated.status)) {
          stopPoll();
          setStep('done');
        }
      } catch {
        // network error — keep polling
      }
    }, POLL_INTERVAL_MS);
  }, [stopPoll]);

  useEffect(() => () => stopPoll(), [stopPoll]);

  // ── Poll for settlement after accepting ──────────────────────────────────────
  const startSettlementPoll = useCallback((id: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${CLAWBOT_URL}/api/rfq/${id}`);
        const data = await res.json();
        if (!data.ok) return;
        const updated: RFQ = data.rfq;
        setRfq(updated);
        if (['SETTLED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(updated.status)) {
          stopPoll();
          setStep('done');
        }
      } catch { /* keep polling */ }
    }, POLL_INTERVAL_MS);
  }, [stopPoll]);

  // ── Submit RFQ ───────────────────────────────────────────────────────────────
  const handleSubmit = async (fields: {
    pair: Pair; amount: number; direction: 'buy' | 'sell';
    deadline: number; maxSlippageBps: number;
  }) => {
    if (!evmAddress) { setFormError('EVM address not available'); return; }
    setSubmitLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`${CLAWBOT_URL}/api/rfq/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, takerAddress: evmAddress }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.error ?? 'Submit failed'); return; }
      setRfq(data.rfq);
      setStep('polling');
      startPoll(data.rfq.id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Accept Quote ─────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!rfq || !evmAddress) return;
    setAcceptLoading(true);
    setAcceptError(null);
    try {
      const message = buildAcceptMessage(rfq);
      const takerSignature = await signMessage(message, evmAddress);

      const res = await fetch(`${CLAWBOT_URL}/api/rfq/${rfq.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takerSignature }),
      });
      const data = await res.json();

      if (!data.ok) {
        setAcceptError(data.error ?? 'Accept failed');
        return;
      }

      setRfq(data.rfq);
      setStep('accepting');
      // Transition to done once settlement resolves
      startSettlementPoll(data.rfq.id);
      setStep('done');
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Signing failed');
    } finally {
      setAcceptLoading(false);
    }
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    stopPoll();
    setRfq(null);
    setFormError(null);
    setAcceptError(null);
    setStep('form');
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#0a0a18]/80 border border-purple-500/25 rounded-2xl p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="font-mono text-xs text-purple-300 tracking-widest uppercase">
          ClawBot — RFQ Trading
        </span>
        {rfq && (
          <span className="ml-auto">
            <StatusBadge status={rfq.status} />
          </span>
        )}
      </div>

      <Stepper step={step} />

      {/* Step content */}
      {step === 'form' && (
        <FormStep
          evmAddress={evmAddress}
          onSubmit={handleSubmit}
          loading={submitLoading}
          error={formError}
        />
      )}

      {(step === 'polling') && rfq && (
        <PollingStep rfq={rfq} />
      )}

      {(step === 'quoted') && rfq && (
        <QuoteStep
          rfq={rfq}
          onAccept={handleAccept}
          loading={acceptLoading}
          error={acceptError}
        />
      )}

      {(step === 'done' || step === 'accepting') && rfq && (
        <DoneStep rfq={rfq} onReset={handleReset} />
      )}

      {step === 'error' && (
        <div className="text-center py-8">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="font-mono text-sm text-rose-300 mb-4">{formError ?? acceptError ?? 'Unknown error'}</p>
          <button onClick={handleReset} className="font-mono text-xs text-slate-400 hover:text-white underline">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
