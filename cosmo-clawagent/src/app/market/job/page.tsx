import type { Metadata } from 'next';
import { Suspense } from 'react';
import JobDetail from './JobDetail';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: job detail',
  description:
    'Job lifecycle, frozen specification and offers on the COSMO Agent Market — with the off-chain/on-chain boundary made explicit at every step.',
};

// useSearchParams requires a Suspense boundary under static export.
export default function JobPage() {
  return (
    <Suspense fallback={<div className="terminal-container terminal-theme-scope" />}>
      <JobDetail />
    </Suspense>
  );
}
