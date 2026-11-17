'use client';

// Wallet status at the top of /portfolio: is a wallet there, which address,
// which network. Reads the shared session; the only action is Connect.

import { Loader2, Plug } from 'lucide-react';
import Chip from '@/components/cosmo/Chip';
import { CHAIN_ID, EXPLORER_ADDR, shortAddr } from '@/lib/mainnetOnchain';
import type { WalletState } from '@/lib/walletSession';

export default function WalletStatus({
  wallet,
  onConnect,
  busy,
}: {
  wallet: WalletState;
  onConnect: () => void;
  busy: boolean;
}) {
  const connected = wallet.status === 'connected' && wallet.address !== null;
  return (
    <section aria-label="Your wallet" className="mt-8 rounded-xl border border-line-base bg-surface-1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-ink-2">Your wallet</span>
          {wallet.status === 'no-wallet' && <Chip tone="idle">StarKey not found</Chip>}
          {wallet.status === 'disconnected' && <Chip tone="idle">Not connected</Chip>}
          {connected && <Chip tone="settled">Connected</Chip>}
          {connected &&
            (wallet.onMainnet ? (
              <Chip tone="neutral">Supra mainnet</Chip>
            ) : (
              <Chip tone="warn">Other network</Chip>
            ))}
        </div>
        {!connected && wallet.status !== 'no-wallet' && (
          <button
            type="button"
            onClick={onConnect}
            disabled={wallet.connecting || busy}
            className="inline-flex items-center gap-2 rounded-lg border border-line-base px-4 py-2 font-mono text-xs text-ink-1 transition-all hover:border-line-strong hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {wallet.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            Connect wallet
          </button>
        )}
      </div>

      {connected && (
        <p className="mt-3 font-mono text-sm text-ink-0">
          <a
            href={`${EXPLORER_ADDR}${wallet.address}`}
            target="_blank"
            rel="noopener noreferrer"
            title={wallet.address ?? undefined}
            className="underline decoration-line-strong hover:text-white"
          >
            {shortAddr(wallet.address!)}
          </a>
        </p>
      )}
      {connected && !wallet.onMainnet && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 basis-64 font-sans text-xs leading-relaxed text-phase-warn">
            Your wallet is on another network{wallet.chainId ? ` (${wallet.chainId})` : ''}. Everything on this page is still read
            from Supra mainnet ({CHAIN_ID}). Taking tokens back needs Supra mainnet: switch in StarKey, or use the button. This
            page notices the change.
          </p>
          <button
            type="button"
            onClick={onConnect}
            disabled={wallet.connecting || busy}
            className="inline-flex items-center gap-2 rounded-lg border border-phase-warn/50 px-4 py-2 font-mono text-xs text-phase-warn transition-all hover:border-phase-warn disabled:cursor-not-allowed disabled:opacity-40"
          >
            {wallet.connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
            Switch to Supra mainnet
          </button>
        </div>
      )}
      {wallet.status === 'no-wallet' && (
        <p className="mt-3 font-sans text-xs leading-relaxed text-ink-1">
          The StarKey wallet was not found in this browser. You can still type any address below: looking needs no wallet.
        </p>
      )}
      {wallet.status === 'disconnected' && (
        <p className="mt-3 font-sans text-xs leading-relaxed text-ink-2">
          Connecting shows your own address and unlocks the buttons for taking tokens back. It does not move anything.
        </p>
      )}
      {wallet.error && <p className="mt-2 font-mono text-xs text-phase-warn">{wallet.error}</p>}
    </section>
  );
}
