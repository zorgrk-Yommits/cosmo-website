'use client';

/**
 * RFQInterface.tsx
 * 3-step + settlement RFQ trading interface for CosmoClaw.
 *
 * Step 1 — Form:       Pair, amount, direction, deadline, slippage
 *                      NFT gate: checks balanceOf(takerAddress) on ClawAgentNFT
 * Step 2 — Polling:    Poll GET /api/rfq/:id every 3s until QUOTED / terminal
 * Step 3 — Quote:      Quote details + countdown → personal_sign → POST /accept
 * Step 4 — Settlement: Live status: MATCHED → EXECUTING → SETTLED / FAILED
 *
 * Signing: window.starkey.evm (EIP-1193) + personal_sign
 * NFT Gate: raw eth_call, no ethers dependency in frontend
 * NFT Contract: 0xebA201EDBe6127AdbD55e4B44Fe39336BB89dd18 on SupraEVM testnet
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronRight, Loader2, CheckCircle2, XCircle, Clock,
  ArrowUpDown, Zap, AlertTriangle, RefreshCw, ExternalLink, Shield,
} from 'lucide-react';
import { useWallet } from '@context/WalletContext';

// ── Config ─────────────────────────────────────────────────────────────────────
// Empty string → relative URLs (/api/rfq/...) → works via Nginx proxy on production.
// Set NEXT_PUBLIC_CLAWBOT_URL=http://localhost:4000 for local dev without Nginx.
const CLAWBOT_URL   = process.env.NEXT_PUBLIC_CLAWBOT_URL ?? '';
const POLL_MS       = 3_000;
const SUPRA_CHAIN   = '0x' + (523994005626).toString(16); // 0x7a05e9d6a
const NFT_CONTRACT  = '0xebA201EDBe6127AdbD55e4B44Fe39336BB89dd18';
const BALANCEOF_SEL = '0x70a08231'; // keccak256("balanceOf(address)")[0:4]
const MINT_URL      = '/launch#mint'; // update when mint page is live

const SUPPORTED_PAIRS = [
  'ETH/USDC', 'ETH/USDT',
  'BTC/USDC', 'BTC/USDT',
  'SUPRA/USDC', 'COSMO/USDC',
] as const;
type Pair = typeof SUPPORTED_PAIRS[number];

// ── Types ──────────────────────────────────────────────────────────────────────
interface RFQQuote {
  quotePrice:  number;
  quoteAmount: number;
  spreadBps:   number;
  quotedAt:    string;
  validUntil:  string;
}

interface RFQ {
  id:             string;
  status:         string;
  pair:           string;
  amount:         number;
  direction:      'buy' | 'sell';
  deadline:       number;
  takerAddress:   string;
  maxSlippageBps: number;
  expiresAt:      number;
  quote:          RFQQuote | null;
  takerSignature:   string | null;
  matchedAt:        number | null;
  txHash:           string | null;
  onChainRequestId: string | null;
  onChainQuoteId:   string | null;
  errorMsg:         string | null;
}

type Step = 'form' | 'polling' | 'quoted' | 'settlement' | 'done' | 'failed';

interface FormFields {
  pair:           Pair;
  amount:         number;
  direction:      'buy' | 'sell';
  deadline:       number;
  maxSlippageBps: number;
}

// ── Provider Status ────────────────────────────────────────────────────────────
// Three distinct wallet states:
//   no-starkey  — window.starkey is absent (extension not installed)
//   supra-only  — window.starkey.supra exists but .evm does not
//                 (user is on Supra Native network, not SupraEVM)
//   ready       — window.starkey.evm exists and is usable
type ProviderStatus = 'no-starkey' | 'supra-only' | 'ready';

function getProviderStatus(): ProviderStatus {
  if (typeof window === 'undefined') return 'no-starkey';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sk = (window as any).starkey;
  if (!sk) return 'no-starkey';
  if (!sk.evm) return 'supra-only';
  return 'ready';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEvmProvider = (): any =>
  typeof window !== 'undefined' ? (window as any).starkey?.evm ?? null : null;

async function getEvmAddress(): Promise<string | null> {
  const p = getEvmProvider();
  if (!p) return null;
  try {
    const accounts: string[] = await p.request({ method: 'eth_accounts' });
    return accounts?.[0]?.toLowerCase() ?? null;
  } catch { return null; }
}

async function getChainId(): Promise<string | null> {
  const p = getEvmProvider();
  if (!p) return null;
  try { return await p.request({ method: 'eth_chainId' }); }
  catch { return null; }
}

/** Ask StarKey to switch to SupraEVM testnet. Returns error string or null. */
async function switchToSupraEVM(): Promise<string | null> {
  const p = getEvmProvider();
  if (!p) return 'EVM provider not available';
  try {
    await p.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SUPRA_CHAIN }],
    });
    return null;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any)?.code === 4001) return 'Switch rejected';
    return e instanceof Error ? e.message : 'Switch failed';
  }
}

/** Check NFT balance via raw eth_call (no ethers needed) */
async function fetchNFTBalance(address: string): Promise<number> {
  const p = getEvmProvider();
  if (!p) return 0;
  try {
    const paddedAddr = address.replace('0x', '').toLowerCase().padStart(64, '0');
    const data = BALANCEOF_SEL + paddedAddr;
    const result: string = await p.request({
      method: 'eth_call',
      params: [{ to: NFT_CONTRACT, data }, 'latest'],
    });
    if (!result || result === '0x' || result === '0x' + '0'.repeat(64)) return 0;
    return parseInt(result, 16);
  } catch { return 0; }
}

/** Hex-encode string for personal_sign */
function toHex(str: string): string {
  return '0x' + Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function signMessage(message: string, address: string): Promise<string> {
  const p = getEvmProvider();
  if (!p) throw new Error('StarKey EVM provider not found');
  return p.request({ method: 'personal_sign', params: [toHex(message), address] });
}

function buildAcceptMessage(rfq: RFQ): string {
  const [base, quote] = rfq.pair.split('/');
  return `Accept RFQ ${rfq.id} quote ${rfq.quote!.quoteAmount} ${quote} for ${rfq.amount} ${base}`;
}

function secondsLeft(expiresAt: number): number {
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function shortAddr(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { color: string; dot: string }> = {
    PENDING:   { color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10', dot: 'bg-yellow-400 animate-pulse' },
    QUOTED:    { color: 'text-blue-300   border-blue-500/40   bg-blue-500/10',   dot: 'bg-blue-400   animate-pulse' },
    MATCHED:   { color: 'text-purple-300 border-purple-500/40 bg-purple-500/10', dot: 'bg-purple-400 animate-pulse' },
    EXECUTING: { color: 'text-cyan-300   border-cyan-500/40   bg-cyan-500/10',   dot: 'bg-cyan-400   animate-pulse' },
    SETTLED:   { color: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', dot: 'bg-emerald-400' },
    CANCELLED: { color: 'text-slate-300  border-slate-500/40  bg-slate-500/10',  dot: 'bg-slate-400' },
    FAILED:    { color: 'text-rose-300   border-rose-500/40   bg-rose-500/10',   dot: 'bg-rose-400' },
    EXPIRED:   { color: 'text-orange-300 border-orange-500/40 bg-orange-500/10', dot: 'bg-orange-400' },
  };
  const { color, dot } = cfg[status] ?? cfg.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono text-xs font-bold tracking-widest ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {status}
    </span>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const steps = [
    { label: 'RFQ' },
    { label: 'Quote' },
    { label: 'Settlement' },
  ];
  const idx = step === 'form' ? 0
    : step === 'polling' || step === 'quoted' ? 1
    : 2;

  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-all ${
              i < idx  ? 'bg-purple-600 border-purple-500 text-white' :
              i === idx ? 'bg-purple-600/20 border-purple-500 text-purple-300' :
                          'bg-transparent border-white/10 text-slate-600'
            }`}>
              {i < idx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`font-mono text-[10px] tracking-wider uppercase whitespace-nowrap ${
              i === idx ? 'text-purple-300' : i < idx ? 'text-slate-400' : 'text-slate-700'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-2 mb-4 transition-all ${i < idx ? 'bg-purple-600' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── NFT Gate Banner ────────────────────────────────────────────────────────────
function NFTGateBanner({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-slate-500 animate-spin flex-shrink-0" />
        <p className="font-mono text-xs text-slate-500">Checking ClawAgent NFT…</p>
      </div>
    );
  }
  return (
    <div className="bg-purple-500/5 border border-purple-500/30 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-mono text-sm text-purple-200 font-semibold mb-1">
            ClawAgent NFT Required
          </p>
          <p className="font-mono text-xs text-slate-400 mb-3">
            You need a ClawAgentNFT to access RFQ trading. Mint one to get started.
          </p>
          <a
            href={MINT_URL}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 font-mono text-xs font-semibold hover:bg-purple-600/50 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            Mint ClawAgent NFT
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Wallet State Banners ───────────────────────────────────────────────────────

/** window.starkey not found — extension not installed */
function NoStarkeyBanner() {
  return (
    <div className="bg-slate-500/5 border border-slate-500/20 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-sm text-slate-200 font-semibold mb-1">
          StarKey Wallet Not Found
        </p>
        <p className="font-mono text-xs text-slate-400 mb-3">
          Install StarKey Wallet to access RFQ trading.
        </p>
        <a
          href="https://starkey.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-600/30 border border-slate-500/40 text-slate-300 font-mono text-xs font-semibold hover:bg-slate-600/50 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Install StarKey
        </a>
      </div>
    </div>
  );
}

/** window.starkey.supra exists but .evm does not — user on Supra Native */
function SupraOnlyBanner({ onSwitch, switching }: { onSwitch: () => void; switching: boolean }) {
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/25 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-mono text-sm text-yellow-200 font-semibold mb-1">
          Switch to SupraEVM Network
        </p>
        <p className="font-mono text-xs text-slate-400 mb-3">
          You&apos;re connected to Supra Native. RFQ trading requires the SupraEVM network in StarKey.
        </p>
        <button
          onClick={onSwitch}
          disabled={switching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-mono text-xs font-semibold hover:bg-yellow-500/30 disabled:opacity-50 transition-all"
        >
          {switching
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Switching…</>
            : <><Zap className="w-3.5 h-3.5" />Switch Network</>
          }
        </button>
      </div>
    </div>
  );
}

/** EVM provider available but on wrong chain ID */
function WrongChainBanner({ onSwitch, switching }: { onSwitch: () => void; switching: boolean }) {
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-mono text-xs text-yellow-300 font-semibold">Wrong Chain</p>
        <p className="font-mono text-[11px] text-yellow-400/70 mt-0.5 mb-2">
          SupraEVM Testnet required (Chain ID 523994005626)
        </p>
        <button
          onClick={onSwitch}
          disabled={switching}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-mono text-[11px] font-semibold hover:bg-yellow-500/30 disabled:opacity-50 transition-all"
        >
          {switching
            ? <><Loader2 className="w-3 h-3 animate-spin" />Switching…</>
            : <><Zap className="w-3 h-3" />Switch Chain</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Form ───────────────────────────────────────────────────────────────
interface FormStepProps {
  evmAddress:      string | null;
  providerStatus:  ProviderStatus;
  nftChecking:     boolean;
  hasNFT:          boolean | null;
  wrongChain:      boolean;
  switching:       boolean;
  onSwitch:        () => void;
  onSubmit:        (fields: FormFields) => void;
  loading:         boolean;
  error:           string | null;
  initialFields:   FormFields | null;
}

function FormStep({
  evmAddress, providerStatus, nftChecking, hasNFT,
  wrongChain, switching, onSwitch,
  onSubmit, loading, error, initialFields,
}: FormStepProps) {
  const [pair, setPair]               = useState<Pair>(initialFields?.pair ?? 'ETH/USDC');
  const [amount, setAmount]           = useState(initialFields ? String(initialFields.amount) : '');
  const [direction, setDirection]     = useState<'buy' | 'sell'>(initialFields?.direction ?? 'sell');
  const [deadline, setDeadline]       = useState(initialFields?.deadline ?? 60);
  const [maxSlippageBps, setSlippage] = useState(initialFields?.maxSlippageBps ?? 50);
  const [amountErr, setAmountErr]     = useState('');

  const [base] = pair.split('/');

  const handleSubmit = () => {
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0 || n > 1_000_000) {
      setAmountErr('Enter a valid amount (0 < x ≤ 1,000,000)');
      return;
    }
    setAmountErr('');
    onSubmit({ pair, amount: n, direction, deadline, maxSlippageBps });
  };

  const canSubmit = providerStatus === 'ready' && !!evmAddress && hasNFT === true && !wrongChain && !loading;

  return (
    <div className="space-y-5">
      {/* Pair */}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">
          Trading Pair
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_PAIRS.map((p) => (
            <button key={p} onClick={() => setPair(p)}
              className={`px-3 py-2 rounded-lg font-mono text-xs font-semibold border transition-all ${
                pair === p
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-transparent border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-300'
              }`}
            >{p}</button>
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
            <button key={d} onClick={() => setDirection(d)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-sm font-bold border transition-all ${
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
          type="number" value={amount} placeholder="0.00" min="0" step="any"
          onChange={(e) => { setAmount(e.target.value); setAmountErr(''); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:bg-purple-500/5 transition-all"
        />
        {amountErr && <p className="mt-1.5 font-mono text-xs text-rose-400">{amountErr}</p>}
      </div>

      {/* Deadline */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Deadline</label>
          <span className="font-mono text-xs text-purple-300">{deadline}s</span>
        </div>
        <input type="range" min={10} max={300} step={10} value={deadline}
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
          <label className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Max Slippage</label>
          <span className="font-mono text-xs text-purple-300">{maxSlippageBps} bps ({(maxSlippageBps / 100).toFixed(2)}%)</span>
        </div>
        <input type="range" min={10} max={500} step={10} value={maxSlippageBps}
          onChange={(e) => setSlippage(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[10px] text-slate-700">10 bps</span>
          <span className="font-mono text-[10px] text-slate-700">500 bps</span>
        </div>
      </div>

      {/* Status row: provider check → network check → NFT gate → address */}
      {providerStatus === 'no-starkey' && <NoStarkeyBanner />}

      {providerStatus === 'supra-only' && (
        <SupraOnlyBanner onSwitch={onSwitch} switching={switching} />
      )}

      {providerStatus === 'ready' && wrongChain && (
        <WrongChainBanner onSwitch={onSwitch} switching={switching} />
      )}

      {providerStatus === 'ready' && !wrongChain && !evmAddress && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-yellow-500 animate-spin flex-shrink-0" />
          <p className="font-mono text-xs text-yellow-300">Connecting to SupraEVM…</p>
        </div>
      )}

      {providerStatus === 'ready' && !wrongChain && evmAddress && (hasNFT === false || nftChecking) && (
        <NFTGateBanner loading={nftChecking} />
      )}

      {providerStatus === 'ready' && !wrongChain && evmAddress && hasNFT === true && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">Taker (EVM)</div>
            <div className="font-mono text-xs text-slate-400">{shortAddr(evmAddress)}</div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-[10px] text-emerald-300 font-bold">NFT ✓</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <p className="font-mono text-xs text-rose-300">{error}</p>
        </div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-sm font-bold transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.4)]"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
          : <><Zap className="w-4 h-4" />Submit RFQ<ChevronRight className="w-4 h-4" /></>
        }
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
        {([
          ['RFQ ID',    rfq.id.slice(0, 18) + '…'],
          ['Pair',      rfq.pair],
          ['Amount',    `${rfq.amount} ${rfq.pair.split('/')[0]}`],
          ['Direction', rfq.direction.toUpperCase()],
        ] as const).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">{k}</span>
            <span className={`font-mono text-xs ${k === 'Direction' ? (rfq.direction === 'sell' ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold') : 'text-white'}`}>{v}</span>
          </div>
        ))}
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
  rfq:     RFQ;
  onAccept: () => void;
  loading: boolean;
  error:   string | null;
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
      {/* Hero quote */}
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
            <div className="font-mono text-[10px] text-slate-500">for</div>
            <div className="font-mono text-sm text-white font-semibold">{rfq.amount} {base}</div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
        <div className="flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Mid Price</span>
          <span className="font-mono text-xs text-white">${q.quotePrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Spread</span>
          <span className="font-mono text-xs text-yellow-300">{q.spreadBps} bps ({(q.spreadBps / 100).toFixed(2)}%)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Max Slippage</span>
          <span className={`font-mono text-xs ${q.spreadBps <= rfq.maxSlippageBps ? 'text-emerald-300' : 'text-rose-300'}`}>
            {rfq.maxSlippageBps} bps {q.spreadBps > rfq.maxSlippageBps ? '⚠ exceeded' : '✓'}
          </span>
        </div>
        <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-600">Expires In</span>
          <span className={`font-mono text-sm font-bold flex items-center gap-1.5 ${secs < 15 ? 'text-rose-400' : secs < 30 ? 'text-yellow-300' : 'text-emerald-300'}`}>
            <Clock className="w-3.5 h-3.5" />{secs}s
          </span>
        </div>
      </div>

      {/* Message to sign */}
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

      <button onClick={onAccept} disabled={loading || expired}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-mono text-sm font-bold transition-all ${
          expired
            ? 'bg-rose-600/20 border border-rose-500/30 text-rose-400 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {expired        ? <><XCircle className="w-4 h-4" />Quote Expired</> :
         loading        ? <><Loader2 className="w-4 h-4 animate-spin" />Signing…</> :
         <><CheckCircle2 className="w-4 h-4" />Accept Quote &amp; Sign<ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

// ── Step 4: Settlement ─────────────────────────────────────────────────────────
interface SettlementStepProps {
  rfq:      RFQ;
  onReset:  () => void;
  onRetry:  () => void;
}

function SettlementStep({ rfq, onReset, onRetry }: SettlementStepProps) {
  const [base, quote] = rfq.pair.split('/');
  const status = rfq.status;

  const isSettled  = status === 'SETTLED';
  const isFailed   = status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED';
  const isPending  = !isSettled && !isFailed; // MATCHED or EXECUTING

  const tradeSummary = `${rfq.amount} ${base} ${rfq.direction.toUpperCase()} → ${
    rfq.quote?.quoteAmount.toLocaleString('en-US', { maximumFractionDigits: 6 }) ?? '?'
  } ${quote}`;

  // ── EXECUTING / MATCHED ──────────────────────────────────────────────────────
  if (isPending) {
    return (
      <div className="space-y-5">
        <div className="text-center py-2">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <StatusBadge status={status} />
          <h3 className="font-mono text-base font-bold text-white mt-3 mb-1">
            {status === 'MATCHED' ? 'Order Matched' : 'On-chain TX in progress…'}
          </h3>
          <p className="font-mono text-xs text-slate-500">{tradeSummary}</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          {status === 'MATCHED' && (
            <p className="font-mono text-xs text-slate-400">
              Taker signature verified. Waiting for maker to initiate on-chain settlement…
            </p>
          )}
          {status === 'EXECUTING' && (
            <>
              <p className="font-mono text-xs text-slate-400">
                Transaction submitted to SupraEVM. Confirming via nonce check (15s window)…
              </p>
              {rfq.txHash && rfq.txHash !== 'stub-pending' && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600 mb-1">Indexing Hash</div>
                  <div className="font-mono text-[11px] text-slate-500 break-all">{rfq.txHash}</div>
                  <p className="font-mono text-[10px] text-slate-700 mt-1">
                    SupraEVM returns an indexing hash — not the final on-chain TX hash
                  </p>
                </div>
              )}
            </>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
            <span className="font-mono text-[10px] text-slate-600">Polling every 3s…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── SETTLED ──────────────────────────────────────────────────────────────────
  if (isSettled) {
    return (
      <div className="space-y-5">
        <div className="text-center py-2">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <StatusBadge status="SETTLED" />
          <h3 className="font-mono text-lg font-bold text-emerald-300 mt-3 mb-1">Trade Complete</h3>
          <p className="font-mono text-xs text-slate-400">{tradeSummary}</p>
        </div>

        {rfq.txHash && rfq.txHash !== 'stub-settled' && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-2.5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 mb-1">TX Hash (Indexing)</div>
              <div className="font-mono text-xs text-emerald-300/80 break-all">{rfq.txHash}</div>
              <p className="font-mono text-[10px] text-slate-600 mt-1">
                SupraEVM indexing hash — final hash available once chain confirms
              </p>
            </div>
            {(rfq.onChainRequestId || rfq.onChainQuoteId) && (
              <div className="pt-2 border-t border-emerald-500/10 grid grid-cols-2 gap-3">
                {rfq.onChainRequestId && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 mb-1">On-Chain Request ID</div>
                    <div className="font-mono text-xs text-emerald-300/80">{rfq.onChainRequestId}</div>
                  </div>
                )}
                {rfq.onChainQuoteId && (
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 mb-1">On-Chain Quote ID</div>
                    <div className="font-mono text-xs text-emerald-300/80">{rfq.onChainQuoteId}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button onClick={onReset}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-bold transition-all hover:shadow-[0_0_24px_rgba(139,92,246,0.4)]"
        >
          <RefreshCw className="w-4 h-4" />
          New RFQ
        </button>
      </div>
    );
  }

  // ── FAILED / EXPIRED / CANCELLED ─────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-rose-400" />
        </div>
        <StatusBadge status={status} />
        <h3 className="font-mono text-lg font-bold text-rose-300 mt-3 mb-1">
          {status === 'EXPIRED' ? 'Quote Expired' :
           status === 'CANCELLED' ? 'Order Cancelled' : 'Trade Failed'}
        </h3>
        <p className="font-mono text-xs text-slate-400">{tradeSummary}</p>
      </div>

      {rfq.errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-rose-600 mb-1">Error Reason</div>
          <p className="font-mono text-xs text-rose-300">{rfq.errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={onRetry}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-bold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 font-mono text-sm transition-all"
        >
          New RFQ
        </button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RFQInterface() {
  // evmAddress comes from WalletContext — WalletContext owns EVM account state
  const { evmAddress } = useWallet();

  const [step, setStep]               = useState<Step>('form');
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>('no-starkey');
  const [wrongChain, setWrongChain]   = useState(false);
  const [switching, setSwitching]     = useState(false);
  const [nftChecking, setNftCheck]    = useState(false);
  const [hasNFT, setHasNFT]         = useState<boolean | null>(null);  // null = unchecked
  const [rfq, setRfq]               = useState<RFQ | null>(null);
  const [lastFields, setLastFields] = useState<FormFields | null>(null);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [formError, setFormError]         = useState<string | null>(null);
  const [acceptError, setAcceptError]     = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Resolve provider status + chain on mount ─────────────────────────────────
  useEffect(() => {
    async function init() {
      setProviderStatus(getProviderStatus());
      const chainId = await getChainId();
      setWrongChain(!!chainId && chainId.toLowerCase() !== SUPRA_CHAIN.toLowerCase());
    }
    init();

    const p = getEvmProvider();
    if (!p) return;

    const onChainChanged = (chainId: string) => {
      setProviderStatus(getProviderStatus());
      setWrongChain(chainId.toLowerCase() !== SUPRA_CHAIN.toLowerCase());
    };

    p.on?.('chainChanged', onChainChanged);
    return () => {
      p.removeListener?.('chainChanged', onChainChanged);
    };
  }, []);

  // ── NFT check whenever evmAddress changes (driven by WalletContext) ───────────
  useEffect(() => {
    if (!evmAddress) { setHasNFT(null); return; }
    setNftCheck(true);
    fetchNFTBalance(evmAddress).then((bal) => {
      setHasNFT(bal > 0);
      setNftCheck(false);
    });
  }, [evmAddress]);

  // ── Poll helpers ─────────────────────────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startPoll = useCallback((id: string, onQuoted: (r: RFQ) => void) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${CLAWBOT_URL}/api/rfq/${id}`);
        const data = await res.json();
        if (!data.ok) return;
        const r: RFQ = data.rfq;
        setRfq(r);
        if (r.status === 'QUOTED') { stopPoll(); onQuoted(r); }
        else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(r.status)) {
          stopPoll(); setStep('failed');
        }
      } catch { /* keep polling */ }
    }, POLL_MS);
  }, [stopPoll]);

  const startSettlementPoll = useCallback((id: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${CLAWBOT_URL}/api/rfq/${id}`);
        const data = await res.json();
        if (!data.ok) return;
        const r: RFQ = data.rfq;
        setRfq(r);
        if (r.status === 'SETTLED') { stopPoll(); setStep('done'); }
        else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(r.status)) {
          stopPoll(); setStep('done'); // DoneStep checks status for FAILED display
        }
        // MATCHED / EXECUTING: keep polling, DoneStep re-renders automatically
      } catch { /* keep polling */ }
    }, POLL_MS);
  }, [stopPoll]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (fields: FormFields) => {
    if (!evmAddress) { setFormError('EVM address not available'); return; }
    setLastFields(fields);
    setSubmitLoading(true);
    setFormError(null);
    try {
      const res  = await fetch(`${CLAWBOT_URL}/api/rfq/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, takerAddress: evmAddress }),
      });
      const data = await res.json();
      if (!data.ok) { setFormError(data.error ?? 'Submit failed'); return; }
      setRfq(data.rfq);
      setStep('polling');
      startPoll(data.rfq.id, () => setStep('quoted'));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Network error — is CosmoClaw running?');
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Accept ───────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!rfq || !evmAddress) return;
    setAcceptLoading(true);
    setAcceptError(null);
    try {
      const message = buildAcceptMessage(rfq);
      const takerSignature = await signMessage(message, evmAddress);

      const res  = await fetch(`${CLAWBOT_URL}/api/rfq/${rfq.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ takerSignature }),
      });
      const data = await res.json();

      if (!data.ok) {
        // Classify error for better UX
        if (data.error?.includes('expired')) {
          setAcceptError('Quote expired — please submit a new RFQ');
        } else if (data.error?.includes('Signature')) {
          setAcceptError('Signature mismatch — make sure you sign with the connected wallet');
        } else {
          setAcceptError(data.error ?? 'Accept failed');
        }
        return;
      }

      setRfq(data.rfq);
      setStep('settlement');
      startSettlementPoll(data.rfq.id);
    } catch (e) {
      // Distinguish user rejection from other errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((e as any)?.code === 4001) {
        setAcceptError('Signature rejected — you cancelled the signing request');
      } else {
        setAcceptError(e instanceof Error ? e.message : 'Signing failed');
      }
    } finally {
      setAcceptLoading(false);
    }
  };

  // ── Switch Network ───────────────────────────────────────────────────────────
  const handleSwitch = async () => {
    setSwitching(true);
    const err = await switchToSupraEVM();
    setSwitching(false);
    if (!err) {
      setProviderStatus(getProviderStatus());
      const chainId = await getChainId();
      setWrongChain(!!chainId && chainId.toLowerCase() !== SUPRA_CHAIN.toLowerCase());
    }
  };

  // ── Reset / Retry ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    stopPoll();
    setRfq(null);
    setFormError(null);
    setAcceptError(null);
    setLastFields(null);
    setStep('form');
  };

  // Retry: go back to form but keep last fields pre-filled
  const handleRetry = () => {
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
          CosmoClaw — RFQ Trading
        </span>
        {rfq && (
          <span className="ml-auto"><StatusBadge status={rfq.status} /></span>
        )}
      </div>

      <Stepper step={step} />

      {step === 'form' && (
        <FormStep
          evmAddress={evmAddress}
          nftChecking={nftChecking}
          hasNFT={hasNFT}
          providerStatus={providerStatus}
          wrongChain={wrongChain}
          switching={switching}
          onSwitch={handleSwitch}
          onSubmit={handleSubmit}
          loading={submitLoading}
          error={formError}
          initialFields={lastFields}
        />
      )}

      {step === 'polling' && rfq && <PollingStep rfq={rfq} />}

      {step === 'quoted' && rfq && (
        <QuoteStep
          rfq={rfq}
          onAccept={handleAccept}
          loading={acceptLoading}
          error={acceptError}
        />
      )}

      {(step === 'settlement' || step === 'done') && rfq && (
        <SettlementStep rfq={rfq} onReset={handleReset} onRetry={handleRetry} />
      )}

      {step === 'failed' && rfq && (
        <SettlementStep rfq={rfq} onReset={handleReset} onRetry={handleRetry} />
      )}
    </div>
  );
}
