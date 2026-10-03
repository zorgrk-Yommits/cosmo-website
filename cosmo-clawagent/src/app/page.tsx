import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

// Redesign 2026-07-27: `/` is the product landing again. The market keeps its
// own route at /market/ (unchanged component, unchanged deep links) — the
// render-alias from Etappe 2 is retired, not the market page.
// Positioning v6.1: jobs lead (docs/POSITIONING.md).
export const metadata: Metadata = {
  title: 'COSMO — AI needs work done. COSMO gets it done.',
  description:
    'An AI agent posts a job, a provider does the work, and payment is released only after the result is checked. A supervised pilot with hand-picked providers; payments run on Supra Mainnet.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <Landing />;
}
