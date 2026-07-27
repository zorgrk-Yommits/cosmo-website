'use client';

// B7 (F1): the connected StarKey account, always visible on the job page.
// Before this chip existed the wallet was only read at signing time — the
// self-quote stranding happened because nobody could SEE they were browsing
// with the provider's wallet. The switch hint is deliberate explainer text:
// account switching lives inside the StarKey extension and cannot be moved
// into this product.

import { Wallet } from 'lucide-react';
import type { MarketProvider } from '../lib/marketApi';
import { sameWallet } from '../lib/marketWallet';

const short = (w: string) => `${w.slice(0, 10)}…${w.slice(-6)}`;

export default function WalletChip({
  wallet,
  buyerWallet,
  providers,
  onConnect,
}: {
  wallet: string | null;
  buyerWallet: string | null;
  providers: MarketProvider[];
  onConnect: () => void;
}) {
  const providerMatch = wallet ? providers.find((p) => p.wallet && sameWallet(p.wallet, wallet)) : undefined;
  const isBuyer = wallet && buyerWallet ? sameWallet(wallet, buyerWallet) : false;

  return (
    <div className="flex flex-col items-end gap-1">
      {wallet ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-base bg-surface-inset px-2.5 py-1 font-mono text-[10px] text-ink-1">
          <Wallet className="h-3 w-3 text-phase-active" />
          {short(wallet)}
          {providerMatch && (
            <span className="rounded-full bg-phase-proof/15 px-1.5 py-0.5 text-phase-proof">
              provider wallet: {providerMatch.name}
            </span>
          )}
          {isBuyer && !providerMatch && (
            <span className="rounded-full bg-phase-settled/15 px-1.5 py-0.5 text-phase-settled">buyer wallet</span>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-base bg-surface-inset px-2.5 py-1 font-mono text-[10px] text-ink-1 transition-colors hover:border-phase-active/40 hover:text-ink-0"
        >
          <Wallet className="h-3 w-3 text-phase-active" />
          Connect wallet
        </button>
      )}
      <span className="font-mono text-[10px] text-ink-2">
        To use a different account, switch it inside the StarKey browser extension, then reload.
      </span>
    </div>
  );
}
