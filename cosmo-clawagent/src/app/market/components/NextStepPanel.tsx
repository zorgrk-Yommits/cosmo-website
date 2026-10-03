'use client';

// "Your next step" — the BUYER role panel of the job page (L2: rendered as a
// tab inside RoleNextStep). The stage no longer derives client-side: the
// server's next-steps document is the single source of "whose turn / which
// action" (deriveStage() removed, L2 Lifecycle-Neuschnitt); only the arm/
// quote-countdown overlays stay client-side because auto-arm lives in the
// browser by design. Exactly ONE CTA or an explicit waiting card renders per
// state. Buyer copy follows src/components/cosmo/terms.ts (site-clarity plan):
// buttons name the real action and amount, promises match what the page can
// do, and what was signed is reported from the chain through <TxStatus>.

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileJson,
  Hourglass,
  Loader2,
  RefreshCw,
  Send,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EXPLORER_TX, faBalance } from '@/lib/mainnetOnchain';
import TechDetails from '@/components/cosmo/TechDetails';
import TokenPosition from '@/components/cosmo/TokenPosition';
import TxStatus from '@/components/cosmo/TxStatus';
import {
  attestationUrl,
  type MarketJob,
  type MarketOffer,
  type MarketProvider,
  type NextBlocker,
  type NextStepsDoc,
} from '../lib/marketApi';
import { QUOTE_SAFETY_SECS, type MarketFlow } from '../lib/useMarketFlow';
import { sameWallet } from '../lib/marketWallet';
import { JOB_ONCHAIN_STATUS } from '../lib/computeViews';
import { fmtDelivery, fmtRel, fmtTs } from '../lib/marketStatus';
import { CTA_BIG, CTA_DANGER, BTN_GHOST } from './cta';

// Blocker cards: the server names cause AND remedy (B1/B2) — render both.
export function BlockerCards({ blockers }: { blockers: NextBlocker[] }) {
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2">
      {blockers.map((b) => (
        <div key={b.code} className="rounded-lg border border-phase-warn/30 bg-phase-warn/[0.06] p-3">
          <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-phase-warn">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {b.cause}
          </p>
          <p className="mt-1 pl-5 font-sans text-xs leading-relaxed text-ink-1">{b.remedy}</p>
        </div>
      ))}
    </div>
  );
}

// B7: ONE offer list for both the select stage and the change-selection
// panel. Readiness (incl. the pre-selection self-quote gate) comes from the
// server document; the connected-wallet comparison additionally warns
// client-side even before a personalized document has arrived.
function OfferPicker({
  offers,
  providers,
  readinessList,
  pickedOffer,
  onPick,
  wallet,
  budgetAsset,
}: {
  offers: MarketOffer[];
  providers: MarketProvider[];
  readinessList: { offerId: string; providerWallet: string; blockers: NextBlocker[] }[] | null;
  pickedOffer: string;
  onPick: (id: string) => void;
  wallet: string | null;
  budgetAsset: string;
}) {
  return (
    <div className="space-y-2">
      {offers.map((o) => {
        const prov = providers.find((p) => p.id === o.providerId);
        const picked = pickedOffer === o.id;
        // B1/B2: on-chain readiness is checked BEFORE selection — a
        // blocked offer says so here, not after funding.
        const readiness = readinessList?.find((r) => r.offerId === o.id) ?? null;
        const ready = readiness === null || readiness.blockers.length === 0;
        const ownWallet =
          wallet !== null &&
          ((prov?.wallet && sameWallet(wallet, prov.wallet)) ||
            (readiness?.providerWallet && sameWallet(wallet, readiness.providerWallet)));
        return (
          <div key={o.id}>
            <label
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-all',
                picked
                  ? 'border-phase-active/60 bg-phase-active/10'
                  : 'border-line-base bg-surface-inset hover:border-line-strong',
              )}
            >
              <span className="flex items-center gap-3">
                <input type="radio" name="pick-offer" checked={picked} onChange={() => onPick(o.id)} />
                <span className="font-mono text-sm text-ink-0">{prov?.name ?? o.providerId}</span>
                {!ready && (
                  <span className="rounded-full border border-phase-warn/40 bg-phase-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-phase-warn">
                    not ready
                  </span>
                )}
              </span>
              <span className="font-mono text-xs text-ink-1">
                <span className="font-bold text-ink-0">
                  {o.price} {budgetAsset}
                </span>{' '}
                · {fmtDelivery(o.deliverySecs)}
              </span>
            </label>
            {ownWallet && (
              <p className="mt-1 flex items-start gap-1.5 pl-1 font-mono text-xs text-phase-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This is the wallet you are connected with. You cannot buy from yourself.
              </p>
            )}
            {picked && readiness && readiness.blockers.length > 0 && (
              <div className="mt-2">
                <BlockerCards blockers={readiness.blockers} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function fmtQuants(quants: string, decimals: number): string {
  const v = BigInt(quants);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole.toString();
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Stage =
  | 'loading'
  | 'moderation'
  | 'rejected'
  | 'awaiting-offers'
  | 'backend-down'
  | 'select'
  | 'escrow'
  | 'preparing'
  | 'accept'
  | 'arm-failed'
  | 'expired-manual'
  | 'active'
  | 'approve'
  | 'settled'
  | 'blocked';

// Role split (2026-07-23): the buyer has FOUR actions — approve is a real
// numbered step now, matching the buyer rail's node ④.
const STAGE_STEP: Partial<Record<Stage, 1 | 2 | 3 | 4>> = {
  select: 1,
  escrow: 2,
  preparing: 3,
  accept: 3,
  'arm-failed': 3,
  'expired-manual': 3,
  approve: 4,
};

// The StarKey footer renders only where the wallet is actually part of the
// story — pre-wallet stages (moderation, awaiting-offers, ...) are
// email-guided and must not mention the wallet yet.
const WALLET_STAGES: ReadonlySet<Stage> = new Set([
  'select',
  'escrow',
  'preparing',
  'accept',
  'arm-failed',
  'expired-manual',
  'active',
  'approve',
]);

export default function NextStepPanel({
  job,
  offers,
  providers,
  doc,
  f,
}: {
  job: MarketJob;
  offers: MarketOffer[];
  providers: MarketProvider[];
  doc: NextStepsDoc | null; // server-computed; null = backend unreachable
  f: MarketFlow; // owned by RoleNextStep (single instance per page)
}) {
  const [pickedOffer, setPickedOffer] = useState<string>('');
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const iv = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(iv);
  }, []);

  const flow = f.flow;
  const jobIdOnchain = flow?.jobIdOnchain ?? job.jobIdOnchain ?? null;
  const selectedOfferId = flow?.selectedOfferId ?? job.selectedOfferId ?? null;
  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? null;
  const selectedProvider = selectedOffer
    ? (providers.find((p) => p.id === selectedOffer.providerId) ?? null)
    : null;
  const secsLeft = f.quoteExpiresAt !== null ? Math.max(0, f.quoteExpiresAt - nowSec) : 0;
  const quoteLive = f.armState === 'armed' && secsLeft > QUOTE_SAFETY_SECS;
  const txAccept = flow?.txRefs.accept ?? job.txRefs.accept;
  const txRefs = flow?.txRefs ?? job.txRefs;
  const oj = f.onchainJob;

  // L2: the stage comes from the SERVER's next-steps document (the single
  // "whose turn" source). Only auto-arm/quote-countdown overlays remain
  // client-side — the server cannot see the browser's arm budget.
  const buyerBlock = doc?.roles.find((r) => r.role === 'buyer') ?? null;

  function stageFromServer(): Stage {
    switch (buyerBlock!.state) {
      case 'moderation':
        return 'moderation';
      case 'rejected':
        return 'rejected';
      case 'awaiting_offers':
        return 'awaiting-offers';
      case 'select':
        return 'select';
      case 'fund_escrow':
        return 'escrow';
      case 'arming':
      case 'accept': {
        if (f.armState === 'failed') return 'arm-failed';
        if (f.armState === 'expired' && f.autoArmsLeft === 0) return 'expired-manual';
        return quoteLive ? 'accept' : 'preparing';
      }
      case 'syncing':
        return 'preparing';
      case 'waiting_delivery':
        return 'active';
      case 'approve':
        return 'approve';
      case 'settled':
        return 'settled';
      default:
        // request_closed / inconsistent / chain_unreadable / exception:
        // render the server's blockers verbatim — cause and remedy included.
        return 'blocked';
    }
  }

  function deriveStage(): Stage {
    if (buyerBlock) return stageFromServer();
    // No server document: safe minimal fallback, never an action.
    if (job.status === 'settled' || flow?.status === 'settled') return 'settled';
    if (job.status === 'submitted') return 'moderation';
    if (job.status === 'rejected') return 'rejected';
    if (!f.flowChecked && flow === null) return 'loading';
    return 'backend-down';
  }
  const stage = deriveStage();
  const stepNo = STAGE_STEP[stage];

  // Before locking: what the buyer's wallet holds of the payment token, so the
  // panel can show what gets locked and what stays. Read-only; null = unknown.
  const payFa = flow?.escrowParams?.paymentFa ?? null;
  // The balance is stored with the wallet+token it was read for, so a stale
  // value is never shown after the wallet or the token changes.
  const balKey = stage === 'escrow' && f.wallet && payFa ? `${f.wallet}|${payFa}` : null;
  const [balRead, setBalRead] = useState<{ key: string; bal: bigint } | null>(null);
  useEffect(() => {
    if (!balKey || !f.wallet || !payFa) return;
    let stop = false;
    faBalance(f.wallet, payFa)
      .then((bal) => {
        if (!stop) setBalRead({ key: balKey, bal });
      })
      .catch(() => {
        /* unknown stays unknown */
      });
    return () => {
      stop = true;
    };
  }, [balKey, f.wallet, payFa]);
  const walletBal = balRead && balRead.key === balKey ? balRead.bal : null;

  const serverBlockers = buyerBlock?.blockers ?? [];
  const escrowBlocked = stage === 'escrow' && (buyerBlock ? buyerBlock.action === null : false);

  // B7: nothing is on-chain yet -> selection can still be changed.
  const requestId = flow?.requestId ?? doc?.requestId ?? null;
  const pickedProviderWallet = (() => {
    const o = offers.find((x) => x.id === pickedOffer);
    return o ? (providers.find((p) => p.id === o.providerId)?.wallet ?? null) : null;
  })();
  const pickedIsOwnWallet = !!(f.wallet && pickedProviderWallet && sameWallet(f.wallet, pickedProviderWallet));

  return (
    <div className="rounded-xl border border-phase-active/25 bg-phase-active/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-phase-active" />
          <h2 className="font-mono text-sm font-bold text-ink-0">Your next step</h2>
        </div>
        {stepNo && (
          <span className="rounded-full border border-phase-active/40 bg-phase-active/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-phase-active">
            Step {stepNo} of 4
          </span>
        )}
      </div>

      <div className="mt-4">
        {stage === 'loading' && (
          <div className="flex items-center gap-2 font-mono text-xs text-ink-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading your next step…
          </div>
        )}

        {stage === 'moderation' && (
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-ink-2" />
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              Your job is <span className="font-bold text-ink-0">in review</span>. Once
              approved, hand-picked pilot providers can make offers. We also write to you by
              email. Nothing to do right now.
            </p>
          </div>
        )}

        {stage === 'rejected' && (
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            This job was not approved for the pilot board. Nothing was charged.{' '}
            <Link href="/market/post/" className="text-phase-proof hover:text-phase-proof">
              Post a new job
            </Link>{' '}
            if you want to try a different scope.
          </p>
        )}

        {stage === 'awaiting-offers' && (
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-phase-active" />
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              <span className="font-bold text-ink-0">Open for offers.</span> The pilot providers
              have been notified. As soon as the first offer arrives, you choose one here.
              Nothing to do right now.
            </p>
          </div>
        )}

        {stage === 'backend-down' && (
          <div className="space-y-3">
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-phase-warn/90">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Our server cannot be reached right now, so this page cannot show your next step.
              Anything already locked stays locked and is not lost.
            </p>
            <button type="button" className={BTN_GHOST} onClick={() => void f.refreshFlow()}>
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {stage === 'select' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              Choose the offer you want. You confirm the choice with your wallet: this costs
              nothing and moves no tokens. The wallet you sign with becomes the buyer wallet for
              this job.
            </p>
            <OfferPicker
              offers={offers}
              providers={providers}
              readinessList={buyerBlock?.offerReadiness ?? null}
              pickedOffer={pickedOffer}
              onPick={setPickedOffer}
              wallet={f.wallet}
              budgetAsset={job.budgetAsset}
            />
            <button
              type="button"
              className={CTA_BIG}
              disabled={!pickedOffer || f.busy !== null || pickedIsOwnWallet}
              onClick={() => void f.selectOffer(pickedOffer)}
            >
              {f.busy === 'selecting' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
              Choose this offer
            </button>
          </div>
        )}

        {stage === 'escrow' && flow && (
          <div className="space-y-4">
            {selectedOffer && (
              <p className="font-sans text-sm leading-relaxed text-ink-1">
                Chosen:{' '}
                <span className="font-bold text-ink-0">
                  {selectedProvider?.name ?? selectedOffer.providerId}
                </span>{' '}
                — {selectedOffer.price} {job.budgetAsset} ·{' '}
                {fmtDelivery(selectedOffer.deliverySecs)}
              </p>
            )}
            {flow.escrowParams ? (
              (() => {
                const ep = flow.escrowParams;
                const lockQ = BigInt(ep.maxPriceQuants);
                const unit = Number(BigInt(10) ** BigInt(ep.assetDecimals));
                const short = walletBal !== null && walletBal < lockQ;
                return (
                  <>
                    <p className="font-sans text-sm leading-relaxed text-ink-1">
                      Locking moves{' '}
                      <span className="font-bold text-ink-0">
                        {fmtQuants(ep.maxPriceQuants, ep.assetDecimals)} {ep.assetSymbol}
                      </span>{' '}
                      out of your wallet into the job&apos;s contract. It is held there, not by us
                      and not by the provider, and nobody is paid yet. If the offer is lower than
                      this amount, the difference comes back to you when you confirm.
                    </p>
                    <TokenPosition
                      parts={[
                        {
                          kind: 'locked',
                          label: 'Will be locked for this job',
                          amount: `${fmtQuants(ep.maxPriceQuants, ep.assetDecimals)} ${ep.assetSymbol}`,
                          value: Number(lockQ) / unit,
                          hint: 'Paid to the provider only after you approve the result.',
                        },
                        {
                          kind: 'wallet',
                          label: 'Stays in your wallet',
                          amount:
                            walletBal === null || short
                              ? null
                              : `${fmtQuants((walletBal - lockQ).toString(), ep.assetDecimals)} ${ep.assetSymbol}`,
                          value: walletBal === null || short ? undefined : Number(walletBal - lockQ) / unit,
                          hint: f.wallet
                            ? undefined
                            : 'Connect your wallet to see what stays.',
                        },
                      ]}
                    />
                    {short && (
                      <p className="flex items-start gap-1.5 font-sans text-sm leading-relaxed text-phase-warn">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Your wallet holds {fmtQuants(walletBal!.toString(), ep.assetDecimals)}{' '}
                          {ep.assetSymbol}, which is less than the amount to lock. See the{' '}
                          <a href="/wcosmo/" className="text-phase-proof hover:text-phase-proof">
                            conversion guide
                          </a>{' '}
                          or{' '}
                          <a href="/buy/" className="text-phase-proof hover:text-phase-proof">
                            buy {ep.assetSymbol}
                          </a>
                          .
                        </span>
                      </p>
                    )}
                    <ul className="space-y-1.5 font-sans text-sm leading-relaxed text-ink-1">
                      <li>
                        Result due by{' '}
                        <span className="text-ink-0">{fmtTs(ep.jobDeadlineSecs)}</span>.
                      </li>
                      <li>
                        After the result arrives you have{' '}
                        <span className="text-ink-0">{fmtDelivery(ep.reviewWindowSecs)}</span> to
                        check it.
                      </li>
                      <li>
                        If the job never starts, you can take the full amount back on{' '}
                        <Link href="/portfolio/" className="text-phase-proof hover:text-phase-proof">
                          My tokens
                        </Link>{' '}
                        once this job&apos;s start window has expired. There is no cancel button
                        before that.
                      </li>
                    </ul>
                  </>
                );
              })()
            ) : (
              <p className="font-mono text-xs text-phase-warn">
                The amount to lock is not available yet. Refresh in a moment.
              </p>
            )}
            <BlockerCards blockers={serverBlockers} />
            <button
              type="button"
              className={CTA_BIG}
              disabled={f.busy !== null || escrowBlocked || flow.rail.paused || !flow.escrowParams}
              onClick={() => void f.createEscrow()}
            >
              {f.busy === 'escrowing' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {flow.escrowParams
                ? `Lock ${fmtQuants(flow.escrowParams.maxPriceQuants, flow.escrowParams.assetDecimals)} ${flow.escrowParams.assetSymbol}`
                : 'Lock payment'}
            </button>
            <p className="font-sans text-xs leading-relaxed text-ink-2">
              After this, the job is prepared automatically. Your next action is Confirm and
              start. Your last one, checking the result, comes once the provider hands it in.
            </p>
            {/* B7 escape hatch: a blocked funding stage is never a dead end
                while nothing is on-chain — the buyer can re-select here. */}
            {escrowBlocked && requestId == null && offers.length > 0 && (
              <div className="border-t border-line-base pt-4">
                <h3 className="font-mono text-xs font-bold text-ink-0">Choose a different offer</h3>
                <p className="mt-1 mb-3 font-sans text-sm leading-relaxed text-ink-1">
                  You can choose a different offer. Nothing is locked yet. Choosing again also
                  makes the account you sign with the buyer wallet.
                </p>
                <OfferPicker
                  offers={offers}
                  providers={providers}
                  readinessList={buyerBlock?.offerReadiness ?? null}
                  pickedOffer={pickedOffer}
                  onPick={setPickedOffer}
                  wallet={f.wallet}
                  budgetAsset={job.budgetAsset}
                />
                <button
                  type="button"
                  className={cn(BTN_GHOST, 'mt-3')}
                  disabled={!pickedOffer || f.busy !== null || pickedIsOwnWallet}
                  onClick={() => void f.selectOffer(pickedOffer)}
                >
                  {f.busy === 'selecting' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Choose this offer instead
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'preparing' && (
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-phase-active" />
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              <span className="font-bold text-ink-0">Getting the job ready…</span> We check
              your locked payment and prepare the provider&apos;s offer. Nothing to do: the
              Confirm and start button appears here in a moment.
            </p>
          </div>
        )}

        {stage === 'accept' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              The provider&apos;s offer is ready
              {f.quote && flow?.escrowParams && (
                <>
                  :{' '}
                  <span className="font-bold text-ink-0">
                    {fmtQuants(f.quote.price, flow.escrowParams.assetDecimals)}{' '}
                    {flow.escrowParams.assetSymbol}
                  </span>{' '}
                  from provider {f.quote.solver.slice(0, 10)}…
                </>
              )}
              . Confirming starts the job and returns any part of the locked payment that is
              above the offer. The contract compares your confirmation with the exact offer: if
              the offer changed in the meantime, it refuses and nothing is paid.
            </p>
            <div className="flex items-center gap-2 font-mono text-sm">
              <Clock3
                className={cn('h-4 w-4', secsLeft < 60 ? 'text-phase-warn' : 'text-phase-settled')}
              />
              <span className={cn(secsLeft < 60 ? 'text-phase-warn' : 'text-phase-settled')}>
                Offer valid {fmtCountdown(secsLeft)}
              </span>
              <span className="text-[11px] text-ink-2">renews automatically</span>
            </div>
            <button
              type="button"
              className={CTA_BIG}
              disabled={f.busy !== null}
              onClick={() => void f.accept()}
            >
              {f.busy === 'accepting' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Confirm and start
            </button>
          </div>
        )}

        {stage === 'arm-failed' && (
          <div className="space-y-4">
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-phase-fault">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Getting the job ready failed. Your payment stays locked and is not lost. You can
              retry below at no cost.
            </p>
            {f.armError && (
              <p className="font-mono text-[11px] text-ink-2">
                Technical detail: {f.armError}
              </p>
            )}
            <button
              type="button"
              className={CTA_DANGER}
              disabled={f.busy !== null}
              onClick={() => void f.rearm()}
            >
              <RefreshCw className={cn('h-5 w-5', f.busy === 'arming' && 'animate-spin')} />
              Retry
            </button>
          </div>
        )}

        {stage === 'expired-manual' && (
          <div className="space-y-4">
            <p className="flex items-start gap-1.5 font-sans text-sm leading-relaxed text-ink-1">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-phase-warn" />
              The offer expired. Get a fresh one: it is free and needs no wallet signature.
            </p>
            <button
              type="button"
              className={CTA_BIG}
              disabled={f.busy !== null}
              onClick={() => void f.rearm()}
            >
              <RefreshCw className={cn('h-5 w-5', f.busy === 'arming' && 'animate-spin')} />
              Refresh the offer
            </button>
          </div>
        )}

        {stage === 'active' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-phase-active" />
              <p className="font-sans text-sm leading-relaxed text-ink-1">
                <span className="font-bold text-ink-0">
                  The provider is working (job #{jobIdOnchain}).
                </span>{' '}
                Nothing to do right now. The result and the button to approve it appear here
                once the provider hands it in.
                {txAccept && (
                  <>
                    {' '}
                    <a
                      href={`${EXPLORER_TX}${txAccept}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-phase-proof hover:text-phase-proof"
                    >
                      View the start transaction
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
            {oj && nowSec <= oj.jobDeadlineSecs && (
              <p className="flex items-center gap-2 font-mono text-xs text-ink-1">
                <Clock3 className="h-3.5 w-3.5 text-phase-settled" />
                Result due by {fmtTs(oj.jobDeadlineSecs)}{' '}
                <span className="text-ink-2">({fmtRel(oj.jobDeadlineSecs, nowSec)})</span>
              </p>
            )}
            {oj && oj.status === JOB_ONCHAIN_STATUS.ACTIVE && nowSec > oj.jobDeadlineSecs && (
              <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-phase-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  The deadline has passed without a result. The provider can no longer hand one
                  in. Take your locked payment back on{' '}
                  <Link href="/portfolio/" className="font-bold text-phase-proof hover:text-phase-proof">
                    My tokens
                  </Link>
                  : connect this wallet there and use the button next to this job.
                </span>
              </p>
            )}
          </div>
        )}

        {stage === 'approve' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              The provider handed in a result. Look at it and compare it with what you said
              counts as done.
            </p>
            <a
              href={flow?.deliver?.attestationUri ?? attestationUrl(job.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-line-base bg-surface-inset px-4 py-3 font-mono text-sm text-phase-proof transition-colors hover:border-line-strong hover:text-ink-0"
            >
              <FileJson className="h-4 w-4" />
              View result
            </a>
            {oj && oj.deliveredAt > 0 && (
              <p className="flex items-start gap-2 font-sans text-sm leading-relaxed text-ink-1">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-phase-warn" />
                <span>
                  You have until{' '}
                  <span className="font-bold text-ink-0">
                    {fmtTs(oj.deliveredAt + oj.reviewWindowSecs)}
                  </span>{' '}
                  to check it. If you do nothing by then, the provider is paid automatically.
                </span>
              </p>
            )}
            <button
              type="button"
              className={CTA_BIG}
              disabled={f.busy !== null || oj?.status !== JOB_ONCHAIN_STATUS.DELIVERED}
              onClick={() => void f.approve()}
            >
              {f.busy === 'approving' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
              Approve and pay provider
            </button>
            <p className="font-sans text-xs leading-relaxed text-ink-2">
              Approving pays the provider in one transaction. It cannot be undone.
            </p>
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              <span className="font-bold text-ink-0">Not happy with the result?</span> Do not
              approve. Reply to one of our emails about this job before the time above runs out.
              There is no button for this on the page yet.
            </p>
            {(job.attestationHash ?? flow?.deliver?.attestationHash) && (
              <TechDetails title="Technical details: how the result is pinned">
                <p>
                  The chain stores a fingerprint (SHA3-256 hash) of the result document, so the
                  document cannot be changed after delivery. The hash on-chain equals the
                  SHA3-256 of the document linked above.
                </p>
                <p className="mt-2 break-all font-mono text-[11px] text-ink-1">
                  SHA3-256: {job.attestationHash ?? flow?.deliver?.attestationHash}
                </p>
                <p className="mt-2">
                  A dispute exists in the contract (dispute_delivery_v2) but is not wired into
                  this page. After the review window, anyone can trigger settlement
                  (timeout_settle_v2) without the buyer&apos;s signature.
                </p>
              </TechDetails>
            )}
          </div>
        )}

        {stage === 'blocked' && buyerBlock && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-ink-1">{buyerBlock.headline}</p>
            <BlockerCards blockers={buyerBlock.blockers} />
          </div>
        )}

        {stage === 'settled' && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-phase-settled" />
            <p className="font-sans text-sm leading-relaxed text-ink-1">
              <span className="font-bold text-phase-settled">Paid.</span>{' '}
              {selectedOffer ? `${selectedOffer.price} ${job.budgetAsset}` : 'The payment'} went
              to the provider. This job is complete. Nothing more to do.
              {txRefs.deliver && (
                <>
                  {' '}
                  <a
                    href={`${EXPLORER_TX}${txRefs.deliver}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phase-proof hover:text-phase-proof"
                  >
                    Delivery transaction
                  </a>
                </>
              )}
              {txRefs.settle && (
                <>
                  {txRefs.deliver ? ' · ' : ' '}
                  <a
                    href={`${EXPLORER_TX}${txRefs.settle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phase-proof hover:text-phase-proof"
                  >
                    Payment transaction
                  </a>
                </>
              )}
              .
            </p>
          </div>
        )}
      </div>

      {f.error && (
        <p className="mt-4 flex items-start gap-1.5 font-mono text-[11px] text-phase-fault">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {f.error}
        </p>
      )}
      <TxStatus stage={f.tx.stage} message={f.tx.message} txHash={f.tx.hash} className="mt-4" />
      {f.info && !f.error && f.tx.stage !== 'failed' && (
        <p className="mt-3 font-sans text-sm text-phase-settled">{f.info}</p>
      )}

      {WALLET_STAGES.has(stage) && (
        <p className="mt-4 border-t border-line-subtle pt-3 font-mono text-[11px] text-ink-2">
          You sign with your own StarKey wallet. This site never holds your tokens or keys.
          Every step from locking the payment onward is a public transaction on Supra Mainnet.
        </p>
      )}
    </div>
  );
}
