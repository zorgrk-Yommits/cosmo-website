# COSMO — Verifiable Liquidity Mandates

Public website for **COSMO**, a control and verification layer for market makers
and liquidity agents managing third-party capital. Capital owners define the
mandate — venues, assets, amounts, slippage, gas and execution limits; agents
execute within hard limits; COSMO proves every action with signed mandates,
pinned policies, receipts and independent verification. Built on Supra;
category: execution and assurance infrastructure for agent economies.
Canonical positioning: `docs/POSITIONING.md` (v6.0).

## Positioning

COSMO is **built on Supra** and **complementary to** the Supra agent stack — it
is **not a competitor**:

| Layer | Role |
|---|---|
| **SupraOS** | Agent coordination / orchestration layer |
| **SupraFX** | Market, liquidity and trading rails |
| **COSMO** | Institutional layer — governance primitives (authority, mandate, policy, ceremony, record, receipt, verification) around autonomous action |

COSMO turns autonomous intent into accountable, atomic execution. The current
proven capability is a **Mainnet proof of accountable execution** via an
RFQ-based round-trip; it is **not permissionless yet**. RFQ is the technical
proof of the mechanism, not COSMO's product identity.

The primary public statement is the **COSMO Manifesto v4.0** (linked from the
homepage). See `docs/POSITIONING.md` for the canonical positioning and the
language guardrails (no hard SupraOS/SupraFX integration or partnership claims).

## Routes

- `/` — positioning + the agent-economy story
- `/demo` — click-through replay of the controlled Mainnet round-trip (static on-chain data)
- `/community-rfq` — controlled community experiment in machine-to-machine commerce (intent-only)
- `/access` — COSMO NFT holder access gate (Stage 1)

## Development

```bash
npm run dev     # dev server
npm run build   # static export to out/
```

The site is a static export (`out/`) served by `serve`. `public/` assets —
including `COSMO_Manifesto_v4.0_DRAFT.pdf` — are copied into `out/` on build.
