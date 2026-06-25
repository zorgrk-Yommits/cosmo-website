import type { Metadata } from 'next';
import AccessGate from './AccessGate';

export const metadata: Metadata = {
  title: 'COSMO — Holder Access',
  description:
    'Connect your StarKey wallet to verify COSMO NFT holder access. Stage 1 holder gate — no trades, no permissionless Maker access, no on-chain transactions.',
};

export default function AccessPage() {
  return <AccessGate />;
}
