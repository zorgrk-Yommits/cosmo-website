'use client';

// Controlled Community RFQ Demo — Stage 1, intent-only.
//
// A community wallet can PREVIEW a small supUSDC -> wCOSMO RFQ intent. Nothing is
// signed, nothing moves, no RPC is called. This mirrors AccessGate's deliberately
// self-contained StarKey-connect + static-allowlist pattern: the ONLY network
// action is the user-initiated StarKey connect popup.
//
// HARD Stage-1 boundaries: 0 transactions, 0 token movement, no migrate flow,
// no accept_quote, no live maker response, no permissionless/open-market wording.
//
// The token pair is fixed and was verified read-only on Supra Mainnet (chain 8):
// both legs are non-dispatchable 6-decimal FAs, so the RFQ engine leg-gate passes.
// See plans/community-rfq-supra-wcosmo-plan.md.

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  Plug,
  Loader2,
  ArrowRight,
  Lock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAllowlisted, ALLOWLIST_STAGE } from '../access/lib/allowlist';

// ── verified Mainnet pair (read-only confirmed; do NOT edit without re-verifying) ──
const PAIR = {
  tokenIn: {
    symbol: 'supUSDC',
    name: 'Supra Wrapped USDC',
    metadata: '0xf90b4b9d4a9d87c39fb3140513e52edc3ead5eaddcb9881b02becdeb63c5793d',
    decimals: 6,
  },
  tokenOut: {
    symbol: 'wCOSMO',
    name: 'Wrapped COSMO',
    metadata: '0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6',
    decimals: 6,
  },
} as const;

// Stage-1 preview cap (human units). The same ceiling carries into Stage-2.
const MAX_AMOUNT = 5;

type SupraProvider = {
  connect: () => Promise<unknown>;
  account?: () => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
};

function getSupra(): SupraProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { starkey?: { supra?: SupraProvider } })?.starkey?.supra ?? null;
}

function extractAddress(raw: unknown): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ? String(raw[0]).trim().toLowerCase() : null;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const v = o.address ?? (o.accounts as unknown[] | undefined)?.[0] ?? o.account ?? null;
    return v ? String(v).trim().toLowerCase() : null;
  }
  if (typeof raw === 'string') return raw.trim().toLowerCase() || null;
  return null;
}

function shortAddr(addr: string): string {
  const h = addr.startsWith('0x') ? addr : `0x${addr}`;
  return h.length <= 16 ? h : `${h.slice(0, 8)}…${h.slice(-6)}`;
}

// Parse a human decimal string to integer base units, or null if invalid / out of range.
function toBaseUnits(value: string, decimals: number): number | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\d*\.?\d*$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 10 ** decimals);
}

type Intent = {
  requester: string;
  amountInBase: number;
  minAmountOutBase: number;
  capturedAt: string;
};

export default function CommunityRfq() {
  const [address, setAddress] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [amountIn, setAmountIn] = useState('1.00');
  const [minAmountOut, setMinAmountOut] = useState('0.99');
  const [intent, setIntent] = useState<Intent | null>(null);

  // Silent reconnect if a session already exists (no popup, no signature).
  useEffect(() => {
    const t = setTimeout(async () => {
      const p = getSupra();
      if (!p?.account) return;
      try {
        const a = extractAddress(await p.account());
        if (a) setAddress(a);
      } catch {
        /* not previously connected — stay disconnected */
      }
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const connect = useCallback(async () => {
    const p = getSupra();
    if (!p) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    setConnecting(true);
    try {
      let a = extractAddress(await p.connect());
      if (!a && p.account) a = extractAddress(await p.account());
      if (a) setAddress(a);
    } catch (e: unknown) {
      if ((e as { code?: number })?.code !== 4001) console.error('[CommunityRfq] connect error', e);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const p = getSupra();
    try {
      await p?.disconnect?.();
    } catch {
      /* ignore */
    }
    setAddress(null);
    setIntent(null);
  }, []);

  const connected = !!address;
  const eligible = connected && isAllowlisted(address);

  const amountInBase = toBaseUnits(amountIn, PAIR.tokenIn.decimals);
  const minAmountOutBase = toBaseUnits(minAmountOut, PAIR.tokenOut.decimals);
  const amountsValid = amountInBase !== null && minAmountOutBase !== null;

  const captureIntent = useCallback(() => {
    // Hard gate: only allowlisted/eligible wallets may generate a local intent
    // preview. Everyone else can read the page and connect, but not build intent.
    if (!address || !eligible || amountInBase === null || minAmountOutBase === null) return;
    setIntent({
      requester: address,
      amountInBase,
      minAmountOutBase,
      capturedAt: new Date().toISOString(),
    });
  }, [address, eligible, amountInBase, minAmountOutBase]);

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          {/* ── header ── */}
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Controlled Community Experiment · Stage 1
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Controlled Community Experiment
            </h1>
            <p className="mt-4 font-sans text-lg text-slate-300">
              An early experiment in machine-to-machine commerce. An allowlisted wallet can preview a
              small supUSDC → wCOSMO request, Kahless can quote, and COSMO can settle the selected
              request atomically on Supra Mainnet. This is not a public market or a permissionless RFQ venue.
            </p>
            <p className="mt-2 font-mono text-sm text-amber-300">
              Intent-only preview. No funds move.
            </p>
          </header>

          {/* ── connect / disconnect ── */}
          <div className="mt-10">
            {!connected ? (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-5 py-3 font-mono text-sm text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4" />
                )}
                {connecting ? 'Connecting…' : 'Connect StarKey'}
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnect}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 font-mono text-xs text-slate-400 transition-all hover:border-white/30 hover:text-white"
              >
                Disconnect
              </button>
            )}
            {notFound && (
              <p className="mt-3 font-mono text-xs text-amber-400">
                StarKey wallet not detected. Install the StarKey extension and reload.
              </p>
            )}
          </div>

          {/* ── status cards ── */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatusCard
              icon={<Wallet className="h-4 w-4" />}
              label="Wallet"
              value={connected ? 'Connected' : 'Not connected'}
              tone={connected ? 'ok' : 'idle'}
            />
            <StatusCard
              icon={<Plug className="h-4 w-4" />}
              label="Address"
              value={connected ? shortAddr(address as string) : '—'}
              tone={connected ? 'ok' : 'idle'}
              mono
            />
            <StatusCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Eligibility"
              value={!connected ? '—' : eligible ? 'COSMO NFT holder' : 'Not on allowlist'}
              tone={!connected ? 'idle' : eligible ? 'ok' : 'bad'}
            />
          </div>

          {/* ── intent builder (fixed pair) ── */}
          <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              Build RFQ intent
            </h2>

            {/* fixed pair display */}
            <div className="mt-5 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
              <TokenLeg
                role="You ask with"
                symbol={PAIR.tokenIn.symbol}
                name={PAIR.tokenIn.name}
                metadata={PAIR.tokenIn.metadata}
                decimals={PAIR.tokenIn.decimals}
                accent="cyan"
              />
              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 rotate-90 text-slate-600 md:rotate-0" />
              </div>
              <TokenLeg
                role="Kahless quotes"
                symbol={PAIR.tokenOut.symbol}
                name={PAIR.tokenOut.name}
                metadata={PAIR.tokenOut.metadata}
                decimals={PAIR.tokenOut.decimals}
                accent="purple"
              />
            </div>

            {/* amount inputs */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <AmountField
                label={`amount_in (${PAIR.tokenIn.symbol})`}
                value={amountIn}
                onChange={setAmountIn}
                hint={`max ${MAX_AMOUNT} · ${PAIR.tokenIn.decimals} decimals`}
                base={amountInBase}
                disabled={!connected}
              />
              <AmountField
                label={`min_amount_out (${PAIR.tokenOut.symbol})`}
                value={minAmountOut}
                onChange={setMinAmountOut}
                hint={`max ${MAX_AMOUNT} · ${PAIR.tokenOut.decimals} decimals`}
                base={minAmountOutBase}
                disabled={!connected}
              />
            </div>

            <button
              type="button"
              onClick={captureIntent}
              disabled={!connected || !eligible || !amountsValid}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 font-mono text-sm text-cyan-100 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText className="h-4 w-4" />
              Preview intent
            </button>
            {!connected ? (
              <p className="mt-3 font-mono text-[11px] text-slate-500">
                Connect a wallet to build an intent preview.
              </p>
            ) : !eligible ? (
              <p className="mt-3 font-mono text-[11px] text-amber-400">
                Intent preview is limited to allowlisted COSMO holder wallets. This wallet is not on
                the allowlist — you can read the page, but cannot generate an intent.
              </p>
            ) : null}
          </section>

          {/* ── intent preview ── */}
          {intent && (
            <section className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-300" />
                <h3 className="font-mono text-sm text-slate-100">RFQ intent — preview only</h3>
              </div>
              <dl className="mt-4 grid gap-3 font-mono text-xs sm:grid-cols-2">
                <PreviewRow k="requester" v={shortAddr(intent.requester)} />
                <PreviewRow k="captured_at" v={intent.capturedAt} />
                <PreviewRow
                  k="token_in"
                  v={`${PAIR.tokenIn.symbol} (${shortAddr(PAIR.tokenIn.metadata)})`}
                />
                <PreviewRow
                  k="token_out"
                  v={`${PAIR.tokenOut.symbol} (${shortAddr(PAIR.tokenOut.metadata)})`}
                />
                <PreviewRow
                  k="amount_in"
                  v={`${amountIn} ${PAIR.tokenIn.symbol}  ·  ${intent.amountInBase} base`}
                />
                <PreviewRow
                  k="min_amount_out"
                  v={`${minAmountOut} ${PAIR.tokenOut.symbol}  ·  ${intent.minAmountOutBase} base`}
                />
              </dl>
              <p className="mt-4 font-sans text-sm leading-relaxed text-slate-300">
                This is an intent preview only. No request was created, no quote was requested, and
                no funds moved. No on-chain transaction was sent.
              </p>
            </section>
          )}

          {/* ── Stage 2 — locked ── */}
          <section className="mt-8 rounded-xl border border-slate-600/40 bg-slate-500/[0.04] p-5 opacity-90">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-slate-400" />
              <h3 className="font-mono text-sm text-slate-200">
                Stage 2 — Controlled on-chain RFQ
              </h3>
              <span className="ml-auto rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                Locked
              </span>
            </div>
            <p className="mt-3 font-sans text-sm text-slate-400">
              A real, controlled on-chain round-trip is gated. It requires:
            </p>
            <ul className="mt-3 space-y-2">
              {[
                'Allowlisted requester holding a small amount of bridged supUSDC',
                'K1 free wCOSMO top-up (maker pays from free primary store; bond untouched)',
                'Manual, targeted K1 quote — no automatic open maker response',
                'A separate explicit GO before any Mainnet transaction',
              ].map((req) => (
                <li key={req} className="flex items-start gap-2 font-mono text-[12px] text-slate-400">
                  <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                  {req}
                </li>
              ))}
            </ul>
          </section>

          {/* ── caveat ── */}
          <aside className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              This is a controlled demo, not a permissionless market. It uses allowlisted wallets,
              pre-checked assets and small limits.
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
              {ALLOWLIST_STAGE} — Stage 1 is intent-only: no signature, no token movement, no
              on-chain transaction, no live RPC. The only network action is the StarKey connect.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
  tone,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'ok' | 'bad' | 'idle';
  mono?: boolean;
}) {
  const toneCls =
    tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-slate-400';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn('mt-2 break-all text-sm', mono ? 'font-mono' : 'font-sans font-medium', toneCls)}>
        {value}
      </div>
    </div>
  );
}

function TokenLeg({
  role,
  symbol,
  name,
  metadata,
  decimals,
  accent,
}: {
  role: string;
  symbol: string;
  name: string;
  metadata: string;
  decimals: number;
  accent: 'cyan' | 'purple';
}) {
  const ring = accent === 'cyan' ? 'border-cyan-500/30' : 'border-purple-500/30';
  const text = accent === 'cyan' ? 'text-cyan-200' : 'text-purple-200';
  return (
    <div className={cn('rounded-xl border bg-white/[0.02] p-4', ring)}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{role}</div>
      <div className={cn('mt-1 font-mono text-lg', text)}>{symbol}</div>
      <div className="font-sans text-xs text-slate-400">{name}</div>
      <div className="mt-2 break-all font-mono text-[10px] text-slate-600">{metadata}</div>
      <div className="font-mono text-[10px] text-slate-600">{decimals} decimals · non-dispatchable</div>
    </div>
  );
}

function AmountField({
  label,
  value,
  onChange,
  hint,
  base,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
  base: number | null;
  disabled?: boolean;
}) {
  const invalid = value.trim() !== '' && base === null;
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'mt-2 w-full rounded-lg border bg-black/30 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition-colors disabled:opacity-40',
          invalid ? 'border-rose-500/50' : 'border-white/10 focus:border-cyan-500/50',
        )}
      />
      <span className={cn('mt-1 block font-mono text-[10px]', invalid ? 'text-rose-400' : 'text-slate-600')}>
        {invalid ? `Enter a number > 0 and ≤ ${MAX_AMOUNT}` : base !== null ? `${hint} · ${base} base units` : hint}
      </span>
    </label>
  );
}

function PreviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="mt-0.5 break-all text-slate-200">{v}</div>
    </div>
  );
}
