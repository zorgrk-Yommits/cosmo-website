'use client';

// /compute/bond — self-service provider bond helper (positioning phase 2).
//
// Forked from the proven M2BondHelper pattern (maker-onboarding/m2), which stays
// frozen and untouched. Differences here: open to any wallet (no address lock),
// one free amount input validated against live provider_vault views, two target
// addresses (wcosmo lives in the cosmoclaw package, deposit_provider_bond in the
// compute package), wrap step skippable when enough wCOSMO is already held.
// Hard-pinned to Supra MAINNET chain 8 via lib/mainnetOnchain — deliberately
// independent from the env-driven RFQ testnet config. Never asks for keys or
// seeds; signing happens only in the StarKey popup.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ShieldAlert,
  CheckCircle2,
  Plug,
  Loader2,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  COSMOCLAW_ADDR,
  COMPUTE_PKG_ADDR,
  WCOSMO_META,
  COSMO_META,
  CHAIN_ID,
  RPC,
  EXPLORER_TX,
  type SupraProvider,
  getSupra,
  sameAddr,
  fmtAmt,
  shortAddr,
  bcsU64,
  parseAmount,
  rpcView,
  rpcViewAll,
  fetchSeqNum,
  faBalance,
} from '@/lib/mainnetOnchain';

// ---- On-chain status snapshot ----------------------------------------------------
type GlobalStatus = {
  minBond: bigint;
  maxPerProvider: bigint; // 0 = uncapped
  globalCap: bigint; // 0 = uncapped
  totalBonded: bigint;
  paused: boolean;
  paymentFaOk: boolean;
};

type WalletStatus = {
  cosmoBal: bigint;
  wcosmoBal: bigint;
  bondAmount: bigint;
  lockedUntil: bigint;
  slashCount: bigint;
  activeJobs: bigint;
  eligible: boolean;
};

const PV = `${COMPUTE_PKG_ADDR}::provider_vault`;

async function fetchGlobalStatus(): Promise<GlobalStatus> {
  const [minBond, maxPer, globalCap, totalBonded, paused, paymentFa] = await Promise.all([
    rpcView(`${PV}::get_min_provider_bond`, [], []),
    rpcView(`${PV}::get_max_bond_per_provider`, [], []),
    rpcView(`${PV}::get_global_bond_cap`, [], []),
    rpcView(`${PV}::get_total_bonded`, [], []),
    rpcView(`${PV}::is_onboarding_paused`, [], []),
    rpcView(`${PV}::payment_fa_addr`, [], []),
  ]);
  return {
    minBond: BigInt(String(minBond ?? 0)),
    maxPerProvider: BigInt(String(maxPer ?? 0)),
    globalCap: BigInt(String(globalCap ?? 0)),
    totalBonded: BigInt(String(totalBonded ?? 0)),
    paused: paused === true,
    paymentFaOk: sameAddr(String(paymentFa ?? ''), WCOSMO_META),
  };
}

async function fetchWalletStatus(addr: string): Promise<WalletStatus> {
  const [cosmoBal, wcosmoBal, bondTuple, eligible] = await Promise.all([
    faBalance(addr, COSMO_META),
    faBalance(addr, WCOSMO_META),
    rpcViewAll(`${PV}::get_provider_bond`, [], [addr]),
    rpcView(`${PV}::is_provider_eligible`, [], [addr]),
  ]);
  const t = (i: number) => BigInt(String(bondTuple[i] ?? 0));
  return {
    cosmoBal,
    wcosmoBal,
    bondAmount: t(0),
    lockedUntil: t(1),
    slashCount: t(2),
    activeJobs: t(4),
    eligible: eligible === true,
  };
}

// ---- Per-step tx state --------------------------------------------------------------
type StepDef = { n: 1 | 2; moduleAddr: string; modName: string; fnName: string };
const STEPS: StepDef[] = [
  { n: 1, moduleAddr: COSMOCLAW_ADDR, modName: 'wcosmo', fnName: 'wrap' },
  { n: 2, moduleAddr: COMPUTE_PKG_ADDR, modName: 'provider_vault', fnName: 'deposit_provider_bond' },
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

const ZERO = BigInt(0);

export default function ProviderBondHelper() {
  const providerRef = useRef<SupraProvider | null>(null);
  const preparedRef = useRef<Record<number, { data: unknown; amount: bigint } | null>>({});
  const defaultApplied = useRef(false);

  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null); // set ONLY after chain check passes
  const [connAddr, setConnAddr] = useState<string | null>(null);
  const [chainMsg, setChainMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [global, setGlobal] = useState<GlobalStatus | null>(null);
  const [wallet, setWallet] = useState<WalletStatus | null>(null);
  const [statusErr, setStatusErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [amountInput, setAmountInput] = useState('');
  const [steps, setSteps] = useState<Record<number, StepState>>({ 1: emptyStep(), 2: emptyStep() });
  const [log, setLog] = useState<{ text: string; tone: 'ok' | 'bad' | 'warn' | 'info' } | null>(
    null,
  );

  const patchStep = useCallback((n: number, patch: Partial<StepState>) => {
    setSteps((s) => ({ ...s, [n]: { ...s[n], ...patch } }));
  }, []);

  const refreshStatus = useCallback(
    async (addr?: string | null): Promise<{ g: GlobalStatus; w: WalletStatus | null } | null> => {
      setRefreshing(true);
      try {
        const a = addr === undefined ? account : addr;
        const [g, w] = await Promise.all([
          fetchGlobalStatus(),
          a ? fetchWalletStatus(a) : Promise.resolve(null),
        ]);
        setGlobal(g);
        setWallet(w);
        setStatusErr(null);
        // Prefill the amount input once with the live minimum bond.
        if (!defaultApplied.current && g.minBond > ZERO) {
          defaultApplied.current = true;
          setAmountInput((prev) => (prev === '' ? fmtRaw(g.minBond) : prev));
        }
        return { g, w };
      } catch (e) {
        setStatusErr(`Status error: ${(e as Error).message}`);
        return null;
      } finally {
        setRefreshing(false);
      }
    },
    [account],
  );

  // Read-only global status also without a wallet.
  useEffect(() => {
    void refreshStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Any amount change invalidates previously prepared payloads.
  useEffect(() => {
    preparedRef.current = {};
    setSteps((s) => ({
      1: { ...s[1], payloadText: null, signReady: false },
      2: { ...s[2], payloadText: null, signReady: false },
    }));
  }, [amountInput]);

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
    setAccount(null);
    try {
      const accounts = await p.connect();
      const addr = Array.isArray(accounts) ? String(accounts[0]) : String(accounts);
      setConnAddr(addr);

      // Enforce Supra Mainnet (chain 8) — same proven flow as the M2 helper.
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
          text: `Chain ${cid ?? '?'} — please switch StarKey to Supra Mainnet (8)`,
        });
        return;
      }
      setChainMsg({ ok: true, text: 'Supra Mainnet (8) OK' });

      setAccount(addr);
      setLog({ text: 'Connected. Loading on-chain status …', tone: 'info' });
      await refreshStatus(addr);

      p.on?.('accountChanged', () => {
        setAccount(null);
        setConnAddr(null);
        setChainMsg(null);
        setWallet(null);
        preparedRef.current = {};
        setSteps({ 1: emptyStep(), 2: emptyStep() });
        setLog({ text: 'Account changed — please reconnect.', tone: 'warn' });
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== 4001) {
        setLog({ text: `Connect error: ${(e as Error).message ?? e}`, tone: 'bad' });
      }
    } finally {
      setConnecting(false);
    }
  }, [refreshStatus]);

  // ---- Derived amounts + validation ------------------------------------------------
  const target = parseAmount(amountInput); // deposit amount in base units, or null
  const wcosmoBal = wallet?.wcosmoBal ?? ZERO;
  const wrapNeeded = target !== null ? (target > wcosmoBal ? target - wcosmoBal : ZERO) : null;

  const validation: string[] = [];
  if (amountInput !== '' && target === null) {
    validation.push('Invalid amount (max 6 decimal places).');
  }
  if (target !== null && global) {
    if (target <= ZERO) validation.push('Amount must be greater than zero.');
    const resulting = (wallet?.bondAmount ?? ZERO) + target;
    if (resulting < global.minBond) {
      validation.push(
        `Resulting bond ${fmtAmt(resulting)} would be below the minimum of ${fmtAmt(global.minBond)} wCOSMO.`,
      );
    }
    if (global.maxPerProvider > ZERO && resulting > global.maxPerProvider) {
      validation.push(
        `Resulting bond ${fmtAmt(resulting)} would exceed the per-provider cap of ${fmtAmt(global.maxPerProvider)} wCOSMO.`,
      );
    }
    if (global.globalCap > ZERO && target > global.globalCap - global.totalBonded) {
      validation.push(
        `Amount exceeds the global headroom of ${fmtAmt(global.globalCap - global.totalBonded)} wCOSMO (cap ${fmtAmt(global.globalCap)}, bonded ${fmtAmt(global.totalBonded)}).`,
      );
    }
    if (wallet && wrapNeeded !== null && wrapNeeded > ZERO && wallet.cosmoBal < wrapNeeded) {
      validation.push(
        `Not enough $COSMO to wrap: need ${fmtAmt(wrapNeeded)}, wallet holds ${fmtAmt(wallet.cosmoBal)}.`,
      );
    }
  }
  const misconfigured = global !== null && !global.paymentFaOk;
  if (misconfigured) {
    validation.push(
      'On-chain payment asset does not match wCOSMO — refusing to prepare transactions. Please report this.',
    );
  }

  const amountsValid = target !== null && target > ZERO && validation.length === 0;
  const connected = !!account;
  const anyBusy = steps[1].busy || steps[2].busy;
  const step1Skipped = amountsValid && wrapNeeded === ZERO;
  const eligible = wallet?.eligible === true;

  const prepEnabled = (n: 1 | 2) => {
    if (!connected || !amountsValid || anyBusy || global === null || wallet === null) return false;
    if (n === 1) return wrapNeeded !== null && wrapNeeded > ZERO;
    return wcosmoBal >= (target ?? ZERO); // deposit only once enough wCOSMO is held
  };
  const signEnabled = (n: 1 | 2) => connected && steps[n].signReady && !steps[n].busy;

  // ---- Prepare / sign (exact payload shape from the proven M2 helper) ---------------
  const prepare = useCallback(
    async (step: StepDef) => {
      const p = providerRef.current;
      if (!p || !account || target === null) return;
      const amount = step.n === 1 ? (wrapNeeded ?? ZERO) : target;
      if (amount <= ZERO) return;
      patchStep(step.n, { busy: true });
      try {
        const seq = await fetchSeqNum(account);
        const expiry = Math.ceil(Date.now() / 1000) + 300;
        const rawTxPayload = [
          account,
          seq,
          step.moduleAddr,
          step.modName,
          step.fnName,
          [], // no type args
          [bcsU64(amount)], // exactly one u64
          { txExpiryTime: expiry },
        ];
        const data = await p.createRawTransactionData(rawTxPayload);
        preparedRef.current[step.n] = { data, amount };
        const text = [
          `Sender          : ${account}`,
          `Function-ID     : ${step.moduleAddr}::${step.modName}::${step.fnName}`,
          'Type-Args       : (none)',
          `Arg 1 (u64)     : ${amount.toString()}  (= ${fmtAmt(amount)} ${step.n === 1 ? '$COSMO → wCOSMO' : 'wCOSMO'})`,
          `Sequence-Number : ${seq}`,
          `Expiry (unix)   : ${expiry}`,
          'Chain           : 8 (Supra Mainnet)',
        ].join('\n');
        patchStep(step.n, { payloadText: text, signReady: true });
        setLog({ text: `Step ${step.n} payload ready. Review it, then sign.`, tone: 'info' });
      } catch (e) {
        setLog({ text: `Payload error: ${(e as Error).message ?? e}`, tone: 'bad' });
      } finally {
        patchStep(step.n, { busy: false });
      }
    },
    [account, target, wrapNeeded, patchStep],
  );

  const sign = useCallback(
    async (step: StepDef) => {
      const p = providerRef.current;
      const prepared = preparedRef.current[step.n];
      if (!p || !account || !prepared) return;
      patchStep(step.n, { busy: true, signReady: false });
      try {
        // Snapshot the value the poll below watches for.
        const before =
          step.n === 1 ? (wallet?.wcosmoBal ?? ZERO) : (wallet?.bondAmount ?? ZERO);
        setLog({ text: 'Waiting for signature in StarKey …', tone: 'info' });
        const txHash = await p.sendTransaction({
          data: prepared.data,
          from: account,
          to: step.moduleAddr,
          chainId: Number(CHAIN_ID),
          value: '',
        });
        preparedRef.current[step.n] = null;
        patchStep(step.n, { txHash, payloadText: null });
        setLog({ text: `TX sent (step ${step.n}). Waiting for on-chain confirmation …`, tone: 'info' });
        // Poll until the state change is visible (max ~60s), like the M2 helper.
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const st = await refreshStatus();
          if (!st?.w) continue;
          if (step.n === 1 && st.w.wcosmoBal > before) break;
          if (step.n === 2 && st.w.bondAmount > before) break;
        }
        setLog({ text: `Step ${step.n} confirmed on-chain (or still pending — check status).`, tone: 'ok' });
      } catch (e) {
        setLog({ text: `Sign/send error: ${(e as Error).message ?? e}`, tone: 'bad' });
        patchStep(step.n, { signReady: true });
      } finally {
        patchStep(step.n, { busy: false });
      }
    },
    [account, wallet, patchStep, refreshStatus],
  );

  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24">
          {/* header */}
          <header className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Compute provider onboarding · Mainnet (chain 8) · guarded v1
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Provider Bond — Self-Service
            </h1>
            <p className="mt-4 font-sans text-lg text-slate-300">
              Post your own provider bond in two transactions: wrap $COSMO to wCOSMO, then
              deposit the bond. The bond is slashable — that is what makes your on-chain track
              record credible. Signing happens exclusively in StarKey.
            </p>
          </header>

          {/* prerequisites */}
          <aside className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-mono text-xs uppercase tracking-wider text-slate-500">
              Prerequisites
            </h2>
            <ul className="mt-3 space-y-1.5 font-sans text-sm text-slate-300">
              <li>
                · StarKey wallet extension (
                <a
                  href="https://starkey.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300"
                >
                  starkey.app
                </a>
                ) on Supra Mainnet
              </li>
              <li>· SUPRA in the wallet for gas</li>
              <li>
                · $COSMO in the wallet — there is no public listing; see the{' '}
                <Link
                  href="/wcosmo/"
                  className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300"
                >
                  wCOSMO guide
                </Link>{' '}
                for how to obtain it (OTC / community)
              </li>
            </ul>
          </aside>

          {/* security block */}
          <aside className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
              <div>
                <p className="font-sans text-sm font-semibold leading-relaxed text-amber-200">
                  Security model of this page
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-slate-300">
                  This page never asks for a seed or private key and runs no server-side signers.
                  Function-IDs are fixed; the only free input is the amount. Every payload is
                  shown in full before you sign it in the StarKey popup.
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
                {connecting ? 'Connecting …' : 'Connect StarKey'}
              </button>
            ) : null}
            {notFound && (
              <p className="mt-3 font-mono text-xs text-amber-400">
                StarKey not found. Install the extension (starkey.app) and reload.
              </p>
            )}
          </div>

          {/* wallet checks */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatusCard
              icon={<Wallet className="h-4 w-4" />}
              label="Wallet"
              value={connAddr ? shortAddr(connAddr) : 'Not connected'}
              tone={connected ? 'ok' : connAddr ? 'bad' : 'idle'}
              mono={!!connAddr}
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
                Refresh
              </button>
            </div>

            {/* eligible badge */}
            {wallet && (
              <div
                className={cn(
                  'mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs',
                  eligible
                    ? 'border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/[0.08] text-amber-300',
                )}
              >
                {eligible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {eligible ? 'provider eligible' : 'not yet eligible'}
              </div>
            )}

            <dl className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-2">
              <StatusRow k="$COSMO balance" v={wallet ? `${fmtAmt(wallet.cosmoBal)} COSMO` : '— (connect)'} />
              <StatusRow k="wCOSMO balance" v={wallet ? `${fmtAmt(wallet.wcosmoBal)} wCOSMO` : '— (connect)'} />
              <StatusRow k="Your bond" v={wallet ? `${fmtAmt(wallet.bondAmount)} wCOSMO` : '— (connect)'} />
              <StatusRow
                k="Active jobs / slashes"
                v={wallet ? `${wallet.activeJobs.toString()} / ${wallet.slashCount.toString()}` : '— (connect)'}
              />
              <StatusRow k="Minimum bond" v={global ? `${fmtAmt(global.minBond)} wCOSMO` : '—'} />
              <StatusRow
                k="Cap per provider"
                v={global ? (global.maxPerProvider > ZERO ? `${fmtAmt(global.maxPerProvider)} wCOSMO` : 'uncapped') : '—'}
              />
              <StatusRow
                k="Global cap / bonded"
                v={
                  global
                    ? `${global.globalCap > ZERO ? fmtAmt(global.globalCap) : '∞'} / ${fmtAmt(global.totalBonded)} wCOSMO`
                    : '—'
                }
              />
              <StatusRow
                k="Onboarding paused"
                v={global ? (global.paused ? 'yes' : 'no') : '—'}
                tone={global ? (global.paused ? 'warn' : 'ok') : undefined}
              />
            </dl>
            {global?.paused && (
              <p className="mt-3 font-sans text-xs leading-relaxed text-amber-300/90">
                Onboarding is currently paused: you can still deposit a bond, but buyers cannot
                assign jobs to new providers until it is unpaused.
              </p>
            )}
            {misconfigured && (
              <p className="mt-3 font-mono text-xs text-rose-400">
                WARNING: on-chain payment asset ≠ wCOSMO. All transaction buttons are disabled.
              </p>
            )}
            {statusErr && <p className="mt-3 font-mono text-xs text-rose-400">{statusErr}</p>}
          </section>

          {/* eligible / next steps */}
          {eligible && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-wider text-emerald-300">
                    Provider eligible
                  </p>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-slate-200">
                    Your bond meets the minimum. Next step: reach out with the provider pilot
                    template on{' '}
                    <Link href="/compute/" className="text-sky-400 underline decoration-sky-400/40 hover:text-sky-300">
                      /compute
                    </Link>{' '}
                    — quotes flow through the signed quote path operated by the COSMO team
                    (guarded v1), so your first job is set up together. You can top up your bond
                    below at any time within the caps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* amount input */}
          <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="font-sans text-sm font-semibold text-slate-200">Bond amount</h2>
            <p className="mt-1 font-sans text-xs text-slate-500">
              Amount of wCOSMO to deposit as provider bond (default: live minimum bond).
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="100"
                className="w-40 rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-sm text-slate-100 outline-none transition-colors focus:border-purple-400/60"
              />
              <span className="font-mono text-xs text-slate-400">wCOSMO</span>
            </div>
            {target !== null && wrapNeeded !== null && wallet && (
              <p className="mt-2 font-mono text-[11px] text-slate-500">
                {wrapNeeded > ZERO
                  ? `Wallet holds ${fmtAmt(wcosmoBal)} wCOSMO → step 1 wraps the missing ${fmtAmt(wrapNeeded)}.`
                  : `Wallet already holds ${fmtAmt(wcosmoBal)} wCOSMO — step 1 is skipped.`}
              </p>
            )}
            {validation.length > 0 && (
              <ul className="mt-3 space-y-1">
                {validation.map((v) => (
                  <li key={v} className="font-mono text-xs text-rose-400">
                    · {v}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* tx steps */}
          {STEPS.map((step) => {
            const skipped = step.n === 1 && step1Skipped;
            const stepAmount = step.n === 1 ? wrapNeeded : target;
            return (
              <section
                key={step.n}
                className={cn(
                  'mt-6 rounded-xl border p-5',
                  skipped || (step.n === 2 && eligible)
                    ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                    : 'border-white/10 bg-white/[0.02]',
                )}
              >
                <h2 className="font-sans text-sm font-semibold text-slate-200">
                  {step.n === 1
                    ? 'Step 1 · wrap — $COSMO → wCOSMO (skipped if you hold enough wCOSMO)'
                    : 'Step 2 · deposit the provider bond'}
                </h2>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {step.modName}::{step.fnName}
                  {connected && amountsValid && stepAmount !== null && stepAmount > ZERO
                    ? `(u64:${stepAmount.toString()})`
                    : '(u64:<amount>)'}
                </p>
                {step.n === 1 && skipped && (
                  <p className="mt-2 font-mono text-xs text-emerald-300">
                    Skipped — wallet already holds enough wCOSMO for the chosen amount.
                  </p>
                )}
                {step.n === 2 && (
                  <p className="mt-1 font-sans text-xs text-slate-500">
                    Enabled once the wallet holds at least the chosen amount in wCOSMO.
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
                    Show payload
                  </button>
                  <button
                    type="button"
                    onClick={() => void sign(step)}
                    disabled={!signEnabled(step.n)}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-600/20 px-4 py-2 font-mono text-xs text-amber-100 transition-all hover:border-amber-400 hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sign in StarKey
                  </button>
                </div>
                {steps[step.n].payloadText && (
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-slate-600 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                    {steps[step.n].payloadText}
                  </pre>
                )}
                {steps[step.n].txHash && (
                  <p className="mt-3 break-all font-mono text-xs text-slate-400">
                    TX hash:{' '}
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
            );
          })}

          {/* honesty box */}
          <section className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-amber-300" />
              <h3 className="font-mono text-sm text-slate-100">Guarded v1 — what a bond does and does not do</h3>
            </div>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-slate-400">
              <li>
                · Posting a bond makes you <span className="text-slate-200">eligible</span>; it does
                not assign you jobs. Jobs start when a buyer accepts a quote for you.
              </li>
              <li>
                · Quotes flow through a signed quote path operated by the COSMO team — providers do
                not price autonomously in v1.
              </li>
              <li>· One active job per provider (guarded v1 cap).</li>
              <li>
                · The bond is slashable: on a no-delivery, 10% of the required bond is paid to the
                buyer (fixed at accept time).
              </li>
              <li>
                · Withdrawing the bond (`withdraw_provider_bond`) requires the cooldown to have
                passed and no active job; the remainder must be zero or above the minimum. This
                page does not offer withdraw in v1.
              </li>
              <li>· All parameters (min bond, caps) can change through governance.</li>
            </ul>
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
            No secrets, no server signers, no admin/multisig functions. Read-only status via {RPC}.
            Built on Supra.{' '}
            <Link href="/compute/" className="text-slate-500 underline hover:text-slate-300">
              /compute
            </Link>{' '}
            ·{' '}
            <Link href="/wcosmo/" className="text-slate-500 underline hover:text-slate-300">
              /wcosmo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Format a base-unit bigint as a plain editable string (no locale separators).
function fmtRaw(q: bigint): string {
  const whole = q / BigInt(1000000);
  const frac = q % BigInt(1000000);
  if (frac === BigInt(0)) return whole.toString();
  return `${whole.toString()}.${frac.toString().padStart(6, '0').replace(/0+$/, '')}`;
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
