# MCP-PROBE-002 — Rerun mit korrekter Hash-Bindung

## Context

MCP-PROBE-001 (Job #6, 21.07.) ging on-chain durch, aber über den falschen Weg: der
`result_hash` band die **Markt-Attestation** statt der `evidence.json`. Die Probe war damit
nicht on-chain gebunden → Rene: kein Public-Framing, Wiederholung nach dem
Lifecycle-Neuschnitt.

**Befund aus der Vorprüfung (27.07.): der B6-Fix ist bereits bewiesen.** Job #8
(`job_mrz3g06c7z98w3`, buyer-proof-001) lief am 26.07. den vollständigen artifact-Pfad mit
echten Txs: `result_challenge_issued` → `result_registered` (wallet-signiert vom on-chain
Solver) → `deliver_confirmed` mit exakt diesem Hash → `poller.settle_confirmed`. On-chain
`get_job_v2(8)` liefert `result_hash = 0x2a9b11d783f013503831b79e866950e7e343039543f3892a5056932088ade357`,
identisch mit dem registrierten `expectedResultHash`, Status SETTLED.

Der Rerun ist deshalb **nicht mehr die Lifecycle-Abnahme** — die wird auf Job #8 geschlossen.
Sein Zweck ist der ursprüngliche Produktzweck: eine publizierbare MCP-Verhaltensprobe, deren
`result_hash` die `evidence.json` bindet.

Entscheide Rene (27.07.): voller Rerun · Provider = K1 mit offen benannter Grenze ·
Probe in ephemerem Docker-Container.

## Ziel

Ein neuer artifact-Job auf `heros.cloud/market`, 5 wCOSMO, komplette Kette bis Settlement,
bei dem gilt: `on-chain result_hash == SHA3-256(evidence.json)` und `result_uri` serviert
genau diese Bytes.

## Ausdrückliche Nicht-Ziele

- **Kein Extern-Beweis.** Provider ist K1 (COSMO-kontrolliert), die Probe wird von
  COSMO-Tooling gebaut. `environment.isolation` sagt das wörtlich, wie in 001. Jedes Framing
  behauptet Hash-Bindung, nie Unabhängigkeit.
- Keine pauschale Sicherheitsaussage über den MCP-Server (Pflicht-Grenzsatz, s. u.).
- Kein Backend-Code-Change. Kein jobType-Picker in der AdminConsole (Approve per curl, wie
  bei buyer-proof-001).
- Keine Kahless-Ansprache in diesem Zyklus.

## Trust-Modell, ehrlich

| Behauptung | Wodurch gedeckt |
|---|---|
| Der Hash auf der Kette gehört zu genau dieser Datei | `get_job_v2(9).result_hash` == sha3-256 der Live-URL-Bytes, byte-verifiziert |
| Der Solver hat den Hash selbst registriert | `/result`-Route prüft Signatur gegen `jv.solver` (chain truth) und lässt Registrierung nur bei Status ACTIVE zu |
| Die Probe beschreibt das Verhalten dieser Version | Re-run + Diff durch COSMO vor dem Approve |
| Die Probe ist unabhängig | **NICHT gedeckt** — K1 = eigener Agent, Tooling = COSMO |
| Der Server ist sicher | **NICHT gedeckt und nirgends behauptet** |

## Betrugsvektoren

| Vektor | Gegenmaßnahme |
|---|---|
| Provider liefert anderen Hash als registriert | next-steps gibt das Deliver-Template nur mit dem registrierten Hash aus; `deliver_result_v2` ist einmalig |
| Provider registriert nach der Lieferung um | `/result` wirft 409, sobald on-chain Status ≠ ACTIVE |
| Datei wird nach dem Hashen still ausgetauscht | Hash wird gegen die **Live-URL** neu berechnet, nicht gegen die lokale Datei |
| Fremder registriert ein Ergebnis | Signatur muss vom on-chain `solver` stammen, Challenge-TTL 300 s |
| Spec wird nachträglich passend gemacht | Approve friert `specCanonical` + `specHash`; Probe läuft erst danach |
| Attestations-Pfad wird versehentlich benutzt (der 001-Fehler) | `jobType=artifact` beim Approve → Attestations-Route antwortet 409 |
| Lieferfenster läuft ab (buyer-proof-001-Lehre: Offer-`deliverySecs` ist die echte Deadline) | Artefakt wird **vor** dem Escrow gebaut und veröffentlicht; Register+Deliver in einer Sitzung |

## Unverifizierbare Annahmen

- npm liefert unter `@modelcontextprotocol/server-everything@2026.7.4` dieselben Bytes wie am
  21.07. — abgesichert nur durch die aufgezeichnete `integrity` im Evidence, nicht durch uns.
- StarKey signiert, was es anzeigt.
- Der Container hat keine Host-Secrets — durch Konstruktion, nicht durch Beweis.

## Spec-Korrektur gegenüber 001

001 war wörtlich unerfüllbar: Abnahmekriterium 4 verlangte Tool `add`, das es in 2026.7.4
nicht gibt (umbenannt zu `get-sum`). 2026.7.4 ist heute weiterhin `latest` — Pin bleibt, damit
der 001-Befund reproduzierbar bleibt.

- Test A: `echo` mit `message = <Job-Nonce>` → Rückgabetext enthält den Nonce exakt.
- Test B: **`get-sum` mit a=2, b=3 → 5** (statt `add`).
- Test C (neu): `add` existiert **nicht** — `tools/call add` muss mit `-32602` fehlschlagen.
  Damit wird der 001-Befund vom Nebensatz zur prüfbaren Aussage.
- `limitation` wörtlich: *"This specific version
  (@modelcontextprotocol/server-everything@2026.7.4) exhibited the recorded behavior under the
  documented tests. This is not a general security certification."*
- Kein Satz mit "secure", "certified", "audit passed".

## Schritte

**M1 — Spec + Job anlegen**
Nonce `mcpprobe002-<12 hex>` in die Description. Intake
`POST http://127.0.0.1:4100/api/market/jobs` (Schema: title 8–120, description 40–8000,
acceptanceCriteria 20–4000, budgetAmount `"5"`, budgetAsset `wCOSMO`, deadlineTs ≤ now+7d,
contactEmail, buyerWallet `0x0a0571a9…04e1bb`).
Dann **`POST /api/market/admin/jobs/:id/approve` mit Body `{"jobType":"artifact"}`** — der
Default wäre `attestation` und würde exakt den 001-Fehler reproduzieren. Rückgabe muss
`jobType: "artifact"` enthalten; `specHash` notieren.

**M2 — Probe im Container**
`docker run --rm node:22-slim` mit tmpfs für work/home, keine Mounts von Host-Secrets, Netz
nur zur npm-Registry. `npx -y @modelcontextprotocol/server-everything@2026.7.4` über stdio;
`initialize`, `tools/list`, `resources/list`, `prompts/list`, Tests A/B/C. Jede JSON-RPC-Zeile
roh nach `transcript.jsonl`. `evidence.json` nach Schema `cosmo-mcp-probe-v1` (Feldliste s.
`plans/mcp-probe-001-k1-runbook.md` §2; Struktur 1:1 aus `/root/mcp-probe-001-delivery/evidence.json`
übernehmen), `evidence_hash` = SHA3-256 der `transcript.jsonl`-Bytes.
Skript und Container-Definition landen in `/root/mcp-probe-002/` — nicht in einem Produktiv-Repo.

**M3 — Veröffentlichen und Hash festnageln**
`evidence.json` + `transcript.jsonl` nach
`/root/workspace/meine-website/cosmo-clawagent/public/evidence/mcp-probe-002/` **und**
`out/evidence/mcp-probe-002/` (Website-Repo liegt dort, nicht /root/cosmo-website; `out/` ist
live serviert — kein `npm run build` nötig und keiner erwünscht).
`result_hash` = SHA3-256 der **von der Live-URL geladenen** Bytes:
`curl -s https://heros.cloud/evidence/mcp-probe-002/evidence.json | python3 -c "import hashlib,sys;print('0x'+hashlib.sha3_256(sys.stdin.buffer.read()).hexdigest())"`.
Ab hier wird die Datei nicht mehr angefasst.

**M4 — Offer durch K1**
Provider `prov_mruu19nhii516h` (Wallet `0x11c1c266…51da53`) ist registriert und nach Job #8
wieder frei. Wallet-signiertes Offer über den bestehenden Challenge/Submit-Pfad, 5 wCOSMO,
`deliverySecs` großzügig (24 h) — das Artefakt liegt ja schon.

**M5 — Rene: Select + Escrow + Accept (StarKey)**
`heros.cloud/market/job?id=<job>`. Hier läuft die **5-Punkte-StarKey-Checkliste** mit:
passiver Chip nach dem Signieren · Eigen-Offer-Warnung · Change-selection-Re-Sign ·
Re-Bind sichtbar · Bedienbarkeit ohne Zuruf. Beobachtungen werden notiert, nicht interpretiert.

**M6 — K1: Registrieren + Liefern (StarKey, K1-Wallet)**
`heros.cloud/market/work?id=<job>`. Zwei Schritte: erst Hash+URI registrieren (wallet-signiert,
Route prüft gegen on-chain Solver), dann Deliver mit type-to-confirm des exakten Hashes.
Das ist der Pfad, den 001 nicht hatte.

**M7 — Abnahme und Settlement**
COSMO fährt die Probe im Container erneut und diffed gegen `evidence.json` (erwartbar
abweichend: `probed_at`, ggf. Laufzeitfelder — alles andere muss gleich sein). Erst bei
sauberem Diff Buyer-Approve über StarKey → atomares Settlement, 5 wCOSMO an K1.
Achtung: Deliver ≠ bezahlt (buyer-proof-001-Fehleindruck) — `get_job_v2(9).status == 2` ist
das Kriterium, nicht ein UI-Label.

**M8 — Evidence-Bundle**
`public/evidence/mcp-probe-002/index.txt` nach Muster `pilot-001`: Job-ID, specHash, alle
Tx-Hashes (create/submitQuote/accept/deliver/settle), `result_hash`, Grenzsatz zur fehlenden
Unabhängigkeit. Danach Memory + Obsidian-Note.

## Verifikation

1. `curl .../evidence.json | sha3-256` == `get_job_v2(9).result_hash` — die Kernaussage.
2. `get_job_v2(9)`: `solver` == K1-Wallet, `status` == 2 (SETTLED), `price` == 5000000.
3. Audit-Log `state/market-audit.jsonl` enthält für den Job in dieser Reihenfolge:
   `job_approved` (jobType artifact) · `offer_wallet_submitted` · `offer_selected` ·
   `request_confirmed` · `arm_signed` · `quote_armed` · `accept_confirmed` ·
   `result_challenge_issued` · `result_registered` · `deliver_confirmed` · `settle_confirmed`.
4. Gegenprobe zum 001-Fehler: `GET /api/market/jobs/<id>/attestation` muss **409** liefern.
5. `evidence_hash` im Evidence rechnet sich aus `transcript.jsonl` nach.
6. Re-run-Diff aus M7 abgelegt.

## Kill-Conditions

- Hash der Live-URL ≠ registrierter Hash → **kein Approve**, Job auslaufen lassen.
- Re-run-Diff zeigt unerklärte Abweichungen außerhalb der Zeitfelder → kein Approve.
- `/result` antwortet 409 (Status ≠ ACTIVE) → Abbruch, nicht umgehen.
- Rail `is_paused` == true → Abbruch (aktuell false, `next_job_id` = 9).
- Probe-Verdict FAIL mit unklarer Ursache → veröffentlichen, aber nicht bezahlen.

## Streichliste

AdminConsole-jobType-Picker · Kahless-Outreach · Public-Announcement · Auftauen von Job #3
(jetzt durch Job #8 entblockt, aber eigener Schritt mit eigenem GO — braucht vorher
Selection-Reset wegen `self_quote`).

## Kritische Dateien

- `/root/cosmo-market-api/src/routes/flow.ts` (Registrierung `/result/challenge` + `/result`,
  Zeilen ~541–648) — nur lesen, kein Change
- `/root/cosmo-market-api/src/routes/admin.ts` (Approve mit `jobType`)
- `/root/cosmo-market-api/src/resultPolicy.ts` (einziger Hash-Dispatcher)
- `/root/workspace/meine-website/cosmo-clawagent/plans/mcp-probe-001-k1-runbook.md` (Vorlage)
- `/root/mcp-probe-001-delivery/evidence.json` (Schema-Vorlage, Archiv VOID)
- neu: `/root/mcp-probe-002/` (Probe-Skript), `public/evidence/mcp-probe-002/` (Evidence)
