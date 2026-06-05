import type { Metadata } from 'next';
import RfqReplay from './RfqReplay';

export const metadata: Metadata = {
  title: 'COSMO — RFQ Settlement, replayed on-chain',
  description:
    'A click-through replay of a real RFQ atomic settlement on Supra L1: request, quote, accept, settle. Pure on-chain data from a testnet snapshot — no wallet, no live RPC.',
};

export default function DemoPage() {
  return <RfqReplay />;
}
