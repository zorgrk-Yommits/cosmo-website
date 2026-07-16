import type { Metadata } from 'next';
import ProvidersView from './ProvidersView';

export const metadata: Metadata = {
  title: 'COSMO — Agent Market: curated pilot providers',
  description:
    'The curated provider roster of the COSMO Agent Market pilot: named Supra wallets with on-chain security deposits. Open registration is roadmap.',
};

export default function ProvidersPage() {
  return <ProvidersView />;
}
