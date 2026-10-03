import type { Metadata } from 'next';
import Assurance from './Assurance';

const TITLE = 'COSMO — Proof: what really happened, and how to check it';
const DESCRIPTION =
  'What was actually paid or run for real on COSMO, with the links to check each one: paid jobs on Supra Mainnet, runs under fixed rules, and a liquidity run on Ethereum mainnet. Plus the rules this site holds itself to and a research tool that checks prices.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
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

export default function AssurancePage() {
  return <Assurance />;
}
