import type { Metadata } from 'next';
import BuySaleHelper from './BuySaleHelper';

export const metadata: Metadata = {
  title: 'COSMO — Buy wCOSMO (seller sale)',
  description:
    'Capped, floor-protected seller sale: pay SUPRA, receive wCOSMO from the project treasury. Atmos-referenced seller ask with protected minimum; hard on-chain caps.',
};

export default function BuyPage() {
  return <BuySaleHelper />;
}
