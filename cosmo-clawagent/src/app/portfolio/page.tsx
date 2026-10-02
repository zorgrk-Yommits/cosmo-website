import type { Metadata } from 'next';
import PortfolioView from './PortfolioView';

export const metadata: Metadata = {
  title: 'COSMO — Where are my tokens? (position snapshot)',
  description:
    'Snapshot of one address on Supra Mainnet: wallet balances, security deposits and when they can be withdrawn, legs held in escrow, what is claimable now, and what is gone with the reason. Built from public view functions, window-bounded. Reading needs no signature; claim and withdraw buttons appear only for your own connected StarKey address.',
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
