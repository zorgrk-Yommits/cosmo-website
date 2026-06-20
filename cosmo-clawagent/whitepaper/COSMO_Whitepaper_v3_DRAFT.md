# COSMO Whitepaper v3 — DRAFT

**The Native Execution Layer for the SupraOS Agent Economy**

Version 3.0 (Draft) · April 2026 · heros.cloud

---

## 1. Abstract

COSMO is a native Supra protocol that gives autonomous agents a place to settle. CosmoClaw, the protocol's reference execution provider, plugs into the SupraOS Mission Control hierarchy as a TRANSACT-class capability — the trading and DeFi-execution function that a Co-CEO, Co-CRO or Co-CFO delegates to when an on-chain action is required. The settlement layer runs as native Move modules on Supra L1 and as audited Solidity contracts on SupraEVM, with a 21-of-30 council of $COSMO-staked operators verifying cross-chain receipts. Two production stacks are running today: a SupraEVM RFQ pipeline with 54 of 54 tests green and on-chain SETTLED transactions, and a Move-native re-implementation that has cleared a nineteen-finding ultrareview audit and is ready to deploy bundled with the SupraFX integration. Whoever has the best workflows wins — and ours run natively on Supra.

## 2. Introduction

The agent economy is no longer a thesis. SupraOS Mission Control ships a working multi-agent operating system with a Co-CEO, Co-CRO, Co-CMO and Co-CFO, persistent memory, a policy engine, and — newly announced in April 2026 — a SaaS deployment tier. What it does not ship is a specialized DeFi execution layer, a settlement protocol with cryptoeconomic security, or a token-incentive system for external execution providers. That gap is where COSMO operates.

CosmoClaw is not a competing agent platform. It is the execution capability that other agents call. In the SupraOS Bot Builder taxonomy of WHEN, GET, THINK, PROCESS, ACT, TRANSACT and FLOW nodes, CosmoClaw is a TRANSACT provider — the node that turns an agent's intent into an on-chain settlement on a network the calling agent does not have to understand. The $COSMO token is the access, settlement, and reputation primitive that holds this layer accountable.

This document supersedes whitepapers v1.4 and v2.1, which described an external Node.js execution layer with off-chain polling. Both versions are retired. The architecture described here was triggered by the publication of the Supra On-chain Verifiable Compute (OVC) and AutoFi specifications and Joshua Tobkin's Mission Control briefings of April 2026, and finalized in the native-stack pivot of April 23, 2026.

The protocol's positioning rests on a single observation: agent platforms are converging on the same handful of node types — WHEN, GET, THINK, PROCESS, ACT, TRANSACT, FLOW — and the TRANSACT slot is empty for any DeFi action that goes beyond a single contract call on a single chain. Cross-chain RFQ settlement, MEV-resistant liquidity sourcing, and council-attested receipt verification are not problems an agent's planner LLM should solve at runtime. They are problems a specialized capability solves once, well, and exposes through a simple interface. CosmoClaw is that capability. $COSMO is the cryptoeconomic seal that keeps the operators running it honest.

## 3. The Pivot: Why Native Supra

Until the OVC and AutoFi documentation landed, building settlement as an external coordinator made sense. The chain offered cheap state and fast finality; it did not offer atomic multi-step execution, MEV-resistant trigger scheduling, or verifiable off-chain computation as first-class primitives. Coordination logic had to live somewhere — and the lowest-friction "somewhere" was a Node.js process polling the chain.

That argument is now structurally inverted. AutoFi gives Move modules the ability to schedule conditional, atomic, MEV-resistant trigger sequences directly on Supra L1. OVC anchors model inference and aggregation results to the chain with verifiable proofs. The combination removes the structural rationale for an external execution layer in any settlement-critical flow.

The April 23, 2026 pivot is therefore a consolidation, not a rewrite. Two stacks are alive today and continue to run in parallel:

- **SupraEVM Stack (production, settling).** RFQEngine.sol, MakerVault.sol and COSMOStaking.sol are deployed on SupraEVM testnet (chain ID 523994005626). All 54 unit and integration tests pass; the end-to-end RFQ flow has reached on-chain SETTLED state across multiple counterparties; the Express API and ClawBot run under PM2 on the production VPS.
- **Move-Native Stack (audited, ready to deploy).** The cosmo-contracts-move repository (HEAD `afe514c`, 27 commits on `main`) is feature-complete for Phase 1, with 44 of 44 tests green and 19 of 19 ultrareview findings dispositioned across nine sequenced commits. The audited code is **audited and ready, deploy bundled with SupraFX integration** — kept off testnet on purpose so the re-deploy happens once, alongside the FX wiring, rather than in pieces.

The pivot's strategic thesis: in a world where AutoFi and OVC make atomic on-chain coordination cheaper than off-chain orchestration, an external execution layer is structurally weaker than a native one. Migrate now, while the surface area is small, rather than after a year of accumulated coordinator state. The EVM stack remains the production fallback through Q3 2026; the Move stack becomes canonical once the SupraFX integration shape is locked.

## 4. Architecture: AutoFi + Settlement

CosmoClaw's architecture is four concentric layers. From inside out:

- **Identity Layer.** COSMO Hero NFT (community membership and the soul-bound primitive) and ClawAgentNFT (per-operator identity, reputation slot, slashing target).
- **Agent Layer.** CosmoClaw as the reference execution provider, plus any third-party operator who mints a ClawAgentNFT and stakes the required $COSMO. Operators are not whitelisted; they are admitted by stake and judged by reputation.
- **Execution Layer.** AutoFi-triggered Move modules running the RFQ state machine, the MakerVault inventory, and the cross-chain receipt verifier. This is the layer where DAG optimization happens (see below).
- **Settlement Layer.** A 21-of-30 council of $COSMO-staked operators verifies cross-chain receipts and signs settlement attestations. Reputation is recorded per operator; a missed leg costs −33% of reputation and a slice of stake. The $COSMO economy — fee burn, vault payouts, council rewards — is closed at this layer.

### The RFQ State Machine

```
┌──────────────┐
│  createRFQ   │   Taker submits an RFQ on chain.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   MATCHED    │   Maker (CosmoClaw or third-party) accepts.
└──────┬───────┘   60-second taker deadline starts.
       │
       ▼
┌──────────────┐
│ TAKER_SENDING│   Taker dispatches their leg on its native chain.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│TAKER_VERIFIED│   Council verifies taker receipt; >60s = -33% rep.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ MAKER_SENDING│   Maker dispatches their leg.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│MAKER_VERIFIED│   Council verifies maker receipt.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   SETTLED    │   Both legs final on their respective chains.
└──────────────┘   No bridge, no escrow, no wrapped tokens.
```

The two legs settle on their own chains. There is no bridge contract holding funds and no escrow program. The council's job is not to move money — it is to attest that two real on-chain transactions happened. This makes the security perimeter "Council bond + per-leg chain finality" rather than "bridge contract liveness."

### Cross-Chain Reach

Taker support at v3 launch covers Supra (Move), SupraEVM, BNB Chain, Base, AVAX, and Sei. Sui and Solana are out of scope for v3; both lack the EVM-RPC-shaped tooling that lets a Move-side verifier consume receipts cheaply, and adding them adds verifier complexity without adding meaningful flow. They are revisited in a v4 scope.

### DAG-Native Execution

Joshua Tobkin's April 2026 Mission Control briefing extended Supra's parallel-EVM execution model to agent orchestration: *"We're actually applying the concepts behind our parallel EVM execution. In terms of looking at a dependency graph, calculating a DAG."* The published example showed an eleven-step workflow compressed to roughly 57% of its sequential runtime — a 43% time saving — by parallelizing legs that did not depend on each other.

CosmoClaw is designed to run cleanly inside this DAG. A single RFQ has serial dependencies (taker leg precedes maker leg), but a multi-RFQ batch — a Co-CFO rebalancing across four pairs simultaneously — is naturally parallel. Each RFQ becomes one DAG node; only the pre-funding step on the maker side is shared. Parallel settlement legs in the SupraOS DAG model are a first-class case for CosmoClaw, not an afterthought.

The atomic-execution guarantee comes from AutoFi triggers, not from coordinator code. A trigger is a registered, conditional, on-chain transaction that fires when its predicate is satisfied — for example, when both legs of an RFQ have produced verified receipts. The trigger executes inside the same block as its dependencies; there is no inter-block window where a partial state can be observed, frozen, or sandwiched. MEV resistance is therefore not a property of CosmoClaw's logic but of the execution layer it runs on, which is the right place for that property to live.

## 5. CosmoClaw in SupraOS Mission Control

The Mission Control update of April 2026 reshaped where CosmoClaw plugs in. The updates change the surface CosmoClaw is built to expose, not its core.

### Three Deployment Tiers — and Why This Matters

SupraOS is rolling out three deployment shapes:

1. **Self-host** on a Mac mini or VPS — for users who want full data sovereignty.
2. **Private server** — managed but isolated, for organizations.
3. **SaaS** — *"folks that just don't want to host anything, they can actually get the kind of full benefits."*

The SaaS tier is decisive for COSMO. SaaS users by definition do not run their own DeFi infrastructure — they cannot host private keys, execution endpoints, or maker inventory. Specialized execution providers stop being optional and become the only path to DeFi capability. CosmoClaw is positioned as the pre-built TRANSACT provider for the SaaS tier — the capability a SaaS-tier Co-CFO calls without the user having to know what an RFQ is.

### The Mission Control Hierarchy

The visible Mission Control org structure has Co-CEO, Co-CRO, Co-CMO, and Co-CFO departments, each with specialized agents. CosmoClaw is the DeFi capability for the entire hierarchy, not a Co-CFO-only tool:

| Calling Department | Use Case for CosmoClaw |
|---|---|
| Co-CEO | Treasury management, strategic rebalancing, runway hedging |
| Co-CRO | Token-incentive payouts, revenue conversion, payment routing |
| Co-CFO | Trading, vault management, P&L hedging, RFQ execution |

The SupraOS Policy Engine sits above every call — spend caps, action whitelists and approval flows are enforced before CosmoClaw is invoked. CosmoClaw's own on-chain reputation system is a second, independent security layer on the contract side: SupraOS protects the user from their own agent, CosmoClaw protects the protocol from bad operators.

### Karpathy-Loop Outcome Source

Mission Control runs what the team calls a Karpathy-Loop: *"work one workflow, if success or fails, move it to the next workflow and rinse, repeat, and loop it."* CosmoClaw's TRANSACT layer is the place where settlement outcomes — the loop's primary signal — are produced. Every RFQ that settles or fails feeds the calling agent's next iteration. CosmoClaw has been running this loop since v1; SupraOS now makes it the platform default.

### Ahead of the DeFi Pattern Reveal

Joshua has announced that the next Mission Control video — within "the next two days or so" of the April briefing — will demonstrate how SupraOS agents trade in DeFi securely. CosmoClaw is positioned as the answer that already exists: a dual-stack settlement protocol with audited code, on-chain SETTLED transactions, a $COSMO economy and a defined operator role. The exact integration shape is pending Joshua's reveal; the protocol is built so that whatever pattern lands, CosmoClaw can present itself as the TRANSACT-class provider for that pattern rather than retrofitting against it.

## 6. The $COSMO Token

$COSMO is the access, settlement and reputation primitive of the protocol. It is not a fee discount token, and it does not exist for governance theater.

### Utility

Every settlement charges a small execution fee, denominated in $COSMO. The fee is split three ways:

- **Burn** — protocol-level deflationary pressure proportional to volume.
- **Vault Stakers** — yield to anyone who stakes $COSMO on a specific operator's ClawAgentNFT. NFT ownership is *not* required to stake.
- **Council** — recurring revenue to the 21-of-30 council members for the work of attesting cross-chain receipts.

### Staking and Reputation

Anyone can stake $COSMO on any operator. Yield is reputation-weighted: a high-reputation operator attracts more stake, captures more flow, and earns more for their stakers. A −33% reputation event on a missed leg cuts the stake's yield share until reputation recovers. This is a market for execution quality, denominated in $COSMO.

### Workflow Settlement

Mission Control's Cost Counselor surfaces per-workflow model spend in real time — the SupraOS team has already built the meter. That opens a concrete door for $COSMO as the settlement asset for execution fees inside SupraOS workflows: a SaaS-tier user whose Co-CFO calls CosmoClaw can pay the execution fee in $COSMO, with the same three-way split. The settlement-token policy for the SaaS tier is still in alignment with Supra Labs and is intentionally left open in this draft; the technical surface is ready either way.

### Governance

Council membership, fee parameters, and chain-support additions sit behind on-chain governance. Voting weight is staked $COSMO, time-decayed to disincentivize last-minute capture.

### Migration

The existing memecoin-era $COSMO contract migrates 1:1 into the v3 utility contract. Holders sign one transaction; balances move; the legacy contract is frozen. No vesting cliffs are added at migration.

## 7. Federated Learning Layer + Karpathy-Loop

Settlement decisions are not random. The maker side of every RFQ runs a Quote Acceptance Predictor — a small model that estimates the probability of a quote being accepted given price, inventory, counterparty history and chain conditions. The Federated Learning (FL) layer is what lets that model improve without centralizing operator data.

### The Karpathy-Loop, Concretely

Every settlement outcome is a labeled training example. Success vs. failure, time-to-settle, slippage realized vs. quoted — all of it lands on chain as part of the SETTLED event. Each operator's local model trains on its own outcomes; the FL layer aggregates the gradients, not the data. The Karpathy-Loop runs at two scales: the per-operator inner loop (each settlement updates the local predictor) and the protocol-level outer loop (aggregated gradients update the canonical model weekly).

The DAG optimization from Section 4 is the spatial dimension — it parallelizes steps inside one iteration. The Karpathy-Loop is the temporal dimension — it iterates the system across time. CosmoClaw is built to plug into both.

### Roadmap: V1 → V2 → V3

- **V1 — Centralized Aggregator (today).** A single trusted aggregator collects gradients from operators and publishes the updated model. Honest-but-curious threat model. Fastest path to a working loop.
- **V2 — OVC + Karpathy-Loop (next).** The aggregator's work is migrated to On-chain Verifiable Compute. Anyone can verify the aggregation; the aggregator role becomes mechanical. This is the canonical state we are aiming for.
- **V3 — zkML (open research field).** Not framed as a mandatory endgame. zkML earns a place only when we build models that OVC cannot support — large sentiment LLMs, time-series transformers, or models with private inputs like maker inventory or counterparty data. For the current Quote Acceptance Predictor, OVC is sufficient.

The V3 framing is deliberate. zkML is a real tool but a heavy one; deploying it before the model warrants it is engineering theater. We enter that space when the predictor's model class makes OVC infeasible — and we will say so when it happens.

## 8. Roadmap

The roadmap is organized around the SupraFX integration, not against arbitrary calendar quarters.

| Window | Milestone | Dependency |
|---|---|---|
| Q2 2026 | SupraFX integration alignment with Supra Labs; SaaS-tier policy locked | Joshua DeFi reveal |
| Q2 2026 | Move-stack canonical deploy on testnet, bundled with FX wiring | SupraFX API access |
| Q2 2026 | $COSMO 1:1 migration contract published, audited, opened to holders | Audit slot |
| Q3 2026 | EVM-stack remains production fallback; mainnet posture decided | Move-stack soak |
| Q3 2026 | Council bootstrapping: 21 of 30 seats filled; first slashing event lived | Operator pipeline |
| Q3 2026 | FL Layer V1 → V2 (OVC aggregator) | OVC GA on Supra L1 |
| Q4 2026 | SaaS-tier integration with Mission Control as TRANSACT provider | SaaS GA |
| Q4 2026 | Workflow Settlement live: $COSMO as execution-fee asset inside SupraOS | Token policy locked |

Anything past Q4 2026 is intentionally not promised.

## 9. Risks and Honest Caveats

The honest caveats are short and named.

- **SupraOS access.** SupraOS / SupraFX alpha access from Joshua Tobkin is pending. There is no signed integration agreement and no SDK contract. Our positioning as the TRANSACT provider for Mission Control is a thesis the alpha cycle will validate or invalidate.
- **AutoFi maturity.** AutoFi is new. The migration from EVM-coordinator to Move-AutoFi is staged, and the EVM stack is kept as the production fallback through Q3 2026 specifically because AutoFi has not yet seen its first protocol-scale incident.
- **Cross-chain trust.** Receipts on the taker side depend on per-chain finality and on the council's honest reading of those receipts. The 21-of-30 stake-and-slashing model bounds the trust assumption — it does not eliminate it. A coordinated 11-of-30 collusion remains a survivable but expensive attack.
- **Agent economy timeline.** Our entire revenue thesis assumes Co-CFOs and the Mission Control hierarchy reach mainstream usage in 2026 and 2027. If that adoption curve slips into 2028, our settlement volume slips with it. We are sized for a longer ramp than the bull case implies.
- **Pending DeFi pattern.** The DeFi pattern Joshua will demonstrate in his next Mission Control video has not yet been published. The final integration shape between CosmoClaw and that pattern is therefore pending. The protocol is built to adapt; the brand positioning is the part that is exposed.
- **Settlement-token policy.** Whether $COSMO can serve as the SaaS-tier workflow-settlement asset, or whether SupraOS will require a stablecoin denomination, is in active alignment with Supra Labs. The whitepaper does not promise either outcome.

### Conclusion

Whoever has the best workflows wins — and ours run natively on Supra. CosmoClaw's job is to be the boring, reliable TRANSACT-class capability that an autonomous Co-CFO calls, an SaaS-tier Co-CEO trusts, and a DAG-aware orchestrator parallelizes without thinking about. $COSMO's job is to make sure the operators running that capability are honest, accountable, and paid in a unit that tracks the protocol's own success. Two production stacks, an audited Move re-implementation, a defined council role, and a clear Karpathy-Loop signal source — that is the foundation v3 ships on.

---

*COSMO Whitepaper v3 — DRAFT · April 2026 · heros.cloud*
