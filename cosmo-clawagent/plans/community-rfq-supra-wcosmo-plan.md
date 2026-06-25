# Controlled Community RFQ Demo — supUSDC → wCOSMO

Status: **Stage-1 intent-only implemented** (`/community-rfq`). Stage-2 on-chain remains
locked behind a separate GO. No transactions, no token movement, no permissionless operation.

Narrative: *"A community wallet asks with supUSDC. Kahless quotes wCOSMO. COSMO settles."*

---

## 1. Verified read-only compatibility finding (Supra Mainnet, chain 8)

All facts below were confirmed by read-only RPC reads against `https://rpc-mainnet.supra.com`
(no transaction). Candidate addresses were taken from the SupraNova bridge frontend
(`supranova.ai`) token config and then **disambiguated on-chain** — the config mixes
environments, so only the address that resolves on Mainnet with the correct symbol is treated
as canonical.

### token_in — supUSDC  (GO)
- Metadata address: `0xf90b4b9d4a9d87c39fb3140513e52edc3ead5eaddcb9881b02becdeb63c5793d`
- `0x1::fungible_asset::Metadata`: present (real FA metadata object)
- symbol / name / decimals: `supUSDC` / "Supra Wrapped USDC" / **6**
- DispatchFunctionStore: **absent** -> non-dispatchable
- Atmos / dispatchable_fa_store: **no** (managed only by the bridge `wrapped_token_deployer`
  `0xda20f7...f932` mint/burn refs — not a dispatch hook)
- primary_fungible_store: usable — `DeriveRefPod` present; live supply 35,028.31 supUSDC;
  real holders carry nonzero primary-store balances (verified on AMM pool accounts)
- Migration: **none needed** — FA-native (unlike SUPRA, which needs CoinStore -> FA migration)

### token_out — wCOSMO  (already proven)
- Metadata address: `0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6`
- decimals: **6**, non-dispatchable, primary-store compatible
- Accepted by the live RFQ engine (was token_out in the D-14 Mainnet round-trip)

### Engine fit
- `rfq_engine::create_request(token_in, token_out, ...)` moves both legs via
  `primary_fungible_store::transfer`; the D-13/K1 leg-gate rejects any dispatchable FA
  (`is_store_dispatchable`). Both supUSDC and wCOSMO are non-dispatchable -> leg-gate passes.
- Both legs are 6 decimals -> clean amount math.

### Rejected / blocked
- iUSDC `0x90a8e901...ec57b281`: real FA but **dispatchable** (DispatchFunctionStore present,
  iAsset) and on-chain decimals = **8** (the bridge config's `decimal:6` is wrong). NO-GO —
  same blocked class as SYRUP / HERO / BEYOND / underlying COSMO.
- supUSDC config siblings `0x2b97...1569`, `0x3ca1...0e96` and iUSDC `0x7762...661c`:
  resolve to null on Mainnet -> other environments, excluded.

Recommendation: **supUSDC → wCOSMO = GO** as the first external-value Controlled RFQ demo pair.

---

## 2. Stage-1 — intent-only (implemented)
Route: `/community-rfq` (`src/app/community-rfq/`).
- StarKey connect + static allowlist recognition (reuses `access/lib/allowlist`).
- Fixed pair: token_in = supUSDC, token_out = wCOSMO (both read-only, not user-selectable).
- Inputs: `amount_in` (supUSDC, capped), `min_amount_out` (wCOSMO, capped).
- Output: a local **intent preview** (human + base-unit quants). No funds move.
- Hard: 0 transactions, 0 token movement, no migrate flow, no accept_quote, no live maker
  response, no RPC, no signature. The only network action is the user-initiated StarKey connect.

## 3. Stage-2 — controlled on-chain (LOCKED, needs separate GO)
Shown in the UI as disabled with these requirements:
- allowlisted requester holding a small amount of bridged supUSDC
- K1 free wCOSMO top-up (maker pays amount_out from free primary store; bond/caps untouched)
- manual, targeted K1 quote (no automatic open maker response)
- explicit separate GO before any Mainnet transaction
Then: real `create_request` -> targeted quote -> `accept_quote` (atomic settle) -> static
`/demo` capture.

## 4. Guardrails (binding)
No unlimited amounts · only verified tokens (supUSDC `0xf90b...5793d` / wCOSMO `0x4799...0cff6`)
· no dispatchable assets in Stage-2 · no automatic maker response · no external user funds
without explicit UI warning · no keyfile/secret output · no server-key production claim · no
permissionless/open-market claim · no deploy without GO · no transaction without GO.

## 5. Suggested caps (carried into Stage-2)
- amount_in: first run ~1.0 supUSDC; hard cap <= 5 supUSDC (5,000,000 base units @ 6 dec)
- amount_out: first run ~1.0 wCOSMO; hard cap <= 5 wCOSMO (5,000,000 base units @ 6 dec)
- 1 request at a time
