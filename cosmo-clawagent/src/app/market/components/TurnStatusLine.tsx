'use client';

// Slim neutral status line (role split 2026-07-23): replaces the Observer
// tab. Shows whose turn it is — addressed to the page's own role — next to
// the connected-wallet chip. Fail-closed: no server document -> no turn chip
// (never a guess).

import { Radio } from 'lucide-react';
import type { MarketProvider, NextStepsDoc } from '../lib/marketApi';
import WalletChip from './WalletChip';

function turnLabel(ownRole: 'buyer' | 'provider', turn: NextStepsDoc['turn']): string {
  if (turn === ownRole) return 'Your turn';
  if (turn === 'buyer') return 'Waiting for the buyer';
  if (turn === 'provider') return 'Waiting for the provider';
  if (turn === 'server') return 'Automatic step running — no action needed';
  return 'No action pending';
}

export default function TurnStatusLine({
  ownRole,
  doc,
  wallet,
  buyerWallet,
  providers,
  onConnect,
}: {
  ownRole: 'buyer' | 'provider';
  doc: NextStepsDoc | null;
  wallet: string | null;
  buyerWallet: string | null;
  providers: MarketProvider[];
  onConnect: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
      {doc ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
          <Radio className="h-3 w-3 text-emerald-300" />
          {turnLabel(ownRole, doc.turn)}
        </span>
      ) : (
        <span aria-hidden="true" />
      )}
      <WalletChip wallet={wallet} buyerWallet={buyerWallet} providers={providers} onConnect={onConnect} />
    </div>
  );
}
