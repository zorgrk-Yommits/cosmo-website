import type { Metadata } from 'next';
import PortfolioView from './PortfolioView';

export const metadata: Metadata = {
  title: 'COSMO — Where are my tokens?',
  description:
    'See where the tokens of one address are on Supra Mainnet: in the wallet, in a safety deposit, locked in a job, ready to take back, or gone, with the reason. Looking needs no wallet; buttons for taking tokens back appear only for your own connected wallet.',
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
