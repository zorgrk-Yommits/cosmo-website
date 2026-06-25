# Founder-only RFQ dApp — Stufe 1 Plan

Status: FREIGEGEBEN 2026-06-22. Plan-First abgeschlossen; Build autonom-iterativ.
Projekt: cosmo-clawagent (Next.js 16.1.6, App-Router). Produktname: COSMO / $COSMO.

## Ziel

Founder-only Weboberfläche auf der bestehenden COSMO-Website, über die der Founder
mit verbundener StarKey-Wallet die RFQ-Taker-Aktionen per Klick gegen den live
Mainnet-Stand ausfuehrt — statt CLI. Stufe 1 = Rene benutzt sie selbst mit eigener
Wallet; keine Oeffnung fuer Fremde (spaeterer zweiter Schalter, nach Stage-2-Hardening).

## Sicherheits-Leitplanke (nicht verhandelbar)

Signatur ausschliesslich ueber die Browser-Wallet (StarKey). Der deployer_v2-Key
kommt im Frontend NICHT vor. Keine Admin-/Deploy-/Arming-Funktionen in der dApp —
nur wallet-signierte Nutzer-(Taker-)Aktionen.

## Genehmigte Entscheidungen

1. Scope = (a) Taker-Cockpit zuerst, dann (b) minimaler Maker-Daemon-Auto-Quoter
   unmittelbar anschliessend. a+b = benutzbarer End-to-End-Zustand (verstanden).
2. cap_id (Trading-Capability): fuer Stufe 1 per CLI minten + in der dApp nur
   referenzieren. dApp-Mint-Flow als spaetere Stufe kartieren.
3. Test-Target: Testnet chain 6 zuerst; Mainnet-Flip (chain 8) erst nach gruenem
   Loop auf chain 6.

## Ist-Stand (read-only verifiziert 2026-06-22)

- Wallet: context/WalletContext.tsx bindet StarKey nur LESEND an
  (window.starkey.supra: connect/account/accountChanged/disconnect; parallel .evm).
  Kein Signing, kein Senden, kein supra-l1-sdk. Signing-Schicht = Greenfield.
- NFT-Gate: src/lib/nftGate.ts = read-only GraphQL (Tradeport-Indexer), COSMO-NFT
  Holder-Check. layout.tsx wrappt WalletProvider im Demo-Build bewusst NICHT
  (NEXT_PUBLIC_TRADEPORT_* Key-Leak-Schutz) -> /founder braucht eigenen Provider-Scope.
- Demo: src/app/demo/lib/lifecycle.ts laedt statischen Snapshot
  (src/data/mainnet-e2e-roundtrip-capture.json) -> ALL_STEPS/CORE_STEPS/ECONOMICS/META.
  RfqReplay.tsx + SettlementStage.tsx = reine Replay/Animation, kein RPC/Wallet/Tx.
  Keine Chain-Libs in package.json.
- Wiederverwendbar: visuelles Vokabular (LifecycleRail/StepNode/SettlementStage/
  DataPanel) + Step/Snapshot-Schema. NICHT als Engine: lifecycle.ts ist Snapshot-
  Adapter, keine interaktive State-Machine.

## rfq_engine Entry-Funktionen (Modul 0xf2785..1264e1::rfq_engine, mainnet live)

Taker / wallet-signierbar (in dApp):
- create_request(requester, agent_nft_addr, token_in, amount_in, token_out,
  min_amount_out, request_fee_quants)
- accept_quote(taker, request_id, cap_id, expected_amount_out, expected_signed_at,
  expected_settlement_deadline_secs)
- cancel_request(requester, request_id)
- execute_settlement(caller, quote_id) / automation_resolve(caller, quote_id)  [permissionless caller]
- claim_unwind(caller, quote_id)  [permissionless, nach Deadline]

Maker/Daemon (off-chain, NICHT in dApp):
- submit_quote(submitter, ..., signature_blob)  [Ed25519 Server-Sig]
- fund_quote(operator, request_id)  [Operator-Kapital]
- reclaim_unaccepted_quote(operator, ...)

Admin/Governance (nie in dApp): set_server_quote_pubkey, freeze_quote, council_slash_quote

Views (Live-Lesen): get_request, get_quote, get_accepted_quote, accepted_quote_status,
is_configured, get_next_request_id, get_next_quote_id, quote_ttl_secs,
min/max_settlement_deadline_secs, Status-Enums.

## 60s-TTL / Daemon-Einordnung

Founder-Taker macht NUR: create_request -> Quote abwarten -> accept_quote ->
Settlement triggern/beobachten. Maker (submit_quote+fund_quote) = off-chain Daemon
mit Operator-Key. Quote-TTL ~60s ab signed_at; accept_quote erzwingt die TTL
ebenfalls -> Maker muss LIVE auto-quoten (manuelles CLI parallel scheitert am Fenster,
dokumentierte Lehre). Darum gehoert (b) der minimale Auto-Quoter unmittelbar zu a.

## Spike-Befund (StarKey-Signing zuerst)

- Nicht-deployer-Wallet-Frage BEANTWORTET: create_request hat kein Admin-/Sender-Gate
  (Code) UND lief im Live-Mainnet-Capture vom Taker 0xdd98..622d (Nicht-deployer,
  Tx 0x85eca9cf..., Success). accept_quote ebenso (0x0107926a...). Einzige Voraussetzung:
  Wallet-Account existiert/gefundet auf der Zielchain + Gas (+ token_in-Balance fuer Escrow).
- StarKey-Supra-Signing-API: zu verifizieren (RawTx via supra-l1-sdk -> StarKey-Provider
  signAndSend; exakte Methode gegen StarKey-Doku) — die eine externe Integrations-Unbekannte.

## Bauplan

Platzierung: NEUE Route /founder (wallet- + NFT-gated). /demo bleibt oeffentlicher
Replay. Eigener WalletProvider-Scope nur auf /founder (kein Demo-Key-Leak).

Stufe-1-Aktionen (alle wallet-signiert): create_request, Live-Quote-Anzeige
(get_quote-Polling), accept_quote (mit TTL-Countdown), execute_settlement,
cancel_request, claim_unwind.

Neue Bausteine:
- lib/supraTx.ts        — supra-l1-sdk Entry-Function-RawTx (BCS-Args) fuer 5 Taker-Calls
- lib/starkeySign.ts    — RawTx -> StarKey-Supra-Provider signAndSend
- lib/rfqViews.ts        — read-only View-Calls gegen RPC (get_request/get_quote/Status/ids)
- hooks/useRfqFlow.ts   — echte interaktive State-Machine (REQUESTED->QUOTED->ACCEPTED
                          ->FUNDED->SETTLED), Gegenstueck zu lifecycle.ts
- app/founder/page.tsx + Komponenten (reuse SettlementStage/LifecycleRail/StepNode/DataPanel
  mit Live- statt Snapshot-Daten)

(b) Maker-Daemon Auto-Quoter (off-chain Node, separater Prozess; NICHT im Browser):
reuse D-14-Signer-Kern + supra-l1-sdk; watch get_next_request_id -> submit_quote ->
fund_quote auf neue Requests. Operator-Key nur hier, nie im Frontend.

Test-Disziplin: UI/Signing zuerst gegen Testnet chain 6 (Wegwerf-Betraege), dann
RPC/ChainID-Flip auf Mainnet 8 nach gruenem Loop. Konventionen: targeted git add,
COSMO/$COSMO, host-seitige Pushes (origin = github cosmo-website).

## Testnet-Target (deployed 2026-06-22, chain 6)

Persistenter Deploy via `cosmo-contracts-move/scripts/deploy-testnet-rfq-target.sh`
(headless, ephemerer Faucet-Key in gitignored `.testnet-target/`, Move.toml
rebound+restored). Adressen (nicht geheim) in `.env.local` verdrahtet:

- MODULE_ADDR: `0x2aedf2ea1d77b55638af365ceb75f228d92e86e58eb4cad9f80da8edbbdd5e1c`
- TOKEN_IN (plain): `0x753813483cb618cf8a71a6eab5a837032680334dbf26e2d951709726bf5ca143`
- TOKEN_OUT (plain): `0x634d3af5599a4b3eeb541591d1f158e5a9397850c842f942613fedb83e3389b1`
- publish_main `0xe2c1d592...`, publish_helpers `0xa7a875cf...`, get_next_request_id=0

Reicht fuer create_request + Views + den StarKey-Browser-Test. accept/settle
brauchen zusaetzlich: CLI-gemintete Trading-Capability (cap_id) + Maker-Daemon
(Teil b) + minimales Arming (server_quote_pubkey, Maker-Bond).

## Offene Folge-Kartierung (spaeter)

- dApp-Mint-Flow fuer Trading-Capability (Stufe 1 nutzt CLI-Mint).
- Stage-2-Hardening (struktureller hook-resistenter Fix + Allowlist + Request-Fee)
  bleibt Voraussetzung vor permissionless / Fremd-Oeffnung.
- Testnet-Deployment des vollen rfq_engine auf chain 6 (Build-Target fuer sichere Iteration).
