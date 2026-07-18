import type { Metadata } from 'next';
import Assurance from './Assurance';

const TITLE = 'COSMO Trust — Evidence, Honesty Principles, Assurance';
const DESCRIPTION =
  'Four settled on-chain proofs, the honesty rules this site holds itself to, and the Price Integrity Guard research module. Every claim links to a transaction or a hash.';

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
