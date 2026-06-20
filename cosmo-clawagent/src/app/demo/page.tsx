import type { Metadata } from 'next';
import RfqReplay from './RfqReplay';

export const metadata: Metadata = {
  title: 'COSMO — RFQ Settlement, replayed on-chain',
  description:
    'A click-through replay of a real RFQ atomic settlement on Supra Mainnet: request, quote, accept, settle — both legs in one transaction, or neither. Pure on-chain data from a founder-run round-trip — no wallet, no live RPC.',
};

export default function DemoPage() {
  return <RfqReplay />;
}
