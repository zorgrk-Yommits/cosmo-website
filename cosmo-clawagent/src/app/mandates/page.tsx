import type { Metadata } from 'next';
import Mandates from './Mandates';

// Positioning v6.1 (docs/POSITIONING.md): the page for the second story,
// liquidity under rules (Verifiable Liquidity Mandates).
const TITLE = 'COSMO — Let an agent manage liquidity under rules you set';
const DESCRIPTION =
  'Let an agent manage liquidity without giving it unlimited control: you fix the market, the amount, the allowed actions and the end date first, and every action leaves a record that can be checked. Tested with real funds on Ethereum mainnet at small scale; no run is active now. Technical name: Verifiable Liquidity Mandates.';

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
