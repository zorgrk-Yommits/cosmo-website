'use client';

// M2 Maker Onboarding — bond helper (Phase 5, permissionless maker opening).
//
// Ported 1:1 from tools/m2-bond-helper.html (cosmo-contracts-move). Deliberately
// self-contained like AccessGate: does NOT import rfqConfig/starkeySign — those are
// bound to the env-driven RFQ target (currently testnet chain 6), while this page is
// hard-pinned to Supra MAINNET chain 8. Exactly two fixed entry calls, no free
// function-id or amount inputs, never asks for keys/seeds; signing happens only in
// the StarKey popup.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Wallet,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Plug,
  Loader2,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---- Constants (deliberately hardcoded, zero UI inputs) ----------------------
const M2_ADDR = '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb';
const MODULE_ADDR = '0xf2785bf6510d738d2f58c48ee62f00ec56462a5bf0de4ccfdebd11cd2b1264e1';
const WCOSMO_META = '0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6';
const AMOUNT = 100000000; // 100 wCOSMO (6 decimals) — fixed
// Phase 6 roundtrip top-up: exactly 1 COSMO -> 1 wCOSMO for the quote escrow,
// so the roundtrip driver preflight (freeWCOSMO >= 997000) passes. Fixed, no inputs.
const TOPUP_AMOUNT = 1000000; // 1 wCOSMO (6 decimals) — fixed
const CHAIN_ID = '8'; // Supra Mainnet
const RPC = 'https://rpc-mainnet.supra.com';
const EXPLORER_TX = 'https://suprascan.io/tx/';

// ---- StarKey provider (minimal surface we use) --------------------------------
type SupraProvider = {
  connect: () => Promise<unknown>;
  account?: () => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
  getChainId?: () => Promise<unknown>;
  changeNetwork?: (opts: { chainId: string }) => Promise<unknown>;
  createRawTransactionData: (payload: unknown[]) => Promise<unknown>;
  sendTransaction: (tx: {
    data: unknown;
    from: string;
    to: string;
    chainId: number;
    value: string;
  }) => Promise<string>;
  on?: (event: string, cb: () => void) => void;
};

function getSupra(): SupraProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { starkey?: { supra?: SupraProvider } })?.starkey?.supra ?? null;
}

// ---- Pure helpers (byte-identical to supraTx.u64Arg / the html helper) --------
const norm = (a: string) => (a || '').toLowerCase().replace(/^0x/, '').padStart(64, '0');
const sameAddr = (a: string, b: string) => norm(a) === norm(b);
const fmtAmt = (q: string | number | bigint) =>
  (Number(q) / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 6 });
const shortAddr = (addr: string) => {
  const h = addr.startsWith('0x') ? addr : `0x${addr}`;
  return h.length <= 16 ? h : `${h.slice(0, 8)}…${h.slice(-6)}`;
};

function bcsU64(n: number | bigint): Uint8Array {
  // BCS u64: 8 bytes, little-endian (target is ES2017 — no bigint literals).
  const out = new Uint8Array(8);
  let x = BigInt(n);
  const MASK = BigInt(255);
  const SHIFT = BigInt(8);
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & MASK);
    x >>= SHIFT;
  }
  return out;
}

async function rpcView(fn: string, typeArgs: string[], args: string[]): Promise<unknown> {
  const r = await fetch(`${RPC}/rpc/v1/view`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ function: fn, type_arguments: typeArgs, arguments: args }),
  });
  if (!r.ok) throw new Error(`view HTTP ${r.status}`);
  const j = (await r.json()) as { result?: unknown[]; response?: { result?: unknown[] } };
  return (j.result ?? j.response?.result ?? [])[0];
}

async function fetchSeqNum(addr: string): Promise<number> {
  const r = await fetch(`${RPC}/rpc/v1/accounts/${addr}`);
  if (!r.ok) throw new Error(`account HTTP ${r.status}`);
  const j = (await r.json()) as {
    sequence_number?: number | string;
    account?: { sequence_number?: number | string };
  };
  const s = j.sequence_number ?? j.account?.sequence_number;
  if (s === undefined) throw new Error('sequence_number nicht gefunden');
  return Number(s);
}

// ---- On-chain status snapshot --------------------------------------------------
type ChainStatus = {
  bal: bigint;
  avail: bigint;
  elig: boolean;
  gate: boolean;
};

async function fetchStatus(): Promise<ChainStatus> {
  const [bal, avail, elig, gate] = await Promise.all([
    rpcView(
      '0x1::primary_fungible_store::balance',
      ['0x1::fungible_asset::Metadata'],
      [M2_ADDR, WCOSMO_META],
    ),
    rpcView(`${MODULE_ADDR}::maker_vault::operator_available`, [], [M2_ADDR]),
    rpcView(`${MODULE_ADDR}::maker_vault::is_operator_quote_eligible`, [], [M2_ADDR]),
    rpcView(`${MODULE_ADDR}::maker_vault::is_deposit_gate_open`, [], []),
  ]);
  return {
    bal: BigInt(String(bal ?? 0)),
    avail: BigInt(String(avail ?? 0)),
    elig: elig === true,
    gate: gate === true,
  };
}

// ---- Per-step tx state -----------------------------------------------------------
type StepDef = { n: 1 | 2; modName: string; fnName: string };
const STEPS: StepDef[] = [
  { n: 1, modName: 'wcosmo', fnName: 'wrap' },
  { n: 2, modName: 'maker_vault', fnName: 'deposit_operator_bond' },
];

type StepState = {
  payloadText: string | null;
  txHash: string | null;
  busy: boolean;
  signReady: boolean;
};
const emptyStep = (): StepState => ({
  payloadText: null,
  txHash: null,
  busy: false,
  signReady: false,
});

export default function M2BondHelper() {
  const providerRef = useRef<SupraProvider | null>(null);
  const preparedRef = useRef<Record<number, unknown>>({});

  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connAddr, setConnAddr] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null); // set ONLY after addr+chain checks pass
  const [addrOk, setAddrOk] = useState<boolean | null>(null);
  const [chainMsg, setChainMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [steps, setSteps] = useState<Record<number, StepState>>({ 1: emptyStep(), 2: emptyStep() });
  // Phase 6 top-up has its own state so the two bond steps stay untouched.
  const [topup, setTopup] = useState<StepState>(emptyStep());
  const [log, setLog] = useState<{ text: string; tone: 'ok' | 'bad' | 'warn' | 'info' } | null>(
    null,
  );

  const patchStep = useCallback((n: number, patch: Partial<StepState>) => {
    setSteps((s) => ({ ...s, [n]: { ...s[n], ...patch } }));
  }, []);

  const patchTopup = useCallback((patch: Partial<StepState>) => {
    setTopup((t) => ({ ...t, ...patch }));
  }, []);

  const refreshStatus = useCallback(async (): Promise<ChainStatus | null> => {
    setRefreshing(true);
    try {
      const st = await fetchStatus();
      setStatus(st);
      setStatusErr(null);
      return st;
    } catch (e) {
      setStatusErr(`Status-Fehler: ${(e as Error).message}`);
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Read-only status also without a wallet (same as the html helper).
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const connect = useCallback(async () => {
    const p = getSupra();
    if (!p) {
      setNotFound(true);
      return;
    }
    providerRef.current = p;
    setNotFound(false);
    setConnecting(true);
    setAddrOk(null);
    setChainMsg(null);
    setAccount(null);
    try {
      const accounts = await p.connect();
      const addr = Array.isArray(accounts) ? String(accounts[0]) : String(accounts);
      setConnAddr(addr);

      // Hard address lock: this page is for the M2 maker wallet ONLY.
      if (!sameAddr(addr, M2_ADDR)) {
        setAddrOk(false);
        setLog({ text: 'FALSCHE ADRESSE — diese Seite ist nur fuer die M2 Maker Wallet.', tone: 'bad' });
        return;
      }
      setAddrOk(true);

      // Enforce Supra Mainnet (chain 8).
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
          /* fall through to hard check */
        }
      }
      if (cid !== CHAIN_ID) {
        setChainMsg({
          ok: false,
          text: `Chain ${cid ?? '?'} — bitte in StarKey auf Supra Mainnet (8) wechseln`,
        });
        return;
      }
      setChainMsg({ ok: true, text: 'Supra Mainnet (8) OK' });

      setAccount(addr);
      setLog({ text: 'Verbunden. Status wird geladen …', tone: 'info' });
      await refreshStatus();

      p.on?.('accountChanged', () => {
        setAccount(null);
        setConnAddr(null);
        setAddrOk(null);
        setChainMsg(null);
        preparedRef.current = {};
        setSteps({ 1: emptyStep(), 2: emptyStep() });
        setTopup(emptyStep());
        setLog({ text: 'Account gewechselt — bitte neu verbinden.', tone: 'warn' });
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== 4001) {
        setLog({ text: `Connect-Fehler: ${(e as Error).message ?? e}`, tone: 'bad' });
      }
    } finally {
      setConnecting(false);
    }
  }, [refreshStatus]);

  const prepare = useCallback(
    async (step: StepDef) => {
      const p = providerRef.current;
      if (!p || !account) return;
      patchStep(step.n, { busy: true });
      try {
        const seq = await fetchSeqNum(account);
        const expiry = Math.ceil(Date.now() / 1000) + 300;
        // Exact payload shape from the proven m2-bond-helper.html — do not vary.
        const rawTxPayload = [
          account,
          seq,
          MODULE_ADDR,
          step.modName,
          step.fnName,
          [], // no type args
          [bcsU64(AMOUNT)], // exactly one u64, hardcoded
          { txExpiryTime: expiry },
        ];
        const data = await p.createRawTransactionData(rawTxPayload);
        preparedRef.current[step.n] = data;
        const text = [
          `Sender          : ${account}`,
          `Function-ID     : ${MODULE_ADDR}::${step.modName}::${step.fnName}`,
          'Type-Args       : (keine)',
          `Arg 1 (u64)     : ${AMOUNT}  (= ${fmtAmt(AMOUNT)} wCOSMO)`,
          `Sequence-Number : ${seq}`,
          `Expiry (unix)   : ${expiry}`,
          'Chain           : 8 (Supra Mainnet)',
        ].join('\n');
        patchStep(step.n, { payloadText: text, signReady: true });
        setLog({ text: `Payload Schritt ${step.n} bereit. Pruefen, dann signieren.`, tone: 'info' });
      } catch (e) {
        setLog({ text: `Payload-Fehler: ${(e as Error).message ?? e}`, tone: 'bad' });
      } finally {
        patchStep(step.n, { busy: false });
      }
    },
    [account, patchStep],
  );

  const sign = useCallback(
    async (step: StepDef) => {
      const p = providerRef.current;
      const prepared = preparedRef.current[step.n];
      if (!p || !account || !prepared) return;
      patchStep(step.n, { busy: true, signReady: false });
      try {
        setLog({ text: 'Warte auf Signatur in StarKey …', tone: 'info' });
        const txHash = await p.sendTransaction({
          data: prepared,
          from: account,
          to: MODULE_ADDR,
          chainId: Number(CHAIN_ID),
          value: '',
        });
        preparedRef.current[step.n] = null;
        patchStep(step.n, { txHash, payloadText: null });
        setLog({
          text: `TX gesendet (Schritt ${step.n}). Warte auf on-chain-Bestaetigung …`,
          tone: 'info',
        });
        // Poll until the state change is visible (max ~60s), like the html helper.
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const st = await refreshStatus();
          if (!st) continue;
          if (step.n === 1 && st.bal >= BigInt(AMOUNT)) break;
          if (step.n === 2 && (st.elig || st.avail >= BigInt(AMOUNT))) break;
        }
      } catch (e) {
        setLog({ text: `Signatur/Sende-Fehler: ${(e as Error).message ?? e}`, tone: 'bad' });
        patchStep(step.n, { signReady: true });
      } finally {
        patchStep(step.n, { busy: false });
      }
    },
    [account, patchStep, refreshStatus],
  );

  // ---- Phase 6 top-up (wcosmo::wrap u64:1000000) ---------------------------------
  // Same proven payload shape as prepare()/sign(), own handlers + preparedRef slot 3
  // so the two bond steps stay byte-identical in behavior.
  const prepareTopup = useCallback(async () => {
    const p = providerRef.current;
    if (!p || !account) return;
    patchTopup({ busy: true });
    try {
      const seq = await fetchSeqNum(account);
      const expiry = Math.ceil(Date.now() / 1000) + 300;
      const rawTxPayload = [
        account,
        seq,
        MODULE_ADDR,
        'wcosmo',
        'wrap',
        [], // no type args
        [bcsU64(TOPUP_AMOUNT)], // exactly one u64, hardcoded
        { txExpiryTime: expiry },
      ];
      const data = await p.createRawTransactionData(rawTxPayload);
      preparedRef.current[3] = data;
      const text = [
        `Sender          : ${account}`,
        `Function-ID     : ${MODULE_ADDR}::wcosmo::wrap`,
        'Type-Args       : (keine)',
        `Arg 1 (u64)     : ${TOPUP_AMOUNT}  (= ${fmtAmt(TOPUP_AMOUNT)} wCOSMO)`,
        `Sequence-Number : ${seq}`,
        `Expiry (unix)   : ${expiry}`,
        'Chain           : 8 (Supra Mainnet)',
      ].join('\n');
      patchTopup({ payloadText: text, signReady: true });
      setLog({ text: 'Payload Top-up bereit. Pruefen, dann signieren.', tone: 'info' });
    } catch (e) {
      setLog({ text: `Payload-Fehler: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      patchTopup({ busy: false });
    }
  }, [account, patchTopup]);

  const signTopup = useCallback(async () => {
    const p = providerRef.current;
    const prepared = preparedRef.current[3];
    if (!p || !account || !prepared) return;
    patchTopup({ busy: true, signReady: false });
    try {
      setLog({ text: 'Warte auf Signatur in StarKey …', tone: 'info' });
      const txHash = await p.sendTransaction({
        data: prepared,
        from: account,
        to: MODULE_ADDR,
        chainId: Number(CHAIN_ID),
        value: '',
      });
      preparedRef.current[3] = null;
      patchTopup({ txHash, payloadText: null });
      setLog({ text: 'TX gesendet (Top-up). Warte auf on-chain-Bestaetigung …', tone: 'info' });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const st = await refreshStatus();
        if (st && st.bal >= BigInt(TOPUP_AMOUNT)) break;
      }
    } catch (e) {
      setLog({ text: `Signatur/Sende-Fehler: ${(e as Error).message ?? e}`, tone: 'bad' });
      patchTopup({ signReady: true });
    } finally {
      patchTopup({ busy: false });
    }
  }, [account, patchTopup, refreshStatus]);

  // ---- Derived gating ----------------------------------------------------------
  const balOk = status !== null && status.bal >= BigInt(AMOUNT);
  // DONE per requirement: operator_available >= 100 wCOSMO OR eligible === true.
  const done = status !== null && (status.avail >= BigInt(AMOUNT) || status.elig);
  const connected = !!account;
  const anyBusy = steps[1].busy || steps[2].busy;

  const prepEnabled = (n: 1 | 2) => {
    if (!connected || done || status === null || anyBusy) return false;
    if (n === 1) return !balOk; // wrap only while below 100 wCOSMO
    return balOk && status.gate; // bond only with balance AND open deposit gate
  };
  const signEnabled = (n: 1 | 2) => !done && connected && steps[n].signReady && !steps[n].busy;

  // Phase 6 gating: only for the bonded, quote-eligible M2 wallet on chain 8
  // (address+chain enforced at connect; `account` is only set after both checks).
  const topupReady = status !== null && status.bal >= BigInt(TOPUP_AMOUNT);
  const topupBonded =
    status !== null && status.avail >= BigInt(AMOUNT) && status.elig;
  const topupPrepEnabled =
    connected && topupBonded && !topupReady && !anyBusy && !topup.busy;
  const topupSignEnabled = connected && !topupReady && topup.signReady && !topup.busy;

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          {/* header */}
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Maker onboarding · M2 · Mainnet (chain 8)
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              M2 Operator Bond
            </h1>
            <p className="mt-4 font-sans text-lg text-slate-300">
              Zwei fixe Transaktionen: 100 $COSMO wrappen, dann 100 wCOSMO als Operator-Bond
              einzahlen. Signatur ausschliesslich in StarKey.
            </p>
          </header>

          {/* warning banner */}
          <aside className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
              <div>
                <p className="font-sans text-sm font-semibold leading-relaxed text-amber-200">
                  Nur fuer die M2 Maker Wallet.
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-slate-300">
                  Alle anderen Wallets werden abgewiesen. Function-IDs und Betrag sind fest
                  verdrahtet — keine freien Eingaben. Diese Seite fragt niemals nach Seed oder
                  Private Key.
                </p>
                <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
                  Erwartete Adresse: {M2_ADDR}
                </p>
              </div>
            </div>
          </aside>

          {/* connect */}
          <div className="mt-8">
            {!connected ? (
              <button
                type="button"
                onClick={connect}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-600/20 px-5 py-3 font-mono text-sm text-purple-100 transition-all hover:border-purple-400 hover:bg-purple-600/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                {connecting ? 'Verbinde …' : 'StarKey verbinden'}
              </button>
            ) : null}
            {notFound && (
              <p className="mt-3 font-mono text-xs text-amber-400">
                StarKey nicht gefunden. Extension installieren (starkey.app) und neu laden.
              </p>
            )}
          </div>

          {/* wallet checks */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatusCard
              icon={<Wallet className="h-4 w-4" />}
              label="Wallet"
              value={connAddr ? shortAddr(connAddr) : 'Nicht verbunden'}
              tone={connected ? 'ok' : connAddr ? 'bad' : 'idle'}
              mono={!!connAddr}
            />
            <StatusCard
              icon={addrOk === false ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              label="Adress-Check"
              value={addrOk === null ? '—' : addrOk ? 'OK (== M2)' : 'FALSCHE ADRESSE'}
              tone={addrOk === null ? 'idle' : addrOk ? 'ok' : 'bad'}
            />
            <StatusCard
              icon={<Plug className="h-4 w-4" />}
              label="Chain"
              value={chainMsg?.text ?? '—'}
              tone={chainMsg === null ? 'idle' : chainMsg.ok ? 'ok' : 'bad'}
            />
          </div>

          {/* on-chain status */}
          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
                Status (read-only, on-chain)
              </h2>
              <button
                type="button"
                onClick={() => void refreshStatus()}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-400 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
                Aktualisieren
              </button>
            </div>
            <dl className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-2">
              <StatusRow k="wCOSMO-Balance M2" v={status ? `${fmtAmt(status.bal)} wCOSMO` : '—'} />
              <StatusRow k="Operator-Bond verfuegbar" v={status ? `${fmtAmt(status.avail)} wCOSMO` : '—'} />
              <StatusRow
                k="Quote-eligible"
                v={status ? (status.elig ? 'ja' : 'nein') : '—'}
                tone={status ? (status.elig ? 'ok' : 'warn') : undefined}
              />
              <StatusRow
                k="Deposit-Gate offen"
                v={status ? (status.gate ? 'ja' : 'NEIN (STOP)') : '—'}
                tone={status ? (status.gate ? 'ok' : 'bad') : undefined}
              />
            </dl>
            {statusErr && <p className="mt-3 font-mono text-xs text-rose-400">{statusErr}</p>}
          </section>

          {/* DONE state */}
          {done && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-wider text-emerald-300">
                    DONE
                  </p>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-slate-200">
                    Operator-Bond ist eingezahlt bzw. M2 ist quote-eligible. Es gibt hier nichts
                    mehr zu tun — beide Transaktions-Buttons sind gesperrt.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* tx steps */}
          {STEPS.map((step) => (
            <section
              key={step.n}
              className={cn(
                'mt-6 rounded-xl border p-5',
                done || (step.n === 1 && balOk)
                  ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                  : 'border-white/10 bg-white/[0.02]',
              )}
            >
              <h2 className="font-sans text-sm font-semibold text-slate-200">
                {step.n === 1
                  ? 'Schritt 1 · wrap — 100 $COSMO → 100 wCOSMO'
                  : 'Schritt 2 · Operator-Bond einzahlen — 100 wCOSMO'}
              </h2>
              <p className="mt-1 font-mono text-xs text-slate-400">
                {step.modName}::{step.fnName}(u64:{AMOUNT})
              </p>
              {step.n === 2 && !done && (
                <p className="mt-1 font-sans text-xs text-slate-500">
                  Wird erst freigeschaltet, wenn M2 mindestens 100 wCOSMO haelt und das
                  Deposit-Gate offen ist.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void prepare(step)}
                  disabled={!prepEnabled(step.n)}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-600/20 px-4 py-2 font-mono text-xs text-sky-100 transition-all hover:border-sky-400 hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {steps[step.n].busy && !steps[step.n].signReady ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Payload anzeigen
                </button>
                <button
                  type="button"
                  onClick={() => void sign(step)}
                  disabled={!signEnabled(step.n)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-600/20 px-4 py-2 font-mono text-xs text-amber-100 transition-all hover:border-amber-400 hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {done ? <Lock className="h-3.5 w-3.5" /> : null}
                  In StarKey signieren
                </button>
              </div>
              {steps[step.n].payloadText && (
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-slate-600 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                  {steps[step.n].payloadText}
                </pre>
              )}
              {steps[step.n].txHash && (
                <p className="mt-3 break-all font-mono text-xs text-slate-400">
                  TX-Hash:{' '}
                  <a
                    href={`${EXPLORER_TX}${steps[step.n].txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300"
                  >
                    {steps[step.n].txHash}
                  </a>
                </p>
              )}
            </section>
          ))}

          {/* Phase 6 — roundtrip wCOSMO top-up (fixed 1 COSMO wrap) */}
          <section
            className={cn(
              'mt-6 rounded-xl border p-5',
              topupReady
                ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                : 'border-white/10 bg-white/[0.02]',
            )}
          >
            <h2 className="font-sans text-sm font-semibold text-slate-200">
              Phase 6 — Roundtrip wCOSMO Top-up
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-400">
              wcosmo::wrap(u64:{TOPUP_AMOUNT})
            </p>
            <p className="mt-1 font-sans text-xs text-slate-500">
              Wrappt genau 1 $COSMO zu 1 wCOSMO als Quote-Escrow fuer den Roundtrip-Test
              (Preflight: freie wCOSMO &gt;= 0,997). Der Bond bleibt unberuehrt. Erst
              freigeschaltet, wenn der Operator-Bond eingezahlt und M2 quote-eligible ist.
            </p>
            {topupReady && (
              <div className="mt-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-300" />
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Roundtrip top-up ready
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void prepareTopup()}
                disabled={!topupPrepEnabled}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/50 bg-sky-600/20 px-4 py-2 font-mono text-xs text-sky-100 transition-all hover:border-sky-400 hover:bg-sky-600/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {topup.busy && !topup.signReady ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                Payload anzeigen
              </button>
              <button
                type="button"
                onClick={() => void signTopup()}
                disabled={!topupSignEnabled}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-600/20 px-4 py-2 font-mono text-xs text-amber-100 transition-all hover:border-amber-400 hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {topupReady ? <Lock className="h-3.5 w-3.5" /> : null}
                In StarKey signieren
              </button>
            </div>
            {topup.payloadText && (
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-slate-600 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                {topup.payloadText}
              </pre>
            )}
            {topup.txHash && (
              <p className="mt-3 break-all font-mono text-xs text-slate-400">
                TX-Hash:{' '}
                <a
                  href={`${EXPLORER_TX}${topup.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300"
                >
                  {topup.txHash}
                </a>
              </p>
            )}
          </section>

          {/* log line */}
          {log && (
            <p
              className={cn(
                'mt-6 font-mono text-xs',
                log.tone === 'ok' && 'text-emerald-400',
                log.tone === 'bad' && 'text-rose-400',
                log.tone === 'warn' && 'text-amber-400',
                log.tone === 'info' && 'text-slate-400',
              )}
            >
              {log.text}
            </p>
          )}

          {/* footer note */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-slate-600">
            Keine Secrets, keine Server-Signer, keine Admin-/Multisig-Funktionen. Read-only-Status
            via {RPC}. Diese Seite ist noindex und nicht in der Navigation verlinkt.
          </p>
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

function StatusRow({ k, v, tone }: { k: string; v: string; tone?: 'ok' | 'bad' | 'warn' }) {
  const toneCls =
    tone === 'ok'
      ? 'text-emerald-300'
      : tone === 'bad'
        ? 'text-rose-300'
        : tone === 'warn'
          ? 'text-amber-300'
          : 'text-slate-200';
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">{k}</span>
      <span className={cn('text-right text-xs', toneCls)}>{v}</span>
    </div>
  );
}
