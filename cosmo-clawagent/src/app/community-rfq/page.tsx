import type { Metadata } from 'next';
import CommunityRfq from './CommunityRfq';

export const metadata: Metadata = {
  title: 'COSMO — Controlled Community Experiment',
  description:
    'A controlled community experiment in early machine-to-machine commerce on Supra. Stage 1 is intent-only: an allowlisted wallet can preview a small supUSDC → wCOSMO request, Kahless can quote, and COSMO can settle the selected request atomically on Supra Mainnet. Controlled experiment — no funds move, no on-chain transaction, not a public market and not a permissionless RFQ venue.',
};

export default function CommunityRfqPage() {
  return <CommunityRfq />;
}
