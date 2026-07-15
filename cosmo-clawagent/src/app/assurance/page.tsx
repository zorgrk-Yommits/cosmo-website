import type { Metadata } from 'next';
import Assurance from './Assurance';

const TITLE = 'COSMO Assurance — Price Integrity Guard';
const DESCRIPTION =
  'A read-only research prototype for independently evaluating the economic plausibility, freshness and evidence coverage of critical oracle values.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'COSMO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function AssurancePage() {
  return <Assurance />;
}
