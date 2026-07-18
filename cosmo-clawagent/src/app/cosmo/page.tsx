import type { Metadata } from 'next';
import CosmoStory from './CosmoStory';

// The former landing page (protocol story). Carries the old site-default SEO
// text; overrides openGraph/twitter so it does not inherit the buyer-first
// layout defaults (Next merges metadata shallowly per top-level key).
const TITLE = 'COSMO — Execution & Accountability Layer for the Agent Economy';
const DESCRIPTION =
  'COSMO is the execution layer of the agent stack on Supra: SupraOS coordinates agents, SupraFX moves markets and liquidity, COSMO settles the work — bonded, atomic, accountable on-chain execution. Live on Supra Mainnet with documented settlement proofs; guarded v1, not permissionless yet.';

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
