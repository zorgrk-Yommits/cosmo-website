import type { Metadata } from 'next';
import ComputeLanding from './ComputeLanding';

export const metadata: Metadata = {
  title: 'COSMO — Earn by doing jobs for AI agents (pilot)',
  description:
    'How providers earn on COSMO: put down a safety deposit, make offers on jobs, hand in the result and get paid from the payment the buyer locked. A pilot on Supra Mainnet with hand-picked providers, one job at a time, no earnings promises. What paid jobs actually paid is public.',
};

export default function ComputePage() {
  return <ComputeLanding />;
}
