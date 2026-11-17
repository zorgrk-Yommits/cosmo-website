// Pure helpers for the "Jobs" and "Trace" areas of /portfolio
// (plans/cosmo-wallet-v01-plan.md, C4 and D). No fetch, no wallet, no signing.

import { sameAddr } from '@/lib/mainnetOnchain';
import type { MarketJob } from '@/app/market/lib/marketApi';
import type { MyJobEntry } from '@/app/market/lib/myJobs';

// ---- Marketplace jobs --------------------------------------------------------------
// The marketplace records the buyer address once the buyer has chosen an offer.
// Before that a job belongs to no address; such jobs are only known to the
// browser that posted them and are listed separately, never as "of this address".
export type WalletJobs = { ofAddress: MarketJob[]; fromThisBrowser: MyJobEntry[] };

export function selectJobs(jobs: MarketJob[], addr: string, local: MyJobEntry[]): WalletJobs {
  const ofAddress = jobs
    .filter((j) => typeof j.buyerWallet === 'string' && j.buyerWallet !== '' && sameAddr(j.buyerWallet, addr))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const known = new Set(ofAddress.map((j) => j.id));
  return { ofAddress, fromThisBrowser: local.filter((e) => !known.has(e.id)) };
}

export const jobHref = (id: string) => `/market/job/?id=${encodeURIComponent(id)}`;

// ---- TRACE -------------------------------------------------------------------------
// public/trace/index.json is written by scripts/import-trace-run.cjs.
export type TraceEntry = { address: string; chain: string; run: string; generated_at: string; hops: number };

const RUN_RE = /^run-\d{8}T\d{6}Z$/;
const ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;

export function parseTraceIndex(body: unknown): TraceEntry[] {
  const list = Array.isArray(body) ? body : [];
  const out: TraceEntry[] = [];
  for (const v of list) {
    if (typeof v !== 'object' || v === null) continue;
    const e = v as Record<string, unknown>;
    if (
      typeof e.address === 'string' && ADDR_RE.test(e.address) &&
      typeof e.chain === 'string' &&
      typeof e.run === 'string' && RUN_RE.test(e.run) &&
      typeof e.generated_at === 'string' && !Number.isNaN(Date.parse(e.generated_at)) &&
      typeof e.hops === 'number'
    ) {
      out.push({ address: e.address, chain: e.chain, run: e.run, generated_at: e.generated_at, hops: e.hops });
    }
  }
  return out;
}

// Newest published Supra trace for this address, or null.
export function findTrace(index: TraceEntry[], addr: string): TraceEntry | null {
  const hits = index.filter((e) => e.chain === 'supra' && sameAddr(e.address, addr));
  hits.sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at));
  return hits[0] ?? null;
}

export const traceHref = (run: string) => `/trace/${run}/index.html`;

// The local TRACE tool listens on this machine only. The button that opens it is
// shown only when this page itself was loaded from this machine.
export const LOCAL_TRACE_ORIGIN = 'http://127.0.0.1:4777';

export function isLocalPage(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function localTraceUrl(addr: string): string | null {
  if (!ADDR_RE.test(addr)) return null;
  return `${LOCAL_TRACE_ORIGIN}/?input=${encodeURIComponent(addr)}&chain=supra`;
}
