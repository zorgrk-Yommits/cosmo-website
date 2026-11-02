# STOCK-TOKEN P4 Record: Live-Fenster mit 1 Fill AAPL/USDG (02.11.2026)

Zeitfenster Rene 02.11.2026 18:53 MEZ ("Zeitfenster jetzt"), GO-Tap = Runner-Start per `!`-Zeile 18:56 MEZ (GO-Text im Arm zitiert beides).
Branch `feat/killer-demo-robinhood`, Live-Worktree `/root/w-kd-rh-p3s2` detached `832a3e6` (src/config identisch mit HEAD 70454a6), Policy v3
`maker-policy.v3.robinhood-aapl.json` sha 8a987c19, Kunden-Policy v2.aapl sha 1dca39ec, Maker-Delegate v7 (228d291d), Verifier 1.0.5 (live seit 18:50 MEZ).
Alle Zeiten Berlin = MEZ (UTC+1). Evidenz `stock-p4-window-2026-11-02/` (Fenster-Dir + customer/), `SHA256SUMS.p4s` (46 Dateien).

## Ergebnis: 1/1 Fill PROVEN. M2 zahlte 1,680209 USDG und erhielt 0,005 AAPL (erster Stock-Token-Fill auf SupraFX). Bundle ACCEPT 48/48 (Runner-intern und Standalone 1.0.5). Settlement im SupraFX-Ledger (platform mode), kein Off-Venue-Transfer.

| Schritt | Ergebnis | Beleg |
|---|---|---|
| Tests | 272/272 auf 832a3e6 (17:46 MEZ) | `tests.json` |
| Maker-Preflight 18:53 | READY_WITH_DEVIATIONS: G1-G3 PASS, G4/G5 INFO (kein Kandidat; Would-Quote 336,770486, Lock 1,683853 USDG; Venue 0 bps, DORA 11 s, Chainlink 7 bps/1972 s), G6 funds PASS (USDG 3,0), G7 Delegates [v7, v4] == erwartet, G8 DEVIATION (pairs_via_caps, venue_expiry), G9 Ledger 0, G10 Backing 1,04 | `go-check.md`, `preflight.out` |
| Policy-Check 18:54 | PASS 13/13 (P-CAP-USDG 3, P-CAP-USDG-ROOM, P-CAP-AAPL, P-CAP-ETH, P-EXPIRY akzeptiert), F6 live PASS | `policy-check.out` |
| Kunden-Preflight 18:54 | PASS 8/8 | `customer-preflight.out` |
| Shadow-Loop Fenster 2 | 18:52 MEZ von COSMO gestoppt (Ziel erreicht, kein paralleler Leser) | `stock-p3-shadow-2026-11-02/window-2/maker/loop.log` (Nachtrag) |
| Arm | 18:55 LIVE_REFUSED ARM_WINDOW (vor Fensterstart, korrekt); **ARMED 19:00:13 MEZ**, arm_hash `0x28a3667f...`, Fenster 18:00Z-19:00Z, Ende 19:15Z, max_fills 1, others [v4], deviations [pairs_via_caps, venue_expiry] | `arm.json`, `arm.out` |
| Runner | Start per Rene-Zeile 19:00:39 MEZ (PID 283386), Tick 1 12 offene RFQs, 0 Kandidaten | `live.ndjson` |
| Kunden-Mandat + RFQ | 19:03 MEZ per Rene-Zeile: Case `kdc-20261102T1803-5170c183`, micro_live, rfq_id `1e7f5637-b4fb-02cb-e41f-bbe5a68a6c8a`, expires_at_batch 14786248, Submit ok | `customer/cases/`, `customer/customer.ndjson` |
| RFQ auf dem Venue | `R-261102-180329-1c` AAPL/USDG robinhood-mainnet -> robinhood-mainnet, 0,005 AAPL, auto_accept, Taker K1 0xa3d79667 (deklarierter eigener Kunde) | `cases/.../rfq-list.json` |
| Entscheid | Tick 4 19:03:55 MEZ: Case `kdm-20261102T1803-1803291c-9f900f7d` RESERVATION -> **FINAL AUTHORIZED**, Verify ACCEPT, 0-Kapital PASS; Rate 336,075478 USDG/AAPL, Lock 1,680378 USDG | `live.ndjson` (kind case), `decision-FINAL.json` |
| Quote | attempt_start 19:03:55, attempt_sent 19:04:07: lifecycle `applied`, quote_id `1a9cb8ac-4cb9-32ac-f369-422750e4156c`, Submit ok, Envelope enthaelt Event | `live/execution.json`, `fills-ledger.json` (APPLIED, decision_id 0x1c70616e..., arm_hash 0x28a3667f...) |
| **Fill-Proof** | **PROVEN** 19:04:15 MEZ (`fill-proof.json`); Venue by-id: status `matched`, fill_count 1, total_filled 0,005, remaining 0 | `live/fill-proof.json`, Venue-Read 19:05 MEZ |
| Funds nach Fill (M2) | USDG available **1,319791** (vorher 3,000000: -1,680209 = Lock 1,680378 minus 169 Micro Rebate/Rundung), **AAPL 5e15 = 0,005** (vorher 0), SUPRA 50.131,17 unveraendert, keine Locks, 0 offene Quotes | `live/funds-after-fill.json` |
| Bundle | Runner-intern ACCEPT, Bundle-Hash 594640ca...; **Standalone-Verifier 1.0.5 (frischer Prozess): ACCEPT 48/48** | `fill.json`, dieser Record |
| Runner-Ende | run_end **DONE** 19:05:16 MEZ, "1/1 fills", 4 Ticks | `live.ndjson`, `run-state.json` |
| Hashes | Case `SHA256SUMS` + `SHA256SUMS.p4s` (46 Dateien) | |

## Befunde
1. **tick_error nach dem Fill (kosmetisch):** unmittelbar nach `attempt_end` warf der Tick "Cannot convert undefined to a BigInt" (1 Fehler, consec 1).
   Ursache: die Telegram-Fill-Meldung (`live.ts` ~Z. 448) rechnet mit `supra_delta`/`iusdc_delta` aus dem Fill-Proof; fuer v3 (Pay-Asset USDG, Receive AAPL)
   sind diese Felder `undefined` (`fill.json`: supra_delta None). Alle Dateien (execution, ledger, funds-after-fill, fill-proof, Bundle, fill.json, fills/01)
   waren vorher geschrieben; der naechste Tick schloss sauber mit DONE. Wirkung: **keine Telegram-Fill-Meldung** (Rene bekam die Meldung im Chat). Fix: Pay-/Receive-Asset-Labels im TG-Text (wie G5/G6), eigener Nachlauf-Commit.
2. Arm vor Fensterstart wird abgewiesen (ARM_WINDOW) - korrekt; Fensterstart 19:00 war 5 min nach "jetzt", Arm dann per Wartezeit.
3. Rebate: Lock 1,680378 vs. gezahlt 1,680209 USDG = 169 Micro (1 bp Maker-Rebate wie beim ETH-Fill 29.10. S0).
4. K1-Seite: Venue `matched`, 0,005 AAPL verkauft; K1 behaelt 0,00091755 AAPL + USDG-Erloes im Venue-Ledger (minus Taker-Fee; nicht Teil des Maker-Bundles).

## Kompensierende Kontrolle (GO-Text): Delegate v7 nach dem Fenster
`cosmo-aapl-maker-v7` (Cap USDG 3, Rest 1,32 USDG) laeuft laut dApp bis Batch 26.639.394. Laut GO-Text Revoke nach dem Fenster = Renes dApp-Handgriff
(Deactivate); COSMO prueft danach mit `live.ts revoke-check`. Delegate v4 bleibt (Rene 29.10.). Entscheid Rene offen.

## Naechster Schritt
Beweisseite Stock-Token (Format A wie /evidence/robinhood-usdg-supra-001/: Shadow-Fenster 1+2, Live-Fill, Verifier 1.0.5, Ehrlichkeitskasten:
Taker = eigener Kunde K1, Settlement Venue-Ledger, Preisanker DORA 6004 + Chainlink) = eigenes GO; Ertragsblatt-Zeile; TG-Text-Fix.
