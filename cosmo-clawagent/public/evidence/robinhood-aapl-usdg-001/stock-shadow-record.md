# STOCK-TOKEN P3 Record: Shadow-Fenster 1 mit echtem AAPL-RFQ (02.11.2026)

Fenster Rene (01.11. 17:50 MEZ): Mo 02.11.2026 16:45-18:00 MEZ. RFQ-Post per Shell-Zeile `post-p3-aapl.sh` 17:09 MEZ (16:09:49 UTC).
Branch `feat/killer-demo-robinhood`, Live-Worktree `/root/w-kd-rh-p3s` detached `d057550`, Policies `maker-policy.v3.robinhood-aapl.json`
(sha a1759fb1) + `customer-policy.v2.aapl.json` (sha 1dca39ec), Verifier 1.0.4. Plan `plans/robinhood-stock-token-plan.md` P3.
Alle Zeiten Berlin = MEZ (UTC+1). Evidenz: `stock-p3-shadow-2026-11-02/` (maker = Fenster-Dir, customer = Kunden-Dir), `SHA256SUMS.p3s1`.

## Ergebnis: NOT_AUTHORIZED (fail-closed, erwartet). Equity-Preispfad, Floor und Funds gruen; F6 FAIL, weil Policy v3 im Shadow nur Delegate v4 erwartet und M2 seit 01.11. v4 + v7 aktiv hat. 0 Kapital, RFQ abgelaufen, 0 Fills.

Das Fensterziel "FINAL AUTHORIZED" ist NICHT erreicht. Ursache ist ein P1-Fehler (Policy vor v7 geschrieben), kein Marktbefund.

## Abweichung vorab: Vorbereitung lief erst im Fenster
Die Vorbereitung (S0.2, tests.json, Worktree, Preflights) sollte vor 16:15 MEZ stehen. Die Telegram-Erinnerung ging 16:15 (remind-p3.log),
eine Session wurde erst 17:01 ("Status") gestartet; Vorbereitung 17:02-17:06, Shadow-Loop ab 17:03. Der F6-Blocker wurde beim Lesen der
Policy vor dem Post erkannt und Rene genannt; Rene postete trotzdem (Beweis Kunden-Post + Equity-Pfad + fail-closed).

| Pruefung | Ergebnis | Beleg |
|---|---|---|
| Tests | 272/272 gruen auf d057550 (alle src/killerDemo-Suites), 17:05 MEZ | `maker/tests.json`, `maker/tests.log` |
| Kunden-Preflight (vorher) | PASS 8/8 inkl. C-ORACLE (Feeds live seit US-Boersenstart; am 01.11. noch FAIL = Wochenende) | `customer/preflight.json`, `maker/customer-preflight.out` |
| Kunden-Oracle beim Post | Venue AAPL == DORA 6004 innerhalb 0 bps, Alter 7 s / 7 s <= 600 s; Ref 340,867675 USDG/AAPL | `customer/customer.ndjson` (kind oracle) |
| Kunden-Mandat + RFQ | Case `kdc-20261102T1609-29c16f53`, micro_live, Mandat-Hash `0x1f765e99...a104`, rfq_id `1f765e99-5896-a18e-fde8-59d97f693659`, Floor 337,458998 (= Ref - 100 bp), Submit ok | `customer/cases/`, `customer/rfqs-ledger.json` |
| RFQ auf dem Venue | `R-261102-160948-97` AAPL/USDG robinhood-mainnet -> robinhood-mainnet, 0,005 AAPL, auto_accept, created 16:09:48 UTC, expires_at 16:39:37 UTC (Policy 600 Batches), settlement_mode platform; **erste Stock-Token-RFQ auf SupraFX** | `maker/cases/.../rfq-list.json` (Tick 5, Venue-Liste sha de0c8946) |
| Shadow-Maker Fenster | Loop alle 2 min (`run-loop.sh`, `window.ts --smoke --policy v3`, read-only, Proposer-Key), Start 17:03 MEZ, bis 18:05 MEZ; Tick 11 (17:23): 0 Fehler, Listen vollstaendig | `maker/window.json`, `maker/log.ndjson`, `maker/loop.log` |
| Kandidat | Tick 5 (17:11 MEZ): 1 neuer Kandidat = unsere RFQ, Case `kdm-20261102T1611-16094897-4af3bc99`, Taker 0xa3d79667 = deklarierter eigener Kunde K1 | `maker/log.ndjson` (kind case) |
| Equity-Anker V-5M | OK: rate 339,129871 = fair 340,834041 - 50 bps; DORA 6004 Alter 7 s; Chainlink 0x6b22 Abweichung 24 bps bei 5543 s Alter; Venue 0 bps; Quellen DORA (supra-rpc) + Chainlink (evm-rpc) unabhaengig, Venue nur Konsistenz | `decision-RESERVATION.json` |
| Floor V-6M | OK: rate 339,129871 >= Floor 337,458998 -> **waere angenommen worden** | `decision-RESERVATION.json` |
| Funds F1 | PASS: M2 Venue-USDG 3,000000 >= Lock 1,695650; Marge 8521 Quote-Einheiten (0,0085 USDG) | `reads/stage-1.json` |
| **Funds F6** | **FAIL**: aktive Delegates [228d291d (v7), d4098132 (v4)] != erwartet [d4098132] (`delegates.shadow_expected_active` der Policy v3) | `reads/stage-1.json` |
| Entscheid | Stage RESERVATION -> **NOT_AUTHORIZED**, dominant V-8M ("funds preflight FAIL: F6"); terminal, kein Retry (KD.M-RETRY greift nur bei Lesefehlern) | `maker/log.ndjson`, `decision-RESERVATION.json` |
| 0-Kapital | PASS (capital state identical, Hash 5575314f3ee2ef74); kein Quote, kein Lock, kein Write nach aussen | `zero-capital.json` |
| Case-Hashes | `SHA256SUMS` im Case 10/10 OK (sha256sum -c, 17:19 MEZ) | Case-Dir |
| RFQ-Ende | Venue by-id 17:24 MEZ: status `expired`, total_filled 0, fill_count 0, remaining 0; Tick 10/11 ohne AAPL/USDG in der Open-Liste; K1 behaelt 0,00591755 AAPL | Venue-Read, `maker/log.ndjson` |

## S0.2: Auswertung 36-h-Preislog (01.11. 14:36 - 02.11. 16:59 MEZ, 316 Punkte, 18 davon US-Session Mo)
| Groesse | Beobachtet | Pin v3 | Befund |
|---|---|---|---|
| DORA 6004 Takt US-Session | alle ~300 s (282-323 s), Alter am Messpunkt max 27 s | 600 s | ok |
| DORA 6004 Alter Wochenende | max 237.953 s (= Fr-Schluss bis Mo 15:30 MEZ) | - | Shadow/Live nur in US-Handelszeit, wie geplant |
| Chainlink Alter US-Session | max 48.197 s (13,4 h) | 86.460 s | ok |
| Abweichung DORA/Chainlink | max 53,2 bps (Mo frueh), zuletzt 13,2 bps; beim Tick 24 bps | 50 bps | **zu eng**: Chainlink tickt erst bei 0,5 % Abweichung, der Spread kann daher kurz ueber 50 bps liegen -> Vorschlag 75 bps |
| Venue-Oracle HTTP | 4x nicht-200 am So (Wochenende), Mo 0x | - | ok |
Logger laeuft weiter bis Di 03.11. 02:36 MEZ (`stock-discovery/price-sources-aapl-36h.jsonl`).

## Befunde
1. **F6-Pin im Shadow** (`delegates.shadow_expected_active` = [v4]) stammt aus P1 (01.11. 15:45), v7 entstand erst 17:35. Live-Modus haette v7 + `--allow-other-delegate v4` erwartet und waere durchgegangen (Policy-Check 01.11. PASS). Fix = Policy-Aenderung -> neue sha, History-Datei, Verifier 1.0.5.
2. Chainlink-Toleranz 50 bps zu eng (S0.2); im selben Re-Pin auf 75 bps heben.
3. Vorbereitung muss vor dem Fenster laufen; Erinnerung allein reicht nicht. Fuer Fenster 2: Erinnerung 15:00-15:30 MEZ mit explizitem "Session jetzt starten".
4. Positiv: Kunden-Post mit v2.aapl-Policy, base-priced Oracle, Equity-Reads (DORA + Chainlink + Venue) und Quote-Mathe laufen live gegen das Venue wie in den Fixtures; erste Stock-Token-RFQ auf SupraFX ueberhaupt.

## Naechster Schritt (Rene 02.11. 17:16 MEZ: "Record committen, Fix morgen, Fenster Di 15:45-17:00")
Di 03.11.2026: Policy v3 Re-Pin (v7 in shadow_expected_active, chainlink max_dev 75 bps), Tests, Verifier 1.0.5 (Deploy eigenes GO), dann
**Shadow-Fenster 2 Di 03.11. 15:45-17:00 MEZ** (14:45-16:00 UTC): tests.json + neuer detached Worktree, Kunden-Preflight, Loop, eine `!`-Zeile von Rene.
Telegram-Erinnerung per One-Shot-Cron 15:00 MEZ (`stock-p3/remind-p3w2.sh`).

Nachtrag Loop-Ende Fenster 1: `loop finished after 31 ticks` 18:06:54 MEZ, 0 Fehler, window.json RUNNING/31 Ticks (Shadow-Fenster werden nicht geschlossen, Loop endet per Zeit). `maker/loop.log`, `maker/window.json`.

---

# FENSTER 2 (Mo 02.11.2026 18:20-19:35 MEZ, GO Rene 17:35 "GO 45 Minuten ab jetzt"): P3 BESTANDEN

Statt des Di-Termins (Rene 17:33: "warum muss ich bis morgen warten?"). Fix 17:40-17:46 MEZ, Commit `832a3e6` = origin/feat/killer-demo-robinhood,
Live-Worktree `/root/w-kd-rh-p3s2` detached `832a3e6`. Evidenz `stock-p3-shadow-2026-11-02/window-2/` (maker = Fenster-Dir stock-p3w2, customer = Kunden-Dir).

## Ergebnis: 1 Kandidat, FINAL AUTHORIZED, Bundle ACCEPT 35/35 (Standalone, frischer Prozess), F6 PASS unter dem neuen Pin, 0 Kapital, RFQ abgelaufen, 0 Fills.

## Fix vorab (D-ST3): Policy v3 Re-Pin a1759fb1 -> 8a987c19
| Aenderung | vorher | nachher |
|---|---|---|
| `delegates.shadow_expected_active` | [v4 d4098132] | [v7 228d291d, v4 d4098132] (= M2-Stand seit 01.11. 17:35) |
| `delegates.live_expected_active` (Text) | v5 | v7 |
| `price.equity.chainlink.max_dev_bps` | 50 | 75 (S0.2: 53 bps beobachtet; Chainlink tickt erst bei 0,5 %) |
| `decided.D-ST3` | - | Rene 02.11. 17:16/17:35, Fenster 2 heute |
History `history/maker-policy.v3.robinhood-aapl.a1759fb1.json` + MB2-Zeile (Fenster 1 bleibt unter a1759fb1 nachpruefbar). Fixtures: v7-Event in `fundsV3()`,
Live-Fixture (synthetischer Maker-Delegate spielt v7) filtert es; Chainlink-Grenztest auf 75 bps; History-Zaehler 4. Tests 272/272 (w-kd-rh und p3s2), tsc 0.
Verifier 1.0.5 (oeffentlich, heros.cloud/verifier) NICHT gebaut: der Tick prueft intern gegen die aktuellen Pins; Bau + Deploy = eigener Schritt mit GO.

| Pruefung | Ergebnis | Beleg |
|---|---|---|
| Tests | 272/272 auf 832a3e6, 17:46 MEZ | `window-2/maker/tests.json` |
| Kunden-Preflight (vorher) | PASS 8/8 | `window-2/maker/customer-preflight.out` |
| Smoke-Tick unter neuen Pins | 17:46 MEZ rc 0, 12 offene RFQs, 0 Kandidaten | `window-2/maker/log.ndjson` |
| Shadow-Loop | Start automatisch 18:15 MEZ (`start-at-1815.sh`), 2-min-Ticks bis 19:40 MEZ; Tick 7 (18:27) 0 Fehler | `window-2/maker/loop.log`, `window.json` |
| READY an Rene | Telegram 17:47 MEZ (ok:true) | - |
| Kunden-Oracle beim Post | Venue AAPL == DORA 6004, DORA-Read sha f0b5b187 | `window-2/customer/customer.ndjson` (kind oracle, 17:22:12 UTC) |
| Kunden-Mandat + RFQ | Case `kdc-20261102T1722-c127360e`, micro_live, rfq_id `cab0f29f-4634-b649-66b8-05e56ec8e08c`, Floor 334,728900, expires_at_batch 14782334, Submit ok | `window-2/customer/` |
| RFQ auf dem Venue | `R-261102-172223-10` AAPL/USDG robinhood-mainnet -> robinhood-mainnet, 0,005 AAPL, auto_accept, Ref 338,11, 18:22 MEZ | `window-2/maker/cases/.../rfq-list.json` |
| Kandidat | Tick 5 (18:23:33 MEZ): Case `kdm-20261102T1723-17222310-41368746`, Taker 0xa3d79667 = deklarierter eigener Kunde K1 (V-2M OK) | `window-2/maker/log.ndjson` |
| **Funds F6** | **PASS**: active delegates == expected (v7 + v4), no open orders (created 20, revoked 18) | `decision-FINAL.json` |
| Funds F1 | PASS: USDG 3,000000 >= Lock 1,681650 | `decision-FINAL.json` |
| Equity-Anker V-5M (FINAL) | OK: rate 336,329900 = fair 337,933484 - 50 bps; DORA 6004 Alter 6 s; Chainlink 8 bps / 188 s; Venue 0 bps; Marge 8018 USDG-Einheiten (RESERVATION: fair 338,020000, Chainlink 5 bps, Marge 8450) | `decision-RESERVATION.json`, `decision-FINAL.json` |
| Floor V-6M | OK: 336,329900 >= Floor 334,728900 -> **waere angenommen worden** | `decision-FINAL.json` |
| Backing V-7M | OK: USDG fully_backed 1,04; Vault 13,0 >= intern 12,5 | `decision-FINAL.json` |
| Entscheid | RESERVATION -> **FINAL AUTHORIZED** (Core C1-C8 OK, Profil V-1M..V-9M OK) | `window-2/maker/log.ndjson` |
| Pins im Bundle | maker-policy.v3 8a987c19, repo_commit 832a3e6, val_core v1.7 311f1ef, Proposer e0c877c7 | `pins.json` |
| Unabhaengige Nachpruefung (`maker/cli.ts verify-bundle`, frischer Prozess) | **ACCEPT, 35 Checks, 0 failed** (18:24 MEZ) | dieser Record |
| Case-Hashes | SHA256SUMS 12/12 OK | Case-Dir |
| 0-Kapital | PASS (capital state identical, Hash 27fdd7cc6183a8e0); kein Quote, kein Lock, kein Write | `zero-capital.json` |
| RFQ-Ende | Venue by-id 18:28:43 MEZ: `expired`, fill_count 0, total_filled 0, remaining 0; K1 behaelt 0,00591755 AAPL | Venue-Read |
| Hashes | `SHA256SUMS.p3s1` neu ueber beide Fenster (55 Dateien) | |

## Befunde Fenster 2
1. Chainlink lag beim Tick 5-8 bps von DORA entfernt (frischer Tick 184-188 s alt) - innerhalb 50 wie 75 bps; der 75-bps-Pin ist Reserve fuer den Fall des Morgens (53 bps).
2. Expiry: RFQ 18:22:23 -> expired vor 18:28:43 MEZ (~6 min = 600 Batches), wie Fenster 1 und P3 USDG/SUPRA.
3. Die Tage-Lehre bleibt: Vorbereitung als Skript vor dem Fenster; heute lief sie als Session-Arbeit 17:40-17:47 innerhalb der 45 Minuten.

## Naechster Schritt
P3 Stock-Token ist bestanden. Offen: (a) Verifier 1.0.5 bauen (Pin 8a987c19 + History a1759fb1, Harness run-all, Website-Commit) und deployen = eigenes GO;
(b) P4 Live Stock-Token (ein GO-Tap, US-Handelszeit, max 1 Fill: M2 zahlt ~1,68 USDG, erhaelt 0,005 AAPL, Settlement SupraFX-Ledger platform mode), Zeitfenster von Rene;
(c) danach Record + Beweisseite (eigenes GO). Loop Fenster 2 endet 19:40 MEZ von selbst (loop.log-Nachtrag beim naechsten Commit).

## Nachtrag 02.11.2026 ~18:50 MEZ: Verifier 1.0.5 gebaut + abgenommen (GO Rene "Verifier 1.0.5 bauen und deployen")
- Aenderung append-only: Trust-Profil v3-Set 8a987c19 CURRENT, a1759fb1 HISTORICAL mit `history/maker-policy.v3.robinhood-aapl.a1759fb1.json` (eingebettet, 44 Datendateien);
  Goldens (7 Pin-Sets = 14 + 1 + 2 + 1 + 30 + 1 + 1 Pins, neuer 1.0.5-Check, Version), README.
- Distributable sha3 `0xd8445beae5c565de93a41412dd1530f875149fa7d78d233321b4a05fdc28e41b` (759.868 Bytes), Profil `0x346a128b25678359a7f103195c9b1421186e9b066bf36b5bc322465251301dc2`.
- `run-all-maker`: **GREEN** (goldens, core-freeze 20 VAL + 19 killerDemo, differential 250 = 10 Fixtures + 178 Flips + 62 Mutanten, 31 Probes + Hooks, provenance OK).
  Log `/root/logs/killer-demo-robinhood/stock-p3w2/verifier-acceptance-20261102T174529Z.log`.
- Direktpruefung mit 1.0.5: Fenster-2-Bundle (8a987c19) **ACCEPT 35/35**; Fenster-1-Bundle (historisch a1759fb1) ACCEPT 27/27; P4-Fenster-2-Fill (v2) ACCEPT 48/48.
  Gegenprobe 1.0.4 auf dem Fenster-2-Bundle: REJECT 7/35 (MB2 Pin unbekannt, Folgefehler MB4/MB5/MB7) = der Grund fuer 1.0.5.
- Deploy auf heros.cloud/verifier: siehe naechster Nachtrag.

## Nachtrag 02.11.2026 18:50 MEZ: Verifier 1.0.5 DEPLOYED (GO Rene)
Website-Commit `c95f39e` (public/verifier: cosmo-verify-maker.mjs, PROVENANCE-maker.json, index.html, index.txt). `scripts/deploy.sh` -> Release
`20261102-174824-c95f39e` (vorher `20261101-183042-15092e9-dirty`; Rollback = `scripts/deploy.sh --rollback`). Live-SHA3 https://heros.cloud/verifier/cosmo-verify-maker.mjs
== `0xd8445bea...` (MATCH), PROVENANCE 1.0.5, Seite zeigt 1.0.5; die heruntergeladene Live-Datei verifiziert das Fenster-2-Bundle ACCEPT 35/35.
Beweisseite /evidence/robinhood-usdg-supra-001/ 200, Teaser-Media 206. Offen: P4 Live Stock-Token (Zeitfenster + GO-Tap Rene).
