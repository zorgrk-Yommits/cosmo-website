'use client';

// Buyer on-chain flow panel (M4): select an offer, fund the escrow, arm the
// provider quote, accept it — every on-chain step signed by the buyer's own
// StarKey wallet, every server step verifiable on-chain. The accept tuple is
// read from the chain, never from page state.

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import type { MarketJob, MarketOffer, MarketProvider } from '../lib/marketApi';
import { useMarketFlow } from '../lib/useMarketFlow';
import { fmtDelivery } from '../lib/marketStatus';

function fmtQuants(quants: string, decimals: number): string {
  const v = BigInt(quants);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

function StepHeader({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px]',
          done
            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
            : active
              ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
              : 'border-white/15 text-slate-500',
        )}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : n}
      </span>
      <h3 className={cn('font-mono text-xs font-bold', done || active ? 'text-slate-100' : 'text-slate-500')}>
        {title}
      </h3>
    </div>
  );
}

export default function BuyerFlow({
  job,
  offers,
  providers,
  onChanged,
}: {
  job: MarketJob;
  offers: MarketOffer[];
  providers: MarketProvider[];
  onChanged: () => void;
}) {
  const f = useMarketFlow(job.id, onChanged);
  const [pickedOffer, setPickedOffer] = useState<string>('');
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!['approved', 'selected', 'onchain'].includes(job.status)) return null;
  if (job.status === 'approved' && offers.length === 0) return null;

  const flow = f.flow;
  const requestId = flow?.requestId ?? job.requestId ?? null;
  const jobIdOnchain = flow?.jobIdOnchain ?? job.jobIdOnchain ?? null;
  const selectedOfferId = flow?.selectedOfferId ?? job.selectedOfferId ?? null;
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;

  const step1Done = selectedOfferId !== null;
  const step2Done = requestId !== null;
  const quoteLive = f.quote !== null && f.quoteExpiresAt !== null && f.quoteExpiresAt > nowSec;
  const step4Done = jobIdOnchain !== null;
  const quoteSecsLeft = f.quoteExpiresAt !== null ? Math.max(0, f.quoteExpiresAt - nowSec) : null;

  const btn =
    'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[11px] transition-all disabled:cursor-not-allowed disabled:opacity-40';
  const btnPrimary = cn(btn, 'border-sky-500/40 bg-sky-500/10 text-sky-200 hover:border-sky-400/70 hover:text-white');

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="mb-1 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-purple-300" />
        <h2 className="font-mono text-sm font-bold text-slate-100">Take this job on-chain (buyer)</h2>
      </div>
      <p className="mb-5 font-sans text-xs leading-relaxed text-slate-400">
        From here on, every step is a verifiable Supra Mainnet transaction. You sign the escrow
        and the acceptance with your own StarKey wallet; this site never holds your funds or keys.
      </p>

      {flow === null && (
        <p className="font-mono text-xs text-amber-300/90">
          Market service is unreachable — the on-chain flow is paused. On-chain state stays intact;
          try again later.
        </p>
      )}

      {flow !== null && (
        <div className="space-y-5">
          {/* Step 1 — select */}
          <div>
            <StepHeader n={1} title="Select an offer (wallet-signed)" done={step1Done} active={!step1Done} />
            {!step1Done && (
              <div className="mt-2 space-y-2 pl-7">
                {offers.map((o) => {
                  const prov = providers.find((p) => p.id === o.providerId);
                  return (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2 font-mono text-xs text-slate-300">
                      <input
                        type="radio"
                        name="pick-offer"
                        checked={pickedOffer === o.id}
                        onChange={() => setPickedOffer(o.id)}
                      />
                      {prov?.name ?? o.providerId} — {o.price} {job.budgetAsset} · {fmtDelivery(o.deliverySecs)}
                    </label>
                  );
                })}
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={!pickedOffer || f.busy !== null}
                  onClick={() => void f.selectOffer(pickedOffer)}
                >
                  {f.busy === 'selecting' && <Loader2 className="h-3 w-3 animate-spin" />}
                  Sign selection with StarKey
                </button>
              </div>
            )}
            {step1Done && selectedOffer && (
              <p className="mt-1 pl-7 font-mono text-[11px] text-slate-400">
                {providers.find((p) => p.id === selectedOffer.providerId)?.name ?? selectedOffer.providerId} —{' '}
                {selectedOffer.price} {job.budgetAsset} · {fmtDelivery(selectedOffer.deliverySecs)}
                {flow.buyerWallet && <> · buyer {flow.buyerWallet.slice(0, 10)}…</>}
              </p>
            )}
          </div>

          {/* Step 2 — escrow */}
          <div>
            <StepHeader n={2} title="Fund the on-chain escrow" done={step2Done} active={step1Done && !step2Done} />
            {step1Done && !step2Done && flow.escrowParams && (
              <div className="mt-2 space-y-2 pl-7">
                <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                  Escrows{' '}
                  <span className="text-slate-200">
                    {fmtQuants(flow.escrowParams.maxPriceQuants, flow.escrowParams.assetDecimals)}{' '}
                    {flow.escrowParams.assetSymbol}
                  </span>{' '}
                  against the frozen spec hash. Unspent escrow returns to you at acceptance; you can
                  cancel any time before accepting. Need {flow.escrowParams.assetSymbol}? See the{' '}
                  <a href="/wcosmo/" className="text-sky-400 hover:text-sky-300">conversion guide</a>.
                </p>
                {flow.rail.paused && (
                  <p className="font-mono text-[11px] text-amber-300">The rail is paused — escrow is disabled.</p>
                )}
                {flow.providerChecks && !(flow.providerChecks.eligible && flow.providerChecks.bondCoversMinimum && flow.providerChecks.hasCapacity) && (
                  <p className="flex items-start gap-1.5 font-mono text-[11px] text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    The selected provider is not currently eligible on-chain (bond/capacity). Escrow is
                    blocked until that is resolved.
                  </p>
                )}
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={f.busy !== null || flow.rail.paused}
                  onClick={() => void f.createEscrow()}
                >
                  {f.busy === 'escrowing' && <Loader2 className="h-3 w-3 animate-spin" />}
                  Fund escrow with StarKey
                </button>
              </div>
            )}
            {step2Done && (
              <p className="mt-1 pl-7 font-mono text-[11px] text-slate-400">
                On-chain request #{requestId}
                {flow.txRefs.create && (
                  <>
                    {' · '}
                    <a href={`${EXPLORER_TX}${flow.txRefs.create}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                      view transaction
                    </a>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Step 3 — arm */}
          <div>
            <StepHeader
              n={3}
              title="Arm the provider quote (server-signed, 5 min validity)"
              done={quoteLive || step4Done}
              active={step2Done && !quoteLive && !step4Done}
            />
            {step2Done && !step4Done && (
              <div className="mt-2 space-y-2 pl-7">
                {!quoteLive && (
                  <>
                    <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                      Our server verifies the on-chain escrow against the selected offer and relays a
                      signed quote. Quotes expire after 5 minutes — re-arm any time.
                    </p>
                    <button type="button" className={btnPrimary} disabled={f.busy !== null} onClick={() => void f.arm()}>
                      {f.busy === 'arming' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {f.quote === null ? 'Arm quote' : 'Re-arm quote'}
                    </button>
                  </>
                )}
                {quoteLive && f.quote && flow.escrowParams && (
                  <p className="font-mono text-[11px] text-slate-400">
                    Live quote: {fmtQuants(f.quote.price, flow.escrowParams.assetDecimals)}{' '}
                    {flow.escrowParams.assetSymbol} from {f.quote.solver.slice(0, 10)}… · expires in{' '}
                    <span className={cn(quoteSecsLeft !== null && quoteSecsLeft < 60 ? 'text-amber-300' : 'text-emerald-300')}>
                      {quoteSecsLeft}s
                    </span>
                    {flow.txRefs.submitQuote && (
                      <>
                        {' · '}
                        <a href={`${EXPLORER_TX}${flow.txRefs.submitQuote}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                          view transaction
                        </a>
                      </>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Step 4 — accept */}
          <div>
            <StepHeader n={4} title="Accept the quote (locks the job)" done={step4Done} active={quoteLive && !step4Done} />
            {!step4Done && quoteLive && (
              <div className="mt-2 space-y-2 pl-7">
                <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                  Accepting locks the provider in and refunds any unspent escrow. The acceptance is
                  checked against the exact on-chain quote — if anything drifted, the chain rejects it.
                </p>
                <button type="button" className={btnPrimary} disabled={f.busy !== null} onClick={() => void f.accept()}>
                  {f.busy === 'accepting' && <Loader2 className="h-3 w-3 animate-spin" />}
                  Accept quote with StarKey
                </button>
              </div>
            )}
            {step4Done && (
              <p className="mt-1 pl-7 font-mono text-[11px] text-emerald-300">
                On-chain job #{jobIdOnchain} is active — delivery and settlement follow on the rail.
                {flow.txRefs.accept && (
                  <>
                    {' · '}
                    <a href={`${EXPLORER_TX}${flow.txRefs.accept}`} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">
                      view transaction
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {f.error && (
        <p className="mt-4 flex items-start gap-1.5 font-mono text-[11px] text-rose-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {f.error}
        </p>
      )}
      {f.info && !f.error && <p className="mt-4 font-mono text-[11px] text-emerald-300">{f.info}</p>}
    </div>
  );
}
