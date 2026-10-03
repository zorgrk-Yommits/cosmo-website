import type { Metadata } from 'next';
import { Suspense } from 'react';
import JobDetail from './JobDetail';

export const metadata: Metadata = {
  title: 'COSMO — Job: status and your next step',
  description:
    'Where a job on the COSMO market stands, whose turn it is, the offers, and every step with its public transaction.',
};

// useSearchParams requires a Suspense boundary under static export.
export default function JobPage() {
  return (
    <Suspense fallback={<div className="terminal-container terminal-theme-scope" />}>
      <JobDetail />
    </Suspense>
  );
}
