import type { Metadata } from 'next';
import VaultDashboard from './VaultDashboard';

export const metadata: Metadata = {
  title: 'COSMO — Where deposits are held',
  description:
    'Where safety deposits on COSMO are held, read live from Supra Mainnet: maker deposits, provider deposits with their limits, and the reserve that backs wCOSMO 1 to 1.',
};

export default function VaultPage() {
  return <VaultDashboard />;
}
