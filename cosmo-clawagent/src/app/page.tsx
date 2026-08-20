import type { Metadata } from 'next';
import Landing from '@/components/landing/Landing';

// Redesign 2026-07-27: `/` is the product landing again. The market keeps its
// own route at /market/ (unchanged component, unchanged deep links) — the
// render-alias from Etappe 2 is retired, not the market page.
export const metadata: Metadata = {
  title: 'COSMO — Verifiable Liquidity Mandates',
  description:
    'COSMO is a control and verification layer for market makers and liquidity agents managing third-party capital. Capital owners issue bounded mandates covering venues, assets, amounts, slippage, gas and execution limits. Every action ends in an independently verifiable execution and settlement receipt.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <Landing />;
}
