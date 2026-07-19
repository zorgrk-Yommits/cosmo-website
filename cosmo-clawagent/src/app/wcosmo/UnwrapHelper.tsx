'use client';

// Self-service unwrap payload builder (G1b-3): wCOSMO -> $COSMO via
// cosmoclaw::wcosmo::unwrap(amount). Exact ProviderBondHelper flow, reduced
// to the single unwrap step: connect StarKey (chain 8), amount, prepare
// (full payload shown), sign. Never asks for keys or seeds; permissionless
// and always available as long as the wCOSMO is not locked in a vault.

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Lock, Plug, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CHAIN_ID,
  COSMOCLAW_ADDR,
  EXPLORER_TX,
  WCOSMO_META,
  type SupraProvider,
  bcsU64,
  faBalance,
  fetchSeqNum,
  fmtAmt,
  getSupra,
  parseAmount,
  shortAddr,
} from '@/lib/mainnetOnchain';

const ZERO = BigInt(0);

export default function UnwrapHelper() {
  const providerRef = useRef<SupraProvider | null>(null);
  const preparedRef = useRef<{ data: unknown; amount: bigint } | null>(null);

  const [notFound, setNotFound] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [chainMsg, setChainMsg] = useState<string | null>(null);
  const [wcosmoBal, setWcosmoBal] = useState<bigint | null>(null);

  const [amountInput, setAmountInput] = useState('');
  const [payloadText, setPayloadText] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'prepare' | 'sign'>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; tone: 'info' | 'ok' | 'bad' } | null>(null);

  useEffect(() => {
    preparedRef.current = null;
    setPayloadText(null);
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
        return;
      }
      setAccount(addr);
      setWcosmoBal(await faBalance(addr, WCOSMO_META).catch(() => ZERO));
    } catch (e) {
      setLog({ text: `Connect error: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setConnecting(false);
    }
  }, []);

  const amount = parseAmount(amountInput);
  const amountValid =
    amount !== null && amount > ZERO && (wcosmoBal === null || amount <= wcosmoBal);

  const prepare = useCallback(async () => {
    const p = providerRef.current;
    if (!p || !account || amount === null || amount <= ZERO) return;
    setBusy('prepare');
    try {
      const seq = await fetchSeqNum(account);
      const expiry = Math.ceil(Date.now() / 1000) + 300;
      const rawTxPayload = [
        account,
        seq,
        COSMOCLAW_ADDR,
        'wcosmo',
        'unwrap',
        [], // no type args
        [bcsU64(amount)], // exactly one u64
        { txExpiryTime: expiry },
      ];
      const data = await p.createRawTransactionData(rawTxPayload);
      preparedRef.current = { data, amount };
      setPayloadText(
        [
          `Sender          : ${account}`,
          `Function-ID     : ${COSMOCLAW_ADDR}::wcosmo::unwrap`,
          'Type-Args       : (none)',
          `Arg 1 (u64)     : ${amount.toString()}  (= ${fmtAmt(amount)} wCOSMO → $COSMO)`,
          `Sequence-Number : ${seq}`,
          `Expiry (unix)   : ${expiry}`,
          'Chain           : 8 (Supra Mainnet)',
        ].join('\n'),
      );
      setLog({ text: 'Unwrap payload ready. Review it, then sign.', tone: 'info' });
    } catch (e) {
      setLog({ text: `Payload error: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setBusy(null);
    }
  }, [account, amount]);

  const sign = useCallback(async () => {
    const p = providerRef.current;
    const prepared = preparedRef.current;
    if (!p || !account || !prepared) return;
    setBusy('sign');
    try {
      const before = wcosmoBal ?? ZERO;
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
      setLog({ text: 'TX sent. Waiting for on-chain confirmation …', tone: 'info' });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const bal = await faBalance(account, WCOSMO_META).catch(() => null);
        if (bal !== null && bal < before) {
          setWcosmoBal(bal);
          setLog({ text: 'Unwrapped — $COSMO released to your wallet.', tone: 'ok' });
          return;
        }
      }
      setLog({ text: 'TX sent — confirmation still pending, check the explorer.', tone: 'info' });
    } catch (e) {
      setLog({ text: `Sign/send error: ${(e as Error).message ?? e}`, tone: 'bad' });
    } finally {
      setBusy(null);
    }
  }, [account, wcosmoBal]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="font-mono text-sm text-slate-100">Unwrap here (self-service)</h3>
      <p className="mt-2 font-sans text-xs leading-relaxed text-slate-400">
        Burns wCOSMO 1:1 and releases $COSMO to your wallet. Permissionless — works for
        any holder at any time, as long as the wCOSMO is not held in a vault.
      </p>

      <div className="mt-4">
        {account ? (
          <p className="flex items-center gap-2 font-mono text-xs text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Connected: {shortAddr(account)}
            {wcosmoBal !== null && (
              <span className="text-slate-500">· {fmtAmt(wcosmoBal)} wCOSMO held</span>
            )}
          </p>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={() => void connect()}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 font-mono text-xs text-purple-200 hover:bg-purple-500/20"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
            Connect StarKey
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

      {account && (
        <div className="mt-4 flex gap-2">
          <input
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Amount (wCOSMO)"
            inputMode="decimal"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-500/50 focus:outline-none"
          />
          <button
            type="button"
            disabled={!amountValid || busy !== null}
            onClick={() => void prepare()}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs',
              amountValid && busy === null
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20'
                : 'cursor-not-allowed border-white/10 bg-black/20 text-slate-600',
            )}
          >
            {busy === 'prepare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Prepare unwrap
          </button>
        </div>
      )}
      {account && amountInput !== '' && !amountValid && (
        <p className="mt-1.5 font-mono text-[11px] text-amber-300">
          Positive number, max 6 fraction digits, not above your wCOSMO balance.
        </p>
      )}

      {payloadText && (
        <div className="mt-4 space-y-3">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-dashed border-slate-700 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-slate-400">
            {payloadText}
          </pre>
          <button
            type="button"
            disabled={busy !== null}
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
    </div>
  );
}
