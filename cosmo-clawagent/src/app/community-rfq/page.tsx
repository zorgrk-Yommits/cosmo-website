import type { Metadata } from 'next';
import CommunityRfq from './CommunityRfq';

export const metadata: Metadata = {
  title: 'COSMO — Controlled Community RFQ Demo',
  description:
    'Stage 1 intent-only preview: a community wallet can request a small supUSDC → wCOSMO RFQ. Kahless can quote. COSMO can settle the selected request atomically on Supra Mainnet. Controlled demo — no funds move, no on-chain transaction, not a permissionless market.',
};

export default function CommunityRfqPage() {
  return <CommunityRfq />;
}
