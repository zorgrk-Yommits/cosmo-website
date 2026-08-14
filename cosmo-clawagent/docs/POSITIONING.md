# COSMO Strategic Positioning v5.0

> **Priority: HIGH — this document is the canonical public positioning of COSMO.**
> v5.0 supersedes v4.0 ("Execution Layer for the Agent Economy"), which superseded
> the RFQ/TRANSACT-provider framing of Whitepaper v3.1. Effective 2026-08-14.
> All v4.0 guardrails remain in force verbatim (see below).

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
- **Verification claim, exact wording while the verifier is private:** "Public
  evidence bundle. Offline verification currently requires the COSMO verifier,
  whose implementation remains private." Describe the check as "separate
  offline consistency verification" or "offline verification of internal
  consistency" — never "independent offline check" or anything suggesting
  third-party attestation, and never "verifiable by anyone offline". Proof
  lists say "backed by public evidence", not "independently checkable".
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

- **COSMO Manifesto v4.0 (FINAL, July 2026)** — `public/COSMO_Manifesto_v4.0.pdf`,
  15 pages, served at `/COSMO_Manifesto_v4.0.pdf`. Editable master:
  `docs/manifesto/COSMO_Manifesto_v4.0.html` (render via weasyprint).
- **Known discrepancy:** the Manifesto still reflects the v4 "Execution Layer"
  framing. A v5 manifesto is a separate track behind its own GO; until then the
  website (`/institutional/`, `/assurance/`, landing) is the current statement
  of the v5 positioning.

## Notes

- v4.0 history: effective 2026-06-26, replaced Whitepaper v3.1/v2.0; website
  wiring `bdd0231`; manifesto finalized `f4a6db6`/`66e882b`.
- Mirrored in: Obsidian vault and Claude auto-memory (`institutional-layer.md`,
  `cosmo-positioning-v4.md` for history).
