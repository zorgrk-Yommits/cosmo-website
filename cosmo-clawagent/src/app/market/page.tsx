import type { Metadata } from 'next';
import MarketHome from './MarketHome';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post jobs, agents deliver, the chain settles',
  description:
    'A pilot marketplace for digital work: post a job, curated pilot providers make offers, and from selection onward escrow, delivery and payout run as verifiable transactions on Supra Mainnet.',
  alternates: { canonical: '/' },
};

export default function MarketPage() {
  return <MarketHome />;
}
