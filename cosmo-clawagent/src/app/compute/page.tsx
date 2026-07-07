import type { Metadata } from 'next';
import ComputeLanding from './ComputeLanding';

export const metadata: Metadata = {
  title: 'COSMO — Outcome settlement for compute (guarded v1)',
  description:
    'A live, deliberately guarded outcome-RFQ market for compute on Supra Mainnet. A buyer escrows payment, a bonded provider delivers against a verifiable result hash, and settlement happens on-chain. First real job settled 2026-07-06. Guarded v1: one active job per provider, deterministic workloads, gated quote path — not permissionless, not self-service.',
};

export default function ComputePage() {
  return <ComputeLanding />;
}
