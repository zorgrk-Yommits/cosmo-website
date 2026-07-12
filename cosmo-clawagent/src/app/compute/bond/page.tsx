import type { Metadata } from 'next';
import ProviderBondHelper from './ProviderBondHelper';

export const metadata: Metadata = {
  title: 'COSMO — Compute provider security deposit (guarded v1)',
  description:
    'Place your compute provider security deposit on Supra Mainnet in two separate StarKey transactions: convert $COSMO into wCOSMO, then deposit the wCOSMO as your security. Live on-chain validation against provider_vault views — no keys, no server signers, guarded v1.',
};

export default function ProviderBondPage() {
  return <ProviderBondHelper />;
}
