# ROBINHOOD-DEMO P4 Live, Fenster 2 (01.11.2026): 2/2 Fills PROVEN, Settlement im Venue-Ledger (platform mode)

GO Rene 01.11.2026 12:56 MEZ ("GO 14:00 bis 15:30 heute"). Live-Worktree `/root/w-kd-rh-p4b` detached auf `8ec635d`
(= Fixes nach Fenster 1 `b217625` + Kunden-Preflight-Sequenz `8ec635d`), Zustand `/root/logs/killer-demo-robinhood/p4-window-2`,
Evidenzkopien `p4-window-2-2026-11-01/` (60 Dateien, `SHA256SUMS.p4w2`). Alle Zeiten MEZ (UTC+1).

## Ablauf

| Zeit | Schritt | Ergebnis | Evidenz |
|---|---|---|---|
| 12:57-13:01 | Vorab-Checks | Maker-Preflight READY_WITH_DEVIATIONS; K1-Preflight 1. Lauf STOP (Venue-Oracle 404 transient), nach Fix `8ec635d` PASS 7/7; Ledger-Regel live: beide Fenster-1-RFQs expired/0 Fills = freigegeben | `tests-b217625.*`, Kunden-`preflight.json` |
| 13:50-13:51 | Preflight + Policy-Check + Arm (automatisch, `wait-and-arm.sh`) | READY_WITH_DEVIATIONS (G1-G3, G6, G7, G9, G10 PASS; G4/G5 INFO; G8 DEVIATION pairs_via_caps + venue_expiry), Policy-Check PASS, ARMED `0xf9ed2fe9` Quote-Fenster 13:50-15:30, Ende 15:45, max 2 Fills | `go-check.*`, `policy-check.json`, `arm.json` |
| 13:55 | Runner (Rene `!`-Zeile) | Tick 1: 13 offene RFQs, 0 Kandidaten | `live.ndjson` |
| 13:55 | K1 RFQ 1 `R-261101-125610-12` 1,5 USDG (Rene `!`-Zeile) | posted; KD.C-N: 2 freigegeben, 0 gezaehlt | `customer/cases/kdc-20261101T1255-7247363d` |
| 13:56:30 | Tick 2, Fall `kdm-20261101T1256-12561012-56caf873` | FINAL AUTHORIZED, Bundle ACCEPT, 0-Kapital PASS; Quote 521f039c applied; **Fill 1 PROVEN 13:56:50**: -13.606,50553820 SUPRA, Rate 907191088322380954135255 bft (9071,91 SUPRA je USDG), Lock 13.607,87 | `cases/...56caf873`, `fills-ledger.json` |
| 13:57 | K1 RFQ 2 `R-261101-125732-97` 1,5 USDG (Rene) | posted | `customer/cases/kdc-20261101T1257-04e0d211` |
| 13:58:02 | Tick 3, Fall `kdm-20261101T1258-12573297-691b15bd` | FINAL AUTHORIZED, ACCEPT, 0-Kapital PASS; Quote 223bd728 applied; **Fill 2 PROVEN 13:58:22**: -13.606,16534155 SUPRA, Rate 907168406276971606702833 bft | `cases/...691b15bd` |
| 13:58:22 | `run_end` | **DONE 2/2 fills**, 3 Ticks, 0 Fehler, keine Locks | `run-state.json` |
| 14:00 | settlement-prep Fall 1 (Snapshot, read-only) | K1 Council SUPRA 27.201,78472278, K1 L1 SUPRA 10.008,02299645; unbenutzt, Off-Venue-Transfer nicht Teil der Demo | `settlement-prep.json` |

Venue nach dem Fenster: K1 27.201,78 SUPRA + 4,5 USDG; M2 3 USDG + 9.206,77 SUPRA (vor dem Fenster 36.419,44), keine Locks, keine offenen Orders.

## Verifier

Standalone `cosmo-verify-maker.mjs` 1.0.3 (Trust-Profil `cosmo-maker-trust-v1` 0x19290992): beide Bundles **ACCEPT 48/48, 0 failed**
(`verifier/*.json`). MB13: kein Settlement-File, Manifest sagt none (kein Off-Venue-Transfer in der Demo). MB14: Kunden-Mandat gebunden.

## Settlement: Venue-Ledger (platform mode), Entscheid Rene 14:05 MEZ: kein Off-Venue-Transfer

Beide RFQs liefen mit `settlement_mode: platform`, dem Standard-Settlement von SupraFX (alle 12.000 am 29.10. beobachteten RFQs
liefen so, ein anderer Modus wurde nie beobachtet). Der Handel ist damit vollstaendig gesettelt: K1 hat die SUPRA, M2 hat die USDG,
beides in den Council-Kontostaenden belegt (Fill-Proof PROVEN, Quote-Lifecycle applied, Verifier ACCEPT 48/48). Eine Auszahlung vom
Venue (K1 SUPRA auf Supra L1, M2 USDG auf Robinhood Chain) waere ein zusaetzlicher Schritt ausserhalb des Handels gewesen; Rene hat
ihn gestrichen ("ich sehe doch auch so, dass das USDG da ist"). Er ist **nicht Teil der Demo**. Das `settlement-prep.json` ist ein
unbenutzter Snapshot; `settlement-proof` wurde nicht gerufen; MB13 meldet "no settlement file, manifest says none".
Claim-Regel fuer Beweisseite und Texte: "gesettelt im SupraFX-Ledger (platform mode)"; nicht "on-chain ausgezahlt".
Delegate v4 bleibt aktiv (Entscheid Rene 29.10.), die P-EXPIRY-Kompensation (revoke + destroy-key nach dem Fenster) bleibt damit
ausgesetzt. Ehrlichkeitsregel (Plan): Taker K1 ist ein eigenes Konto, deklariert in Policy, Bundle (V-2M declared_own_taker) und auf
der Beweisseite.

## Befunde

1. KD.M-RETRY und KD.C-N (Fixes nach Fenster 1) haben im Fenster gegriffen: KD.C-N hat beide alten Eintraege freigegeben (live geprueft
   vor dem Fenster); ein Retry-Fall trat nicht auf (beide RFQs im ersten Tick entschieden), das Oracle flackerte nur vor dem Fenster (K1-Preflight 404).
2. Kunden-Preflight (CLI) lud die Delegate-Sequenz nicht von der Chain -> `sequence_in_sync=fail` nach frueheren Posts; Post-Pfad war nicht betroffen. Fix `8ec635d`.
3. Lange Zeilen: alle Rene-Aktionen wieder als Skripte (`start-runner.sh`, `post-p4w2-fill{1,2}.sh`), Runner-Skript verweigert ohne `arm.json`.
4. Falls je ein Off-Venue-Transfer belegt werden soll: ein Fenster mit 2 Fills braucht 2 Runden je 2 Signaturen (MB13 bindet den SUPRA-Leg an den Lock des Einzelfalls).

## Naechster Schritt

P5 Format A: Beweisseite `heros.cloud/proof/robinhood-usdg-supra-001` aus der Vorlage mit beiden Bundles, Verifier-Link,
Settlement-Angabe "SupraFX-Ledger (platform mode)" und Ehrlichkeitskasten (eigener Taker). Ertragsblatt-Zeile. Eigenes GO fuer die Veroeffentlichung.
