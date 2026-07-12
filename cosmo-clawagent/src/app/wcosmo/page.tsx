import type { Metadata } from 'next';
import WcosmoGuide from './WcosmoGuide';

export const metadata: Metadata = {
  title: 'COSMO — wCOSMO: the security-deposit asset',
  description:
    'wCOSMO is the plain 1:1 wrapper around $COSMO that denominates every security deposit in the COSMO system. Permissionless wrap/unwrap, on-chain verifiable peg, and the honest answer on obtaining $COSMO (OTC / community — no public listing).',
};

export default function WcosmoPage() {
  return <WcosmoGuide />;
}
