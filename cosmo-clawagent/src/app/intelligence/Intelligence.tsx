// AI Agent Ecosystem Intelligence — offer page (demand probe, GO 2026-09-03).
//
// Deliberately a SERVER component: no hooks, no wallet, no RPC, no motion.
// Everything the page promises must be visible in the published sample issue.
// Banned here by decision: exclusive data, complete market coverage, funding
// data, price monitoring, Product Hunt / Hacker News signals, revenue data,
// winner predictions, custom research. The value sold is filtering + family
// detection + cross-signal analysis + interpretation for ecosystem decisions.
//
// The order CTA is data-driven (src/data/intelligence-offer.json). While
// payment_url is empty the page shows the price and the sample but no live
// checkout — and says so plainly.

import Link from 'next/link';
import { ArrowRight, Filter, Layers, Route, BookOpen, ShieldQuestion } from 'lucide-react';
import Chip from '@/components/cosmo/Chip';
import { CtaLink, ctaClasses } from '@/components/cosmo/Cta';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import offer from '@/data/intelligence-offer.json';

const VALUE = [
  {
    icon: Filter,
    title: 'Filtering',
    body: 'Roughly 2,000 new repositories and 1,400 packages a month, reduced to the handful of movements an ecosystem team should act on. Forks, templates, satellite clones and vendor marketing repos are removed and named as noise.',
  },
  {
    icon: Layers,
    title: 'Family detection',
    body: 'Projects are grouped into the tool families they actually belong to — shells, bridges, installers, primitives — so one launch with forty satellites reads as one movement, not forty.',
  },
  {
    icon: Route,
    title: 'Cross-signal analysis',
    body: 'GitHub attention is checked against npm adoption, release cadence and commit activity. A 2,800-star project with 100 downloads a month is reported as exactly that.',
  },
  {
    icon: BookOpen,
    title: 'Interpretation for ecosystem decisions',
    body: 'Each signal ends in what it means for your integration, partnership and channel decisions — and in a possible action, not a headline.',
  },
];

const CONTENTS = [
  ['This month', 'What visibly changed, in five sentences.'],
  ['Four signals that matter', 'Observation, evidence, meaning for ecosystem work, possible action.'],
  ['Ecosystem map', 'Which tool families are expanding, crowded, emerging, under-represented.'],
  ['Watchlist', 'Five to eight projects or families with strategic relevance: integration targets, bridges into or out of your ecosystem, distribution choke points, early partners for a gap. Chosen for relevance, not size.'],
  ['Opportunity / gap', 'At most two, evidence separated from interpretation, confidence stated.'],
  ['What to watch next', 'Three to five concrete signals for the next window, so the next issue reports movement, not repetition.'],
];

const NOT = [
  'Not a dataset, export or API. You receive an analysis.',
  'Not funding, revenue or pricing intelligence. We do not collect it.',
  'Not coverage of closed-source products without a public repository or package.',
  'Not Product Hunt or Hacker News data.',
  'Not complete. The sample is the most visible slice of public activity, and the brief says where it is thin.',
  'Not personal data. Projects are referenced; people are not profiled.',
  'Not custom research. One category, one window, one method — the same for every reader.',
];

const FOR = [
  'DevRel and ecosystem teams at agent platforms and harness vendors',
  'Developer-infrastructure providers adding agent integrations',
  'Tool and protocol vendors growing developer adoption',
];

export default function Intelligence() {
  const hasCheckout = offer.payment_url.length > 0;
  const hasMonthlyCheckout = offer.monthly_payment_url.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-14 md:px-6 md:pt-20">
      {/* Hero */}
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="active">intelligence brief</Chip>
          <Chip tone="neutral">public GitHub + npm signals</Chip>
          <Chip tone="neutral">3 pages</Chip>
        </div>
        <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-ink-0 md:text-5xl">
          Know where the AI agent ecosystem is actually moving.
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-1">
          A compact intelligence brief for DevRel, ecosystem and partnership teams at AI and developer
          platforms. We filter thousands of public technical signals into the tool families that are
          forming, the integration patterns that are accelerating, the categories that are already
          crowded, and the projects worth a partnership conversation.
        </p>
        <p className="max-w-3xl text-base leading-relaxed text-ink-2">
          You are not paying for GitHub data. You are paying for filtering, family detection,
          cross-signal analysis and interpretation — the work between the raw signals and an
          ecosystem decision.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={offer.sample_path} variant="primary" size="lg">
            Read the sample issue <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CtaLink>
          <a href="#order" className={ctaClasses('secondary', 'lg')}>
            Order Issue 01 — ${offer.price_usd}
          </a>
        </div>
      </header>

      {/* Value */}
      <section className="mt-20">
        <SectionHeader
          kicker="what you pay for"
          title="Four kinds of work between the raw signals and your decision"
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {VALUE.map((v) => (
            <Surface key={v.title} className="p-6">
              <div className="flex items-center gap-3">
                <v.icon className="h-5 w-5 text-phase-active" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-ink-0">{v.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-1">{v.body}</p>
            </Surface>
          ))}
        </div>
      </section>

      {/* Contents */}
      <section className="mt-20">
        <SectionHeader
          kicker="what you get"
          title="One issue, six parts, about three pages"
          lead="Every observation references its public source (repository path or package name). Star counts are attention snapshots, never growth rates; momentum is read from release cadence, commit activity and package downloads."
        />
        <Surface tone="quiet" className="mt-8 divide-y divide-line-subtle">
          {CONTENTS.map(([name, body]) => (
            <div key={name} className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">{name}</div>
              <p className="text-sm leading-relaxed text-ink-1">{body}</p>
            </div>
          ))}
        </Surface>
        <p className="mt-6 text-sm text-ink-2">
          The published sample is a complete Issue 01. It is exactly what you would receive.{' '}
          <Link href={offer.sample_path} className="text-phase-active hover:text-ink-0">
            Read it before you buy →
          </Link>
        </p>
      </section>

      {/* Who */}
      <section className="mt-20 grid gap-6 md:grid-cols-2">
        <Surface className="p-6">
          <h3 className="text-lg font-semibold text-ink-0">Who it is for</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-1">
            Teams that must decide, every few weeks, where to integrate, whom to approach, which
            channels to be present in and which segments to skip:
          </p>
          <ul className="mt-4 space-y-2">
            {FOR.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-ink-1">
                <ArrowRight className="mt-0.5 h-4 w-4 flex-none text-phase-active" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </Surface>
        <Surface tone="inset" className="p-6">
          <div className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-ink-2" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-ink-0">What this is not</h3>
          </div>
          <ul className="mt-4 space-y-2">
            {NOT.map((n) => (
              <li key={n} className="text-sm leading-relaxed text-ink-1">
                {n}
              </li>
            ))}
          </ul>
        </Surface>
      </section>

      {/* Order */}
      <section id="order" className="mt-20 scroll-mt-24">
        <SectionHeader kicker="order" title={hasMonthlyCheckout ? "Single brief or monthly edition" : "Single issue"} />
        <Surface tone="raised" className="mt-8 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
                {offer.issue}
              </div>
              <div className="mt-2 text-4xl font-bold text-ink-0">${offer.price_usd}</div>
              <p className="mt-3 text-sm leading-relaxed text-ink-1">
                AI Agent Ecosystem Intelligence brief, about three pages: this month, four signals,
                ecosystem map, watchlist, gaps, what to watch next, sources and method. Delivered as{' '}
                {offer.delivery}. No personal contact data. If the brief does not help you, write within{' '}
                {offer.refund_days} days and you get your money back.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:min-w-[260px]">
              {hasCheckout ? (
                <a href={offer.payment_url} className={ctaClasses('primary', 'lg')} rel="noopener">
                  Order Issue 01 — ${offer.price_usd}
                </a>
              ) : (
                <>
                  <span className={ctaClasses('secondary', 'lg')} aria-disabled="true">
                    Checkout opens shortly
                  </span>
                  <p className="text-xs leading-relaxed text-ink-2">
                    The payment link is being activated. The sample issue is complete and free to read now.
                  </p>
                </>
              )}
              <CtaLink href={offer.sample_path} variant="ghost" size="md">
                Read the sample first
              </CtaLink>
            </div>
          </div>
          {/* Monthly edition: rendered only once monthly_payment_url is set (one-time only for now, Rene 2026-09-04) */}
          {hasMonthlyCheckout && (
            <div className="mt-8 border-t border-line-subtle pt-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl">
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">
                    Monthly edition
                  </div>
                  <div className="mt-2 text-4xl font-bold text-ink-0">
                    ${offer.monthly_price_usd}
                    <span className="text-lg font-normal text-ink-2">/month</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-1">
                    The same brief every month for your category, same method, same sources, delivered as{' '}
                    {offer.delivery}. Cancel any time. Same {offer.refund_days}-day money-back on the first
                    issue.
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:min-w-[260px]">
                  <a href={offer.monthly_payment_url} className={ctaClasses('secondary', 'lg')} rel="noopener">
                    Subscribe — ${offer.monthly_price_usd}/month
                  </a>
                </div>
              </div>
            </div>
          )}
        </Surface>
      </section>

      {/* Small print */}
      <section className="mt-16">
        <p className="text-xs leading-relaxed text-ink-2">
          The brief is based on official developer interfaces of public infrastructure (GitHub REST API,
          npm registry and download counts, PyPI) and on the author&apos;s own analysis. Observations are
          referenced by source; third-party content is summarised, not copied. Repository owner handles
          appear in source references because they are part of the public repository path; no other
          personal data is collected or published. Not investment advice.
        </p>
      </section>
    </div>
  );
}
