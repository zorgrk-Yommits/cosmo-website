'use client';

// "Your next step" — the BUYER role panel of the job page (L2: rendered as a
// tab inside RoleNextStep). The stage no longer derives client-side: the
// server's next-steps document is the single source of "whose turn / which
// action" (deriveStage() removed, L2 Lifecycle-Neuschnitt); only the arm/
// quote-countdown overlays stay client-side because auto-arm lives in the
// browser by design. Exactly ONE CTA or an explicit waiting card renders per
// state. Buyer copy avoids escrow/quote/arm jargon (Sprachpass, Etappe 5).

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
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import {
  attestationUrl,
  type MarketJob,
  type MarketOffer,
  type MarketProvider,
  type NextBlocker,
  type NextStepsDoc,
} from '../lib/marketApi';
import { QUOTE_SAFETY_SECS, type MarketFlow } from '../lib/useMarketFlow';
import { JOB_ONCHAIN_STATUS } from '../lib/computeViews';
import { fmtDelivery, fmtRel, fmtTs } from '../lib/marketStatus';
import { CTA_BIG, CTA_DANGER, BTN_GHOST } from './cta';

// Blocker cards: the server names cause AND remedy (B1/B2) — render both.
export function BlockerCards({ blockers }: { blockers: NextBlocker[] }) {
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2">
      {blockers.map((b) => (
        <div key={b.code} className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {b.cause}
          </p>
          <p className="mt-1 pl-5 font-sans text-xs leading-relaxed text-slate-400">{b.remedy}</p>
        </div>
      ))}
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

const STAGE_STEP: Partial<Record<Stage, 1 | 2 | 3>> = {
  select: 1,
  escrow: 2,
  preparing: 3,
  accept: 3,
  'arm-failed': 3,
  'expired-manual': 3,
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

  const serverBlockers = buyerBlock?.blockers ?? [];
  const escrowBlocked = stage === 'escrow' && (buyerBlock ? buyerBlock.action === null : false);

  return (
    <div className="rounded-b-xl rounded-tr-xl border border-purple-500/25 bg-purple-500/[0.04] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-purple-300" />
          <h2 className="font-mono text-sm font-bold text-slate-100">Your next step</h2>
        </div>
        {stepNo && (
          <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-purple-300">
            Step {stepNo} of 3
          </span>
        )}
      </div>

      <div className="mt-4">
        {stage === 'loading' && (
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading flow state…
          </div>
        )}

        {stage === 'moderation' && (
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-slate-400" />
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              Your job is <span className="font-bold text-slate-100">in review</span>. Once
              approved it opens for offers from curated pilot providers — we also reach out by
              email. Nothing to do right now.
            </p>
          </div>
        )}

        {stage === 'rejected' && (
          <p className="font-sans text-sm leading-relaxed text-slate-300">
            This job was not approved for the pilot board.{' '}
            <Link href="/market/post/" className="text-sky-400 hover:text-sky-300">
              Post a new job
            </Link>{' '}
            if you want to try a different scope.
          </p>
        )}

        {stage === 'awaiting-offers' && (
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-purple-400" />
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              <span className="font-bold text-slate-100">Open for offers</span> — curated pilot
              providers have been notified. As soon as the first offer arrives, you pick one here
              and take the job on-chain. Nothing to do right now.
            </p>
          </div>
        )}

        {stage === 'backend-down' && (
          <div className="space-y-3">
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-amber-300/90">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Market service is unreachable — the flow is paused. Your on-chain state is safe;
              nothing is lost.
            </p>
            <button type="button" className={BTN_GHOST} onClick={() => void f.refreshFlow()}>
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {stage === 'select' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              Pick the offer you want. Your selection is signed with your StarKey wallet and
              binds it as the buyer wallet for this job.
            </p>
            <div className="space-y-2">
              {offers.map((o) => {
                const prov = providers.find((p) => p.id === o.providerId);
                const picked = pickedOffer === o.id;
                // B1/B2: on-chain readiness is checked BEFORE selection — a
                // blocked offer says so here, not after funding.
                const readiness = buyerBlock?.offerReadiness?.find((r) => r.offerId === o.id) ?? null;
                const ready = readiness === null || readiness.blockers.length === 0;
                return (
                  <div key={o.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-all',
                        picked
                          ? 'border-purple-400/60 bg-purple-500/10'
                          : 'border-white/10 bg-black/20 hover:border-white/25',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="pick-offer"
                          checked={picked}
                          onChange={() => setPickedOffer(o.id)}
                        />
                        <span className="font-mono text-sm text-slate-200">
                          {prov?.name ?? o.providerId}
                        </span>
                        {!ready && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                            not ready
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        <span className="font-bold text-slate-200">
                          {o.price} {job.budgetAsset}
                        </span>{' '}
                        · {fmtDelivery(o.deliverySecs)}
                      </span>
                    </label>
                    {picked && readiness && readiness.blockers.length > 0 && (
                      <div className="mt-2">
                        <BlockerCards blockers={readiness.blockers} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className={CTA_BIG}
              disabled={!pickedOffer || f.busy !== null}
              onClick={() => void f.selectOffer(pickedOffer)}
            >
              {f.busy === 'selecting' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Wallet className="h-5 w-5" />
              )}
              Select offer &amp; sign with StarKey
            </button>
          </div>
        )}

        {stage === 'escrow' && flow && (
          <div className="space-y-4">
            {selectedOffer && (
              <p className="font-sans text-sm leading-relaxed text-slate-300">
                Selected:{' '}
                <span className="font-bold text-slate-100">
                  {selectedProvider?.name ?? selectedOffer.providerId}
                </span>{' '}
                — {selectedOffer.price} {job.budgetAsset} ·{' '}
                {fmtDelivery(selectedOffer.deliverySecs)}
              </p>
            )}
            {flow.escrowParams ? (
              <p className="font-sans text-sm leading-relaxed text-slate-300">
                Funding the job locks{' '}
                <span className="font-bold text-slate-100">
                  {fmtQuants(flow.escrowParams.maxPriceQuants, flow.escrowParams.assetDecimals)}{' '}
                  {flow.escrowParams.assetSymbol}
                </span>{' '}
                on-chain against the frozen job specification. The money is held by the on-chain
                contract — not by us and not by the provider. Any unused part comes back to you
                when you confirm, and you can cancel and get everything back at any time before
                you confirm. Need {flow.escrowParams.assetSymbol}? See the{' '}
                <a href="/wcosmo/" className="text-sky-400 hover:text-sky-300">
                  conversion guide
                </a>
                .
              </p>
            ) : (
              <p className="font-mono text-xs text-amber-300">
                Funding details are not available yet — refresh in a moment.
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
              Fund the job with StarKey
            </button>
            <p className="font-mono text-[11px] text-slate-500">
              Held on-chain, refunded if the job does not go ahead. After this signature
              everything is prepared automatically — your next and final action is Confirm &amp;
              start.
            </p>
          </div>
        )}

        {stage === 'preparing' && (
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-purple-300" />
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              <span className="font-bold text-slate-100">Preparing the final step…</span> We
              verify your funding on-chain and set up the provider&apos;s offer for
              confirmation. No action needed from you — the Confirm &amp; start button appears
              here in a moment.
            </p>
          </div>
        )}

        {stage === 'accept' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              The provider&apos;s offer is ready on-chain
              {f.quote && flow?.escrowParams && (
                <>
                  :{' '}
                  <span className="font-bold text-slate-100">
                    {fmtQuants(f.quote.price, flow.escrowParams.assetDecimals)}{' '}
                    {flow.escrowParams.assetSymbol}
                  </span>{' '}
                  from provider {f.quote.solver.slice(0, 10)}…
                </>
              )}
              . Confirming starts the job and returns any unused funds to you. The chain checks
              your confirmation against the exact offer terms — if the terms changed in the
              meantime, the chain rejects it.
            </p>
            <div className="flex items-center gap-2 font-mono text-sm">
              <Clock3
                className={cn('h-4 w-4', secsLeft < 60 ? 'text-amber-300' : 'text-emerald-300')}
              />
              <span className={cn(secsLeft < 60 ? 'text-amber-300' : 'text-emerald-300')}>
                Offer valid {fmtCountdown(secsLeft)}
              </span>
              <span className="text-[11px] text-slate-500">— renews automatically</span>
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
              Confirm &amp; start with StarKey
            </button>
          </div>
        )}

        {stage === 'arm-failed' && (
          <div className="space-y-4">
            <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Preparing the final step failed. Your funds are safe in the on-chain contract —
              you can retry below at no cost.
            </p>
            {f.armError && (
              <p className="font-mono text-[11px] text-slate-500">
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
            <p className="flex items-start gap-1.5 font-sans text-sm leading-relaxed text-slate-300">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              The offer&apos;s validity window ran out. Get a fresh one — it is free and needs
              no wallet signature.
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
              <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-purple-300" />
              <p className="font-sans text-sm leading-relaxed text-slate-300">
                <span className="font-bold text-slate-100">
                  On-chain job #{jobIdOnchain} is active — the provider is working.
                </span>{' '}
                Nothing to do right now; the approval button appears here once the result is
                delivered.
                {txAccept && (
                  <>
                    {' '}
                    <a
                      href={`${EXPLORER_TX}${txAccept}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300"
                    >
                      View the accept transaction
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
            {oj && nowSec <= oj.jobDeadlineSecs && (
              <p className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <Clock3 className="h-3.5 w-3.5 text-emerald-300" />
                Delivery due {fmtTs(oj.jobDeadlineSecs)}{' '}
                <span className="text-slate-500">({fmtRel(oj.jobDeadlineSecs, nowSec)})</span>
              </p>
            )}
            {oj && oj.status === JOB_ONCHAIN_STATUS.ACTIVE && nowSec > oj.jobDeadlineSecs && (
              <p className="flex items-start gap-1.5 font-mono text-xs leading-relaxed text-amber-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                The delivery deadline has passed without a result. Delivery is no longer possible
                on-chain, and you can get your locked funds back. Contact us and we will guide
                you through the steps.
              </p>
            )}
          </div>
        )}

        {stage === 'approve' && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              The provider delivered a result. The chain stores a fingerprint (SHA3-256 hash) of
              this attestation document, so the document cannot be changed afterwards:
            </p>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <a
                href={flow?.deliver?.attestationUri ?? attestationUrl(job.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs text-sky-400 hover:text-sky-300"
              >
                <FileJson className="h-3.5 w-3.5" />
                View the attestation document
              </a>
              {(job.attestationHash ?? flow?.deliver?.attestationHash) && (
                <p className="mt-2 break-all font-mono text-[11px] text-slate-400">
                  SHA3-256: {job.attestationHash ?? flow?.deliver?.attestationHash}
                  <span className="text-slate-500"> — the hash on-chain equals the SHA3-256 of that document.</span>
                </p>
              )}
            </div>
            {oj && oj.deliveredAt > 0 && (
              <p className="flex items-center gap-2 font-mono text-xs text-slate-400">
                <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                Review window until {fmtTs(oj.deliveredAt + oj.reviewWindowSecs)} — it is your
                turn to approve. After that time, settlement can be triggered by anyone, without
                your signature.
              </p>
            )}
            <p className="font-mono text-[11px] leading-relaxed text-slate-500">
              Something wrong with the result? You can dispute it on-chain — contact us before
              the review window ends and do not approve.
            </p>
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
              Approve delivery with StarKey
            </button>
            <p className="font-mono text-[11px] text-slate-500">
              Approval settles everything in one transaction: the provider is paid and their
              security deposit is released.
            </p>
          </div>
        )}

        {stage === 'blocked' && buyerBlock && (
          <div className="space-y-4">
            <p className="font-sans text-sm leading-relaxed text-slate-300">{buyerBlock.headline}</p>
            <BlockerCards blockers={buyerBlock.blockers} />
          </div>
        )}

        {stage === 'settled' && (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              <span className="font-bold text-emerald-300">Job settled on-chain.</span>{' '}
              {selectedOffer ? `${selectedOffer.price} ${job.budgetAsset}` : 'The payment'} was
              paid out to the provider and their security deposit was released. This job is
              complete — nothing more to do.
              {txRefs.deliver && (
                <>
                  {' '}
                  <a
                    href={`${EXPLORER_TX}${txRefs.deliver}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300"
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
                    className="text-sky-400 hover:text-sky-300"
                  >
                    Settlement transaction
                  </a>
                </>
              )}
              .
            </p>
          </div>
        )}
      </div>

      {f.error && (
        <p className="mt-4 flex items-start gap-1.5 font-mono text-[11px] text-rose-300">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {f.error}
        </p>
      )}
      {f.info && !f.error && <p className="mt-4 font-mono text-[11px] text-emerald-300">{f.info}</p>}

      {WALLET_STAGES.has(stage) && (
        <p className="mt-4 border-t border-white/5 pt-3 font-mono text-[11px] text-slate-500">
          You sign with your own StarKey wallet; this site never holds funds or keys. Every
          on-chain step is a verifiable Supra Mainnet transaction.
        </p>
      )}
    </div>
  );
}
