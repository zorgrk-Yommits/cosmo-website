// AI Agent Ecosystem Intelligence — Sample issue (August 2026).
//
// SERVER component. Content is the client sample from the opportunity-radar
// repo (analysis/2026-09-03-ai-agent-ecosystem-intelligence-client-sample.md,
// commit 2a0d6ce), rendered 1:1 in the site idiom. Every number here is taken
// from the archived data of 2026-09-03; nothing is copied from third-party
// READMEs — descriptions are paraphrased, short attributive phrases are quoted.
// Third parties are named as plain text only.

import Link from 'next/link';
import Chip from '@/components/cosmo/Chip';
import { ctaClasses } from '@/components/cosmo/Cta';
import SectionHeader from '@/components/cosmo/SectionHeader';
import Surface from '@/components/cosmo/Surface';
import offer from '@/data/intelligence-offer.json';

type Signal = {
  n: string;
  title: string;
  observation: string;
  evidence: string;
  meaning: string;
  action: string;
};

const SIGNALS: Signal[] = [
  {
    n: '01',
    title: 'An ecosystem can form in three weeks, and it forms through satellites, not registries',
    observation:
      '41 of 151 filtered newcomers (27 %) are plugins, shells, bridges or catalogues for one harness: 11 desktop, mobile or terminal shells, 3 catalogues, 3 vision add-ons, 3 provider bridges (consumer ChatGPT, Claude or Grok subscriptions as providers; a rival harness’s extensions running unmodified), 1 bridge to nine chat platforms.',
    evidence:
      'Two satellites already have 53 and 57 contributors and 22 and 24 releases. The host’s official skill package: 1.43 M npm downloads a month; 17 third-party satellite packages on npm: 44 k combined. A catalogue inside the ecosystem counts about 1,950 plugin repositories (its own figure).',
    meaning:
      'Distribution runs through the host’s plugin mechanism and a GitHub topic, not through npm. The first partners to appear make the host usable elsewhere: shells, bridges, catalogues. Compatibility layers to a rival ecosystem arrived within two weeks.',
    action:
      'Platform owners: ship plugin topic, official catalogue and reference shell as launch deliverables. Tool vendors: a plugin for a fast-forming host is a weeks-scale decision; bridges out of your ecosystem will appear whether you build them or not.',
  },
  {
    n: '02',
    title: 'A middle layer is forming between the MCP protocol and agent products',
    observation:
      'Two organisations (the MCP project and Vercel) hold 72 % of downloads across 916 sampled packages; the top 50 hold 95 %; 256 packages are single-service servers around a 6,800 median.',
    evidence:
      'Downloads concentrate in access and install plumbing: remote proxy 4.9 M, HTTP handler 3.6 M, stdio-to-HTTP gateway 689 k, self-hosted gateway 345 k, installers 7.9 M and 614 k, “am I inside an agent” detectors 13.8 M and 8.0 M. The TypeScript SDK split into core, client and server at 2.0 on 27 July; the 1.x monolith still carries 204 M downloads.',
    meaning:
      '“MCP-compatible” no longer differentiates. Visibility depends on working through the proxies and installers developers actually use, and on behaving well when a library detects an agent environment.',
    action:
      'Test your server through the two leading installers and the remote proxy; add agent-environment detection to CLI output; schedule the SDK 2.0 migration before the long tail forces it.',
  },
  {
    n: '03',
    title: 'SKILL.md is becoming a packaging format for agent capabilities (not yet a standard)',
    observation:
      '3 of the 16 most-starred newcomers are skill packs; 32 of 151 are skill-labelled. Seven behaviour-correction skills (anti-laziness, anti-slop, scope-creep guards, token efficiency, commit gates) hold about 8,000 stars combined; one is JetBrains’ with a measured cost claim.',
    evidence:
      'The largest skill/MCP installer: 7.9 M downloads a month; at least ten competitors between 3 k and 614 k. Adoption lags attention: one skill with 976 stars shows 1,683 downloads.',
    meaning:
      'Developers increasingly reach agents through instruction files rather than SDKs. A platform without a first-party skill pack is absent from this channel, which still has no shared versioning, provenance or trust model.',
    action: 'Publish official skills, get listed in the leading installers and catalogues, measure downloads rather than stars.',
  },
  {
    n: '04',
    title: 'Coding-agent workspaces are saturating; differentiation moved to team surfaces',
    observation:
      '70 of 151 newcomers match the shell/orchestrator pattern; at least 15 are new GUIs. Incumbents at 29 k to 131 k stars ship the same four features: parallel sessions, worktrees, approval UI, mobile remote.',
    evidence:
      'Two incumbents’ commits are slowing (one from 1,248 to 253 in four weeks). The newcomers with real team signals are team-chat or shared-workspace products: 25 contributors and 10 releases in 17 days; 30 contributors; an established frontend vendor entering with governance framing.',
    meaning:
      'Partnering with a single-user GUI buys little reach. Team surfaces that bring their own harness (“your Claude Code or Codex as the brain”) are the integration targets with growth.',
    action:
      'Deprioritise GUI partnerships unless the GUI owns a distribution channel; prioritise team-collab surfaces and harness runtimes with release cadence.',
  },
];

const MAP: { status: string; tone: 'active' | 'warn' | 'proof' | 'idle'; families: string }[] = [
  {
    status: 'Expanding',
    tone: 'active',
    families: 'DSH satellite ecosystem; skill packs; MCP access plumbing; team-collaboration agent surfaces',
  },
  {
    status: 'Crowded',
    tone: 'warn',
    families:
      'coding-agent GUIs and orchestrators; single-service MCP servers; agent memory (89 npm packages, incumbents 30 k to 93 k stars); web access for agents (incumbents 29 k to 112 k stars)',
  },
  {
    status: 'Emerging',
    tone: 'proof',
    families:
      'agent-native primitives (email inbox per agent 439 k downloads, Postgres layer with 26 releases, device control 545 k, agent-env detection 13.8 M); model-cost arbitrage and routing; security and reverse-engineering agents; a Chinese-language short-drama vertical',
  },
  {
    status: 'Under-represented',
    tone: 'idle',
    families:
      'verification, evaluation, observability (4 of 151 new repos; under 1 M npm downloads combined); agent payments and commerce (one vendor blueprint; 238 k downloads across 32 packages); cross-harness governance (vendor-supplied, 1 to 4 contributors each)',
  },
];

type Watch = { title: string; what: string; why: string; relation: string; sources: string[] };

const WATCHLIST: Watch[] = [
  {
    title: 'DSH satellite layer (family)',
    what: 'Shells for every OS, three catalogues, provider and IM bridges, a compatibility layer to Pi extensions.',
    why: 'Fastest observed plugin-ecosystem formation; shows what partners build first.',
    relation: 'Plugin target for tool vendors, attention competitor for harness vendors.',
    sources: ['deepseek-ai/deepseek-harness', 'omdsh-dev/DSH-better-sidebar', 'ccch1mneyyy/dsh-TUI', 'leenkcool/Blue-Whale-Harness', 'weijiafu14/pi2dsh'],
  },
  {
    title: 'Harness and provider bridges (family)',
    what: 'A self-hosted unified interface for agent harnesses (654 stars, 11 releases, organisation-owned); a bridge using consumer subscriptions as providers; ChatGPT planning while Codex executes (2,333 stars in six days).',
    why: 'Interop is being built by third parties; your harness may be bridged into another ecosystem without you.',
    relation: 'Monitor, possibly co-opt.',
    sources: ['HarnessRouter/harnessrouter', 'V1ki/dsh-plugin-subscriptions', 'XiaoDuoYa/codex-with-chatgpt'],
  },
  {
    title: 'Skill and MCP installers and catalogues (family)',
    what: 'agent-install 7.9 M, add-mcp 614 k, skillfish, openskills, axm.sh; a 125-skill pack (1,143 stars); the vendor-run plugin directory (35,858 stars).',
    why: 'Choke points of the skill channel.',
    relation: 'Get listed, test compatibility.',
    sources: ['npm: agent-install', 'npm: add-mcp', 'npm: skillfish', 'npm: openskills', 'npm: axm.sh', 'cbrock84/headcount', 'anthropics/claude-plugins-official'],
  },
  {
    title: 'Team-collaboration surfaces',
    what: 'Cumora (3,444 stars, 25 contributors, 10 releases in 17 days; BYO Claude Code/Codex), Lody (868, 30 contributors; share coding agents with a team), OpenBot by CopilotKit (4,023, 22 contributors; agents with their own computer, actions decided before and logged after).',
    why: 'Where agents meet teams and BYO-harness makes your product the brain.',
    relation: 'Integration target.',
    sources: ['yetone/cumora', 'LodyAI/Lody', 'CopilotKit/OpenBot'],
  },
  {
    title: 'Agent-native primitives (family)',
    what: 'Email inbox per agent (truespar/sentio, 5 releases; npm agentmail 439 k), Postgres for agents (pgrundev/pgbot, 26 releases in three weeks), phone control (ShawnPana/phone-harness, 2,268 stars; npm agent-device 545 k), env detection (npm @vercel/detect-agent 13.8 M).',
    why: 'Each defines “agent-ready” for one infrastructure surface.',
    relation: 'Infrastructure partners; checklist for your own readiness.',
    sources: ['truespar/sentio', 'npm: agentmail', 'pgrundev/pgbot', 'ShawnPana/phone-harness', 'npm: agent-device', 'npm: @vercel/detect-agent'],
  },
  {
    title: 'Verification newcomers (family)',
    what: '2akouwu/reverify (672 stars in three days; results checked against the binary), azrtydxb/procoder (commit gate), tanishqkancharla/calldiff (call-stack diffs for agentic review), npm dsh-verify, npm agent-inspect (24 k).',
    why: 'The thin supply side of this issue’s largest gap.',
    relation: 'Early partners for a quality narrative.',
    sources: ['2akouwu/reverify', 'azrtydxb/procoder', 'tanishqkancharla/calldiff', 'npm: dsh-verify', 'npm: agent-inspect'],
  },
  {
    title: 'Fast-moving harnesses (momentum)',
    what: 'code-yeongyu/oh-my-openagent (68,600 stars; releases 36 vs 14 in the prior 30 days; commits 2,769 vs 1,706) and esengine/DeepSeek-Reasonix (35,400; releases 82 vs 18).',
    why: 'Cadence this high outruns docs and breaks integrations.',
    relation: 'Needs a maintained adapter, not a one-off.',
    sources: ['code-yeongyu/oh-my-openagent', 'esengine/DeepSeek-Reasonix'],
  },
];

const GAPS = [
  {
    id: 'G1',
    title: 'Verification and quality of agent output is under-supplied relative to demand signals',
    confidence: 'MEDIUM',
    evidence:
      '(a) about 8,000 stars on skills that exist because agents cut corners; (b) security newcomers selling “checked against ground truth”; (c) small, specific npm quality gates and trajectory testers; (d) 4 of 151 new repos and under 1 M npm downloads in evaluation and observability.',
    interpretation:
      'Creation and orchestration are crowded, independent verification is not; a quality narrative is currently cheap for a platform to own.',
    counter: 'Verification may collapse into CI plus better prompts; the demand signals are indirect.',
  },
  {
    id: 'G2',
    title: 'The skill and plugin channel has no trust or provenance layer',
    confidence: 'MEDIUM',
    evidence:
      'Ten-plus installers with no shared versioning; a roughly 1,950-repo plugin ecosystem with three competing catalogues in three weeks; an MCP security scanner and CI gate appeared on npm; a curated vendor directory draws 35,858 stars.',
    interpretation:
      'Cross-harness discovery, versioning and safety for skills is an open surface because every harness vendor prefers its own directory.',
    counter: 'GitHub plus vendor directories may be good enough until an incident forces the issue.',
  },
];

const NEXT = [
  ['Satellite survival', 'How many of the 41 DSH satellites still push commits in 30 days; whether the two 50-contributor satellites keep growing. Ecosystem or wave?'],
  ['Newcomer-to-momentum transitions', 'Whether Cumora, Moli, Rakazo and pgbot keep release cadence and land on npm with real downloads.'],
  ['SDK 2.0 crossover', '@modelcontextprotocol/core and client (13.9 M and 9.8 M) against the 1.x monolith (204 M). The crossover is the day the long tail must move.'],
  ['Installer concentration', 'Whether agent-install stays an order of magnitude above add-mcp and whether any catalogue or scanner bundles provenance. Where G2 opens or closes.'],
  ['Verification supply', 'Whether any verification newcomer crosses 150 stars or 10 k downloads, and whether governance repos gain more than four contributors. If neither moves, G1 stays open.'],
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 md:grid-cols-[120px_1fr]">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-2">{label}</div>
      <p className="text-sm leading-relaxed text-ink-1">{children}</p>
    </div>
  );
}

export default function Sample() {
  return (
    <article className="mx-auto max-w-4xl px-5 pb-24 pt-14 md:px-6 md:pt-20">
      {/* Masthead */}
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="active">sample issue</Chip>
          <Chip tone="neutral">issue 01</Chip>
          <Chip tone="neutral">window 4 Aug – 3 Sep 2026</Chip>
        </div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-ink-0 md:text-4xl">
          AI Agent Ecosystem Intelligence
        </h1>
        <p className="text-sm leading-relaxed text-ink-2">
          For DevRel, ecosystem and partnership teams. Basis: 2,165 new GitHub repositories from 14
          agent-related queries, filtered to 151 substantive projects; 865 existing projects for momentum;
          1,392 npm packages with download counts. Public APIs only. Stars are attention snapshots as of
          3 September, never growth rates. Method and limits at the end.
        </p>
      </header>

      {/* This month */}
      <section className="mt-14">
        <SectionHeader kicker="this month" title="What visibly changed" />
        <p className="mt-6 text-base leading-relaxed text-ink-1">
          One vendor launch reshaped the category: DeepSeek&apos;s plugin-first harness (DSH), released 13
          August, spawned 41 satellite projects among the 151 most substantive newcomers, eleven of them
          shells for the same CLI. Outside that wave, the most-starred new repositories are not software
          but skill packs, Markdown files that change how coding agents behave, one published by
          JetBrains. On npm, MCP is splitting into a commodity layer (hundreds of single-service servers,
          median 6,800 downloads a month) and a plumbing layer (remote proxies, installers,
          agent-environment detectors) with millions. Coding-agent GUIs kept multiplying with
          near-identical features. Verification of agent output stays almost absent from new projects
          while three unrelated signals point at demand for it.
        </p>
      </section>

      {/* Signals */}
      <section className="mt-16">
        <SectionHeader kicker="4 signals that matter" title="Observation, evidence, meaning, action" />
        <div className="mt-8 space-y-4">
          {SIGNALS.map((s) => (
            <Surface key={s.n} className="p-6">
              <div className="flex items-start gap-4">
                <span className="font-mono text-sm text-phase-active">{s.n}</span>
                <h3 className="text-lg font-semibold leading-snug text-ink-0">{s.title}</h3>
              </div>
              <div className="mt-5 space-y-3">
                <Field label="observation">{s.observation}</Field>
                <Field label="evidence">{s.evidence}</Field>
                <Field label="meaning">{s.meaning}</Field>
                <Field label="action">{s.action}</Field>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {/* Map */}
      <section className="mt-16">
        <SectionHeader kicker="ecosystem map" title="Where the families stand" />
        <Surface tone="quiet" className="mt-8 divide-y divide-line-subtle">
          {MAP.map((m) => (
            <div key={m.status} className="grid gap-3 px-6 py-4 md:grid-cols-[180px_1fr]">
              <div>
                <Chip tone={m.tone}>{m.status}</Chip>
              </div>
              <p className="text-sm leading-relaxed text-ink-1">{m.families}</p>
            </div>
          ))}
        </Surface>
      </section>

      {/* Watchlist */}
      <section className="mt-16">
        <SectionHeader
          kicker="watchlist"
          title="Seven families to watch"
          lead="Chosen for strategic relevance, not size. Sources are GitHub repository paths and npm package names."
        />
        <ol className="mt-8 space-y-4">
          {WATCHLIST.map((w, i) => (
            <li key={w.title}>
              <Surface className="p-6">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-sm text-ink-2">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="text-base font-semibold leading-snug text-ink-0">{w.title}</h3>
                </div>
                <div className="mt-4 space-y-3">
                  <Field label="what">{w.what}</Field>
                  <Field label="why">{w.why}</Field>
                  <Field label="relationship">{w.relation}</Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {w.sources.map((src) => (
                    <code
                      key={src}
                      className="rounded border border-line-subtle bg-surface-inset px-1.5 py-0.5 font-mono text-[11px] text-ink-2"
                    >
                      {src}
                    </code>
                  ))}
                </div>
              </Surface>
            </li>
          ))}
        </ol>
      </section>

      {/* Gaps */}
      <section className="mt-16">
        <SectionHeader kicker="opportunity / gap" title="Two gaps, evidence separated from interpretation" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {GAPS.map((g) => (
            <Surface key={g.id} tone="raised" className="p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="neutral">{g.id}</Chip>
                <Chip tone="proof">confidence {g.confidence}</Chip>
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-ink-0">{g.title}</h3>
              <div className="mt-4 space-y-3">
                <Field label="evidence">{g.evidence}</Field>
                <Field label="interpretation">{g.interpretation}</Field>
                <Field label="counter">{g.counter}</Field>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      {/* Next */}
      <section className="mt-16">
        <SectionHeader kicker="what I would watch next" title="Five questions the next issue must answer" />
        <ol className="mt-8 space-y-3">
          {NEXT.map(([name, body], i) => (
            <li key={name} className="grid gap-1 md:grid-cols-[32px_200px_1fr]">
              <span className="font-mono text-sm text-ink-2">{i + 1}.</span>
              <span className="text-sm font-semibold text-ink-0">{name}</span>
              <p className="text-sm leading-relaxed text-ink-1">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Method */}
      <section className="mt-16">
        <Surface tone="inset" className="p-6">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-2">Method and limits</h3>
          <p className="mt-3 text-xs leading-relaxed text-ink-1">
            GitHub REST API, npm registry and download counts, PyPI RSS; window 4 Aug to 3 Sep 2026; 14
            queries, top 200 by stars each, nine filters (no forks or archives, description, code volume,
            language, pushed within 10 days, at least 150 stars). Momentum covers only the 106 most-starred
            existing projects. No star history; commit counts can be inflated by agent-authored commits; 474
            scoped npm packages lack download values (rate limit). No Product Hunt or Hacker News data, no
            personal data, no README or code content reproduced, no claim of complete coverage.
          </p>
        </Surface>
      </section>

      {/* Back to offer */}
      <section className="mt-14 flex flex-wrap items-center gap-3">
        <a href="/intelligence/#order" className={ctaClasses('primary', 'md')}>
          Order Issue 01 — ${offer.price_usd}
        </a>
        <Link href="/intelligence/" className="text-sm text-ink-2 hover:text-ink-0">
          About the brief →
        </Link>
      </section>
    </article>
  );
}
