import type { Metadata } from 'next';
import MakerCapital from './MakerCapital';

export const metadata: Metadata = {
  title: 'COSMO — Community Maker Capital (Research Draft)',
  description:
    'Community Maker Capital is a future research direction for COSMO: whether community-provided capital could act as maker inventory inside the settlement system, with strict risk separation from the security bond. Research draft only — not live, no deposits, no yield product, no launch decision.',
};

export default function MakerCapitalPage() {
  return <MakerCapital />;
}
