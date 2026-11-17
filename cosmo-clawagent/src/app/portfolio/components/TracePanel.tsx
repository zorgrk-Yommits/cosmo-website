'use client';

// Row 8 of /portfolio: the way into TRACE for this address.
// (1) A trace that was generated earlier and stored as a static page, if there
//     is one for this address (public/trace/index.json).
// (2) "Open in local TRACE": prefills the tool on this machine. The link is
//     rendered only when this page itself was loaded from this machine, so a
//     visitor of the public site never sees a link to their own localhost.
// This page starts no trace and sends the address nowhere.

import { useEffect, useState } from 'react';
import { ExternalLink, Route } from 'lucide-react';
import { fmtUtc } from '../lib/positions';
import { findTrace, isLocalPage, localTraceUrl, parseTraceIndex, traceHref, type TraceEntry } from '../lib/walletLinks';
import { Empty, Row } from './parts';

type Load = { state: 'loading' } | { state: 'ok'; hit: TraceEntry | null } | { state: 'error' };

export default function TracePanel({ addr }: { addr: string }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  // This component is rendered only after a snapshot was read in the browser,
  // never on the server, so reading the location here cannot differ between the two.
  const local = typeof window !== 'undefined' && isLocalPage(window.location.hostname);

  useEffect(() => {
    let live = true;
    fetch('/trace/index.json', { cache: 'no-store' })
      .then((r) => (r.status === 404 ? [] : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: unknown) => live && setLoad({ state: 'ok', hit: findTrace(parseTraceIndex(body), addr) }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => {
      live = false;
    };
  }, [addr]);

  const localUrl = local ? localTraceUrl(addr) : null;

  return (
    <Row n="8" title="Trace: where the funds came from and went" tone="neutral">
      <p className="font-sans text-sm leading-relaxed text-ink-1">
        A trace follows the transfers of an address one step out and keeps the chain records it was built from, so every line
        can be checked.
      </p>
      {load.state === 'loading' && <Empty>Looking for a stored trace …</Empty>}
      {load.state === 'error' && <p className="font-sans text-sm text-phase-warn">The list of stored traces could not be read.</p>}
      {load.state === 'ok' && load.hit === null && <Empty>No trace published for this address yet.</Empty>}
      {load.state === 'ok' && load.hit && (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={traceHref(load.hit.run)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-phase-proof/50 bg-phase-proof/20 px-4 py-2 font-mono text-xs text-phase-proof transition-all hover:border-phase-proof hover:bg-phase-proof/30"
          >
            <Route className="h-3.5 w-3.5" />
            Open trace of this address
          </a>
          <span className="font-sans text-xs text-ink-2">
            generated {fmtUtc(Math.floor(Date.parse(load.hit.generated_at) / 1000))}. It shows the address as it was then, not as it is now.
          </span>
        </div>
      )}
      {localUrl && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle pt-3">
          <a
            href={localUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-line-base px-4 py-2 font-mono text-xs text-ink-1 transition-all hover:border-line-strong hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in local TRACE
          </a>
          <span className="font-sans text-xs text-ink-2">
            Opens the tool on this computer with the address filled in. You start the trace there yourself. Shown only on this computer.
          </span>
        </div>
      )}
    </Row>
  );
}
