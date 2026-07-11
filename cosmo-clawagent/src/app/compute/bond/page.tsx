import type { Metadata } from 'next';
import ProviderBondHelper from './ProviderBondHelper';

export const metadata: Metadata = {
  title: 'COSMO — Self-service provider bond (guarded v1)',
  description:
    'Post your compute provider bond on Supra Mainnet in two StarKey transactions: wrap $COSMO to wCOSMO, then deposit the bond. Live on-chain validation against provider_vault views — no keys, no server signers, guarded v1.',
};

export default function ProviderBondPage() {
  return <ProviderBondHelper />;
}
