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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] text-slate-300">
          <Wallet className="h-3 w-3 text-purple-300" />
          {short(wallet)}
          {providerMatch && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-amber-300">
              provider wallet: {providerMatch.name}
            </span>
          )}
          {isBuyer && !providerMatch && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">buyer wallet</span>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-2.5 py-1 font-mono text-[10px] text-slate-300 transition-colors hover:border-purple-500/40 hover:text-slate-100"
        >
          <Wallet className="h-3 w-3 text-purple-300" />
          Connect wallet
        </button>
      )}
      <span className="font-mono text-[10px] text-slate-500">
        To use a different account, switch it inside the StarKey browser extension, then reload.
      </span>
    </div>
  );
}
