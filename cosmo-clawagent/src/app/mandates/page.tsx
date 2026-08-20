import type { Metadata } from 'next';
import Mandates from './Mandates';

// Positioning v6.0 (docs/POSITIONING.md): the dedicated page for the primary
// story — Verifiable Liquidity Mandates for market makers and liquidity
// managers deploying entrusted capital.
const TITLE = 'COSMO Mandates — Delegate liquidity without blind trust';
const DESCRIPTION =
  'Verifiable Liquidity Mandates: capital owners define venues, assets, amounts, slippage, gas and execution limits in a signed mandate. Agents execute within hard limits. Every action ends in an independently verifiable execution and settlement receipt.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/mandates/' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function MandatesPage() {
  return <Mandates />;
}
