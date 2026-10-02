import type { Metadata } from 'next';
import PortfolioView from './PortfolioView';

export const metadata: Metadata = {
  title: 'COSMO — Where are my tokens? (position snapshot)',
  description:
    'Read-only snapshot of one address on Supra Mainnet: wallet balances, security deposits and when they can be withdrawn, legs held in escrow, what is claimable now, and what is gone with the reason. Built from public view functions, window-bounded, no signatures.',
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
