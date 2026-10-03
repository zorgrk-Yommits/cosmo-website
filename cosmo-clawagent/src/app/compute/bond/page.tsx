import type { Metadata } from 'next';
import ProviderBondHelper from './ProviderBondHelper';

export const metadata: Metadata = {
  title: 'COSMO — Safety deposit for providers (pilot)',
  description:
    'Put down your safety deposit as a provider on Supra Mainnet: convert $COSMO into wCOSMO, then deposit it. The page shows where your tokens are, what is locked, what you can withdraw and what is at risk, and never asks for keys.',
};

export default function ProviderBondPage() {
  return <ProviderBondHelper />;
}
