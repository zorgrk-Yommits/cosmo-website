import type { Metadata } from 'next';
import MarketHome from './MarketHome';

export const metadata: Metadata = {
  title: 'COSMO — Job board: post a job, a provider does it, you pay after checking',
  description:
    'A pilot marketplace for digital work: post a job, hand-picked pilot providers make offers, and your payment stays locked on Supra Mainnet until you have checked the result.',
  // Redesign 2026-07-27: /market/ is the canonical market page again — `/`
  // is the product landing and no longer renders this component.
  alternates: { canonical: '/market/' },
};

export default function MarketPage() {
  return <MarketHome />;
}
