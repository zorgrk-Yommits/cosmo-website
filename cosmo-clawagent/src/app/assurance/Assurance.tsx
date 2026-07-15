// COSMO Assurance — public research page for the Price Integrity Guard.
//
// Deliberately a SERVER component: no hooks, no wallet, no RPC, no framer-motion.
// The "View the evidence" CTA is a plain #evidence anchor and the technical section is a
// native <details> — both keyboard-accessible and JS-free, so the page is
// export-compatible by construction (same discipline as /maker-capital).
//
// POSITIONING GUARDRAIL, non-negotiable: this page must never read as live protection.
// The Guard is read-only detection over frozen evidence. It does not pause protocols,
// block transactions, guard customer funds, or run as a continuous monitor. Words like
// "secured", "live protection" and "prevents exploits" are banned here. Third parties
// (Bonzo, Hedera, Supra, Solido) are named as plain text only — no logos, no loss
// figures, no accusations.
//
// /assurance is the UMBRELLA route: the Price Integrity Guard is the first module, and
// further modules (e.g. a Deployment Integrity Guard) are meant to slot in beside it.

import {
  FlaskConical,
  Timer,
  GitCompareArrows,
  Ruler,
  Eye,
  ShieldQuestion,
  Layers,
  AlertTriangle,
  ArrowRight,
  ArrowDown,
  FileCode2,
} from 'lucide-react';
import Link from 'next/link';

const DIMENSIONS = [
  {
    id: 'freshness',
    title: 'Freshness',
    question: 'Was the value recent enough to use?',
    icon: Timer,
  },
  {
    id: 'deviation',
    title: 'Deviation',
    question: 'How far does it differ from an independent reference?',
    icon: GitCompareArrows,
  },
  {
    id: 'magnitude',
    title: 'Magnitude',
    question: 'Is the value within an economically plausible range?',
    icon: Ruler,
  },
  {
    id: 'coverage',
    title: 'Evidence coverage',
    question: 'Was the required input actually observed?',
    icon: Eye,
  },
] as const;

const RESULTS = [
  {
    id: 'SAFE',
    tone: 'emerald',
    text: 'The evaluated checks stayed within the registered policy boundaries.',
  },
  {
    id: 'WARN',
    tone: 'amber',
    text: 'A relevant limitation, uncertainty or material deviation was found.',
  },
  {
    id: 'HALT_RECOMMENDED',
    tone: 'rose',
    text: 'The observed value was economically implausible enough that dependent actions should be stopped or independently reviewed.',
  },
] as const;

const RESULT_TONE = {
  emerald: {
    wrap: 'border-emerald-500/30 bg-emerald-500/[0.05]',
    pill: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  amber: {
    wrap: 'border-amber-500/30 bg-amber-500/[0.05]',
    pill: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  rose: {
    wrap: 'border-rose-500/30 bg-rose-500/[0.05]',
    pill: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    dot: 'bg-rose-400',
  },
} as const;

// The architecture claim, as a chain rather than a sentence. Visual mechanics follow
// components/PrimitiveChain.tsx (bordered tiles + a connector glyph that rotates with the
// axis), minus framer-motion so this stays a server component.
const PIPELINE = [
  { id: 'engine', title: 'Universal evaluation engine', note: 'chain- and oracle-agnostic' },
  { id: 'mode', title: 'Evidence mode', note: 'shape, time model, reconstruction' },
  { id: 'subject', title: 'Code-registered subject', note: 'the concrete integration' },
  { id: 'policy', title: 'Pinned policy and frozen evidence', note: 'thresholds fixed in advance' },
  { id: 'verdict', title: 'SAFE / WARN / HALT_RECOMMENDED', note: 'read-only recommendation', isVerdict: true },
] as const;

const BASELINE = [
  { k: 'Tag', v: 'price-guard-subject-registry-v2' },
  { k: 'Baseline commit', v: '29f0044' },
  { k: 'Tests', v: '176 offline tests' },
  { k: 'Test environment', v: 'Tests run without network access or a production signing key' },
  { k: 'V1', v: 'V1 remains byte-frozen at commit 4bbf3d6' },
  { k: 'V2', v: 'V2 separates evidence mode from registered subject identity' },
  { k: 'Gates', v: 'Security gates are covered by mutation tests' },
  { k: 'Failure mode', v: 'Policies, subjects and allowed mode/subject combinations fail closed' },
] as const;

const LIMITATIONS = [
  'Read-only detection, not automatic prevention',
  'No continuous production monitor',
  'Frozen evidence rather than independently proven on-chain provenance',
  'Current market reference may rely on a single exchange',
  'Not a full smart-contract audit',
  'Does not assess governance, access control, liquidity or total protocol safety unless explicitly registered',
  'Currently two verified subjects: Bonzo replay and Solido snapshot',
] as const;

export default function Assurance() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:py-24">
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <header className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                COSMO Assurance
              </span>
            </div>

            <h1 className="font-mono text-3xl font-bold tracking-tight text-slate-100 md:text-5xl">
              Verify the data. Then verify the decision.
            </h1>

            {/* Status is in the hero, not buried: this is the first thing a reader must
                take away, before any capability claim below. */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-sky-300">
                <FlaskConical className="h-3 w-3" />
                Research Prototype
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-slate-300">
                Read-only
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-amber-300">
                Not Live Protection
              </span>
            </div>

            <p className="mt-5 font-sans text-base leading-relaxed text-slate-300 md:text-lg">
              A valid oracle update can prove authenticity under its verification model. It does
              not by itself guarantee that acting on the resulting value is economically safe.
              COSMO independently evaluates whether critical numerical inputs are plausible enough
              to use.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#evidence"
                className="inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-6 py-3 font-mono text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-500/15"
              >
                View the evidence
                <ArrowDown className="h-4 w-4" />
              </a>
              {/* Anchors into this page, not out to the repository: the source is not
                  public, and a CTA that 404s for every visitor is worse than no CTA. */}
              <a
                href="#technical-baseline"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-mono text-sm text-slate-300 transition-all hover:border-white/30 hover:text-white"
              >
                <FileCode2 className="h-4 w-4" />
                Technical baseline
              </a>
            </div>
          </header>

          {/* ── What the Guard evaluates ─────────────────────────────────── */}
          <section className="mt-14">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              What the Guard evaluates
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DIMENSIONS.map((d) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      </span>
                      <h3 className="font-mono text-sm font-semibold text-slate-100">{d.title}</h3>
                    </div>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
                      {d.question}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* The principle. This is the load-bearing sentence of the whole page — an
                absent input must never read as a clean result. */}
            <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-6">
              <div className="flex items-center gap-2">
                <ShieldQuestion className="h-4 w-4 text-purple-300" />
                <span className="font-mono text-xs uppercase tracking-[0.25em] text-purple-300/80">
                  The principle
                </span>
              </div>
              <p className="mt-4 font-mono text-lg font-bold leading-snug text-white md:text-xl">
                No evidence is not zero.
                <br />
                No evidence is UNKNOWN.
              </p>
              <p className="mt-4 font-sans text-sm leading-relaxed text-slate-300">
                COSMO does not issue a clean result for a check that had no supporting input.
              </p>
            </div>
          </section>

          {/* ── Results ──────────────────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              Results
            </h2>
            <div className="mt-4 space-y-3">
              {RESULTS.map((r) => {
                const tone = RESULT_TONE[r.tone];
                return (
                  <div key={r.id} className={`rounded-xl border p-5 ${tone.wrap}`}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${tone.pill}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      {r.id}
                    </span>
                    <p className="mt-3 font-sans text-sm leading-relaxed text-slate-300">
                      {r.text}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 rounded-lg border border-white/10 bg-black/20 px-4 py-3 font-sans text-sm leading-relaxed text-slate-300">
              These are read-only recommendations. COSMO does not currently pause or control the
              evaluated protocols.
            </p>
          </section>

          {/* ── Case studies ─────────────────────────────────────────────── */}
          <section id="evidence" className="mt-14 scroll-mt-24">
            <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
              The evidence
            </h2>

            {/* Case study 1 — Bonzo / Hedera */}
            <article className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-base font-semibold text-slate-100">
                  Bonzo SAUCE/wHBAR exploit replay
                </h3>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300">
                  Retrospective detection
                </span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  Not prevention
                </span>
              </div>
              <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-slate-300">
                <p>
                  COSMO reconstructed the manipulated SAUCE/wHBAR oracle value from frozen public
                  evidence.
                </p>
                <p>
                  The Guard produced HALT_RECOMMENDED at the first manipulated submission in the
                  reconstructed timeline, before the first observed borrowing activity.
                </p>
                <p>
                  The manipulated value differed from the market reference by approximately 12.7
                  orders of magnitude.
                </p>
              </div>
              <p className="mt-4 rounded-lg border border-white/5 bg-black/20 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-400">
                The replay proves what the Guard would have recommended from the frozen evidence. It
                does not claim that COSMO was operating during the incident.
              </p>
            </article>

            {/* Case study 2 — Solido / Supra */}
            <article className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-mono text-base font-semibold text-slate-100">
                  Solido collateral snapshot
                </h3>
                <span className="rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300">
                  Single read-only snapshot
                </span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  Not continuous monitoring
                </span>
              </div>
              <div className="mt-4 space-y-3 font-sans text-sm leading-relaxed text-slate-300">
                <p>
                  COSMO compared Solido&apos;s SUPRA collateral value with an independent market
                  reference and separately checked the internal stSUPRA-to-SUPRA conversion
                  relationship against the Flow vault share rate.
                </p>
                <p>The observed price relationships remained within the registered limits.</p>
                <p>
                  Feed freshness and submission provenance could not be established from the frozen
                  snapshot and were therefore reported as UNKNOWN, never silently treated as zero or
                  passed.
                </p>
              </div>
              <p className="mt-4 rounded-lg border border-white/5 bg-black/20 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-400">
                Only the SUPRA market comparison used an independent external reference. The stSUPRA
                check was an internal consistency check, not an independent oracle validation.
              </p>
            </article>
          </section>

          {/* ── Architecture ─────────────────────────────────────────────── */}
          <section className="mt-14">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-slate-400">
                Reusable logic. Explicit integrations.
              </h2>
            </div>

            <div
              role="img"
              aria-label="How an evaluation is composed: a universal evaluation engine is combined with an evidence mode, a code-registered subject, and a pinned policy over frozen evidence, producing a read-only SAFE, WARN or HALT_RECOMMENDED recommendation."
              className="mt-4 flex flex-col items-stretch gap-1"
            >
              {PIPELINE.map((step, i) => {
                const verdict = 'isVerdict' in step && step.isVerdict;
                return (
                  <div key={step.id} className="flex flex-col items-stretch gap-1">
                    <div
                      className={`flex flex-col items-center gap-1 rounded-xl border bg-[rgba(15,15,35,0.7)] px-4 py-3 text-center backdrop-blur ${
                        verdict ? 'border-emerald-400/50' : 'border-purple-500/40'
                      }`}
                    >
                      <span
                        className={`font-mono text-[13px] font-bold leading-tight ${
                          verdict ? 'text-emerald-200' : 'text-white'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="font-mono text-[11px] leading-tight text-slate-400">
                        {step.note}
                      </span>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="self-center font-mono text-sm text-purple-400/70"
                      >
                        ↓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-5 font-sans text-sm leading-relaxed text-slate-300">
              The evaluation engine is chain-agnostic and oracle-agnostic. Each concrete
              integration remains explicitly registered, tested and reviewed.
            </p>
            {/* Guardrail: a new integration is a code change with tests, a pinned policy and a
                review — never a config toggle. Do not soften this line. */}
            {/* slate-400, not slate-500: at 11px the dimmer token measures 4.23:1 and misses
                AA (same finding the homepage documents). This line is the guardrail against
                reading integrations as a config toggle — dimming it defeats it. */}
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-400">
              Adding an integration is not a configuration change. It requires new code, new tests,
              a separately pinned policy and a review.
            </p>
          </section>

          {/* ── Technical baseline (collapsible, native <details> — no JS) ── */}
          <section id="technical-baseline" className="mt-12 scroll-mt-24">
            <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-5 open:bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030712]">
                <span
                  aria-hidden="true"
                  className="text-purple-400/70 transition-transform group-open:rotate-90"
                >
                  ›
                </span>
                Technical baseline
              </summary>

              <dl className="mt-4 space-y-2">
                {BASELINE.map((b) => (
                  <div
                    key={b.k}
                    className="rounded-lg border border-white/5 bg-black/20 px-4 py-2.5 sm:flex sm:items-baseline sm:gap-4"
                  >
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-slate-400 sm:w-40 sm:shrink-0">
                      {b.k}
                    </dt>
                    <dd className="mt-0.5 font-mono text-[12px] leading-relaxed text-slate-200 sm:mt-0">
                      {b.v}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 rounded-lg border border-purple-500/25 bg-purple-500/[0.05] px-4 py-3">
                <p className="font-mono text-[12px] font-bold leading-relaxed text-purple-200">
                  A guard that no test holds is not a guard.
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-400">
                  Comments claim coverage. Mutations demonstrate it.
                </p>
              </div>
            </details>
          </section>

          {/* ── Limitations ──────────────────────────────────────────────── */}
          <section className="mt-8">
            <aside className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <h2 className="font-mono text-sm font-semibold text-amber-200">
                  Current limitations
                </h2>
              </div>
              <ul className="mt-3 space-y-1.5 font-mono text-[12px] leading-relaxed text-slate-300">
                {LIMITATIONS.map((l) => (
                  <li key={l}>· {l}</li>
                ))}
              </ul>
            </aside>
          </section>

          {/* ── Closing ──────────────────────────────────────────────────── */}
          <section className="mt-14 rounded-2xl border border-purple-500/20 bg-white/[0.02] p-6 md:p-8">
            <h2 className="max-w-2xl font-mono text-xl font-bold leading-snug text-white md:text-2xl">
              Economic safety needs a second line of verification.
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-slate-300 md:text-base">
              COSMO Assurance explores how protocols and autonomous agents can verify not only
              whether data is authentic, but whether acting on it is safe.
            </p>
            <Link
              href="/compute/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-6 py-3 font-mono text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-500/15"
            >
              Explore COSMO
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* footer honesty line — same pattern as /maker-capital */}
          {/* slate-400: slate-600 at 11px measures 2.65:1. This line states the page's scope —
              it has to be readable. */}
          <p className="mt-10 font-mono text-[11px] leading-relaxed text-slate-400">
            Static research content. No wallet actions and no on-chain interaction on this page. The
            Price Integrity Guard is the first module under COSMO Assurance; it reads public data
            and frozen evidence and issues recommendations only.
          </p>
        </div>
      </div>
    </div>
  );
}
