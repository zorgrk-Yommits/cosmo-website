# COSMO — Execution & Accountability Layer for the Agent Economy

Public website for **COSMO**, the execution and accountability layer for the
emerging Agent Economy on Supra.

## Positioning

COSMO is **built on Supra** and **complementary to** the Supra agent stack — it
is **not a competitor**:

| Layer | Role |
|---|---|
| **SupraOS** | Agent coordination / orchestration layer |
| **SupraFX** | Market, liquidity and trading rails |
| **COSMO** | Execution & accountability layer — turns autonomous intent into accountable, atomic on-chain execution |

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
