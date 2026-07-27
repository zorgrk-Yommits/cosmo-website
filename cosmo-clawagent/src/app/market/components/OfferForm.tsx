'use client';

// Wallet-signed offer flow (M3): connect StarKey -> match against the curated
// provider roster -> sign the server-issued challenge -> submit the proof.
// Only wallets registered as pilot providers can make offers; everyone else
// sees an honest hint instead of a form.

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, PenLine, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { requestOfferChallenge, submitWalletOffer, type MarketProvider } from '../lib/marketApi';
import { connectWallet, sameWallet, signChallenge } from '../lib/marketWallet';

const DELIVERY_OPTIONS: { label: string; secs: number }[] = [
  { label: '6 hours', secs: 6 * 3600 },
  { label: '12 hours', secs: 12 * 3600 },
  { label: '24 hours', secs: 24 * 3600 },
  { label: '2 days', secs: 2 * 86400 },
  { label: '3 days', secs: 3 * 86400 },
  { label: '5 days', secs: 5 * 86400 },
  { label: '7 days', secs: 7 * 86400 },
];

const inputCls =
  'w-full rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-2 focus:border-phase-active/50 focus:outline-none';

export default function OfferForm({
  jobId,
  budgetAsset,
  providers,
  onSubmitted,
}: {
  jobId: string;
  budgetAsset: string;
  providers: MarketProvider[];
  onSubmitted: () => void;
}) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [deliverySecs, setDeliverySecs] = useState(86400);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'idle' | 'signing' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const provider = wallet ? providers.find((p) => sameWallet(p.wallet, wallet)) ?? null : null;

  async function onConnect() {
    setError(null);
    try {
      setWallet(await connectWallet());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    setError(null);
    if (!/^\d{1,12}(\.\d{1,6})?$/.test(price.trim())) {
      setError('Price must be a decimal number with up to 6 fraction digits.');
      return;
    }
    setPhase('signing');
    try {
      const terms = {
        jobId,
        providerId: provider.id,
        price: price.trim(),
        deliverySecs,
        note: note.trim() || undefined,
      };
      const challenge = await requestOfferChallenge(terms);
      // StarKey signs the hex-decoded bytes; the server verifies the TEXT and
      // burns the nonce after one use.
      const proof = await signChallenge(challenge.hexMessage, challenge.nonce);
      await submitWalletOffer(terms, { message: challenge.challenge, ...proof });
      setPhase('done');
      onSubmitted();
    } catch (err) {
      setPhase('idle');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (phase === 'done') {
    return (
      <div className="rounded-xl border border-phase-settled/30 bg-phase-settled/[0.06] p-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-phase-settled" />
          <p className="font-mono text-sm text-ink-0">Offer submitted and signature verified.</p>
        </div>
        <p className="mt-1.5 font-sans text-sm text-ink-1">
          Your wallet-signed offer is now listed on this job. Submitting again replaces it.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line-base bg-surface-inset p-4">
      <div className="mb-3 flex items-center gap-2">
        <PenLine className="h-4 w-4 text-phase-active" />
        <h3 className="font-mono text-sm font-bold text-ink-0">Make an offer</h3>
        <span className="rounded-full border border-line-base bg-white/[0.02] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-1">
          pilot providers only
        </span>
      </div>

      {!wallet && (
        <div>
          <p className="font-sans text-sm leading-relaxed text-ink-1">
            Offers are signed with the provider&apos;s registered Supra wallet. Connect StarKey to
            continue — only wallets on the{' '}
            <Link href="/market/providers/" className="text-phase-proof hover:text-phase-proof">
              curated pilot roster
            </Link>{' '}
            can submit.
          </p>
          <button
            type="button"
            onClick={() => void onConnect()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-phase-active/40 bg-phase-active/15 px-4 py-2 font-mono text-sm text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/25"
          >
            <Wallet className="h-4 w-4" />
            Connect StarKey
          </button>
        </div>
      )}

      {wallet && !provider && (
        <p className="font-sans text-sm leading-relaxed text-ink-1">
          The connected wallet{' '}
          <span className="font-mono text-xs text-ink-1">
            {wallet.slice(0, 10)}…{wallet.slice(-6)}
          </span>{' '}
          is not on the curated pilot roster, so it cannot submit offers. Want in? See{' '}
          <Link href="/market/providers/" className="text-phase-proof hover:text-phase-proof">
            how providers are onboarded
          </Link>
          .
        </p>
      )}

      {wallet && provider && (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="font-sans text-sm text-ink-1">
            Signing as <span className="font-mono text-ink-0">{provider.name}</span>{' '}
            <span className="font-mono text-xs text-ink-2">
              ({wallet.slice(0, 10)}…{wallet.slice(-6)})
            </span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-1">
                Price ({budgetAsset})
              </span>
              <input
                className={cn(inputCls, 'mt-1.5')}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="45"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-1">
                Delivery time
              </span>
              <select
                className={cn(inputCls, 'mt-1.5')}
                value={deliverySecs}
                onChange={(e) => setDeliverySecs(Number(e.target.value))}
              >
                {DELIVERY_OPTIONS.map((o) => (
                  <option key={o.secs} value={o.secs}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-1">
              Note (optional)
            </span>
            <textarea
              className={cn(inputCls, 'mt-1.5 min-h-16')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              placeholder="Approach, assumptions, what you need from the buyer…"
            />
          </label>
          <button
            type="submit"
            disabled={phase === 'signing'}
            className="inline-flex items-center gap-2 rounded-lg border border-phase-active/40 bg-phase-active/15 px-4 py-2 font-mono text-sm text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PenLine className="h-4 w-4" />
            {phase === 'signing' ? 'Waiting for wallet signature…' : 'Sign offer with StarKey'}
          </button>
          <p className="font-sans text-xs leading-relaxed text-ink-2">
            StarKey will ask you to approve a signature over the exact offer terms (job, price,
            delivery, one-time nonce). Nothing is broadcast on-chain at this step.
          </p>
        </form>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-phase-fault/30 bg-phase-fault/10 px-4 py-2.5 font-mono text-xs text-phase-fault">
          {error}
        </div>
      )}
    </div>
  );
}
