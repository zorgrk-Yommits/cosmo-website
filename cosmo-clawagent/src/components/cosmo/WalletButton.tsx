'use client';

import { Wallet } from 'lucide-react';
import { shortAddr } from '@/lib/mainnetOnchain';
import { cn } from '@/lib/utils';
import { ctaClasses } from './Cta';

// One look for "connect your wallet" and "this is the wallet you are using".
// Presentational only: each page keeps its own connect logic and passes the
// address in. The account can only be switched inside the StarKey extension,
// which is why that hint is part of the component and not left to each page.

export default function WalletButton({
  address,
  onConnect,
  busy = false,
  role,
  className,
}: {
  address: string | null;
  onConnect: () => void;
  busy?: boolean;
  // what this wallet is on the current page, e.g. "buyer wallet"
  role?: string;
  className?: string;
}) {
  if (!address) {
    return (
      <button
        type="button"
        onClick={onConnect}
        disabled={busy}
        className={cn(ctaClasses('secondary', 'md'), className)}
      >
        <Wallet className="h-4 w-4" aria-hidden="true" />
        {busy ? 'Connecting…' : 'Connect wallet'}
      </button>
    );
  }
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="inline-flex items-center gap-2 self-start rounded-lg border border-line-base bg-surface-inset px-3 py-2 font-mono text-xs text-ink-0">
        <Wallet className="h-3.5 w-3.5 text-phase-settled" aria-hidden="true" />
        <span className="sr-only">Connected wallet </span>
        {shortAddr(address)}
        {role && <span className="text-ink-2">· {role}</span>}
      </span>
      <span className="text-xs text-ink-2">
        To use another account, switch it in the StarKey extension and reload.
      </span>
    </div>
  );
}
