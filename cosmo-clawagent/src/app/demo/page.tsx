import type { Metadata } from 'next';
import RfqReplay from './RfqReplay';

export const metadata: Metadata = {
  title: 'COSMO — RFQ Settlement, replayed on-chain',
  description:
    'A click-through replay of a controlled Mainnet RFQ proof on Supra with separated roles: a requesting agent asks, Kahless quotes as the Maker, K1 settles as the bonded Maker-Operator, and COSMO settles both legs atomically — in one transaction, or neither. Static on-chain data — no wallet, no live RPC.',
};

export default function DemoPage() {
  return <RfqReplay />;
}
