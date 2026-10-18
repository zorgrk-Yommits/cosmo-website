# KILLER-DEMO-001 Maker -- Record B2 (17.10.2026, 14:00-15:00 MESZ): vier Live-Fills in einem Fenster, Dauerbetrieb Schritt 1

Dauerbetrieb-Plan (Rene 16.10.: N Fills je Fenster, ein GO je Fenster, Delegate bleibt, Auszahlung gesammelt ausserhalb der Fenster).
Vorbereitungs-GO 16.10. ~10:15 (B2 Sa 17.10. 14:00-15:30 MESZ), Live-GO Rene 17.10. 13:5x:
**"GO M4 B2 17.10. 14:00-15:30 mit 5 Fills und dApp-Abweichungen Paare/Ablauf"**. Record-GO Rene 15:2x: "GO".
Branch `feat/killer-demo-maker`, Code `975241d` (Fix KD.M-SEQ, Tests 83/83), Live-Worktree `/root/w-kd-b2` detached auf `975241d`,
Delegate v3 `cosmo-f2-maker-v3` (`0x7957e547...`, Dauer-Delegate seit Fenster 2), Fensterverzeichnis `/root/logs/killer-demo-maker/b2-window/`.
**Ergebnis: 4 von 5 moeglichen Fills, alle PROVEN; der fuenfte blieb aus, weil nach 14:06 keine iUSDC/SUPRA-RFQ mehr kam.**

## Ablauf (MESZ)

| Zeit | Schritt | Ergebnis | Beleg |
|---|---|---|---|
| 13:30 | Cron-Preflight `--setup-done` | **NOT_READY**: einzig G1 FAIL, `tests.json` vom 16.10. 08:09Z aelter als 24 h (alle anderen Gates PASS) | `b2/window/go-check.md` (ueberschrieben 13:50), `preflight-cron.log` im Fensterverzeichnis |
| 13:49 | Jest 83/83 auf `975241d` neu, `tests.json` erneuert (alte Fassung `tests.json.20261016` im Fensterverzeichnis) | kein Code geaendert | `b2/window/tests.json` |
| 13:50 | Preflight wiederholt | **READY_WITH_DEVIATIONS** (G1-G7, G9, G10 PASS; G8 DEVIATION = `pairs_via_caps`, `venue_expiry`, Policy 10/10 ok); SUPRA verfuegbar 131.252,38 | `b2/window/go-check.json` |
| 13:54 | `policy-check` | PASS (F6 live = genau der v3-Delegate, 16 angelegt / 15 widerrufen) | `b2/window/policy-check.json` |
| 13:54 | `arm` vor Fensterstart | **abgewiesen** `ARM_WINDOW` (korrekt: now ausserhalb 14:00-15:00) | Chat, `arm-1355.log` im Fensterverzeichnis |
| 14:00:09 | `arm --fills 5` mit GO-Text | ARMED `0x4544f5c0...`, Quote-Fenster 14:00-15:00, max_fills 5, `bound_commit` 975241d | `b2/window/arm.json` |
| 14:00:21 | `run` (detached) | Tick 1: 11 offene RFQs, 4 iUSDC-Kandidaten (3 davon je Tick zurueckgestellt, `skipped_rate_limit` = ein Fall je Tick) | `b2/window/log.ndjson` |
| 14:00:41 | Fill 1 `R-261017-113847-16` | FINAL AUTHORIZED -> `PlaceQuoteV2` applied -> **PROVEN** | `b2/cases/kdm-20261017T1200-11384716-4eee4645/` |
| 14:02:14 | Fill 2 `R-261017-113432-c8` | FINAL AUTHORIZED -> applied -> **PROVEN** | `b2/cases/kdm-20261017T1202-113432c8-14259336/` |
| 14:03:45 | Fill 3 `R-261017-112617-89` | FINAL AUTHORIZED -> applied -> **PROVEN** | `b2/cases/kdm-20261017T1203-11261789-c7825c49/` |
| 14:05:13 | Kandidat `R-261017-112313-45` | **NOT_AUTHORIZED** V-3M "RFQ not quotable: remaining batches 28 < 60"; Bundle ACCEPT, 0-Kapital PASS; kein Versuch, kein STOP | `b2/cases/kdm-20261017T1205-11231345-7e75046d/` |
| 14:06:26 | Fill 4 `R-261017-120543-a3` (neue RFQ 14:05) | FINAL AUTHORIZED -> applied -> **PROVEN** | `b2/cases/kdm-20261017T1206-120543a3-1fcac31c/` |
| 14:07-15:00 | 50 Ticks ohne Kandidaten (7 offene RFQs, 0 iUSDC/SUPRA) | Runner wartet, 0 Fehler | `b2/window/live.ndjson` |
| 15:00:16 | Quote-Cutoff | `run_end` **NO_FILL** "quote cutoff reached without an attempt", fills 4/5, 57 Ticks, 0 Fehler | `b2/window/run-state.json` |
| 15:10 | `unwind` | nichts zu tun (0 offene RFQs/Quotes, 0 Lock) | `b2/window/unwind.json` |
| 15:1x | Nachpruefung | `verify-bundle` 5/5 ACCEPT, Tamper-Probe REJECT | `b2/window/b2-reverify-20261017.log`, `b2-tamper-probe-20261017.log` |

Kein Widerruf, kein destroy-key, keine Auszahlung (Dauerbetrieb, Entscheid Rene 16.10. "Delegate bleibt").

## Fill-Nachweis (Quant-genau, je Fill FP1-FP4 PASS)

| # | RFQ | Quote | Rate SUPRA/iUSDC | Lock ceil (Quants) | SUPRA-Delta (Quants) | SUPRA | iUSDC | Bundle |
|---|---|---|---|---|---|---|---|---|
| 1 | R-261017-113847-16 | `9c647c59` | 6984,12 | 1.396.824.903.416 | -1.396.685.220.925 | -13.966,85 | +2,00000000 | ACCEPT `4791229f...` |
| 2 | R-261017-113432-c8 | `c047fcf9` | 6986,66 | 1.397.332.146.805 | -1.397.192.413.590 | -13.971,92 | +2,00000000 | ACCEPT `2d814647...` |
| 3 | R-261017-112617-89 | `aa2e5453` | 6986,26 | 1.397.251.787.012 | -1.397.112.061.833 | -13.971,12 | +2,00000000 | ACCEPT `0a389eca...` |
| 4 | R-261017-120543-a3 | `c5ff58dd` | 6983,98 | 1.396.796.936.915 | -1.396.657.257.221 | -13.966,57 | +2,00000000 | ACCEPT `1e8fdd9c...` |

- FP1 je Fill: RFQ matched, fill_count 1, filled 200.000.000, unser Quote accepted. FP2: SUPRA-Delta = Lock minus Rebate 1 bp (~1,397 SUPRA), iUSDC +200.000.000 Units. FP3: kein anderes Asset bewegt. FP4: 0 Lock, 0 offene Orders danach.
- Summe: **-55.876,47 SUPRA, +8,00000000 iUSDC.** Venue vor dem Fenster 131.252,38 SUPRA verfuegbar (G6), nach Fill 4 **75.375,91** (Council-Snapshot Batch 12555491, `b2/window/fill.json`), Differenz = Summe der vier Deltas. iUSDC verfuegbar danach 21,99. 0 Locks.
- Kurs: Referenz 7073,5 -> 7021,2 (SupraFX), fair ~7019-7022, Quote = fair minus 50 bps; Kaeufer-Floor 4664,83 -> 1,50x darueber. Margin je Fill 0,994-0,999 iUSDC-Units-Aequivalent (`log.ndjson`).
- Taker bei allen vier: `0x988f73bb...` (derselbe Kaeufer-Bot wie M4 und Fenster 2).
- Unabhaengige Nachpruefung (frischer Prozess auf `975241d`): `maker/cli.ts verify-bundle` **ACCEPT 46/46** fuer die vier Fill-Bundles, **ACCEPT 29/29** fuer das NOT_AUTHORIZED-Bundle (kein Live-Teil); `sha256sum -c SHA256SUMS` ok; Manipulationsprobe (Entscheidungswort in einer Kopie von `decision-FINAL.json` veraendert) **REJECT 2 failed**.

## Befunde

1. **Angebot ist der Engpass, nicht die Kette.** Vier Fills in sechs Minuten, sobald Kandidaten da waren; danach 54 Minuten ohne eine einzige iUSDC/SUPRA-RFQ. Fuer "5 Fills" braucht es fuenf frische RFQs im Fenster; die Kette selbst hatte 0 Fehler und keine Wartezeit zwischen Fills ausser dem 60-s-Tick.
2. **G1-Lehre:** `tests.json` muss juenger als 24 h sein (`testsMaxAgeMs`). Fenster am Folgetag der Vorbereitung -> Tests am Fenstertag erneuern (oder im Preflight-Cron vorher laufen lassen). Kein Code geaendert; kuenftig Bedienregel.
3. **V-3M als Restlaufzeit-Gate wirkt:** die aelteste RFQ (11:23 erstellt) hatte 28 Batches < 60 (Quote-Ablauf) und wurde benannt abgelehnt. Reihenfolge "neueste zuerst" hat die drei juengeren davor gefuellt. Keine Aenderung noetig.
4. **Ein Fall je Tick** (`maxCasesPerTick` 1) kostet bei mehreren Kandidaten je ~90 s pro Fill (Tick + Entscheidung + Proof-Reads). Bei vier Kandidaten im ersten Tick waren alle nach 6 Minuten durch. Fuer den aktuellen Markt ausreichend; erst bei mehr Angebot ein Thema.
5. **Monitoring-Lehre (Bedienung):** Run-Ereignisse stehen in `live.ndjson` (`attempt_start/attempt_sent/attempt_end/run_end`), `log.ndjson` traegt nur `watch`/`case`/`skipped_*`. Telegram je Fill lief.
6. **Kapital:** ein Fill bindet ~13.970 SUPRA bei Kurs ~6985; Venue-SUPRA 75.376 reicht fuer ~5 weitere Fills, dann Nachschub. Delegate-Caps 15.000 SUPRA / 3 iUSDC unveraendert.
7. **Ertrag:** 50 bps auf 2 USD je Fill = ~0,01 USD; vier Fills ~0,04 USD. Pilotgroesse; der Beweis "wiederholter Live-Betrieb mit N Fills je Fenster" ist erbracht.

## Belege (sha256 der Originale im Fensterverzeichnis, Kopien unter `b2/`)

| Datei | sha256 |
|---|---|
| `go-check.json` (13:50) | `01cbeaadf5e3f52ae52756c8f9ea732361e9c0bfe9160a54d7b4cecbeba69ac3` |
| `policy-check.json` | `02862aff57e292a3e2ffdedbac120b941f2df1e765167c5fabe293367e00d85e` |
| `arm.json` | `1bcba86649d950370d5bc3cf145a1fbd194485b6a04e85eafd6a1e43adfe1edc` |
| `run-state.json` | `3b8893659d099f0a3577148d4d3a89b00eda48cd3e15cda6d86c42a7eb29b4a7` |
| `fill.json` (Fill 4) | `9425ede3211a4400d7afce0f9138ee69aaf7bee560fc69b8cbd58a717ad4adad` |
| `fills-ledger.json` | `75fa86787d5a0ea37439bb1c7e0790bdfb6f63285b088cf76178450e6abd44f8` |
| `unwind.json` | `289dc535c8af861920e764130f3fe212b6f812f0adf43311d1ebd0d55075e80c` |
| `live.ndjson` | `ad89564b22acc163c1cf19cfb755357a2764a17db5dcefb8a6d16830d4e57e52` |
| `log.ndjson` | `2bd18c55557dd48284363f925ef57f11c80d004bfa40f9cada3bff692d9eee45` |
| `decided.json` | `42d6b8795310c928bdba9216bdcef49413fdd0deec342160d833d49c7ca11ca0` |
| `tests.json` | `8202674c8463f7400c5b16a47727fbe61eb64bfb7bb578c5e20fd38441c161e6` |
| Bundle 1 `SHA256SUMS` | `4791229fedb8461e4f15314cd9b0ddff7456f6f85341c8dcac15ad40641c255d` |
| Bundle 2 `SHA256SUMS` | `2d8146473aa5f9c024a15e43caa3272f1a354a7e804108de26d16e2877b03cea` |
| Bundle 3 `SHA256SUMS` | `0a389eca3b2c06297e4b4e168e17dfd7a987214d489e654ca8d0be893401f3dd` |
| Bundle NOT_AUTHORIZED `SHA256SUMS` | `83b6d3b580552a3004e378a05b352885c7ad03aa6b021dea2e7093c176e064ce` |
| Bundle 4 `SHA256SUMS` | `1e8fdd9c4925f686e4b98ee158b138b8c54f3e50294be14fb9d95d8b2f7797a1` |

Nachpruefen: `npx ts-node -T --project tsconfig.src.json src/killerDemo/maker/cli.ts verify-bundle /root/logs/killer-demo-maker/b2-window/cases/<id>` (auf `975241d`, gegen die Originale). Die Kopien unter `b2/cases/` sind Auszuege wie bei Fenster 2 (ohne `head.json`, `pins.json`, `rfq-list.json`, `reads/`) und bestehen `verify-bundle` allein NICHT; massgeblich sind die `SHA256SUMS` der Originale (Hashes oben).

## Naechster Schritt

Dauerbetrieb Schritt 2 = Wiederholung ohne neuen Bau: naechstes Fenster mit demselben Ablauf (Tests am Fenstertag, Preflight, policy-check, arm --fills N, run, unwind), N = Rene. Auszahlung der 8 + 2 iUSDC gesammelt ausserhalb eines Fensters, wenn Rene es will. SUPRA-Nachschub, sobald die Venue unter ~30.000 faellt (zwei Fills Reserve). Kein neues Sicherheitsbauwerk.
