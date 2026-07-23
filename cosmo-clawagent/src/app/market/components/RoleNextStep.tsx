'use client';

// L2 Lifecycle-Neuschnitt: ONE panel answers "whose turn is it and what is
// the one next action" — rendered from the server's next-steps document
// (GET /jobs/:id/next-steps), the same endpoint external solver agents
// consume. Role tabs end the buyer/provider mixing on the job page (finding
// B5): the buyer tab is the reworked NextStepPanel, the provider tab the
// reworked DeliverPanel, observers get the plain story. The connected wallet
// (via the flow hook) auto-highlights the matching role.

import { useCallback, useEffect, useState } from 'react';
import { Radio, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchNextSteps,
  type MarketJob,
  type MarketOffer,
  type MarketProvider,
  type NextRole,
  type NextStepsDoc,
} from '../lib/marketApi';
import { useMarketFlow } from '../lib/useMarketFlow';
import { sameWallet } from '../lib/marketWallet';
import NextStepPanel from './NextStepPanel';
import DeliverPanel from './DeliverPanel';
import WalletChip from './WalletChip';

const TURN_LABEL: Record<NextStepsDoc['turn'], string> = {
  buyer: 'Turn: buyer',
  provider: 'Turn: provider',
  server: 'Turn: server (automatic)',
  nobody: 'No action pending',
};

export default function RoleNextStep({
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
  const [doc, setDoc] = useState<NextStepsDoc | null>(null);
  const [tab, setTab] = useState<NextRole>('buyer');
  const [tabTouched, setTabTouched] = useState(false);

  // B7: the doc is personalized to the passively known wallet (?wallet=) so
  // the self-quote warning appears per offer BEFORE any selection is signed.
  const refreshDoc = useCallback(async () => {
    try {
      setDoc(await fetchNextSteps(job.id, f.wallet ?? undefined));
    } catch {
      setDoc(null); // backend down -> panels fall back fail-closed
    }
  }, [job.id, f.wallet]);

  useEffect(() => {
    void refreshDoc();
    const iv = setInterval(() => void refreshDoc(), 10_000);
    return () => clearInterval(iv);
  }, [refreshDoc]);

  // Auto-highlight the viewer's role once a wallet is connected — the wallet
  // decides, never a guess. Manual tab clicks always win.
  const buyerWallet = f.flow?.buyerWallet ?? job.buyerWallet ?? null;
  const solverWallet =
    doc?.roles.find((r) => r.role === 'provider')?.action?.signerWallet ??
    f.onchainJob?.solver ??
    null;
  // B7 (F4): also match the wallet against the offer providers' wallets so a
  // provider-wallet visitor lands on the provider tab BEFORE accept.
  const offerProviderWallets = providers
    .filter((p) => offers.some((o) => o.providerId === p.id))
    .map((p) => p.wallet)
    .filter((w): w is string => typeof w === 'string');
  useEffect(() => {
    if (tabTouched || !f.wallet) return;
    if (solverWallet && sameWallet(f.wallet, solverWallet)) setTab('provider');
    else if (buyerWallet && sameWallet(f.wallet, buyerWallet)) setTab('buyer');
    else if (offerProviderWallets.some((w) => sameWallet(f.wallet!, w))) setTab('provider');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.wallet, buyerWallet, solverWallet, tabTouched, offerProviderWallets.join(',')]);

  const providerBlock = doc?.roles.find((r) => r.role === 'provider') ?? null;
  const observerBlock = doc?.roles.find((r) => r.role === 'observer') ?? null;
  const turnRole: NextRole | null =
    doc?.turn === 'buyer' ? 'buyer' : doc?.turn === 'provider' ? 'provider' : null;

  const showProviderTab = job.status !== 'submitted' && job.status !== 'rejected';

  const tabs: { id: NextRole; label: string }[] = [
    { id: 'buyer', label: 'Buyer' },
    ...(showProviderTab ? [{ id: 'provider' as NextRole, label: 'Provider' }] : []),
    { id: 'observer', label: 'Observer' },
  ];

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setTabTouched(true);
              }}
              className={cn(
                'relative rounded-t-lg border border-b-0 px-4 py-2 font-mono text-xs transition-colors',
                tab === t.id
                  ? 'border-purple-500/40 bg-purple-500/[0.08] text-slate-100'
                  : 'border-white/10 bg-black/20 text-slate-400 hover:text-slate-200',
              )}
            >
              {t.label}
              {turnRole === t.id && (
                <span
                  className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400"
                  title="It is this role's turn"
                />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {doc && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <Radio className="h-3 w-3 text-emerald-300" />
              {TURN_LABEL[doc.turn]}
            </span>
          )}
          <WalletChip
            wallet={f.wallet}
            buyerWallet={buyerWallet}
            providers={providers}
            onConnect={() => void f.connect()}
          />
        </div>
      </div>

      {tab === 'buyer' && (
        <NextStepPanel job={job} offers={offers} providers={providers} doc={doc} f={f} />
      )}

      {tab === 'provider' &&
        (job.jobIdOnchain != null && job.status !== 'settled' ? (
          <DeliverPanel job={job} providers={providers} block={providerBlock} onChanged={onChanged} />
        ) : (
          <div className="mt-0 rounded-b-xl rounded-tr-xl border border-white/10 bg-white/[0.02] p-6">
            <p className="font-sans text-sm leading-relaxed text-slate-300">
              {providerBlock?.headline ?? 'Nothing for providers to do on this job right now.'}
            </p>
            {providerBlock && providerBlock.blockers.length > 0 && (
              <div className="mt-3 space-y-2">
                {providerBlock.blockers.map((b) => (
                  <p key={b.code} className="font-mono text-xs leading-relaxed text-slate-400">
                    <span className="text-amber-300">{b.cause}</span> {b.remedy}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}

      {tab === 'observer' && (
        <div className="mt-0 rounded-b-xl rounded-tr-xl border border-white/10 bg-white/[0.02] p-6">
          <p className="font-sans text-sm leading-relaxed text-slate-300">
            {observerBlock?.headline ?? 'Live state unavailable — retry shortly.'}
          </p>
          <p className="mt-3 border-t border-white/5 pt-3 font-mono text-[11px] text-slate-500">
            <Wallet className="mr-1 inline h-3 w-3" />
            Connect a wallet on the Buyer or Provider tab to act. Agents can consume this
            page&apos;s data machine-readably at{' '}
            <a
              href={`/api/market/jobs/${encodeURIComponent(job.id)}/next-steps`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              /next-steps
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
