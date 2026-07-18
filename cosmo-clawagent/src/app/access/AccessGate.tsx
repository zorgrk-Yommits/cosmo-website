'use client';

// COSMO Holder Access — Stage 1 gate.
//
// StarKey (Supra) connect + STATIC allowlist eligibility. Deliberately minimal and
// self-contained: it does NOT import WalletContext/nftGate (those inline the
// Tradeport API keys + fire a live indexer call). Stage 1 here = connect + read
// address + check a public static allowlist. NO signatures, NO on-chain tx, NO RPC.
// The only network action is the user-initiated StarKey connect popup.

import { useCallback, useEffect, useState } from 'react';
import { Wallet, CheckCircle2, XCircle, ShieldCheck, Plug, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProtocolNotice from '@/components/ProtocolNotice';
import { isAllowlisted, ALLOWLIST_STAGE } from './lib/allowlist';

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

export default function AccessGate() {
  const [address, setAddress] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);

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
      // 4001 = user rejected the connect prompt — silent.
      if ((e as { code?: number })?.code !== 4001) console.error('[AccessGate] connect error', e);
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
  }, []);

  const connected = !!address;
  const eligible = connected && isAllowlisted(address);

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          <ProtocolNotice />
          {/* ── header ── */}
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Holder access · Stage 1
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              COSMO Holder Access
            </h1>
            <p className="mt-4 font-sans text-lg text-slate-300">
              Connect your wallet to verify access.
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
              value={!connected ? '—' : eligible ? 'COSMO NFT holder' : 'Not eligible'}
              tone={!connected ? 'idle' : eligible ? 'ok' : 'bad'}
            />
          </div>

          {/* ── result view ── */}
          {connected && (
            <div
              className={cn(
                'mt-6 rounded-xl border p-5',
                eligible
                  ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                  : 'border-rose-500/30 bg-rose-500/[0.06]',
              )}
            >
              <div className="flex items-start gap-3">
                {eligible ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-300" />
                )}
                <p className="font-sans text-sm leading-relaxed text-slate-200">
                  {eligible
                    ? 'Access granted. This wallet is recognized as a COSMO NFT holder.'
                    : 'This wallet is not currently recognized as a COSMO NFT holder.'}
                </p>
              </div>
            </div>
          )}

          {/* ── caveat ── */}
          <aside className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              This gate verifies holder access only. It does not execute trades or grant
              permissionless Maker access.
            </p>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
              {ALLOWLIST_STAGE} — eligibility is checked against a static, public holder allowlist.
              No signature, no on-chain transaction, no live RPC.
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
