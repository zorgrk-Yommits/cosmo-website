import type { Metadata } from 'next';
import CosmoStory from './CosmoStory';

// The $COSMO token page (rewritten in the site-clarity refactor). Overrides
// openGraph/twitter so it does not inherit the layout defaults (Next merges
// metadata shallowly per top-level key).
const TITLE = 'COSMO — $COSMO: the token behind the deposits and the payments';
const DESCRIPTION =
  '$COSMO is the token of the COSMO project on Supra. Wrapped 1 to 1 as wCOSMO, it is what providers put down as a safety deposit and what a job can be paid in. What is live, what is a pilot and what is only planned is labelled; no yield is promised.';

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
