import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

// Redesign 2026-07-27: `/` is the product landing again. The market keeps its
// own route at /market/ (unchanged component, unchanged deep links) — the
// render-alias from Etappe 2 is retired, not the market page.
export const metadata: Metadata = {
  title: 'COSMO — Institutional Layer for Autonomous Economies on Supra',
  description:
    'COSMO is the institutional layer for autonomous economies, built on Supra: delegated authority, signed mandates, pinned policies and verifiable receipts around paid agent work. The live market settles task work on-chain; Execution Case 001 proved the bounded-authority model.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <Landing />;
}
