import type { Metadata } from 'next';
import Institutional from './Institutional';

const TITLE = 'COSMO — The Institutional Layer for Autonomous Economies';
const DESCRIPTION =
  'Delegated authority, mandates, pinned policies, human arming, records, receipts, verification: the governance primitives that make autonomous action accountable — proven in a real micro-live execution case on SupraFX Mainnet.';

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

export default function InstitutionalPage() {
  return <Institutional />;
}
