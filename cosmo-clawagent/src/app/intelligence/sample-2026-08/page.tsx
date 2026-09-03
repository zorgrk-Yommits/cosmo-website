import type { Metadata } from 'next';
import Sample from './Sample';

const TITLE = 'AI Agent Ecosystem Intelligence — Sample issue, August 2026';
const DESCRIPTION =
  'Sample issue: four signals that matter, an ecosystem map, a watchlist of seven project families, two gaps with stated confidence, and what to watch next. Window 4 Aug to 3 Sep 2026. Public GitHub and npm data only.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/intelligence/sample-2026-08/' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function SamplePage() {
  return <Sample />;
}
