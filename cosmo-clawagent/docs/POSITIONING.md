# COSMO Strategic Positioning v6.1

> **Priority: HIGH — this document is the canonical public positioning of COSMO.**
> v6.1 (effective 2026-10-03, decision Rene) changes the ORDER of the public
> story once more: **jobs first, liquidity under rules second.** Nothing from
> v6.0 or v5.0 is revoked: the mandate story, the seven primitives, the claim
> discipline and all language guardrails remain in force (kept in full below).
> Implementation plan: `plans/site-clarity-plan.md`.

## v6.1: the story a first-time visitor gets

**Rule for every page:** a person without blockchain knowledge can say what the
page does after ten seconds. Picture first, one plain sentence second,
technical detail on request. Simpler wording never widens a claim: every limit
below still applies, and the limit stands next to the sentence it qualifies.

### Positioning hierarchy (binding order, replaces the v6.0 order)

1. **Primary: jobs.** "AI needs work done. COSMO gets it done." An AI agent
   posts a job, a provider does the work, payment is released after the result
   is checked. Picture: AI Agent → COSMO → Provider → Result → Payment.
2. **Secondary: liquidity under rules.** "Let an agent manage liquidity without
   giving it unlimited control." This is the Verifiable Liquidity Mandates
   story of v6.0, told with the allowed actions and limits shown before the
   word "mandate" appears.
3. **Category:** execution and assurance infrastructure for agent economies.

### Approved hero (replaces the v6.0 hero on the landing page)

> **AI needs work done. COSMO gets it done.**
>
> An AI agent posts a job. A provider does the work. Payment is released only
> after the result is checked.

Binding qualifiers, visible next to the hero:

- COSMO does not do the work itself. Curated providers do; COSMO runs the job,
  holds the payment and pays out. Never imply an open provider network.
- State the maturity: pilot, supervised, small budgets, settles on Supra Mainnet.
- "Marketplace ≠ full Execution Case" (below) still holds: day-to-day jobs do
  not run through the full mandate framework.

The v6.0 hero stays approved for the liquidity page (`/mandates/`), under the
plain headline of point 2.

### Vocabulary

Visible copy uses the plain words in `src/components/cosmo/terms.ts` (job,
offer, payment, locked payment, safety deposit, rules, result, "what counts as
done"). The technical term stays available in the technical-details blocks and
once in brackets where an expert looks for it. `npm test` enforces this
(`scripts/check-plain-language.cjs`). The seven primitives keep their canonical
names in technical and evidence contexts.

### Maturity labels (one scale, site-wide)

Live · Pilot · Tested · Experimental · Planned · Archive, defined once in
`src/components/cosmo/MaturityBadge.tsx`. The market is **Pilot**. Liquidity
mandates are **Tested** (EVM-MICRO-001, VLM-001: run for real, evidence
published, nothing running now), never "live".

### Say only what the interface can do

Copy describes what a visitor can do on the site today. A function that exists
in the contracts but has no button (cancelling a job, disputing a result) is
described as "contact us" or as planned, never as something the visitor can
do "at any time".

---

# v6.0 layer: Verifiable Liquidity Mandates

> v6.0 (effective 2026-08-20) is now the SECOND story, not revoked. Everything
> below applies in full wherever liquidity mandates are presented.

## Primary audience

**Market makers and liquidity managers deploying capital entrusted to them** by
protocols, foundations, DAOs, treasuries or investors.

The driving question is no longer the general "how can autonomous agents act
economically?" but the concrete:

> **"How does a capital owner delegate execution to a market maker or agent
> without handing over a wallet key with blanket authority?"**

## Core statement (binding)

**Capital owners define the mandate. Agents execute within hard limits. COSMO
proves every action.**

Extended form: *COSMO lets market makers and liquidity managers deploy
third-party capital without requiring blind trust.*

German working form: COSMO ermöglicht Market Makern und Liquiditätsmanagern,
anvertrautes Kapital innerhalb eines klaren Mandats einzusetzen. Der
Kapitalgeber legt Märkte, Beträge und Risikogrenzen fest. COSMO weist
anschließend unabhängig prüfbar nach, was tatsächlich ausgeführt und gesettelt
wurde.

## Product term

**Verifiable Liquidity Mandates.** One mandate binds: the capital owner; the
market maker or liquidity agent; permitted markets and venues; amount, position
and inventory limits; slippage and gas bounds; duration and action count; retry
and stop rules; one-shot or time-bounded authorization; the actual execution;
settlement; and an independently checkable receipt.

## Primary problem

A capital owner wants to delegate liquidity work but not: hand out an
unrestricted private key; sign every transaction manually; rely solely on the
market maker's own reports; discover limit breaches only after a loss; or
reassemble authorization, execution and settlement from separate systems.

COSMO closes that gap: **delegation without blanket authority, autonomy without
free disposal, proof instead of reporting.**

## Primary use cases

1. Bounded treasury rebalancing.
2. Deploying capital into approved liquidity pools.
3. Rebalancing inventory across approved assets.
4. Hedging holdings within preset limits.
5. Building or withdrawing liquidity by fixed rules.
6. Later: proving execution quality against external reference markets.

The first pilot does not need to automate a full market-making strategy — a
single rebalancing or one bounded liquidity action suffices.

## Roles

| Role | Who |
|---|---|
| Capital owner | Protocol, foundation, DAO, treasury, investor |
| Operator | Market maker, liquidity manager, autonomous agent |
| COSMO | The mandate, control, execution and proof layer between them |

COSMO is explicitly NOT: the market maker; a trading strategy; a DEX; a
custodian; merely an agent wallet; a profitability promise; a general trading
bot.

## Differentiation

Other wallet/policy systems can LIMIT what an agent may spend. COSMO
additionally PROVES: which mandate applied; which policy was enforced; which
market conditions were checked; which exact transaction was prepared; what was
actually sent; what settled on chain; whether amount, route, slippage, gas and
retry rules were honored; and that an independent verifier confirms the same
case.

## Anchor proof: EVM-MICRO-001 (approved usage)

EVM-MICRO-001 may be used as the technical proof: real Ethereum mainnet, real
capital, native ETH -> SUPRA, hard-pinned pool and router, bounded amount,
slippage and gas caps, manual case-bound ARM, exactly one submit, no automatic
retry, settlement on Ethereum, internal AND standalone verifier ACCEPT.
Records: `cosmo-contracts-v2/docs/evm-micro-001/` (final-live-record.md,
post-live-record.md, mainnet-shadow-record.md).

It must NOT be inflated into: a production-ready market-making system, or a
complete best-execution product.

## Positioning hierarchy inside the liquidity story

> The site-wide order is set by v6.1 above. This order applies within the
> liquidity story.

1. Verifiable Liquidity Mandates for market makers and liquidity managers.
2. Controlled treasury execution.
3. Category: execution and assurance infrastructure for agent economies.

"Execution Layer for Agent Economies on Supra" and "Institutional Layer for
Autonomous Economies" remain valid as technical category labels — but they are
no longer the first and most abstract statement anywhere.

## Approved hero (liquidity page)

> **Verifiable Liquidity Mandates**
>
> Delegate liquidity operations without delegating blind trust.
>
> Capital owners define the markets, limits and authority. Agents execute.
> COSMO proves every action.

## Approved short pitch

COSMO is a control and verification layer for market makers and liquidity
agents managing third-party capital. Capital owners issue bounded mandates
covering venues, assets, amounts, slippage, gas and execution limits. Every
action ends in an independently verifiable execution and settlement receipt.

## Pilot offer

**COSMO Controlled Liquidity Pilot** — one capital owner; one market maker or
agent; one trading pair; one approved venue; one bounded capital mandate; one
concrete liquidity or rebalancing action; one independently checkable closing
record. CTA: *"Run one bounded liquidity mandate with real capital and
independently verify the result."*

## Never claim (v6 additions, alongside all v5 rules)

- guaranteed capital safety;
- guaranteed profitability;
- regulatory or legal compliance;
- best execution while no reference-market comparison data exists;
- fully autonomous market making;
- support for arbitrary chains, routers or strategies;
- production readiness based on the EVM-MICRO-001 pilot alone.

---

# Inherited layer: v5.0 — Institutional Layer for Autonomous Economies

> v5.0 (effective 2026-08-14) is SUBORDINATED under v6.0 above, not revoked:
> every primitive, every claim rule and every guardrail below remains in force.
> What changed in v6.0 is the ORDER of the story — the abstract category is no
> longer the first sentence.

## The positioning

**COSMO is the institutional layer for autonomous economies, built on Supra.**
SupraOS coordinates agents, SupraFX provides market and liquidity rails — COSMO
provides the delegated authority, mandates, policies, receipts and verification
that make autonomous action accountable.

| Layer | Owner | Role |
|---|---|---|
| Coordination | **SupraOS** | Agent coordination layer — how agents discover, negotiate, orchestrate |
| Markets | **SupraFX** | Market / liquidity / trading rails — price, depth, venues |
| Institutional | **COSMO** | Governance primitives around autonomous action: authority, mandate, policy, ceremony, record, receipt, verification |

**COSMO complements SupraFX and SupraOS. It is explicitly NOT a competitor.**

## The seven primitives (canonical vocabulary)

Delegated authority and the per-case mandate are two different things and are
never merged in copy. The separating sentence is canonical:
**"Capability is copyable. Authority is not."**

1. **Delegated authority** — standing, bounded permission: delegate key, scope,
   caps, expiry, on-chain revoke.
2. **Mandate** — signed authorization of one concrete execution case: one-shot
   nonce, TTL, policy-hash binding.
3. **Policy** — rules hash-pinned before the action; default-REJECT, fail-closed.
4. **Ceremony** — human ARM of the irreversible step (AWAITING_ARM → ARM → resume).
5. **Record** — hash-chained journal plus write-once evidence under a manifest.
6. **Receipt** — signed closing statement with the honest 8-outcome taxonomy.
7. **Verification** — independent offline check of internal consistency.

## Anchor proofs

**Execution Case 001** (SupraFX Mainnet, micro-live, 2026-08-14): all seven
primitives in one real trade, EXECUTED at exactly the mandated rate, ACCEPT
10/10, delegated authority revoked on-chain afterwards. Bundle:
`public/evidence/execution-case-001/`.

**Execution Case 002** (Supra chain 8, micro-live, 2026-08-14): the
generalization case — mandated marketplace work delivery (deliver_result_v2,
job 9, 5 wCOSMO escrow), result hash pre-committed in the mandate, on-chain
hash == mandated hash, EXECUTED, ACCEPT 10/10 through the SAME verification
entry point. Ends at DELIVERED (honest scope). Bundle:
`public/evidence/execution-case-002/`. Narrative page: `/institutional/`.

## Claim discipline (binding)

- **Generalization claim — CLAIMABLE since 2026-08-14:** the condition (a
  second, non-trading case actually proven) is met — Execution Case 002
  (mandated marketplace work delivery, case_mst8l7i8d4391a) closed EXECUTED
  and verifies ACCEPT 10/10 through the same entry point as Case 001. Exact
  wording stays binding: "One verification entry point, shared integrity
  guarantees, two domain-specific execution profiles." Never "one verifier,
  two domains" — the economic meaning of each action stays domain-specific;
  what is shared are the integrity invariants (signatures, mandate binding,
  policy pins, journal chain, evidence manifest, receipt integrity,
  fail-closed behavior). Case 002's honest scope: mandated work delivery with
  on-chain commitment (ends at DELIVERED) — never described as settlement.
- **Marketplace ≠ full Execution Case (binding separation):** the live market
  already shares part of the discipline — frozen criteria, on-chain settlement,
  published evidence — but does NOT run on the full Execution Case framework
  (delegated authority, mandate, ARM, receipt, offline verification). Approved
  wording: "The market already shares part of this discipline: frozen criteria,
  on-chain settlement and published evidence. The full Execution Case framework
  has been proven in Case 001 (a SupraFX trade) and Case 002 (a marketplace
  work delivery, run over the market as one mandated case). Day-to-day market
  jobs do not yet run through the full framework." Landing wording: "COSMO's
  live market already settles task work on-chain. Separately, Execution Cases
  001 and 002 proved the bounded-authority model in two domains."
- **Verification claim (updated v6.1: the verifier is public):** the standalone
  verifier is published at `/verifier/` (v1.3.2). Approved wording: "Public
  evidence bundle. Anyone can run the published offline verifier against it."
  Describe what it does as "offline verification of internal consistency".
  "Independently verifiable" is allowed only in that sense: someone other than
  COSMO can run the published verifier. It never means third-party
  attestation, an audit, or proof that the outside world matches the record;
  the verifier is written by COSMO and that limit is stated next to the claim.
  The earlier wording "requires the private COSMO verifier" is retired and must
  be removed where it still appears (`/assurance/`, `/institutional/`).
- **Human trust anchor:** Case 001 was supervised agent execution with explicit
  human authorization at the irreversible boundary (ARM). The human step is
  part of the proven authority model, never described as a shortcoming or
  contrasted dismissively with automation.
- **"Institutional" scope:** governance primitives only — never custody,
  supervision, regulatory status, or an investment product. State the negative
  explicitly wherever the word carries weight.
- Facts and roadmap never mix; honest limits (self-attestation, one attestor,
  consistency-not-world-truth, observation-based settlement, micro scale, no
  demonstrated paying market) are stated next to the claims they qualify.

## Principal identifiers in public evidence (binding)

Case 001's signed artifacts carry `principal_ref: "operator:rene"` and
`armed_by: "rene"`. Signed originals are never modified after publication; this
disclosure was consciously confirmed for Case 001. **Rule for all future public
cases: choose a neutral principal identifier BEFORE execution** — e.g.
`operator:zorg`, a wallet address, or a pseudonymous operator id. Personal
first names do not appear in new public evidence.

## Language guardrails (unchanged from v4.0, in force verbatim)

**Avoid** (hard integration claims — not approved):
- "integrated with SupraOS"
- "official SupraFX partner"
- "live SupraOS TRANSACT provider"

**Use** (approved soft framing):
- "built on Supra"
- "designed for the emerging Agent Economy"
- "complementary to SupraOS and SupraFX"
- "exploring machine-to-machine commerce"

## Primary public document

- **COSMO Manifesto v6.0 ("Verifiable Liquidity Mandates", September 2026)** —
  served at `/manifesto/` (self-contained HTML, EN + DE, plus `/manifesto/index.txt`
  short version). Editable master: `docs/manifesto/COSMO_Manifesto_v6.0.html`;
  `public/manifesto/index.html` is a verbatim copy of it.
- **Archived:** Manifesto v5.0 ("The Institutional Layer for Autonomous
  Economies", August 2026) at `/manifesto/v5/`, unchanged apart from an archive
  note. Manifesto v4.0 PDF (`/COSMO_Manifesto_v4.0.pdf`, master
  `docs/manifesto/COSMO_Manifesto_v4.0.html`) stays in place for old links.
- The manifesto follows the v6.0 hierarchy above (mandates first, primitives as
  foundation, category last) and carries every proof with its honest scope.

## Notes

- v4.0 history: effective 2026-06-26, replaced Whitepaper v3.1/v2.0; website
  wiring `bdd0231`; manifesto finalized `f4a6db6`/`66e882b`.
- Mirrored in: Obsidian vault and Claude auto-memory (`institutional-layer.md`,
  `cosmo-positioning-v4.md` for history).
- Related internal strategy doc: `docs/OPPORTUNITY-MAP.md` (2026-08-22,
  working hypothesis — opportunity portfolio and market-proof ladder; does NOT
  override this document).
