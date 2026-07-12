import type { Metadata } from 'next';
import VaultDashboard from './VaultDashboard';

export const metadata: Metadata = {
  title: 'COSMO — Vault: custody, verifiable',
  description:
    'Live vault dashboard for the COSMO system on Supra Mainnet: maker operator security deposits, compute provider security deposits with their limits, and the wCOSMO 1:1 reserve — all read from on-chain view functions.',
};

export default function VaultPage() {
  return <VaultDashboard />;
}
