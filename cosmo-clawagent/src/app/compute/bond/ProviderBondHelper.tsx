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
//
// Terminology glossary (translation-proof user-facing copy; applies to
// /compute, /wcosmo and /vault as well): bond → "security deposit",
// slash → "penalty deduction", custody balance → "held in the vault".
// Function-IDs, payload lines and code identifiers stay unchanged.

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
    // On-chain, the minimum applies to each SINGLE deposit (provider_vault
    // E_BELOW_MIN_BOND checks the tx amount), while both caps apply to the
    // resulting totals — mirror exactly that here.
    if (target > ZERO && target < global.minBond) {
      validation.push(
        `Each deposit must be at least the required minimum of ${fmtAmt(global.minBond)} wCOSMO — this is checked per transaction, not on the total.`,
      );
    }
    const resulting = (wallet?.bondAmount ?? ZERO) + target;
    if (global.maxPerProvider > ZERO && resulting > global.maxPerProvider) {
      validation.push(
        `Your total security deposit would be ${fmtAmt(resulting)} wCOSMO — above the per-provider limit of ${fmtAmt(global.maxPerProvider)} wCOSMO.`,
      );
    }
    if (global.globalCap > ZERO && target > global.globalCap - global.totalBonded) {
      validation.push(
        `Amount exceeds the remaining global capacity of ${fmtAmt(global.globalCap - global.totalBonded)} wCOSMO (limit ${fmtAmt(global.globalCap)}, already deposited ${fmtAmt(global.totalBonded)}).`,
      );
    }
    if (wallet && wrapNeeded !== null && wrapNeeded > ZERO && wallet.cosmoBal < wrapNeeded) {
      validation.push(
        `Not enough $COSMO to convert: ${fmtAmt(wrapNeeded)} needed, wallet holds ${fmtAmt(wallet.cosmoBal)}.`,
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
              <span className="inline-flex h-2 w-2 rounded-full bg-phase-active shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Compute provider onboarding · Mainnet (chain 8) · guarded v1
              </span>
            </div>
            <h1 className="font-mono text-3xl font-bold tracking-tight text-ink-0 md:text-5xl">
              Compute Provider Security Deposit
            </h1>
            <p className="mt-4 font-sans text-lg text-ink-1">
              To take compute jobs you place a refundable security deposit in wCOSMO. If a job
              is not delivered, a penalty deduction of 10% of the required deposit goes to the
              buyer. Setting it up takes two separate transactions: first convert $COSMO into
              wCOSMO, then deposit the wCOSMO as your security. Signing happens exclusively in
              StarKey.
            </p>
          </header>

          {/* prerequisites */}
          <aside className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2">
              Prerequisites
            </h2>
            <ul className="mt-3 space-y-1.5 font-sans text-sm text-ink-1">
              <li>
                · StarKey wallet extension (
                <a
                  href="https://starkey.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
                >
                  starkey.app
                </a>
                ) on Supra Mainnet
              </li>
              <li>· SUPRA in the wallet for gas</li>
              <li>
                · $COSMO or wCOSMO in the wallet — a small capped{' '}
                <Link
                  href="/buy/"
                  className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
                >
                  direct sale
                </Link>{' '}
                is live (pilot); for larger amounts see the{' '}
                <Link
                  href="/wcosmo/"
                  className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
                >
                  wCOSMO guide
                </Link>{' '}
                (OTC / community)
              </li>
            </ul>
          </aside>

          {/* security block */}
          <aside className="mt-4 rounded-xl border border-phase-warn/40 bg-phase-warn/[0.08] p-5">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-phase-warn" />
              <div>
                <p className="font-sans text-sm font-semibold leading-relaxed text-phase-warn">
                  Security model of this page
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink-1">
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
                className="inline-flex items-center gap-2 rounded-lg border border-phase-active/50 bg-phase-active/20 px-5 py-3 font-mono text-sm text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                {connecting ? 'Connecting …' : 'Connect StarKey'}
              </button>
            ) : null}
            {notFound && (
              <p className="mt-3 font-mono text-xs text-phase-warn">
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

          {/* main display: your security deposit at a glance */}
          <DepositSummary
            global={global}
            wallet={wallet}
            connected={connected}
            refreshing={refreshing}
            onRefresh={() => void refreshStatus()}
          />

          {/* all remaining on-chain parameters, collapsed by default */}
          <section className="mt-4 rounded-xl border border-line-base bg-surface-1 p-5">
            <details>
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-ink-2 hover:text-ink-1">
                All on-chain parameters (read-only)
              </summary>
              <dl className="mt-4 grid gap-3 font-mono text-sm sm:grid-cols-2">
                <StatusRow k="$COSMO balance" v={wallet ? `${fmtAmt(wallet.cosmoBal)} COSMO` : '— (connect)'} />
                <StatusRow
                  k="Active jobs / penalty deductions"
                  v={wallet ? `${wallet.activeJobs.toString()} / ${wallet.slashCount.toString()}` : '— (connect)'}
                />
                <StatusRow
                  k="Per-provider limit"
                  v={global ? (global.maxPerProvider > ZERO ? `${fmtAmt(global.maxPerProvider)} wCOSMO` : 'uncapped') : '—'}
                />
                <StatusRow
                  k="Global limit / total deposited"
                  v={
                    global
                      ? `${global.globalCap > ZERO ? fmtAmt(global.globalCap) : '∞'} / ${fmtAmt(global.totalBonded)} wCOSMO`
                      : '—'
                  }
                />
                <StatusRow
                  k="Withdrawal locked until"
                  v={
                    wallet
                      ? wallet.lockedUntil > ZERO && Number(wallet.lockedUntil) * 1000 > Date.now()
                        ? new Date(Number(wallet.lockedUntil) * 1000).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
                        : 'no lock'
                      : '— (connect)'
                  }
                />
                <StatusRow
                  k="Onboarding paused"
                  v={global ? (global.paused ? 'yes' : 'no') : '—'}
                  tone={global ? (global.paused ? 'warn' : 'ok') : undefined}
                />
              </dl>
            </details>
            {global?.paused && (
              <p className="mt-3 font-sans text-xs leading-relaxed text-phase-warn/90">
                Onboarding is currently paused: you can still place a security deposit, but
                buyers cannot assign jobs to new providers until it is unpaused.
              </p>
            )}
            {misconfigured && (
              <p className="mt-3 font-mono text-xs text-phase-fault">
                WARNING: on-chain payment asset ≠ wCOSMO. All transaction buttons are disabled.
              </p>
            )}
            {statusErr && <p className="mt-3 font-mono text-xs text-phase-fault">{statusErr}</p>}
          </section>

          {/* eligible / next steps */}
          {eligible && (
            <div className="mt-6 rounded-xl border border-phase-settled/30 bg-phase-settled/[0.06] p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-phase-settled" />
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-wider text-phase-settled">
                    Eligible for compute jobs
                  </p>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-ink-0">
                    Your security deposit meets the required minimum. Next step: reach out with
                    the provider pilot template on{' '}
                    <Link href="/compute/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
                      /compute
                    </Link>{' '}
                    — quotes flow through the signed quote path operated by the COSMO team
                    (guarded v1), so your first job is set up together. You can add to your
                    deposit below at any time within the limits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* amount input */}
          <section className="mt-6 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-sans text-sm font-semibold text-ink-0">Deposit amount</h2>
            <p className="mt-1 font-sans text-xs text-ink-2">
              Amount of wCOSMO to deposit as your provider security (default: the live required
              minimum).
            </p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="100"
                className="w-40 rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-sm text-ink-0 outline-none transition-colors focus:border-phase-active/60"
              />
              <span className="font-mono text-xs text-ink-1">wCOSMO</span>
            </div>
            {target !== null && wrapNeeded !== null && wallet && (
              <p className="mt-2 font-mono text-[11px] text-ink-2">
                {wrapNeeded > ZERO
                  ? `Wallet holds ${fmtAmt(wcosmoBal)} wCOSMO → step 1 converts the missing ${fmtAmt(wrapNeeded)} $COSMO.`
                  : `Wallet already holds ${fmtAmt(wcosmoBal)} wCOSMO — the conversion step is skipped.`}
              </p>
            )}
            {validation.length > 0 && (
              <ul className="mt-3 space-y-1">
                {validation.map((v) => (
                  <li key={v} className="font-mono text-xs text-phase-fault">
                    · {v}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* combined pre-signing plan: what will happen, before → after */}
          {connected && amountsValid && wallet && global && target !== null && wrapNeeded !== null && (
            <TransactionPlan target={target} wrapNeeded={wrapNeeded} wallet={wallet} />
          )}

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
                    ? 'border-phase-settled/30 bg-phase-settled/[0.04]'
                    : 'border-line-base bg-surface-1',
                )}
              >
                <h2 className="font-sans text-sm font-semibold text-ink-0">
                  {step.n === 1
                    ? 'Step 1 of 2 — Convert $COSMO into wCOSMO (separate transaction)'
                    : 'Step 2 of 2 — Deposit wCOSMO as your security (separate transaction)'}
                </h2>
                <p className="mt-1 font-sans text-xs text-ink-1">
                  {step.n === 1
                    ? 'Converts $COSMO into the same amount of wCOSMO in your wallet. Nothing is deposited yet.'
                    : 'Moves the wCOSMO from your wallet into the provider vault as your security deposit.'}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-1">
                  {step.modName}::{step.fnName}
                  {connected && amountsValid && stepAmount !== null && stepAmount > ZERO
                    ? `(u64:${stepAmount.toString()})`
                    : '(u64:<amount>)'}
                </p>
                {step.n === 1 && skipped && (
                  <p className="mt-2 font-mono text-xs text-phase-settled">
                    Skipped — wallet already holds enough wCOSMO for the chosen amount.
                  </p>
                )}
                {step.n === 2 && (
                  <p className="mt-1 font-sans text-xs text-ink-2">
                    Enabled once the wallet holds at least the chosen amount in wCOSMO.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void prepare(step)}
                    disabled={!prepEnabled(step.n)}
                    className="inline-flex items-center gap-2 rounded-lg border border-phase-proof/50 bg-phase-proof/20 px-4 py-2 font-mono text-xs text-phase-proof transition-all hover:border-phase-proof hover:bg-phase-proof/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {steps[step.n].busy && !steps[step.n].signReady ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Prepare transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => void sign(step)}
                    disabled={!signEnabled(step.n)}
                    className="inline-flex items-center gap-2 rounded-lg border border-phase-warn/50 bg-phase-warn/20 px-4 py-2 font-mono text-xs text-phase-warn transition-all hover:border-phase-warn hover:bg-phase-warn/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sign in StarKey
                  </button>
                </div>
                {steps[step.n].payloadText && (
                  <details open className="mt-4">
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-ink-2 hover:text-ink-1">
                      Raw transaction payload (exactly what you will sign)
                    </summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-line-strong bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
                      {steps[step.n].payloadText}
                    </pre>
                  </details>
                )}
                {steps[step.n].txHash && (
                  <p className="mt-3 break-all font-mono text-xs text-ink-1">
                    TX hash:{' '}
                    <a
                      href={`${EXPLORER_TX}${steps[step.n].txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
                    >
                      {steps[step.n].txHash}
                    </a>
                  </p>
                )}
              </section>
            );
          })}

          {/* honesty box */}
          <section className="mt-8 rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-phase-warn" />
              <h3 className="font-mono text-sm text-ink-0">
                Guarded v1 — what the security deposit does and does not do
              </h3>
            </div>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>
                · Placing a security deposit makes you{' '}
                <span className="text-ink-0">eligible</span>; it does not assign you jobs.
                Jobs start when a buyer accepts a quote for you.
              </li>
              <li>
                · Quotes flow through a signed quote path operated by the COSMO team — providers do
                not price autonomously in v1.
              </li>
              <li>· One active job per provider (guarded v1 limit).</li>
              <li>
                · On a no-delivery, a penalty deduction of 10% of the required deposit is paid to
                the buyer (fixed at accept time).
              </li>
              <li>
                · Withdrawing the deposit (`withdraw_provider_bond`) requires the cooldown to have
                passed and no active job; full exit is always allowed. This page does not offer
                withdraw in v1.
              </li>
              <li>· All parameters (required minimum, limits) can change through governance.</li>
            </ul>
          </section>

          {/* log line */}
          {log && (
            <p
              className={cn(
                'mt-6 font-mono text-xs',
                log.tone === 'ok' && 'text-phase-settled',
                log.tone === 'bad' && 'text-phase-fault',
                log.tone === 'warn' && 'text-phase-warn',
                log.tone === 'info' && 'text-ink-1',
              )}
            >
              {log.text}
            </p>
          )}

          {/* footer note */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-ink-2">
            No secrets, no server signers, no admin/multisig functions. Read-only status via {RPC}.
            Built on Supra.{' '}
            <Link href="/compute/" className="text-ink-2 underline hover:text-ink-1">
              /compute
            </Link>{' '}
            ·{' '}
            <Link href="/wcosmo/" className="text-ink-2 underline hover:text-ink-1">
              /wcosmo
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main display: the five questions a provider actually has — required minimum,
// deposited, still missing, wallet balance, eligibility. Global rows render
// read-only even without a wallet.
function DepositSummary({
  global,
  wallet,
  connected,
  refreshing,
  onRefresh,
}: {
  global: GlobalStatus | null;
  wallet: WalletStatus | null;
  connected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const deposited = wallet?.bondAmount ?? null;
  const missing =
    global && wallet
      ? global.minBond > wallet.bondAmount
        ? global.minBond - wallet.bondAmount
        : ZERO
      : null;
  const eligible = wallet?.eligible === true;

  return (
    <section className="mt-6 rounded-xl border border-phase-active/25 bg-phase-active/[0.04] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-wider text-phase-active">
          Your security deposit
        </h2>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-1.5 font-mono text-[11px] text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3 w-3', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>
      <dl className="mt-4 space-y-2 font-mono text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[12px] text-ink-2">Required minimum</dt>
          <dd className="text-ink-0">{global ? `${fmtAmt(global.minBond)} wCOSMO` : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[12px] text-ink-2">Deposited by you</dt>
          <dd className="text-ink-0">
            {deposited !== null ? `${fmtAmt(deposited)} wCOSMO` : '— connect wallet'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[12px] text-ink-2">Still missing</dt>
          <dd className={missing === ZERO ? 'text-phase-settled' : 'text-ink-0'}>
            {missing !== null ? `${fmtAmt(missing)} wCOSMO` : '— connect wallet'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-[12px] text-ink-2">wCOSMO in your wallet</dt>
          <dd className="text-ink-0">
            {wallet ? `${fmtAmt(wallet.wcosmoBal)} wCOSMO` : '— connect wallet'}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        {!connected ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-line-base bg-surface-inset px-3 py-1.5 font-mono text-xs text-ink-1">
            <Plug className="h-3.5 w-3.5" />
            Connect your wallet to see your deposit status
          </span>
        ) : eligible ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-phase-settled/40 bg-phase-settled/[0.08] px-3 py-1.5 font-mono text-xs text-phase-settled">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Eligible for compute jobs
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-phase-warn/40 bg-phase-warn/[0.08] px-3 py-1.5 font-mono text-xs text-phase-warn">
            <Lock className="h-3.5 w-3.5" />
            Not yet eligible — deposit below the required minimum
          </span>
        )}
      </div>
      {global && deposited !== null && deposited > ZERO && missing !== null && missing > ZERO && (
        <p className="mt-3 font-sans text-xs leading-relaxed text-phase-warn/90">
          Each single deposit must itself be at least the required minimum — the smallest valid
          top-up is {fmtAmt(global.minBond)} wCOSMO. Your existing deposit stays withdrawable in
          full.
        </p>
      )}
    </section>
  );
}

// One combined pre-signing panel: plain-English steps + before/after projection.
// Makes explicit that wrap and deposit are SEPARATE transactions.
function TransactionPlan({
  target,
  wrapNeeded,
  wallet,
}: {
  target: bigint;
  wrapNeeded: bigint;
  wallet: WalletStatus;
}) {
  const twoTx = wrapNeeded > ZERO;
  const rows: { label: string; before: bigint; after: bigint }[] = [
    { label: '$COSMO in wallet', before: wallet.cosmoBal, after: wallet.cosmoBal - wrapNeeded },
    {
      label: 'wCOSMO in wallet',
      before: wallet.wcosmoBal,
      after: wallet.wcosmoBal + wrapNeeded - target,
    },
    { label: 'Your security deposit', before: wallet.bondAmount, after: wallet.bondAmount + target },
  ];
  return (
    <section className="mt-6 rounded-xl border border-phase-proof/25 bg-phase-proof/[0.04] p-5">
      <h2 className="font-sans text-sm font-semibold text-ink-0">
        What will happen — {twoTx ? 'two separate transactions' : 'one transaction'}
      </h2>
      <ol className="mt-3 space-y-1.5 font-sans text-sm leading-relaxed">
        <li className={twoTx ? 'text-ink-1' : 'text-ink-2'}>
          1.{' '}
          {twoTx
            ? `Convert ${fmtAmt(wrapNeeded)} $COSMO into ${fmtAmt(wrapNeeded)} wCOSMO (transaction 1).`
            : 'Convert — skipped, your wallet already holds enough wCOSMO.'}
        </li>
        <li className="text-ink-1">
          2. Deposit {fmtAmt(target)} wCOSMO as your provider security deposit (transaction{' '}
          {twoTx ? 2 : 1}).
        </li>
      </ol>
      <p className="mt-2 font-sans text-xs text-ink-2">
        StarKey asks you to sign each transaction individually — nothing is sent until you
        confirm.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-ink-2">
              <th className="pb-2 pr-4 font-normal">&nbsp;</th>
              <th className="pb-2 pr-4 font-normal">Before</th>
              <th className="pb-2 font-normal">After</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line-subtle">
                <td className="py-1.5 pr-4 text-ink-2">{r.label}</td>
                <td className="py-1.5 pr-4 text-ink-1">{fmtAmt(r.before)}</td>
                <td className="py-1.5 text-ink-0">{fmtAmt(r.after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-sans text-[11px] text-ink-2">
        Projection assumes both transactions confirm; SUPRA gas not included.
      </p>
    </section>
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
    tone === 'ok' ? 'text-phase-settled' : tone === 'bad' ? 'text-phase-fault' : 'text-ink-1';
  return (
    <div className="rounded-xl border border-line-base bg-surface-1 p-4">
      <div className="flex items-center gap-2 text-ink-2">
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
      ? 'text-phase-settled'
      : tone === 'bad'
        ? 'text-phase-fault'
        : tone === 'warn'
          ? 'text-phase-warn'
          : 'text-ink-0';
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-lg border border-line-subtle bg-surface-inset px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-ink-2">{k}</span>
      <span className={cn('text-right text-xs', toneCls)}>{v}</span>
    </div>
  );
}
