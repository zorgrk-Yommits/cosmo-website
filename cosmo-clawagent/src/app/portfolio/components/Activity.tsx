'use client';

// Row 7 of /portfolio: the latest confirmed transactions of the address.
// Confirmed = the chain reports the block it is in and whether it ran or failed.

import { useEffect, useState } from 'react';
import TechDetails from '@/components/cosmo/TechDetails';
import { EXPLORER_TX, shortAddr } from '@/lib/mainnetOnchain';
import { cn } from '@/lib/utils';
import { fmtUtc } from '../lib/positions';
import { ACTIVITY_LIMIT, fetchActivity, type ActivityResult } from '../lib/walletActivity';
import { Empty, Row } from './parts';

type Load = { state: 'loading' } | { state: 'ok'; res: ActivityResult } | { state: 'error' };

export default function Activity({ addr }: { addr: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    fetchActivity(addr)
      .then((res) => live && setLoad({ state: 'ok', res }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [addr]);

  return (
    <Row n="7" title="Latest transactions" tone="neutral">
      {load.state === 'loading' && <Empty>Reading the latest transactions …</Empty>}
      {load.state === 'error' && (
        <p className="font-sans text-sm text-phase-warn">
          The transactions could not be read. They are shown as unavailable, not as none.
        </p>
      )}
      {load.state === 'ok' && load.res.items.length === 0 && (
        <Empty>No confirmed transaction found for this address.</Empty>
      )}
      {load.state === 'ok' && load.res.items.length > 0 && (
        <ul className="space-y-1.5">
          {load.res.items.map((a) => (
            <li key={a.hash}>
              <a
                href={`${EXPLORER_TX}${a.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 rounded-lg border border-line-subtle bg-surface-inset/60 px-3 py-2 font-mono text-xs transition-colors hover:border-line-strong"
              >
                <span className="text-ink-2">{fmtUtc(a.timeSecs)}</span>
                <span className="min-w-0 truncate text-ink-0" title={a.fn}>
                  {a.fnShort}
                  {!a.sentByAddr && (
                    <span className="text-ink-2"> · sent by {a.sender ? shortAddr(a.sender) : 'another account'}</span>
                  )}
                </span>
                <span className={cn(a.ok ? 'text-phase-settled' : 'text-phase-fault')}>{a.ok ? 'ran' : 'failed'}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {load.state === 'ok' && load.res.missing.length > 0 && (
        <p className="font-sans text-xs text-phase-warn">
          One source could not be read ({load.res.missing.join(', ')}), so entries may be missing from this list.
        </p>
      )}
      <p className="mt-2 font-sans text-xs text-ink-2">
        The latest {ACTIVITY_LIMIT} confirmed transactions, not the full history. A transaction that is still waiting is not
        listed. Each row opens the transaction in the public explorer.
      </p>
      {load.state === 'ok' && load.res.items.length > 0 && (
        <TechDetails title="Technical details: transaction ids and blocks" className="mt-2">
          <ul className="space-y-1 font-mono text-[11px] leading-relaxed">
            {load.res.items.map((a) => (
              <li key={a.hash} className="break-all">
                block {a.height.toLocaleString('en-US')} · {a.hash} · {a.fn}
              </li>
            ))}
          </ul>
        </TechDetails>
      )}
    </Row>
  );
}
