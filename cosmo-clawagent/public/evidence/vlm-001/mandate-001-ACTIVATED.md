# Verifiable Liquidity Mandate 001 — ACTIVATED (frozen copy)

THIS DOCUMENT IS FROZEN. Its canonical sha3-256 over these exact bytes is
the lifecycle identifier: liquidity_mandate_id = "vlm-001:" + sha3 hex
(lowercase, no 0x). Any change = a different mandate.

## ACTIVATION VALUES (D3 ceremony, 2026-08-22)

| Field | Value |
|---|---|
| Sponsor wallet | `0x8f38b8451d15fe090A3f3503A0DaFd24432167dF` |
| COSMO Execution Wallet | `0xC4F8b3d7a9737e8e85825F306bf0A8C6AEACb00B` |
| Activation block B | `25810302` / `0xfa240a51aa8687e7ca2cb2771316e0deafcf46a81e0e69a40238869b15bc229c` |
| B timestamp (activation) | `1787397071` (2026-08-22T11:11:11Z) |
| Expiry (activation + 14d) | `1788606671` (2026-09-05T11:11:11Z) |
| Budget per leg (Rene decision 2026-08-22, <= 250 EUR hard cap) | **20 EUR** |
| Pool WETH balance @B | `365658090131648996` wei (0.36566 WETH) |
| Pool SUPRA balance @B | `4339884018307764346177024` wei (4,339,884 SUPRA) |
| 10% leg caps @B | WETH `36565809013164899` / SUPRA `433988401830776434617702` |
| ETH/EUR readings (2026-08-22T11:11:44Z) | Kraken 2058.55 / Coinbase 2059.205 EUR/ETH -> used 2059.205 (lower wei cap wins) |
| SUPRA/EUR readings (same time) | CoinGecko 0.00016782424285846946 / cross Gate.io 0.0001955 USDT x Kraken EUR/USD 1.1703 = 0.0001670511834572332 EUR/SUPRA -> used 0.00016782424285846946 |
| **max_weth_in_wei (pinned)** | **`9712486129355746`** (EUR leg binds; = floor(20 [EUR] / 2059.205 [EUR/ETH] x 10^18)) |
| **max_supra_in_wei (pinned)** | **`119172293938882948598843`** (EUR leg binds; = floor(20 [EUR] / 0.00016782424285846946 [EUR/SUPRA] x 10^18)) |
| Basefee reading @B | `98403921` wei (0.0984 gwei) |
| **max_fee_per_gas_cap_wei (pinned)** | **`393615684`** (= 4 x basefee; 600000 x cap = 0.000236 ETH <= 0.005 ETH ceiling OK) |
| EUR sum of pinned legs | 40.00 EUR <= 500 EUR hard cap |
| approval_scan_from_block (from D2) | `25809096` (first-funding block 25810096 - 1000) |
| Gas reserve pin | 0.02 ETH upper bound (funded 0.005 ETH, option B, recorded) |
| Snapshot window | B -> OPEN-ARM within 60 minutes, else NEW snapshot |

Caps independently recomputed (BigInt, exact decimal-string arithmetic):
identical values. Full readings and procedure: activation-record.md (D3).

---

# Verifiable Liquidity Mandate 001 — v1.2 (Phase D0f)

Status: FORMALIZED 2026-08-21 (Phase B), terminology + plan corrections
applied 2026-08-21 (Rene review, pre-implementation); **v1.2 (Phase D0f,
2026-08-22)** works in the four binding Rene corrections from the Phase-D
plan approval (`plans/liquidity-mandate-phase-d-plan.md`, commit `034311e`)
and pins the five previously open numbers — activation now fills in values
without ANY remaining decision. Supersedes v1.0/v1.1 and `mandate-draft.md`.
ACTIVATED 2026-08-22 (D3 ceremony): every activation value is filled in
the ACTIVATION VALUES table above. Only the `AT_STAGE2` values (tokenId,
not_before) arrive with the stage-2 pins after OPEN; their DERIVATION is
fixed here.

Naming (binding for all active documents, identifiers and code):
- Product / mandate: **Verifiable Liquidity Mandate 001** ("Mandate 001")
- Acting entity: **COSMO**
- Execution wallet: **COSMO Execution Wallet** (dedicated EOA)
- Execution key: **COSMO Execution Key**
- Technical domain: **`evm.liquidity_mandate.v1`** (action kinds
  `evm.liquidity_mandate.{open,collect,close,approval_reset}.v1`)
- Shared lifecycle identifier: **`liquidity_mandate_id`**
"Stewardship" may appear in prose as a description, never as an actor name
or identifier. The external relationship reads: the sponsor owns the capital
and the LP position; COSMO executes bounded actions under the mandate;
COSMO never becomes the economic owner of the position.

Decisions recorded:
- Pool-depth finding ACCEPTED (Rene, 2026-08-21): pool holds ~0.37 WETH; the
  10 % rule (~0.037 WETH per side) is expected to bind BELOW the 250-EUR
  budget; the sponsor knowingly accepts min(EUR leg, 10 % leg).
- GO Phase B (Rene, 2026-08-21); GO Phase C after plan corrections
  (Rene, 2026-08-21).
- Sponsor funding decision (Rene, 2026-08-20): dedicated new sponsor wallet,
  ~250 EUR, sponsor holds assets + LP-NFT + fees.
- payer = COSMO Execution Wallet (Rene, 2026-08-21) — see "Temporary
  custody", below.
- Readings (Rene, 2026-08-21): OPEN = bound two-transaction sequence under
  one case/one ARM; APPROVAL-RESET proves the swept state instead of
  containing sweep transfers; CLOSE slippage = 50 bps like the mint.
- **Phase-D plan approval with four binding corrections (Rene, 2026-08-21):**
  (1) budget = **500 EUR total, at most 250 EUR equivalent PER LEG**
  (supersedes the earlier ~250 EUR total); (2) trust pins are strictly
  ADDITIVE — Phase-C pins that verify existing evidence are never removed,
  neither in the repo trust store nor in standalone trust profiles;
  (3) cleanup proves residue ARRIVAL at the pinned sponsor address (sweep
  receipts + sponsor balance delta), not merely execution-wallet emptiness;
  (4) **max 1 COLLECT in this 14-day pilot** — the generic domain keeps two
  slots, the live policy pins only `collect_slot 1`.

## Parties

| Role | Identity |
|---|---|
| Capital owner (sponsor) | NEW dedicated Ethereum wallet, created in the activation ceremony, used exclusively for this pilot: `0x8f38b8451d15fe090A3f3503A0DaFd24432167dF`. Supra Heroes endorse and publicly audit; the sponsor is the sole economic owner. |
| Acting entity | COSMO, executing through the **COSMO Execution Wallet** — a NEW dedicated EOA (NOT the EVM-MICRO-001 wallet, NOT the deployer): `0xC4F8b3d7a9737e8e85825F306bf0A8C6AEACb00B`, signing with the COSMO Execution Key |
| Control & proof layer | COSMO Execution Case framework (mandate, hash-pinned policy, ARM ceremony, receipts, internal + standalone verification) |

## Lifecycle identity

`liquidity_mandate_id` = the canonical sha3-256 hash of the ACTIVATED
mandate document (frozen copy from the activation ceremony), prefixed
`vlm-001:`. Every OPEN, COLLECT, CLOSE and APPROVAL-RESET case carries and
exposes this same identifier: in its pinned policy, in its receipt's domain
block, and in the lifecycle ledger. Individual case mandate hashes remain
separate and per-case. Shadow fixtures (Phase C) use the reserved
identifier `vlm-001-shadow:<fixture hash>` so no shadow artifact can be
confused with the activated mandate.

## Objective

Provide and manage ONE bounded, **full-range** SUPRA/WETH liquidity position
on Ethereum mainnet for a fixed term, with every capital action
independently verifiable.

## Venue (pinned)

- Chain: Ethereum mainnet only (chainId 1, pinned genesis anchor).
- Pool: `0xe33294a2863199541d6ea584f1cc4e3f36b8ea39` (SUPRA/WETH, fee 3000) —
  provenance closed in the B3 drill.
- Position manager: `0x212A1aa26fBA5E73D217Bb2c4829de29cB99F036`
  (`Hello V3 Positions NFT-V1`; Sourcify FULL match creation+runtime;
  byte-equivalent to PancakeSwap V3 NFPM modulo 11 explained immutables).
- Assets: WETH and SUPRA only (native ETH auto-wrapped by the NFPM via
  `msg.value` counts as the WETH side).
- Drift pins: existing 15 codehash pins + NFPM codehash
  `0x386d93002124a50499feee40c0892d7bf5619aed885716ead6818e9f613e13f5`
  + `pool.lmPool() == 0x0`. Any drift = HALT.

## Term

14 days from activation.
- Activation timestamp: `1787397071` (2026-08-22T11:11:11Z, block B timestamp).
- Expiry timestamp: `1788606671` (2026-09-05T11:11:11Z). After expiry the only permitted
  capital action is CLOSE (plus its cleanup proofs).

## Capital limit (procedure fixed, numbers at activation)

Deployed capital = min(EUR leg, pool-share leg) PER LEG, both fixed at ONE
activation block `B` (number + hash, all reads EIP-1898-pinned to B):

- **Budget (Rene correction 1, 2026-08-21):** sponsor capital cap =
  **500 EUR total**; target allocation at most **250 EUR equivalent WETH**
  plus at most **250 EUR equivalent SUPRA**. The EUR sum of both pinned legs
  at activation must be <= 500 EUR (checked in the activation record).
- **EUR leg, dimensionally explicit (per asset):**
  `wei_cap_asset = floor(250 [EUR] / preis_asset [EUR/asset] * 10^decimals)`
  with `decimals = 18` for both WETH and SUPRA. Prices come from TWO
  documented public readings per asset (each logged as source / value / unit
  / UTC timestamp); per asset the reading yielding the LOWER wei cap wins.
  **Pinned price sources (decided 2026-08-21, live-checked):**
  - ETH/EUR: **Kraken** and **Coinbase** (direct EUR pairs).
  - SUPRA/EUR: **CoinGecko (direct EUR)** and the named cross-calculation
    **`preis_supra [EUR/SUPRA] = preis_supra_usdt [USDT/SUPRA, Gate.io] *
    preis_eur_usd [EUR/USD, Kraken]`** (each factor logged with source /
    value / unit / UTC).
  An unreachable pinned source = ABORT, never an ad-hoc substitute.
  Documentation-trusted, sponsor-accepted; no EUR semantics reach the
  executable policy.
- **Pool-share leg (10 % rule, token-balance method):**
  `cap_weth_wei = floor(0.10 * WETH.balanceOf(pool) @ B)`,
  `cap_supra_wei = floor(0.10 * SUPRA.balanceOf(pool) @ B)`.
- **Pinned caps:** `max_weth_in_wei = min(wei_cap_weth(250 EUR),
  cap_weth_wei)`, `max_supra_in_wei = min(wei_cap_supra(250 EUR),
  cap_supra_wei)`.

**OPEN amount derivation (correction 5 — caps are bounds, not desired
amounts):** at the pinned preflight block, derive the maximum feasible
full-range liquidity L from the pool's current `sqrtPriceX96`, the
full-range ticks, and BOTH caps (L = min of the per-token feasible L);
derive the desired token amounts from that L, and the minimum amounts as
9950/10000 of desired. Actual settlement amounts must remain at or below
BOTH pinned caps. The derivation is deterministic integer math over pinned
reads and is re-derived by the verifiers.

## Temporary custody by the COSMO Execution Wallet (honest statement)

payer = COSMO Execution Wallet: the NFPM pulls tokens from the mint sender,
so sponsor capital TEMPORARILY passes through the execution wallet for OPEN
and is exposed to the COSMO Execution Key during that window. This is
bounded by **just-in-time funding**:

`AWAITING_ARM -> mandate verification -> exact sponsor funding -> ARM ->
immediate execution`

— the sponsor funds the execution wallet with exactly the derived amounts
only after the mandate for this case has been verified, immediately before
ARM; execution follows at once. The post-action cleanup proof (see
APPROVAL-RESET) must show, at a pinned canonical block:
`SUPRA.balanceOf(execution wallet) == 0`, `WETH.balanceOf(execution wallet)
== 0`, ETH balance <= the pinned gas reserve, and all relevant ERC-20
allowances == 0.

**Scope of this custody model:** accepted ONLY for this sponsor-funded
pilot. Any future third-party capital requires a policy wallet, vault or
equivalent custody architecture — explicitly outside Phase C and outside
this mandate.

## Permitted actions (each its own Execution Case, each human-armed)

Counts fixed here: at most **1× OPEN** (counted on EXECUTED settlement), at
most **1× COLLECT in this pilot** (Rene correction 4 — the generic domain
keeps two collect slots `collect_1`/`collect_2` unchanged, but only the
`collect_slot 1` policy is pinned live; a second collect would be a separate
explicit governance act, not part of this pilot; not before day 7), exactly
**1× CLOSE**, plus **exactly one APPROVAL-RESET after OPEN** — the only action that creates an ERC-20 allowance under this
mandate (it also serves as the cleanup path of a definitively failed
partial OPEN). COLLECT and CLOSE create no ERC-20 allowance; their cleanup
is the separate NFT-authorization proof. All cases of this mandate carry
the same `liquidity_mandate_id`; the lifecycle ledger, the policies, the
receipts and both verifiers bind every action to it.

1. **OPEN** — the only two-transaction action, one case, one ARM:
   tx1 = exact SUPRA `approve(NFPM, amount1Desired)`;
   tx2 = NFPM `multicall([mint(MintParams), refundETH()])` with the WETH
   side as `msg.value`. Each transaction has EXACTLY ONE broadcast attempt
   and no retry. BOTH signed transactions are durably persisted
   (persist-before-broadcast) before the first broadcast. tx2 may be
   broadcast only after tx1 has a proven successful canonical receipt.
   **Ambiguity is UNRESOLVED, not failed:** if the tx2 broadcast outcome is
   ambiguous (no definitive status yet), the case stays in an unresolved
   observation state — the already-signed tx hash is observed until its
   status is definitive. While execution may still occur: no retry, no
   second OPEN, and NO cleanup classification (an early approve(0) could
   collide with a mint that still lands). **Fail-closed partial state:**
   only once tx2 is DEFINITIVELY unsuccessful (canonical failure, or the
   signed transaction can provably no longer execute) does the case close
   in a halted partial state; the engine HALTs, and no further capital
   action may be armed until the allowance cleanup path (APPROVAL-RESET
   with full cleanup proof) has completed. Whether a second OPEN attempt
   may then be armed is an explicit human decision recorded in the ledger
   — never automatic.
   `mint.recipient = sponsor wallet` in the mint transaction itself;
   `amount0Min/amount1Min` = 9950/10000 of the derived desired amounts.
2. **COLLECT** — collect accrued fees from exactly this tokenId;
   `recipient = sponsor wallet`, policy-bound.
3. **CLOSE** — `decreaseLiquidity` (100 % of the preflight-read liquidity,
   minimum amounts 9950/10000 of the preflight-derived values) + `collect`
   of principal and residual fees to the sponsor wallet; optional `burn` of
   the empty NFT (sponsor-armed variant). After CLOSE the mandate is
   exhausted.
4. **APPROVAL-RESET (ERC-20 cleanup, applies to OPEN only)** —
   `approve(NFPM, 0)`; the case PROVES the swept state at the pinned
   canonical post-block: allowances == 0 for both tokens, SUPRA balance
   == 0, WETH balance == 0, ETH <= pinned gas reserve. The sweep transfers
   themselves are runbook steps BEFORE this case's ARM, outside the
   artifact chain. It runs after a successful OPEN, or as the cleanup path
   of a definitively failed partial OPEN — never after COLLECT or CLOSE,
   which create no ERC-20 allowance.
   **Residue-arrival proof (Rene correction 3):** the cleanup record must
   additionally prove that the swept residue ARRIVED at the pinned sponsor
   address — every sweep transaction's receipt shows a successful transfer
   from the COSMO Execution Wallet to the sponsor (plain ETH value, or an
   ERC-20 `Transfer` log of a mandate token to the sponsor), and the
   sponsor's balance delta across the blocks bracketing the sweeps equals
   the swept sum per asset (operator CLI `sweep-proof`, record under
   `state/execution-cases/records/`). "The execution wallet is empty" alone
   never satisfies the cleanup criterion.

**NFT authorization (correction 4 — narrowest permission, ERC-721 cleanup
separate from ERC-20 APPROVAL-RESET):** COLLECT and CLOSE must prove at
their pinned block: `ownerOf(tokenId) == sponsor`, `getApproved(tokenId) ==
COSMO Execution Wallet` (single-token approval, exactly this tokenId), and
that no operator-wide approval exists (`isApprovedForAll(sponsor, execution
wallet) == false`, plus an ApprovalForAll event scan over the sponsor
wallet's bounded history — the wallet is fresh — showing no standing
approval-for-all to anyone). `setApprovalForAll` and ERC721 `permit` remain
outside the mandate. After COLLECT — and after CLOSE when the NFT remains —
a pinned read-only proof shows the token-specific approval revoked
(`getApproved(tokenId) == 0x0`); if CLOSE burned the NFT, the burn is
proven instead. This ERC-721 proof is a separate observation record and a
precondition for the next capital ARM; it is never folded into the ERC-20
APPROVAL-RESET case.

Observation and reporting need no ARM and move no capital.

## Watch (observe + report only)

A FULL-RANGE position cannot leave its range; the watch objects are the
real ones. Read-only watcher, cadence 6 h, no capital action, report on
change:

1. `pool.lmPool()` != 0x0 (drift pin — also a HALT for any armed case)
2. any pinned codehash drift (pool, NFPM, router periphery)
3. `slot0.feeProtocol` changes (economic: LP-yield share)
4. pool token balances (context for COLLECT/CLOSE timing)
5. position liquidity + `positions(tokenId)` fee growth (after OPEN)
6. SUPRA token admin surfaces (B2): implementation slots of both admin
   proxies — any change is an immediate report and blocks new ARM
   (existing position: report + sponsor decision, CLOSE always available)
7. NFT authorization state (`getApproved(tokenId)`, `isApprovedForAll`) —
   feeds the ERC-721 cleanup proof above

## Explicitly outside this mandate

Automatic repositioning (a future, separate mandate); more than one
position; any other pool, token, venue or chain; bridging; borrowing;
leverage; lending; NFT transfers of any kind (`transferFrom`, both
`safeTransferFrom` overloads, `setApprovalForAll`, ERC721 `permit`);
approvals beyond the exact mandated SUPRA amount; any swap or trading
strategy; price support or a price target; any automatic retry after an
ambiguous broadcast; any payout to any address other than the sponsor
wallet; custody of third-party capital under this EOA model.

## Risk limits (all numbers pinned, no judgment clauses)

- Mint slippage: `amountMin >= 0.995 * amountDesired` per token (50 bps);
  CLOSE minimums likewise 9950/10000 of the preflight-derived amounts.
- Gas, per case: `max_gas_cost_wei = gas_units_cap(action) *
  max_fee_per_gas_cap`, gas_units_cap pinned HERE — OPEN 600,000 (across
  the two-transaction sequence) · COLLECT 250,000 · CLOSE 450,000 ·
  APPROVAL-RESET 60,000 — and `max_fee_per_gas_cap = 4 * basefee` from a
  documented reading at activation. Absolute ceiling 0.005 ETH total gas
  per case. Exceeding either bound = the case does not submit.
- Exactly one broadcast attempt per transaction; no automatic retry.
- Immediate HALT on codehash / proxy / admin / venue / `lmPool` drift.
- Immediate HALT on any verifier REJECT.

**Pinned operational numbers (decided with the Phase-D plan, 2026-08-21 —
previously "Entscheidungsbedarf", now fixed):**

| # | Value | Pinned |
|---|---|---|
| a | COSMO Execution Wallet gas reserve | **0.02 ETH** (`20000000000000000` wei; `gas_headroom_wei` in the APPROVAL-RESET policy). Any execution-wallet balance above it outside an armed case is a watch finding. |
| b | Price sources | ETH/EUR: Kraken + Coinbase. SUPRA/EUR: CoinGecko (direct) + Gate.io×Kraken cross-calculation (formulas above). Lower cap wins; unreachable source = ABORT. |
| c | Snapshot window | **60 minutes** from block B to the OPEN ARM; beyond it the basefee cap and the 10 % readings are stale — take a NEW snapshot (new block B, new record). |
| d | tx2 "definitive" | `definitive <=> now >= mint_deadline + watch_grace`, with `mint_deadline = min(signing_block_timestamp + 120 s, mandate expiry)` (the deadline INSIDE the signed calldata — later mining MUST revert) and `watch_grace = 180 000 ms` (policy `settlement.watch_grace_ms`). tx1 wait stays code-fixed at **40 × 3 s = 120 s**; settlement poll interval **12 s** (policy `settlement.poll_interval_ms`). No code change to the proven OPEN path — the constants are hereby pinned as numbers. |
| e | Approval-scan start | `approval_scan_from_block = sponsor first-funding block − 1000`, chunked `eth_getLogs` at **10 000 blocks per chunk**. Acceptable ONLY because the sponsor wallet is provably fresh (D1: nonce 0) — its full history is bounded. Both verifiers bind the scan evidence to this pin. |

**Trust-pin discipline (Rene correction 2):** every new policy hash is
pinned ADDITIVELY. Phase-C pins needed to verify existing evidence are
never removed — in `config/execution-case-trust.json` and in the standalone
verifier trust profile alike.

## Fraud vectors & trust boundaries

| # | Vector | Bound / mitigation | Residual |
|---|---|---|---|
| 1 | SUPRA token admin (B2): unbounded mint or beacon upgrade | none possible on our side; 14-day exposure of the SUPRA side | **DOMINANT residual — sponsor-accepted, bounded by position size** |
| 2 | LM-pool hook attached mid-term | `lmPool == 0` pin: HALT + watch report | position remains; CLOSE available |
| 3 | Compromised COSMO Execution Key | JIT funding narrows the custody window to minutes; NFT/payouts policy-bound to sponsor; single-token NFT approval only; cleanup proofs after every action | worst case: loss of the in-flight OPEN funding (<= caps) or premature COLLECT/CLOSE **to the sponsor wallet** |
| 4 | Compromised sponsor key / leaked ERC721Permit signature | outside technical reach; runbook: fresh wallet, signatures treated like transactions | total loss of position — sponsor custody discipline |
| 5 | feeProtocol 4000/4000 diverts fee share | economic only, watch reports | reduced LP yield |
| 6 | EUR price reading manipulation at activation | two documented readings, lower-cap wins | negligible (bounds spending downward) |
| 7 | Thin pool / IL | full-range, 10 % cap, no price target | IL accepted as LP economics |
| 8 | Partial OPEN (approval landed, mint did not) | ambiguous tx2 = UNRESOLVED observation (no cleanup while execution may still occur); definitive failure = fail-closed partial state: HALT + mandatory cleanup before any new ARM; second attempt only by explicit human decision | standing allowance until the definitive outcome + cleanup |

## Kill conditions

- Any HALT trigger above → no further ARM; standing position: sponsor
  decision between hold-and-watch and CLOSE.
- Verifier REJECT on any case → freeze, root-cause before any new ARM.
- Ambiguous OPEN tx2 → unresolved observation of the signed tx hash until
  definitive; no retry, no second OPEN, no cleanup classification.
- Definitively failed partial OPEN → HALT until cleanup proof complete.
- Term expiry → only CLOSE (+ cleanup proofs) remains armable.

## Human authorization

- ARM by the operator for OPEN and CLOSE (and each COLLECT).
- Sponsor's own on-chain acts (JIT funding, single-token
  `approve(execution wallet, tokenId)` before COLLECT/CLOSE, its revocation
  afterwards, receipt of all payouts) are sponsor transactions — listed in
  the activation runbook.
- No ARM for observation and reporting.

## Closure and proof

Every capital action ends in a COSMO receipt over hash-chained evidence and
must be ACCEPTED by both the internal and the standalone verifier; every
receipt exposes the `liquidity_mandate_id`. Receipts are published (neutral
principal identifiers only). Honest limits carried in the mandate text:
vector #1 is the dominant residual risk, sponsor-accepted for the bounded
amount; the temporary EOA custody window (vector #3) is accepted for this
sponsor-funded pilot only; the pool's protocol-fee share reduces LP yield
and is governed by the factory owner.
