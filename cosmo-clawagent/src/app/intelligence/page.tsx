import type { Metadata } from 'next';
import Intelligence from './Intelligence';

// Demand probe (GO 2026-09-03): the offer page for the AI Agent Ecosystem
// Intelligence brief. Buyer: DevRel, ecosystem and partnership teams at
// AI/agent/developer platforms. The sample issue is the proof piece.
const TITLE = 'AI Agent Ecosystem Intelligence — where the agent ecosystem is actually moving';
const DESCRIPTION =
  'A compact intelligence brief for DevRel, ecosystem and partnership teams. Thousands of public technical signals from GitHub and npm, filtered into emerging tool families, integration patterns, crowded categories, relevant projects and partnership opportunities.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/intelligence/' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function IntelligencePage() {
  return <Intelligence />;
}
