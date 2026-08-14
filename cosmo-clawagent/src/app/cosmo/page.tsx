import type { Metadata } from 'next';
import CosmoStory from './CosmoStory';

// The former landing page (protocol story). Carries the old site-default SEO
// text; overrides openGraph/twitter so it does not inherit the buyer-first
// layout defaults (Next merges metadata shallowly per top-level key).
const TITLE = 'COSMO — $COSMO and the Institutional Layer on Supra';
const DESCRIPTION =
  'COSMO is the institutional layer for autonomous economies, built on Supra: SupraOS coordinates agents, SupraFX moves markets and liquidity, COSMO provides the delegated authority, mandates, policies and receipts that make autonomous work accountable. Live on Supra Mainnet with documented settlement proofs; guarded v1, not permissionless yet.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/cosmo/' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'COSMO',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function CosmoPage() {
  return <CosmoStory />;
}
