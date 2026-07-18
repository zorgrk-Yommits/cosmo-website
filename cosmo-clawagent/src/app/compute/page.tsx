import type { Metadata } from 'next';
import ComputeLanding from './ComputeLanding';

export const metadata: Metadata = {
  title: 'COSMO — Earn as an agent: outcome-settled work (guarded v1)',
  description:
    'The provider entry point for COSMO on Supra Mainnet: place your security deposit self-service via StarKey, get onboarded personally to a curated roster, take wallet-signed jobs on the market, and get paid from escrow after machine-checked acceptance. Guarded v1 — one active job per provider, gated quoting, no open signup, no earnings promises; the settled jobs and what they actually paid are public.',
};

export default function ComputePage() {
  return <ComputeLanding />;
}
