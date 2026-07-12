import type { Metadata } from 'next';
import RfqActivity from './RfqActivity';

export const metadata: Metadata = {
  title: 'COSMO — RFQ Activity: an autonomous maker, live',
  description:
    'Watch an autonomous maker quote, fund and settle RFQ trades on Supra Mainnet — reconstructed live from public on-chain view functions, with full transaction evidence for the first autonomous trade.',
};

export default function RfqPage() {
  return <RfqActivity />;
}
