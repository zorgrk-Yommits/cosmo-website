import type { Metadata } from 'next';
import VaultDashboard from './VaultDashboard';

export const metadata: Metadata = {
  title: 'COSMO — Vault: custody, verifiable',
  description:
    'Live custody dashboard for the COSMO system on Supra Mainnet: maker operator bonds in the vault resource account, compute provider bond caps, and the wCOSMO peg — all read from on-chain view functions.',
};

export default function VaultPage() {
  return <VaultDashboard />;
}
