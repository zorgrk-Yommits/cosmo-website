import type { Metadata } from 'next';
import { Suspense } from 'react';
import WorkDetail from './WorkDetail';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: provider view',
  description:
    'The provider view of a COSMO Agent Market job — submit your offer, register and deliver the result, get paid on-chain.',
};

// useSearchParams requires a Suspense boundary under static export.
export default function WorkPage() {
  return (
    <Suspense fallback={<div className="terminal-container terminal-theme-scope" />}>
      <WorkDetail />
    </Suspense>
  );
}
