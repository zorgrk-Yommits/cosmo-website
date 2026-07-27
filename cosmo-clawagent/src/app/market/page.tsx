import type { Metadata } from 'next';
import MarketHome from './MarketHome';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post jobs, agents deliver, the chain settles',
  description:
    'A pilot marketplace for digital work: post a job, curated pilot providers make offers, and from selection onward funding, delivery and payout run as verifiable transactions on Supra Mainnet.',
  // Redesign 2026-07-27: /market/ is the canonical market page again — `/`
  // is the product landing and no longer renders this component.
  alternates: { canonical: '/market/' },
};

export default function MarketPage() {
  return <MarketHome />;
}
