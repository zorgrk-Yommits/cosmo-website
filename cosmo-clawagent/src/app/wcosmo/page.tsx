import type { Metadata } from 'next';
import WcosmoGuide from './WcosmoGuide';

export const metadata: Metadata = {
  title: 'COSMO — wCOSMO: $COSMO in a form contracts can hold',
  description:
    'wCOSMO is $COSMO wrapped 1 to 1. Safety deposits are held in it. Anyone can wrap and unwrap at any time, the backing can be checked on-chain, and this page says honestly how to get $COSMO.',
};

export default function WcosmoPage() {
  return <WcosmoGuide />;
}
