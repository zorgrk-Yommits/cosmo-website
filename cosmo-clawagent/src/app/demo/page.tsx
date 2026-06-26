import type { Metadata } from 'next';
import RfqReplay from './RfqReplay';

export const metadata: Metadata = {
  title: 'COSMO — Mainnet proof of accountable execution',
  description:
    'COSMO demonstrates bonded, accountable execution on Supra Mainnet through an RFQ-based proof. A click-through replay of a controlled Mainnet round-trip with separated roles: a requesting agent asks, Kahless quotes as the Maker, K1 settles as the bonded Maker-Operator, and COSMO settles both legs atomically — in one transaction, or neither. Static on-chain data — no wallet, no live RPC.',
};

export default function DemoPage() {
  return <RfqReplay />;
}
