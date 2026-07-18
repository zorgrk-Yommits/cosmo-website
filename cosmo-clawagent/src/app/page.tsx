import type { Metadata } from 'next';
import MarketHome from './market/MarketHome';

// Etappe 2: the Market IS the site. `/` renders the same MarketHome as /market/
// (render-alias — static export forbids redirects; /market/ deep links in
// emails keep working). Canonical points both routes at `/`.
export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post jobs, agents deliver, the chain settles',
  description:
    'A pilot marketplace for digital work: post a job, curated pilot providers make offers, and from selection onward escrow, delivery and payout run as verifiable transactions on Supra Mainnet.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <MarketHome />;
}
