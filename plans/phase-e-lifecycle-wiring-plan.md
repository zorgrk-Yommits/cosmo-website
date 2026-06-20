# Phase E — wire lifecycle.ts to the enriched Mainnet capture

## Goal
Replace the demo's data source — old ephemeral **testnet** snapshot
`@/data/d13-happy-events-2026-06-11.json` (chain 6) — with the real, persistent
**Mainnet** round-trip capture `mainnet-e2e-roundtrip-capture.json` (chain 8,
request_id 1, quote_id 0), audited green in Phase D.

## Source schema (new capture, from quote-server/src/roundtrip/capture.ts)
Top: run_ts, chain_id 8, rpc_url, explorer_tx_base, reqId, quoteId, maker, taker,
agent_nft, quote_pubkey, quote_pubkey_is_dev, pair{token_in/out{address,symbol,decimals,name}},
legs[5]{name,hash,block,ts,from,status,request_id,quote_id,amount_in,amount_out,token_in,token_out,flows[]},
hashes{}.

## Target contract (lifecycle.ts public exports — MUST stay stable)
Snapshot/RawStep/LifecycleStep types, ALL_STEPS, CORE_STEPS, SETUP_STEPS, ECONOMICS,
META, formatToken, truncateHex, amountSymbol, supraScanTxUrl, TOKEN_IN/OUT_SYMBOL/ADDR.
Consumers (RfqReplay, LifecycleRail, DeployDrawer, SettlementStage, DataPanel,
NarrativeHeader) read ONLY these.

## Chosen approach: ADAPTER (recommended)
Keep every public export + type identical. Change ONLY the private data-loading half
of lifecycle.ts: transform the lean capture into the existing `Snapshot` shape. ZERO
consumer edits -> lowest risk. (Alternative: full rewrite of lifecycle + all consumers
to the new schema — higher risk/effort, rejected unless requested.)

### Per-field mapping (capture -> Snapshot/RawStep)
- run_date  <- run_ts (date part)        chain_id <- chain_id (8)   rpc <- rpc_url
- request_id/quote_id/cap_id <- reqId/quoteId/("0")
- contract_addresses.{package=maker, token_in_fa=pair.token_in.address, token_out_fa=pair.token_out.address}
- amount_in/amount_out <- settle leg amount_in/amount_out (1000000 / 997000)
- ephemeral = false (persistent Mainnet hashes -> render LIVE links)
- steps[]: one RawStep per leg -> {step:index, label:name, sender:from, tx_hash:hash,
  status:"Success", vm_status:"Executed successfully", block_height:block,
  timestamp: ISO(ts), events:[synthesized domain event]}.
  Synthesize a domain event per leg carrying the leg's amounts/tokens so DataPanel +
  amountSymbol render unchanged (RequestCreated/QuoteSubmitted/QuoteFunded/QuoteAccepted/
  SettlementExecuted with amount_in/amount_out/promised_amount_out/min_amount_out fields).
- Synthesized OFF-CHAIN step "sign_quote_offchain" (status "off-chain") inserted between
  create_request and submit_quote, from quote_pubkey — preserves the offchain rail node the
  UI expects. (Capture has no off-chain tx by design.)

### Gap handling (fields the lean capture lacks)
- SETUP_STEPS: empty (capture is core-loop only). DeployDrawer already tolerates empty.
- ECONOMICS.settlementGas: null for now (SettlementStage hides it gracefully). OPTIONAL
  follow-up: enrich capture.ts to read FeeStatement.total_charge_gas_units.
- ECONOMICS.escrowAfterSettle: {tokenIn:0, tokenOut:0} — true post-settle (settlement flows
  drain escrow to both sides; provable from leg flows). Renders "empty".
- TOKEN_DECIMALS / symbols: source from pair.token_*.decimals (6) + .symbol
  (tINTEST/wCOSMO) instead of hardcoded 6 / tIN-tOUT.
- META.network "Supra Mainnet"; livenessLabel "Live on Supra Mainnet"; chainId 8.
- supraScanTxUrl: `${explorer_tx_base}${hash}?network=mainnet` (path /tx/ CONFIRMED in
  reaudit). Real persistent links now.

## Files touched
- COPY capture JSON -> src/data/mainnet-e2e-roundtrip-capture.json (website data dir).
- EDIT src/app/demo/lib/lifecycle.ts (data-loading half only; public API unchanged).
- NO consumer-component edits.

## Verification
- npm run typecheck / build in cosmo-clawagent.
- Visual: /demo renders 5-leg core loop, settlement climax shows tINTEST->wCOSMO with
  real amounts, live SupraScan links resolve, no setup drawer noise, footer says Mainnet.

## Open decision for Rene
1. Adapter (recommended) vs full rewrite?
2. settlementGas: ship null now, or first enrich capture.ts with the FeeStatement gas?
