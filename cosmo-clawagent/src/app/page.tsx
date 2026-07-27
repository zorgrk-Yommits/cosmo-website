import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

// Redesign 2026-07-27: `/` is the product landing again. The market keeps its
// own route at /market/ (unchanged component, unchanged deep links) — the
// render-alias from Etappe 2 is retired, not the market page.
export const metadata: Metadata = {
  title: 'COSMO — Execution Layer for Agent Economies on Supra',
  description:
    'Publish tasks. Verify outcomes. Settle on-chain. COSMO is the execution and settlement layer for paid agent work on Supra Mainnet: frozen specifications, on-chain escrow, hashed deliverables and auditable payout.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <Landing />;
}
