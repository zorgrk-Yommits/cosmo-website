'use client';

// Shared job info sections (role split 2026-07-23): facts, frozen spec and
// the on-chain transaction record are neutral evidence — both the buyer page
// (/market/job) and the provider page (/market/work) render them. Extracted
// from JobDetail to share by extraction, not duplication.

import { FileJson, Fingerprint, ListChecks } from 'lucide-react';
import { EXPLORER_TX } from '@/lib/mainnetOnchain';
import { specUrl, type MarketJob, type TxRefs } from '../lib/marketApi';
import { fmtRel, fmtTs } from '../lib/marketStatus';

export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-2">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs text-ink-1">{children}</dd>
    </div>
  );
}

const TX_LABELS: { key: keyof TxRefs; label: string }[] = [
  { key: 'create', label: 'Job funded' },
  { key: 'submitQuote', label: 'Provider offer confirmed' },
  { key: 'accept', label: 'Job confirmed & started' },
  { key: 'deliver', label: 'Result delivered' },
  { key: 'dispute', label: 'Delivery disputed' },
  { key: 'settle', label: 'Settled' },
];

// Explorer links for every recorded transaction — renders nothing when no tx
// exists yet. Sits inside the Lifecycle card on both pages.
export function TxRecord({ txRefs }: { txRefs: TxRefs }) {
  if (!Object.values(txRefs).some(Boolean)) return null;
  return (
    <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-3">
      {TX_LABELS.filter(({ key }) => txRefs[key]).map(({ key, label }) => (
        <Fact key={key} label={label}>
          <a
            href={`${EXPLORER_TX}${txRefs[key]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-phase-proof hover:text-phase-proof"
          >
            view transaction
          </a>
        </Fact>
      ))}
    </dl>
  );
}

export function JobFactsCard({ job, nowSec }: { job: MarketJob; nowSec: number }) {
  return (
    <div className="mt-4 rounded-xl border border-line-base bg-surface-1 p-6">
      <div className="mb-4 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-phase-active" />
        <h2 className="font-mono text-sm font-bold text-ink-0">Job</h2>
      </div>
      <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-ink-1">
        {job.description}
      </p>
      <div className="mt-4 rounded-lg border border-line-base bg-surface-inset p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-2">
          Acceptance criteria
        </p>
        <p className="mt-1.5 whitespace-pre-line font-sans text-sm leading-relaxed text-ink-1">
          {job.acceptanceCriteria}
        </p>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <Fact label="Budget">
          {job.budgetAmount} {job.budgetAsset}
        </Fact>
        <Fact label="Deadline">
          {fmtTs(job.deadlineTs)}{' '}
          <span className="text-ink-2">({fmtRel(job.deadlineTs, nowSec)})</span>
        </Fact>
        <Fact label="Posted">{fmtTs(job.createdAt)}</Fact>
      </dl>
    </div>
  );
}

export function FrozenSpecCard({ job }: { job: MarketJob }) {
  if (!job.specHash) return null;
  return (
    <div className="mt-4 rounded-xl border border-line-base bg-surface-1 p-6">
      <div className="mb-3 flex items-center gap-2">
        <Fingerprint className="h-4 w-4 text-phase-active" />
        <h2 className="font-mono text-sm font-bold text-ink-0">Frozen specification</h2>
      </div>
      <p className="font-sans text-sm leading-relaxed text-ink-1">
        On approval this job&apos;s specification was frozen to an immutable canonical
        document. The on-chain contract stores its SHA3-256 hash, so the specification
        cannot change after funding.
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-3">
        <Fact label="Spec hash (SHA3-256)">
          <span className="break-all">{job.specHash}</span>
        </Fact>
        <Fact label="Canonical document">
          <a
            href={specUrl(job.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-phase-proof hover:text-phase-proof"
          >
            <FileJson className="h-3 w-3" />
            {specUrl(job.id)}
          </a>
        </Fact>
      </dl>
    </div>
  );
}
