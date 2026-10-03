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
// Vocabulary: src/components/cosmo/terms.ts (bond → "safety deposit", slash →
// "deposit penalty"). Function-IDs, payload lines and code identifiers stay
// unchanged and live inside <TechDetails>.

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
import {
  describeDepositOutcome,
  depositOutcomeLines,
  depositReceiptLines,
  type DepositReceipt,
} from './lib/depositOutcome';
import { explainAbort, explainSignError, fetchTxStatus, type TxStage } from '@/lib/txStatus';
import FlowStrip from '@/components/cosmo/FlowStrip';
import MaturityBadge from '@/components/cosmo/MaturityBadge';
import TechDetails from '@/components/cosmo/TechDetails';
import TokenPosition, { type PositionPart } from '@/components/cosmo/TokenPosition';
import TxStatus from '@/components/cosmo/TxStatus';
import { PROVIDER_FLOW } from '@/components/cosmo/flows';

// ---- On-chain status snapshot ----------------------------------------------------
type GlobalStatus = {
  minBond: bigint;
  maxPerProvider: bigint; // 0 = uncapped
  globalCap: bigint; // 0 = uncapped
  totalBonded: bigint;
  paused: boolean;
  paymentFaOk: boolean;
  cooldownSecs: bigint; // bond_cooldown_secs(): lock length after a deposit penalty
  penaltyBps: bigint; // slash_comp_bps(): share of the required deposit paid to the buyer
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
  const [minBond, maxPer, globalCap, totalBonded, paused, paymentFa, cooldown, penalty] = await Promise.all([
    rpcView(`${PV}::get_min_provider_bond`, [], []),
    rpcView(`${PV}::get_max_bond_per_provider`, [], []),
    rpcView(`${PV}::get_global_bond_cap`, [], []),
    rpcView(`${PV}::get_total_bonded`, [], []),
    rpcView(`${PV}::is_onboarding_paused`, [], []),
    rpcView(`${PV}::payment_fa_addr`, [], []),
    rpcView(`${PV}::bond_cooldown_secs`, [], []),
    rpcView(`${PV}::slash_comp_bps`, [], []),
  ]);
  return {
    minBond: BigInt(String(minBond ?? 0)),
    maxPerProvider: BigInt(String(maxPer ?? 0)),
    globalCap: BigInt(String(globalCap ?? 0)),
    totalBonded: BigInt(String(totalBonded ?? 0)),
    paused: paused === true,
    paymentFaOk: sameAddr(String(paymentFa ?? ''), WCOSMO_META),
    cooldownSecs: BigInt(String(cooldown ?? 0)),
    penaltyBps: BigInt(String(penalty ?? 0)),
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
  payloadAmount: bigint | null; // the exact u64 in the prepared payload (drives the outcome box)
  txHash: string | null;
  busy: boolean;
  signReady: boolean;
  // what happened to the signed transaction, read from the chain
  txStage: TxStage;
  txMessage: string | null;
};
const emptyStep = (): StepState => ({
  payloadText: null,
  payloadAmount: null,
  txHash: null,
  busy: false,
  signReady: false,
  txStage: 'idle',
  txMessage: null,
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
  // Receipt for the last deposit (step 2), built from LIVE reads after the tx.
  const [receipt, setReceipt] = useState<DepositReceipt | null>(null);

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
        setStatusErr(`The values could not be read right now (${(e as Error).message}). Try Refresh.`);
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
      1: { ...s[1], payloadText: null, payloadAmount: null, signReady: false },
      2: { ...s[2], payloadText: null, payloadAmount: null, signReady: false },
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
          text: `Wrong network (${cid ?? '?'}). Switch StarKey to Supra Mainnet.`,
        });
        return;
      }
      setChainMsg({ ok: true, text: 'Supra Mainnet' });

      setAccount(addr);
      setLog({ text: 'Connected. Loading your deposit …', tone: 'info' });
      await refreshStatus(addr);

      p.on?.('accountChanged', () => {
        setAccount(null);
        setConnAddr(null);
        setChainMsg(null);
        setWallet(null);
        preparedRef.current = {};
        setSteps({ 1: emptyStep(), 2: emptyStep() });
        setLog({ text: 'The wallet account changed. Please connect again.', tone: 'warn' });
      });
    } catch (e) {
      if ((e as { code?: number })?.code !== 4001) {
        setLog({ text: `Could not connect: ${(e as Error).message ?? e}`, tone: 'bad' });
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
    validation.push('Enter a number with at most 6 digits after the point.');
  }
  if (target !== null && global) {
    if (target <= ZERO) validation.push('The amount must be more than zero.');
    // On-chain, the minimum applies to each SINGLE deposit (provider_vault
    // E_BELOW_MIN_BOND checks the tx amount), while both caps apply to the
    // resulting totals — mirror exactly that here.
    if (target > ZERO && target < global.minBond) {
      validation.push(
        `Each deposit must be at least the minimum of ${fmtAmt(global.minBond)} wCOSMO. The contract checks every single deposit, not your total.`,
      );
    }
    const resulting = (wallet?.bondAmount ?? ZERO) + target;
    if (global.maxPerProvider > ZERO && resulting > global.maxPerProvider) {
      validation.push(
        `Your deposit would be ${fmtAmt(resulting)} wCOSMO in total. The most one provider may deposit is ${fmtAmt(global.maxPerProvider)} wCOSMO.`,
      );
    }
    if (global.globalCap > ZERO && target > global.globalCap - global.totalBonded) {
      validation.push(
        `Only ${fmtAmt(global.globalCap - global.totalBonded)} wCOSMO can still be deposited by all providers together (limit ${fmtAmt(global.globalCap)}, already deposited ${fmtAmt(global.totalBonded)}).`,
      );
    }
    if (wallet && wrapNeeded !== null && wrapNeeded > ZERO && wallet.cosmoBal < wrapNeeded) {
      validation.push(
        `Not enough $COSMO to convert: you need ${fmtAmt(wrapNeeded)}, your wallet holds ${fmtAmt(wallet.cosmoBal)}.`,
      );
    }
  }
  const misconfigured = global !== null && !global.paymentFaOk;
  if (misconfigured) {
    validation.push(
      'The deposit contract is not set to wCOSMO. This page will not prepare a transaction. Please tell us.',
    );
  }

  const amountsValid = target !== null && target > ZERO && validation.length === 0;
  const connected = !!account;
  const anyBusy = steps[1].busy || steps[2].busy;
  const step1Skipped = amountsValid && wrapNeeded === ZERO;
  const eligible = wallet?.eligible === true;
  const penaltyText = global ? `${Number(global.penaltyBps) / 100}%` : 'part';
  const lockDays = global ? `${Math.round(Number(global.cooldownSecs) / 86400)} days` : 'a set time';

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
        patchStep(step.n, { payloadText: text, payloadAmount: amount, signReady: true });
        setLog({ text: `Step ${step.n} is ready. Check what will be signed, then sign.`, tone: 'info' });
      } catch (e) {
        setLog({ text: `Could not prepare the transaction: ${(e as Error).message ?? e}`, tone: 'bad' });
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
      patchStep(step.n, { busy: true, signReady: false, txStage: 'signing', txMessage: null });
      let sent = false;
      try {
        // Snapshot the value the poll below watches for.
        const before =
          step.n === 1 ? (wallet?.wcosmoBal ?? ZERO) : (wallet?.bondAmount ?? ZERO);
        const walletBefore = wallet?.wcosmoBal ?? ZERO;
        setLog({ text: 'Waiting for your signature in the wallet …', tone: 'info' });
        const txHash = await p.sendTransaction({
          data: prepared.data,
          from: account,
          to: step.moduleAddr,
          chainId: Number(CHAIN_ID),
          value: '',
        });
        sent = true;
        preparedRef.current[step.n] = null;
        patchStep(step.n, { txHash, payloadText: null, payloadAmount: null, txStage: 'sent' });
        if (step.n === 2) setReceipt(null);
        setLog({ text: `Step ${step.n} sent. Waiting for confirmation …`, tone: 'info' });
        // Poll until the state change is visible (max ~60s), like the M2 helper.
        let seen: WalletStatus | null = null;
        let confirmed = false;
        let failure: string | null = null;
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          // The chain's own verdict first: a transaction that failed must say so
          // instead of waiting for a balance change that will never come.
          const verdict = await fetchTxStatus(txHash).catch(() => null);
          if (verdict?.status === 'Fail') {
            failure = explainAbort(verdict.vmStatus);
            break;
          }
          const st = await refreshStatus();
          if (!st?.w) continue;
          seen = st.w;
          if (step.n === 1 && st.w.wcosmoBal > before) {
            confirmed = true;
            break;
          }
          if (step.n === 2 && st.w.bondAmount > before) {
            confirmed = true;
            break;
          }
        }
        if (failure) {
          patchStep(step.n, { txStage: 'failed', txMessage: failure });
          setLog({ text: `Step ${step.n} failed. See the reason above.`, tone: 'bad' });
          return;
        }
        patchStep(step.n, confirmed
          ? { txStage: 'confirmed', txMessage: 'Confirmed on chain.' }
          : { txStage: 'unconfirmed', txMessage: 'Not confirmed yet. Nothing is assumed: refresh the status in a moment.' });
        if (step.n === 2) {
          setReceipt({
            payloadAmount: prepared.amount,
            bondBefore: before,
            bondAfter: seen?.bondAmount ?? before,
            walletBefore,
            walletAfter: seen?.wcosmoBal ?? walletBefore,
            lockedUntilSecs: seen?.lockedUntil ?? ZERO,
            activeJobs: seen?.activeJobs ?? ZERO,
            txHash,
            confirmed,
          });
        }
        setLog(
          confirmed
            ? { text: `Step ${step.n} confirmed.`, tone: 'ok' }
            : { text: `Step ${step.n} was sent but is not visible yet. Refresh the status in a moment.`, tone: 'warn' },
        );
      } catch (e) {
        if (sent) {
          setLog({ text: `Could not read the result: ${(e as Error).message ?? e}. Refresh the status.`, tone: 'warn' });
          patchStep(step.n, { txStage: 'unconfirmed', txMessage: 'Sent, but the result could not be read. Refresh the status in a moment.' });
        } else {
          setLog({ text: explainSignError(e), tone: 'bad' });
          patchStep(step.n, { signReady: true, txStage: 'idle' });
        }
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

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-24">
          {/* header: what this is, the picture, the rule in one sentence */}
          <header className="max-w-2xl">
            <MaturityBadge level="pilot" detail="Supra Mainnet" />
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink-0 md:text-5xl">
              Safety deposit
            </h1>
            <p className="mt-4 text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
              To take jobs you put down a deposit in wCOSMO. A contract holds it and it stays
              yours: you can withdraw it whenever none of your jobs is active. If you do not
              deliver a job, {penaltyText} of the required deposit goes to the buyer.
            </p>
          </header>
          <div className="mt-6">
            <FlowStrip
              steps={PROVIDER_FLOW.map(({ id, icon, label }) => ({ id, icon, label }))}
              highlight="deposit"
              label="You are at step two of six: wallet, safety deposit, make an offer, do the work, get paid, withdraw the deposit."
              className="justify-start"
            />
          </div>

          {/* prerequisites */}
          <aside className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-mono text-xs uppercase tracking-wider text-ink-2">
              What you need
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
              <li>· SUPRA in the wallet for transaction fees</li>
              <li>
                · $COSMO or wCOSMO in the wallet. A small, capped{' '}
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
                  How this page keeps you safe
                </p>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink-1">
                  This page never asks for a seed phrase or a private key. The only thing you can
                  change is the amount. Before you sign, the page shows exactly what will be sent,
                  and you confirm it in your StarKey wallet.
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
                {connecting ? 'Connecting …' : 'Connect wallet'}
              </button>
            ) : null}
            {notFound && (
              <p className="mt-3 font-mono text-xs text-phase-warn">
                The StarKey wallet was not found. Install the extension (starkey.app) and reload this page.
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
              label="Network"
              value={chainMsg?.text ?? '—'}
              tone={chainMsg === null ? 'idle' : chainMsg.ok ? 'ok' : 'bad'}
            />
          </div>

          {/* main display: your safety deposit at a glance */}
          <DepositSummary
            penaltyText={penaltyText}
            lockDays={lockDays}
            global={global}
            wallet={wallet}
            connected={connected}
            refreshing={refreshing}
            onRefresh={() => void refreshStatus()}
          />

          {/* all remaining on-chain parameters, collapsed by default */}
          <section className="mt-4">
            <TechDetails title="Technical details: all values read from the contract">
              <dl className="grid gap-3 font-mono text-sm sm:grid-cols-2">
                <StatusRow k="$COSMO balance" v={wallet ? `${fmtAmt(wallet.cosmoBal)} COSMO` : '— (connect)'} />
                <StatusRow
                  k="Active jobs / slash count"
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
            </TechDetails>
            {global?.paused && (
              <p className="mt-3 font-sans text-xs leading-relaxed text-phase-warn/90">
                Sign-up for providers is paused right now. You can still place a deposit, but
                new providers cannot be given jobs until the pause ends.
              </p>
            )}
            {misconfigured && (
              <p className="mt-3 font-mono text-xs text-phase-fault">
                Warning: the deposit contract is not set to wCOSMO. All transaction buttons are
                switched off.
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
                    You can take jobs
                  </p>
                  <p className="mt-1 font-sans text-sm leading-relaxed text-ink-0">
                    Your deposit meets the minimum. Next step: write to us with the provider
                    template on{' '}
                    <Link href="/compute/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof">
                      /compute
                    </Link>{' '}
                    . In the pilot, offers reach the contract through a signing service run by
                    the COSMO team, so we set up your first job together. You can add to your
                    deposit below at any time, within the limits.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* amount input */}
          <section className="mt-6 rounded-xl border border-line-base bg-surface-1 p-5">
            <h2 className="font-sans text-sm font-semibold text-ink-0">Deposit amount</h2>
            <p className="mt-1 font-sans text-xs text-ink-2">
              How much wCOSMO to put down. The field starts with the current minimum.
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
                  ? `Your wallet holds ${fmtAmt(wcosmoBal)} wCOSMO. Step 1 converts the missing ${fmtAmt(wrapNeeded)} $COSMO.`
                  : `Your wallet already holds ${fmtAmt(wcosmoBal)} wCOSMO, so step 1 is skipped.`}
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
                    ? 'Step 1 of 2: Turn $COSMO into wCOSMO'
                    : 'Step 2 of 2: Put the wCOSMO down as your safety deposit'}
                </h2>
                <p className="mt-1 font-sans text-xs text-ink-1">
                  {step.n === 1
                    ? 'Converts $COSMO into the same amount of wCOSMO in your wallet. Nothing is deposited yet. A separate transaction.'
                    : 'Moves the wCOSMO from your wallet into the deposit contract. A separate transaction.'}
                </p>
                {step.n === 1 && skipped && (
                  <p className="mt-2 font-mono text-xs text-phase-settled">
                    Skipped: your wallet already holds enough wCOSMO for this amount.
                  </p>
                )}
                {step.n === 2 && (
                  <p className="mt-1 font-sans text-xs text-ink-2">
                    Available once your wallet holds at least this amount in wCOSMO.
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
                    {steps[step.n].payloadAmount !== null
                      ? step.n === 1
                        ? `Convert ${fmtAmt(steps[step.n].payloadAmount!)} $COSMO`
                        : `Deposit ${fmtAmt(steps[step.n].payloadAmount!)} wCOSMO`
                      : step.n === 1
                        ? 'Convert'
                        : 'Deposit'}
                  </button>
                </div>
                {step.n === 2 && steps[2].payloadAmount !== null && wallet && global && (
                  <TokenOutcomeBox
                    lines={depositOutcomeLines(
                      describeDepositOutcome({
                        payloadAmount: steps[2].payloadAmount,
                        wcosmoBal: wallet.wcosmoBal,
                        bondAmount: wallet.bondAmount,
                        lockedUntilSecs: wallet.lockedUntil,
                        activeJobs: wallet.activeJobs,
                        cooldownSecs: global.cooldownSecs,
                        nowSecs: Math.floor(Date.now() / 1000),
                      }),
                    )}
                  />
                )}
                {step.n === 2 && receipt && (
                  <DepositReceiptBox
                    lines={depositReceiptLines(receipt, Math.floor(Date.now() / 1000))}
                    confirmed={receipt.confirmed}
                  />
                )}
                {steps[step.n].payloadText && (
                  <TechDetails title="Technical details: exactly what you will sign" defaultOpen className="mt-4">
                    <p className="font-mono text-xs">
                      {step.modName}::{step.fnName}
                      {stepAmount !== null && stepAmount > ZERO ? `(u64:${stepAmount.toString()})` : ''}
                    </p>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-dashed border-line-strong bg-surface-inset p-4 font-mono text-[11px] leading-relaxed text-ink-1">
                      {steps[step.n].payloadText}
                    </pre>
                  </TechDetails>
                )}
                <TxStatus
                  stage={steps[step.n].txStage}
                  message={steps[step.n].txMessage ?? undefined}
                  txHash={steps[step.n].txHash}
                  className="mt-4"
                />
              </section>
            );
          })}

          {/* what the deposit does and does not do */}
          <section className="mt-8 rounded-xl border border-phase-warn/20 bg-phase-warn/[0.04] p-5">
            <div className="mb-2 flex items-center gap-2">
              <Lock className="h-4 w-4 text-phase-warn" />
              <h2 className="text-base font-semibold text-ink-0">
                What the deposit does, and what it does not
              </h2>
            </div>
            <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <li>
                · A deposit makes you <span className="text-ink-0">able to take jobs</span>. It does
                not give you one. A job starts when a buyer chooses your offer and confirms it.
              </li>
              <li>
                · In the pilot, offers reach the contract through a signing service run by the
                COSMO team. Providers do not set prices on-chain by themselves yet.
              </li>
              <li>· One job at a time per provider.</li>
              <li>
                · If you do not deliver, {penaltyText} of the required deposit is paid to the buyer.
                The required amount is fixed when the job starts.
              </li>
              <li>
                · You can withdraw when none of your jobs is active and no penalty lock is running.
                A deposit penalty locks withdrawal for {lockDays}. Taking everything out is always
                allowed then. Placing a deposit starts no lock.
              </li>
              <li>
                · Withdrawing happens on{' '}
                <Link href="/portfolio/" className="text-phase-proof underline decoration-phase-proof/40 hover:text-ink-0">
                  My tokens
                </Link>
                , not on this page.
              </li>
              <li>· The minimum and the limits can be changed by the 2-of-3 admin group.</li>
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
            This page holds no keys and signs nothing on a server. It reads values from {RPC}.
            Built on Supra.{' '}
            <Link href="/compute/" className="text-ink-2 underline hover:text-ink-1">
              How earning works
            </Link>{' '}
            ·{' '}
            <Link href="/wcosmo/" className="text-ink-2 underline hover:text-ink-1">
              wCOSMO guide
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Main display: where the provider's tokens are, what is locked, what can be
// withdrawn and what is at risk. Global rows render even without a wallet.
export function DepositSummary({
  global,
  wallet,
  connected,
  refreshing,
  onRefresh,
  penaltyText,
  lockDays,
}: {
  global: GlobalStatus | null;
  wallet: WalletStatus | null;
  connected: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  penaltyText: string;
  lockDays: string;
}) {
  const deposited = wallet?.bondAmount ?? null;
  const missing =
    global && wallet
      ? global.minBond > wallet.bondAmount
        ? global.minBond - wallet.bondAmount
        : ZERO
      : null;
  const eligible = wallet?.eligible === true;

  // The deposit is "locked" while a job is active or a penalty lock is running;
  // otherwise it is free to withdraw. Both facts come from get_provider_bond.
  const [nowSecs] = useState(() => Math.floor(Date.now() / 1000));
  const penaltyLock = !!wallet && wallet.lockedUntil > ZERO && Number(wallet.lockedUntil) > nowSecs;
  const jobLock = !!wallet && wallet.activeJobs > ZERO;
  const num = (q: bigint) => Number(q) / 1e6;
  // What one missed job costs: a share of the required deposit, never more than the deposit.
  const atRisk =
    global && wallet && wallet.bondAmount > ZERO
      ? (() => {
          const share = (global.minBond * global.penaltyBps) / BigInt(10000);
          return share < wallet.bondAmount ? share : wallet.bondAmount;
        })()
      : null;
  const parts: PositionPart[] = wallet
    ? [
        { kind: 'wallet', label: 'wCOSMO in your wallet', amount: `${fmtAmt(wallet.wcosmoBal)} wCOSMO`, value: num(wallet.wcosmoBal) },
        jobLock || penaltyLock
          ? {
              kind: 'locked',
              label: 'Your deposit, locked right now',
              amount: `${fmtAmt(wallet.bondAmount)} wCOSMO`,
              value: num(wallet.bondAmount),
              hint: jobLock
                ? `A job is active (${wallet.activeJobs.toString()}). You can withdraw once it is paid.`
                : `A deposit penalty locks it until ${new Date(Number(wallet.lockedUntil) * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
            }
          : {
              kind: 'free',
              label: 'Your deposit, free to withdraw',
              amount: `${fmtAmt(wallet.bondAmount)} wCOSMO`,
              value: num(wallet.bondAmount),
              hint: wallet.bondAmount > ZERO ? 'No job is active. Withdraw on My tokens.' : 'Nothing deposited yet.',
            },
        ...(atRisk !== null
          ? [
              {
                kind: 'risk' as const,
                label: 'At risk if you miss a job deadline',
                amount: `${fmtAmt(atRisk)} wCOSMO`,
                hint: `${penaltyText} of the required deposit goes to the buyer. The rest is then locked for ${lockDays}.`,
              },
            ]
          : []),
      ]
    : [];

  return (
    <section className="mt-6 rounded-xl border border-phase-active/25 bg-phase-active/[0.04] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink-0">Your safety deposit</h2>
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

      {wallet && <TokenPosition parts={parts} className="mt-4 bg-surface-0" />}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Minimum deposit</dt>
          <dd className="font-mono text-ink-0">{global ? `${fmtAmt(global.minBond)} wCOSMO` : '—'}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-ink-2">Still missing</dt>
          <dd className={cn('font-mono', missing === ZERO ? 'text-phase-settled' : 'text-ink-0')}>
            {missing !== null ? `${fmtAmt(missing)} wCOSMO` : 'connect your wallet'}
          </dd>
        </div>
        {wallet && deposited !== null && (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-2">Jobs active now</dt>
              <dd className="font-mono text-ink-0">{wallet.activeJobs.toString()}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-ink-2">Deposit penalties so far</dt>
              <dd className="font-mono text-ink-0">{wallet.slashCount.toString()}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!connected ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-line-base bg-surface-inset px-3 py-1.5 font-mono text-xs text-ink-1">
            <Plug className="h-3.5 w-3.5" />
            Connect your wallet to see your deposit
          </span>
        ) : eligible ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-phase-settled/40 bg-phase-settled/[0.08] px-3 py-1.5 font-mono text-xs text-phase-settled">
            <CheckCircle2 className="h-3.5 w-3.5" />
            You can take jobs
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-phase-warn/40 bg-phase-warn/[0.08] px-3 py-1.5 font-mono text-xs text-phase-warn">
            <Lock className="h-3.5 w-3.5" />
            Not yet: your deposit is below the minimum
          </span>
        )}
        {wallet && wallet.bondAmount > ZERO && (
          <Link href="/portfolio/" className="font-mono text-xs text-phase-proof underline decoration-phase-proof/40 hover:text-ink-0">
            Withdraw on My tokens
          </Link>
        )}
      </div>
      {global && deposited !== null && deposited > ZERO && missing !== null && missing > ZERO && (
        <p className="mt-3 font-sans text-xs leading-relaxed text-phase-warn/90">
          Every single deposit must itself be at least the minimum, so the smallest top-up is{' '}
          {fmtAmt(global.minBond)} wCOSMO. What you already deposited stays yours to withdraw in
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
    { label: 'Your safety deposit', before: wallet.bondAmount, after: wallet.bondAmount + target },
  ];
  return (
    <section className="mt-6 rounded-xl border border-phase-proof/25 bg-phase-proof/[0.04] p-5">
      <h2 className="font-sans text-sm font-semibold text-ink-0">
        What will happen: {twoTx ? 'two separate transactions' : 'one transaction'}
      </h2>
      <ol className="mt-3 space-y-1.5 font-sans text-sm leading-relaxed">
        <li className={twoTx ? 'text-ink-1' : 'text-ink-2'}>
          1.{' '}
          {twoTx
            ? `Convert ${fmtAmt(wrapNeeded)} $COSMO into ${fmtAmt(wrapNeeded)} wCOSMO (transaction 1).`
            : 'Convert: skipped, your wallet already holds enough wCOSMO.'}
        </li>
        <li className="text-ink-1">
          2. Deposit {fmtAmt(target)} wCOSMO as your safety deposit (transaction{' '}
          {twoTx ? 2 : 1}).
        </li>
      </ol>
      <p className="mt-2 font-sans text-xs text-ink-2">
        Your wallet asks you to sign each transaction on its own. Nothing is sent until you
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
        This assumes both transactions go through. The SUPRA transaction fee is not included.
      </p>
    </section>
  );
}

// Pre-signing box for step 2: describes the EXACT payload amount, one fact per line.
// Rendered only while a step-2 payload is prepared; disappears once it is signed.
function TokenOutcomeBox({ lines }: { lines: string[] }) {
  return (
    <section
      data-testid="token-outcome"
      className="mt-4 rounded-lg border border-phase-active/40 bg-phase-active/[0.06] p-4"
    >
      <h4 className="font-mono text-[11px] uppercase tracking-wider text-phase-active">
        What happens to your tokens when you sign
      </h4>
      <ul className="mt-2 space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
        {lines.map((l) => (
          <li key={l}>· {l}</li>
        ))}
      </ul>
    </section>
  );
}

// Receipt after step 2: live before/after values, where the deposit now sits,
// and when it can come back. Links to the vault page until /portfolio exists.
function DepositReceiptBox({ lines, confirmed }: { lines: string[]; confirmed: boolean }) {
  return (
    <section
      data-testid="deposit-receipt"
      className={cn(
        'mt-4 rounded-lg border p-4',
        confirmed
          ? 'border-phase-settled/40 bg-phase-settled/[0.06]'
          : 'border-phase-warn/40 bg-phase-warn/[0.06]',
      )}
    >
      <h4
        className={cn(
          'font-mono text-[11px] uppercase tracking-wider',
          confirmed ? 'text-phase-settled' : 'text-phase-warn',
        )}
      >
        {confirmed ? 'Receipt: your deposit is in the vault' : 'Receipt: not confirmed yet'}
      </h4>
      <ul className="mt-2 space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
        {lines.map((l) => (
          <li key={l}>· {l}</li>
        ))}
      </ul>
      <p className="mt-3 font-sans text-xs text-ink-2">
        See everything you hold, and withdraw, on{' '}
        <Link
          href="/portfolio/"
          className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
        >
          My tokens
        </Link>
        ; vault totals are on the{' '}
        <Link
          href="/vault/"
          className="text-phase-proof underline decoration-phase-proof/40 hover:text-phase-proof"
        >
          vault page
        </Link>
        . Your wallet shows the lower balance because the deposit is held there, not because it
        was spent.
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
