import type { MarketJob } from '@/app/market/lib/marketApi';

// Everything the landing says about the live market is derived here, in one
// pure function, so it can be tested and so it can never quietly invent a
// number.
//
// The crucial distinction: `null` in means "we do not have the data" and
// yields `null` out — NOT a summary full of zeros. A rendered "0 settled"
// reads as a fact about the market; it must never be produced by a failed
// fetch. An empty array, by contrast, is a real answer and legitimately
// summarises to zeros.

export interface MarketSummary {
  total: number;
  open: number;
  inExecution: number;
  settled: number;
  latestSettled: MarketJob | null;
}

const OPEN: ReadonlySet<string> = new Set(['approved']);
const IN_EXECUTION: ReadonlySet<string> = new Set(['selected', 'onchain', 'delivered']);

export function deriveMarketSummary(jobs: MarketJob[] | null | undefined): MarketSummary | null {
  if (!Array.isArray(jobs)) return null;

  let open = 0;
  let inExecution = 0;
  const settledJobs: MarketJob[] = [];

  for (const job of jobs) {
    if (job.status === 'settled') settledJobs.push(job);
    else if (OPEN.has(job.status)) open += 1;
    else if (IN_EXECUTION.has(job.status)) inExecution += 1;
  }

  const latestSettled = settledJobs.reduce<MarketJob | null>(
    (newest, job) => (newest === null || job.updatedAt > newest.updatedAt ? job : newest),
    null,
  );

  return {
    total: jobs.length,
    open,
    inExecution,
    settled: settledJobs.length,
    latestSettled,
  };
}
