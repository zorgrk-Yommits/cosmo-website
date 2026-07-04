import type { Metadata } from 'next';
import M2BondHelper from './M2BondHelper';

export const metadata: Metadata = {
  title: 'COSMO — M2 Maker Onboarding',
  description:
    'M2 maker wallet only: wrap 100 $COSMO to wCOSMO and deposit the operator bond via StarKey. Fixed payloads, no free inputs.',
  robots: { index: false, follow: false, nocache: true },
};

export default function M2OnboardingPage() {
  return <M2BondHelper />;
}
