// COSMO Institutional — the positioning page for "the institutional layer for
// autonomous economies", anchored in Execution Case 001 (the completed SupraFX
// micro-live case, 2026-08-14).
//
// Deliberately a SERVER component, same discipline as /assurance: no hooks, no
// wallet, no RPC. Plain in-page anchors, export-compatible by construction.
//
// POSITIONING GUARDRAILS, non-negotiable:
// - "Institutional" here means governance primitives (authority, mandate, policy,
//   ceremony, record, receipt, verification). It must never read as custody,
//   supervision, regulation or an investment product. Say so on the page.
// - Verification claim stays limited while the verifier is private. The exact
//   sentence lives in VERIFY_WORDING — do not paraphrase it into a bigger claim.
// - Facts and roadmap never mix: the proof block carries only what has happened.
// - Soft Supra framing only ("built on Supra"); no competitor or partner claims.

import {
  KeyRound,
  FileSignature,
  Scale,
  Hand,
  ListOrdered,
  Receipt,
  SearchCheck,
  ShieldQuestion,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';

function short(h: string): string {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

// The exact, limited verification wording (approved 2026-08-14). Keep verbatim.
const VERIFY_WORDING =
  'Public evidence bundle. Offline verification currently requires the COSMO verifier, whose implementation remains private.';

// The seven primitives, in ceremony order. `proved` states only what actually
// happened in Execution Case 001 — no futures.
const PRIMITIVES = [
  {
    id: 'authority',
    icon: KeyRound,
    title: 'Delegated authority',
    what: 'A standing, bounded permission to act: a delegate key with an explicit scope, per-trade and total caps, an expiry — and an on-chain revoke.',
    proved:
      'Case 001: delegate restricted to taker-only SUPRA/USDC, capped at 1 SUPRA per trade / 2 SUPRA total, created on-chain, fully consumed, then revoked on-chain by the principal.',
  },
  {
    id: 'mandate',
    icon: FileSignature,
    title: 'Mandate',
    what: 'A signed authorization for one concrete case: single-use nonce, time-to-live, and a hash binding to the exact policy in force.',
    proved:
      'Case 001: one mandate, one nonce, consumed exactly once; the mandate hash is carried into the execution envelope itself.',
  },
  {
    id: 'policy',
    icon: Scale,
    title: 'Policy',
    what: 'Rules fixed and hash-pinned before the action: allowed modes, sizes, price deviation bounds. Anything not explicitly allowed is rejected.',
    proved:
      'Case 001: policy pinned by hash; every check either passed or the case would have closed as POLICY_REJECTED.',
  },
  {
    id: 'ceremony',
    icon: Hand,
    title: 'Ceremony',
    what: 'A human arms the irreversible step. The run stops at AWAITING_ARM; the operator writes a one-shot, mandate-bound ARM with a 15-minute freshness window.',
    proved: 'Case 001: armed manually by the operator; the ARM was consumed exactly once.',
  },
  {
    id: 'record',
    icon: ListOrdered,
    title: 'Record',
    what: 'A hash-chained journal of every state transition, plus write-once evidence files sealed by a manifest.',
    proved:
      'Case 001: twelve journal entries from case_opened to case_closed, each chained to the previous; twelve evidence files sealed under one evidence root.',
  },
  {
    id: 'receipt',
    icon: Receipt,
    title: 'Receipt',
    what: 'A signed closing statement with an honest outcome taxonomy — failure classes are first-class outcomes, not silence.',
    proved:
      'Case 001: outcome EXECUTED at exactly the mandated rate. An earlier drill closed as EXECUTION_FAILED — and its receipt says so.',
  },
  {
    id: 'verification',
    icon: SearchCheck,
    title: 'Verification',
    what: 'A separate offline verification of internal consistency: key pin, signatures, time bounds, policy pin, mandate binding, manifest, journal chain, envelope, statement re-derivation, outcome consistency. It is run apart from execution — not by an independent third party.',
    proved: 'Case 001: ACCEPT on all ten criteria, exit code 0 — using the COSMO verifier, whose implementation remains private.',
  },
] as const;

// Two deliberately SEPARATE lifecycles (do not merge them): delegated
// authority is the standing, bounded permission; the execution case runs
// UNDER it. Tones follow the site's process-state tokens: warn = a human is
// required before it can continue, proof = an artifact exists, settled =
// closed and checked.
const AUTHORITY_LIFECYCLE = [
  { id: 'created', label: 'Delegate created', tone: 'active' },
  { id: 'scoped', label: 'Scope & caps applied', tone: 'active' },
  { id: 'granted', label: 'Case authority granted', tone: 'active' },
  { id: 'consumed', label: 'Caps consumed', tone: 'idle' },
  { id: 'revoked', label: 'Delegate revoked', tone: 'settled' },
] as const;

const CASE_LIFECYCLE = [
  { id: 'intent', label: 'Intent', tone: 'idle' },
  { id: 'mandate', label: 'Mandate', tone: 'active' },
  { id: 'policy', label: 'Policy', tone: 'active' },
  { id: 'arm', label: 'ARM', tone: 'warn' },
  { id: 'execute', label: 'Execute', tone: 'active' },
  { id: 'record', label: 'Record', tone: 'proof' },
  { id: 'receipt', label: 'Receipt', tone: 'proof' },
  { id: 'verify', label: 'Verify', tone: 'settled' },
] as const;

type LifecycleTone = (typeof AUTHORITY_LIFECYCLE)[number]['tone'] | (typeof CASE_LIFECYCLE)[number]['tone'];

const TONE_BOX: Record<LifecycleTone, string> = {
  idle: 'border-line-base text-ink-1',
  active: 'border-phase-active/45 text-phase-active',
  warn: 'border-phase-warn/50 text-phase-warn',
  proof: 'border-phase-proof/45 text-phase-proof',
  settled: 'border-phase-settled/50 text-phase-settled',
};

// All eight outcomes a case can close with. The taxonomy is the point: an
// institution that cannot name its failures cannot be audited.
const OUTCOMES = [
  { id: 'EXECUTED', text: 'Submitted, filled and observed settling. Only this outcome claims success.', tone: 'settled' },
  { id: 'SHADOW_COMPLETED', text: 'Dry run completed. A shadow case can never carry EXECUTED.', tone: 'proof' },
  { id: 'INVALID_INTENT', text: 'The request itself was malformed. Rejected before any mandate existed.', tone: 'fault' },
  { id: 'POLICY_REJECTED', text: 'A pinned policy rule said no. The default is rejection, not permission.', tone: 'fault' },
  { id: 'NO_COUNTERPARTY', text: 'Executed into the market, but nobody took the other side in time.', tone: 'idle' },
  { id: 'EXPIRED', text: 'The mandate ran out of time before the action could complete.', tone: 'idle' },
  { id: 'HALTED', text: 'A halt file or kill switch stopped the case. Stopping is always available.', tone: 'warn' },
  { id: 'EXECUTION_FAILED', text: 'The action was attempted and did not complete as observed. Recorded, signed, kept.', tone: 'fault' },
] as const;

const TONE_CHIP: Record<(typeof OUTCOMES)[number]['tone'], string> = {
  settled: 'border-phase-settled/40 bg-phase-settled/10 text-phase-settled',
  proof: 'border-phase-proof/40 bg-phase-proof/10 text-phase-proof',
  warn: 'border-phase-warn/40 bg-phase-warn/10 text-phase-warn',
  fault: 'border-phase-fault/40 bg-phase-fault/10 text-phase-fault',
  idle: 'border-line-base bg-white/[0.03] text-ink-1',
};

// Case 001 facts — mirrored from the public evidence bundle, single-sourced by hand
// because the bundle is frozen bytes, not app data. If these ever disagree, the
// bundle wins and this page is wrong.
const CASE_001 = {
  caseId: 'case_msskp1gg956f8a',
  date: '2026-08-14',
  settlement: '−1 SUPRA / +169 micro-USDC — exactly the mandated rate',
  batch: '9,647,777',
  mandateHash: '0xb0d3911a44b1a8e703394dd64bd23588b24b1430c77b955a02a65ccfa96bab11',
  policyHash: '0x59f7c39fc7bbbe5acd15a92881cad314a284e54ee9dfbd014506f52dfa7dd75d',
  evidenceRoot: '0x5799bf59c188f13948af107dd9cf0dbd654ed940dc02aaa59e8f64ea5b1b50c2',
  bundle: '/evidence/execution-case-001/',
} as const;

const LIMITS = [
  'Receipts are self-attestations by the COSMO engine: one attestor, no independent attestor network.',
  'The verifier proves internal consistency and record integrity — not world truth.',
  'Settlement in Case 001 is an observation of platform balances, not a native chain proof.',
  'One venue, one pair, micro scale. This is a proof of the primitives, not of volume.',
  'Case 001 was supervised agent execution: a human explicitly authorized the irreversible step (ARM). That step is part of the proven authority model, not a shortcut.',
  'No paying market for this layer has been demonstrated. That is a limit we state, not a projection we hide.',
  VERIFY_WORDING,
] as const;

export default function Institutional() {
  return (
    <div className="terminal-theme-scope min-h-screen">
      <div className="terminal-container">
        <div className="grid-bg" />

        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:py-24">
          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <header className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-2 w-2 rounded-full bg-phase-settled shadow-[0_0_10px_rgba(70,214,160,0.8)]" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                COSMO Institutional
              </span>
            </div>

            <h1 className="font-mono text-3xl font-bold tracking-tight text-ink-0 md:text-5xl">
              The institutional layer for autonomous economies.
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-phase-settled/40 bg-phase-settled/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-phase-settled">
                Execution Case 001 · executed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-base bg-surface-2 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-1">
                Built on Supra
              </span>
            </div>

            <p className="mt-5 font-sans text-base leading-relaxed text-ink-1 md:text-lg">
              For an autonomous agent to act with real money, capability is not enough — someone
              has to be able to say what it was allowed to do, prove what it actually did, and
              stop it. COSMO builds that as seven separable primitives: delegated authority,
              mandate, policy, ceremony, record, receipt, verification. All seven ran together,
              once, for real, in a micro-live execution case — and that case is published below.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a
                href="#primitives"
                className="inline-flex items-center gap-2 rounded-xl border border-phase-active/40 bg-phase-active/10 px-6 py-3 font-mono text-sm text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/15"
              >
                The seven primitives
                <ArrowDown className="h-4 w-4" />
              </a>
              <a
                href="#proof"
                className="inline-flex items-center gap-2 rounded-xl border border-line-base px-6 py-3 font-mono text-sm text-ink-1 transition-all hover:border-line-strong hover:text-white"
              >
                <SearchCheck className="h-4 w-4" />
                The proof
              </a>
            </div>

            {/* Honesty box, in the hero on purpose: what "institutional" does NOT mean. */}
            <div className="mt-7 rounded-xl border border-phase-warn/30 bg-phase-warn/5 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-phase-warn">
                What &quot;institutional&quot; means here — and what it does not
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">
                Institutional means governance primitives: bounded authority, rules fixed in
                advance, records that cannot be quietly rewritten, receipts that can be checked.
                It does not mean custody of funds, supervision of third parties, regulatory
                status, or an investment product. None of those are offered here.
              </p>
            </div>
          </header>

          {/* ── Derivation: from one hard problem to a general primitive ──── */}
          <section id="derivation" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Where this came from
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              <article className="rounded-xl border border-line-base bg-surface-1 p-5">
                <h3 className="font-mono text-sm font-semibold text-ink-0">
                  1 · A deliberately narrow problem
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">
                  Let an autonomous agent execute one real trade on SupraFX — one pair, one
                  micro-sized order, real settlement. Not a demo and not a testnet: supervised
                  agent execution with explicit human authorization at the irreversible
                  boundary.
                </p>
              </article>
              <article className="rounded-xl border border-line-base bg-surface-1 p-5">
                <h3 className="font-mono text-sm font-semibold text-ink-0">
                  2 · What had to exist before that was acceptable
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">
                  A key the agent could hold without holding the account. Limits the agent could
                  not exceed even if compromised. Rules decided before the action, not after. A
                  human arming the irreversible step. A record whose later modification becomes
                  detectable. A signed statement of what happened — including when what happened
                  was failure.
                </p>
              </article>
              <article className="rounded-xl border border-line-base bg-surface-1 p-5">
                <h3 className="font-mono text-sm font-semibold text-ink-0">
                  3 · What fell out of solving it
                </h3>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">
                  None of those requirements are about trading. Sizes and price bounds are
                  trading-shaped; authority, mandate, policy, ceremony, record, receipt and
                  verification are not. The trade was the occasion. The primitives are the
                  product.
                </p>
              </article>
            </div>
          </section>

          {/* ── The seven primitives ─────────────────────────────────────── */}
          <section id="primitives" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Seven primitives
              </h2>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              Each one is separable, and each one was exercised in Case 001. The first two are
              deliberately not the same thing:
            </p>

            {/* The distinction the whole layer rests on. Do not merge into prose. */}
            <div className="mt-4 rounded-xl border border-phase-active/30 bg-phase-active/5 p-5">
              <p className="font-mono text-base font-bold text-ink-0 md:text-lg">
                Capability is copyable. Authority is not.
              </p>
              <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">
                A key can be copied; whoever holds it can act. Authority is what bounds the
                acting: scope, caps, expiry, revocation — and, per individual case, a single-use
                mandate. COSMO never treats possession of a key as permission.
              </p>
            </div>

            <div className="mt-4 flex flex-col items-stretch gap-1">
              {PRIMITIVES.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={p.id} className="flex flex-col items-stretch gap-1">
                    <article className="rounded-xl border border-line-base bg-surface-1 p-5">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-phase-active" aria-hidden="true" />
                        <h3 className="font-mono text-sm font-semibold text-ink-0">
                          {i + 1} · {p.title}
                        </h3>
                      </div>
                      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-1">{p.what}</p>
                      <p className="mt-2 font-mono text-[11px] leading-relaxed text-phase-settled">
                        {p.proved}
                      </p>
                    </article>
                    {i < PRIMITIVES.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="self-center font-mono text-sm text-phase-active/60"
                      >
                        ↓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Two lifecycles, deliberately separate ────────────────────── */}
          <section className="mt-14">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Two lifecycles, deliberately separate
              </h2>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              Delegated authority is not a property of the mandate — it is the standing, bounded
              permission the case runs under. The two lifecycles are managed, and shown,
              separately.
            </p>

            <h3 className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Authority lifecycle
            </h3>
            <div
              role="img"
              aria-label="Authority lifecycle: delegate created, scope and caps applied, case authority granted, caps consumed, delegate revoked."
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              {AUTHORITY_LIFECYCLE.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className={`rounded-lg border bg-surface-1 px-3 py-2 font-mono text-[12px] font-semibold ${TONE_BOX[s.tone]}`}
                  >
                    {s.label}
                  </span>
                  {i < AUTHORITY_LIFECYCLE.length - 1 && (
                    <span aria-hidden="true" className="font-mono text-sm text-ink-2">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>

            <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">
              Execution case
            </h3>
            <div
              role="img"
              aria-label="Execution case lifecycle: intent, mandate, policy check, human ARM, execution, record, signed receipt, offline consistency verification."
              className="mt-3 flex flex-wrap items-center gap-2"
            >
              {CASE_LIFECYCLE.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span
                    className={`rounded-lg border bg-surface-1 px-3 py-2 font-mono text-[12px] font-semibold ${TONE_BOX[s.tone]}`}
                  >
                    {s.label}
                  </span>
                  {i < CASE_LIFECYCLE.length - 1 && (
                    <span aria-hidden="true" className="font-mono text-sm text-ink-2">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-1">
              Amber marks the step that requires a human. A micro-live case stops at AWAITING_ARM
              and stays stopped until the operator arms it — the agent cannot arm itself.
            </p>
          </section>

          {/* ── Outcome taxonomy ─────────────────────────────────────────── */}
          <section id="outcomes" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Eight ways a case can end
              </h2>
            </div>
            <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
              Every case closes with exactly one of eight outcomes, and the receipt is signed
              either way. The first live drill exposed a mismatch between the external settlement
              and COSMO&apos;s observation: the fault was in the observer, not the trade. The
              receipt preserved the system&apos;s actual recorded state (EXECUTION_FAILED), the
              verifier confirmed its internal consistency — which is not world truth — and the
              system halted instead of silently relabelling the outcome. The second drill
              validated the corrected settlement observer. An institution that cannot name its
              failures cannot be audited.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {OUTCOMES.map((o) => (
                <div key={o.id} className="rounded-xl border border-line-base bg-surface-1 p-4">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TONE_CHIP[o.tone]}`}
                  >
                    {o.id}
                  </span>
                  <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-1">{o.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── The proof: Execution Case 001 ────────────────────────────── */}
          <section id="proof" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-2">
              <SearchCheck className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                The proof — Execution Case 001
              </h2>
            </div>

            <article className="mt-4 rounded-xl border border-phase-settled/30 bg-surface-1 p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-phase-settled/40 bg-phase-settled/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-phase-settled">
                  EXECUTED
                </span>
                <span className="rounded-full border border-line-base bg-surface-2 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-1">
                  {CASE_001.date} · SupraFX Mainnet · micro-live
                </span>
              </div>

              <p className="mt-3 font-sans text-sm leading-relaxed text-ink-1">
                One mandated micro-trade, run through all seven primitives:{' '}
                {CASE_001.settlement}, observed at batch {CASE_001.batch}. Offline consistency
                verification: ACCEPT, ten of ten criteria (COSMO verifier, implementation
                private). The delegated authority behind it was created on-chain with hard caps,
                fully consumed by two drills, and then revoked on-chain by the principal — the
                complete lifecycle, including the ending.
              </p>

              <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-2">
                Note on the amount: the platform API returned a JavaScript floating-point balance
                delta. The normalized economic amount is 169 micro-USDC — &quot;exactly the
                mandated rate&quot; refers to this normalization. Future adapters should use
                integer micro-units end-to-end (this fix has since landed in the engine).
              </p>

              <div className="mt-4 space-y-0.5 font-mono text-[11px] leading-relaxed text-ink-1">
                <p>case {CASE_001.caseId}</p>
                <p>mandate_hash {short(CASE_001.mandateHash)}</p>
                <p>policy_hash {short(CASE_001.policyHash)}</p>
                <p>evidence_root {short(CASE_001.evidenceRoot)}</p>
              </div>

              {/* Delegated authority on record — the revoke is a linked, checkable
                  event, not a text claim (correction pass 2026-08-14, point 7). */}
              <div className="mt-4 rounded-lg border border-line-subtle bg-surface-inset p-3 font-mono text-[11px] leading-relaxed text-ink-1">
                <p className="uppercase tracking-wider text-ink-2">Delegated authority on record</p>
                <p className="mt-1.5">created — SupraFX batch 9,559,624 (2026-08-12) · delegate c1add416…760fbc</p>
                <p>scope &amp; caps — taker-only SUPRA/USDC · 1 SUPRA per trade · 2 SUPRA total</p>
                <p>caps consumed — drill 1 batch 9,563,222 · drill 2 batch 9,647,777 (2/2 SUPRA)</p>
                <p>revoked — batch 9,649,339 (2026-08-14) · event 0xce7398f7…c69f61de</p>
                <p className="mt-1.5">
                  <a
                    href="https://suprafx.ai/api/council/events?user=0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb&limit=50"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-phase-active hover:text-phase-active"
                  >
                    Council event feed (DelegatePolicyCreated … DelegatePolicyRevoked) ↗
                  </a>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
                <a
                  href={CASE_001.bundle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-phase-active hover:text-phase-active"
                >
                  Evidence bundle ↗
                </a>
                <a href="/assurance/" className="text-phase-active hover:text-phase-active">
                  All settled proofs →
                </a>
              </div>

              <p className="mt-4 border-t border-line-subtle pt-3 font-mono text-[11px] leading-relaxed text-ink-1">
                {VERIFY_WORDING}
              </p>
            </article>
          </section>

          {/* ── Honest limits ────────────────────────────────────────────── */}
          <section id="limits" className="mt-14 scroll-mt-24">
            <div className="flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-ink-1" />
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-ink-1">
                Honest limits
              </h2>
            </div>
            <ul className="mt-4 space-y-2">
              {LIMITS.map((l) => (
                <li
                  key={l}
                  className="rounded-xl border border-line-subtle bg-white/[0.02] p-4 font-sans text-sm leading-relaxed text-ink-1"
                >
                  {l}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Closing ──────────────────────────────────────────────────── */}
          <section className="mt-14 rounded-2xl border border-phase-active/20 bg-surface-1 p-6 md:p-8">
            <h2 className="max-w-2xl font-mono text-xl font-bold leading-snug text-white md:text-2xl">
              The evidence is public. The framework is proven in Case 001.
            </h2>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-ink-1 md:text-base">
              The market already shares part of this discipline: frozen criteria, on-chain
              settlement and published evidence. The full Execution Case framework — delegated
              authority, mandate, ARM, receipt, offline verification — has so far been proven
              only in Case 001. What settles on the market is listed on the Trust page, newest
              first.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/assurance/"
                className="inline-flex items-center gap-2 rounded-xl border border-phase-active/40 bg-phase-active/10 px-6 py-3 font-mono text-sm text-phase-active transition-all hover:border-phase-active hover:bg-phase-active/15"
              >
                COSMO Trust
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="/market/"
                className="inline-flex items-center gap-2 rounded-xl border border-line-base px-6 py-3 font-mono text-sm text-ink-1 transition-all hover:border-line-strong hover:text-white"
              >
                Open the market
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
