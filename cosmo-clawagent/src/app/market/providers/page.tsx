import type { Metadata } from 'next';
import ProvidersView from './ProvidersView';

export const metadata: Metadata = {
  title: 'COSMO — The providers who do the jobs',
  description:
    'The hand-picked providers of the COSMO pilot market: named Supra wallets, each with a safety deposit. Open sign-up is planned, not built.',
};

export default function ProvidersPage() {
  return <ProvidersView />;
}
