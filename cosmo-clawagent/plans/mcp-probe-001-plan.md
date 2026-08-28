# MCP-PROBE-001 — Reproduzierbarer MCP-Probe-Pilotauftrag für Kahless

> Auf GO wird dieser Plan nach `/root/workspace/meine-website/cosmo-clawagent/plans/mcp-probe-001-plan.md`
> kopiert (Projektkonvention) und in einem frischen Chat umgesetzt.

## Context

COSMO betreibt einen live Agent-Marktplatz (`heros.cloud/market`, Backend PM2 `cosmo-market-api`
auf `127.0.0.1:4100`). Der erste extern ausgeführte Käufer-Pilot mit dem Fremd-Agenten **Kahless**
läuft bereits als Issue-Triage-Job (`job_mrufb7mkkl7xhe`, Doku-Task, approved).

Ziel dieses zweiten Pilots: einen **real ausführbaren** Auftrag anlegen, dessen Handelsgut die
**unabhängige Verhaltensprüfung eines öffentlich erreichbaren MCP-Servers** ist. Kahless soll das
Ziel in isolierter Umgebung untersuchen, die tatsächlich angebotenen Tools/Berechtigungen feststellen,
das dokumentierte Verhalten gegenprüfen und ein strukturiertes, maschinell abnehmbares Evidence-Paket
(`PASS`/`WARN`/`FAIL`) liefern. Der Auftrag darf **keine pauschale Sicherheitszertifizierung**
versprechen — die Aussage bleibt auf das konkret getestete Verhalten der gepinnten Version begrenzt.

Erfolg = Kahless nimmt den Auftrag über den bestehenden Market-Workflow selbstständig an, führt die
Prüfung aus, liefert ein gültiges Evidence-Paket, und COSMO nimmt es anhand vorab festgelegter,
reproduzierbarer Kriterien ab und rechnet ab.

**Entscheidungen (bestätigt):**
- Ziel = `@modelcontextprotocol/server-everything@2026.7.4` (offizieller MCP-Referenzserver;
  öffentlich, benigne, npm-versionsgepinnt, deterministischer Tool-Satz — geprüft via `npm view`).
- Abnahmemodell = **Re-run + Diff**: COSMO stellt das gepinnte Ziel selbst nach und vergleicht
  maschinell gegen den Report; zusätzlich Hash-Kette (Evidence ↔ On-Chain `result_hash`).
- **Annehmende Partei (Solver/Maker) = K1** (mainnet chain 8): Operator-Wallet
  `0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53`, Agent-NFT
  `0x38c02505865a8b08d6a2fd354554de5906263e1aedd702af3bb8299f1f191738` (Allowlist GO C1/C2
  2026-07-12, on-chain eligible + agent active). K1 quotet/liefert; COSMO bleibt Käufer.

## Was NICHT gebaut werden muss (bewusst wiederverwendet)

Die Website rendert Jobs vollständig datengetrieben (`src/app/market/MarketHome.tsx`,
`job/JobDetail.tsx`, `useMarketData.ts` → fetch `/api/market/jobs`). Ein neuer **approved** Job
erscheint automatisch inkl. Spec-Endpoint und 7-Schritt-Flow (select → escrow → arm → accept →
deliver → approve → settle). **Kein Website-Code-Change nötig**, um den Auftrag anzeigbar/annehmbar zu
machen. Der gesamte On-Chain-Rail (`flow.ts`, `armGuard`, `deliver_result_v2`) bleibt unverändert.

## Kernarbeit = Auftrags-Content + Anlage

Der Job wird über den existierenden Pfad angelegt (wie kahless-001): **Intake → Admin-Approve
(friert Spec ein)**. Kein State-Edit von Hand (PM2 läuft; `market-state.json` ist in-memory Owner).

### Job-Felder (Intake-Payload, Schema: `src/model.ts` `jobSubmissionSchema`)

- **title**: `MCP-PROBE-001: independent behavior probe of @modelcontextprotocol/server-everything@2026.7.4`
- **budgetAsset**: `wCOSMO`  ·  **budgetAmount**: `5`
- **deadlineTs**: `now + 6 Tage` (Rail-Ceiling 7 d; zur Anlagezeit setzen)
- **contactEmail**: `zorg.rk@gmail.com` (privat, nie öffentlich)
- **buyerWallet**: COSMO-Market-Käuferwallet aus Pilot-001 (aus `config.env`, nicht hartkodieren)
- **website**: `""` (Honeypot leer)

**description** (Markdown; öffentlich, wird eingefroren) — Struktur analog kahless-001:
- *Target*: Paket `@modelcontextprotocol/server-everything`, Version **`2026.7.4`**, Transport
  **stdio**, Start `npx -y @modelcontextprotocol/server-everything@2026.7.4`. Version + aufgelöster
  npm-Integrity/`dist.shasum` sind im Evidence zu protokollieren (= "Paket-/Commit-Hash").
- *Isolation*: Prüfung ausschließlich in einer isolierten/ephemeren Umgebung (Container/Sandbox,
  kein Netz außer npm-Install-Registry, kein Zugriff auf Host-Secrets).
- *Aufgabe*: MCP-Handshake (`initialize`) → `tools/list`, `resources/list`, `prompts/list`
  enumerieren; angebotene Tools + deren `inputSchema` + Server-Capabilities festhalten; dokumentiertes
  Verhalten gegen tatsächliches prüfen; unerwartetes Verhalten notieren.
- *Deterministische Invarianten-Tests* (binden das Transkript an genau diesen Job):
  - `echo` mit Input `cosmo-mcp-probe-001:<jobId>` MUSS denselben String zurückgeben.
  - `add` mit `a=2, b=3` MUSS `5` liefern.
- *Grenze der Aussage (wörtlich gefordert im Liefergut)*:
  > "This specific version (@modelcontextprotocol/server-everything@2026.7.4) exhibited the recorded
  > behavior under the documented tests. This is not a general security certification."
- *Deliverables*: Evidence-Paket `evidence.json` (Schema `cosmo-mcp-probe-v1`, s. u.) + rohes
  JSON-RPC-Transkript `transcript.jsonl`; On-Chain `deliver_result_v2` mit
  `result_hash = sha3-256(canonical(evidence.json))`; Evidence-Bytes an COSMO (contactEmail-Kanal).
- *Warum extern geeignet*: öffentlicher, benigner, versionsgepinnter Gegenstand mit deterministischer
  Ground Truth; keine Secrets/kein Deploy-/On-Chain-Zugriff am Zielsystem nötig.
- *Risk class*: low.

**acceptanceCriteria** (maschinell prüfbar; COSMO Re-run + Diff):
1. `evidence.json` parst und erfüllt Schema `cosmo-mcp-probe-v1` (alle Pflichtfelder; `verdict ∈
   {PASS, WARN, FAIL}`).
2. `target.version == "2026.7.4"` und der protokollierte Start-Command pinnt exakt diese Version.
3. Der berichtete **Tool-Namen-Satz** ist mengengleich mit dem, den COSMO durch eigenes `tools/list`
   gegen denselben gepinnten Server erhält (deterministisch).
4. Beide Invarianten-Tests vorhanden und korrekt (echo-Roundtrip == Job-gebundener String; `add(2,3)==5`);
   COSMO reproduziert.
5. `handshake.serverVersion` und `protocolVersion` stimmen mit COSMOs Re-run überein.
6. Der wörtliche Limitation-Satz (s. o.) ist vorhanden; **keine** pauschale Aussage à la
   "secure"/"certified safe"/"audit passed" im Report.
7. `evidence.evidence_hash == sha3-256(transcript.jsonl-Bytes)` (COSMO re-hasht die gelieferten Bytes).
8. On-Chain `result_hash` aus `deliver_result_v2` == `sha3-256(canonical(evidence.json))`
   (byte-verifiziert, wie Pilot-001).

Dazu ein `File checks`/`Test commands`-Block im kahless-001-Stil, damit die Kriterien mensch*und*
maschinenlesbar bleiben.

### Evidence-Schema `cosmo-mcp-probe-v1` (das Liefergut)

```
schema_version   "cosmo-mcp-probe-v1"
job_id           "job_..."
target           { package, version:"2026.7.4", npm_integrity|shasum, transport:"stdio", launch_command }
probed_at        ISO-8601
environment      { isolation, node_version, os }
handshake        { protocolVersion, serverName, serverVersion, capabilities:{...} }
tools            [ { name, description, input_schema_sha256 } ]   // sortiert
resources        [ ... ]   // Kurzform
prompts          [ ... ]   // Kurzform
tests            [ { tool, input, expected, actual, result:"PASS"|"FAIL" } ]
deviations       [ ... ]   // dokumentiert vs. beobachtet
unexpected       [ ... ]
verdict          "PASS" | "WARN" | "FAIL"
limitation       "<wörtlicher Satz oben>"
evidence_hash    sha3-256(transcript.jsonl)
```

## Anlage-Schritte (Umsetzung im frischen Chat)

Wiederverwendete Routen: Intake `POST /api/market/jobs` (`src/routes/public.ts`), Approve
`POST /api/market/admin/jobs/:id/approve` (`src/routes/admin.ts` → `freezeSpec`, BasicAuth via nginx,
Creds `/root/.market-credentials`). Kanonisierung/Hash: `src/canonical.ts`.

1. Job-Payload (obige Felder) als JSON zusammenstellen; `deadlineTs = nowSecs()+6*86400`,
   `buyerWallet` aus `config.env`.
2. `POST https://heros.cloud/api/market/jobs` → `jobId` merken.  (Alt: gegen `127.0.0.1:4100`.)
3. `POST /api/market/admin/jobs/<jobId>/approve` (BasicAuth) → friert Spec, liefert `specHash`.
4. Verifizieren:
   - `GET /api/market/jobs/<jobId>/spec` → kanonische Bytes; sha3-256 == `specHash`.
   - `GET /api/market/jobs/<jobId>` öffentlich sichtbar; Job erscheint auf `heros.cloud/market`.
5. Solver-Engagement = **K1** (Operator `0x11c1…da53`, Agent `0x38c025…1738`). Provider-Profil „K1"
   mit `wallet = 0x11c1…da53` anlegen, falls nicht vorhanden (Registry-Konvention: `provider.wallet`
   = Operator-Wallet, wie „Operator M2" = `0x0a0571a9…e1bb`). Dann Offer (Wallet-Flow M3, signiert
   vom K1-Operator, oder admin-entered) → select → escrow → arm → accept → `deliver_result_v2` →
   **COSMO-Abnahme (Re-run + Diff gegen 8 Kriterien, Hash-Kette)** → approve → settle.
   Hinweis: der K1-Maker-Daemon (`cosmo-maker-daemon-live`) quotet aktuell nur RFQ-Compute; ob er
   diesen Market-Job automatisch quotet oder ob der Offer manuell/über den Wallet-Flow gesetzt wird,
   ist beim Umsetzen zu klären (siehe Risiken).
6. Nach Settlement: Evidence-Bundle unter `.../cosmo-clawagent/public/evidence/mcp-probe-001/`
   veröffentlichen (Regel: Evidence nur via `public/`) + optional Proof-Panel-Verlinkung auf `/market`.

## Verification (End-to-End)

- **Nach Anlage**: `curl .../jobs/<id>/spec | sha3sum-check == specHash`; Job im Market-Frontend
  sichtbar; `GET /jobs/<id>/status` = `approved`.
- **COSMO-Abnahme-Harness** (kleines Node-Script, eigene Umsetzung): startet
  `npx -y @modelcontextprotocol/server-everything@2026.7.4` über stdio, ruft `initialize` + `tools/list`,
  reproduziert echo/add, und diffs gegen Kahless' `evidence.json` (Kriterien 2-5). Prüft Kriterien
  1/6 (Schema + Limitation-String), 7 (`sha3-256(transcript)`), 8 (`result_hash` on-chain vs.
  `sha3-256(canonical(evidence))`).
- **Abschluss**: Settlement-Tx + byte-verifizierter Hash dokumentiert (Evidence-Ordner + Obsidian-Note,
  Post-Task-Hook).

## Risiken / offene Punkte

- **Offer-Kanal K1**: Der Solver ist die K1-Maker-Identität (Operator `0x11c1…da53`). Offen beim
  Umsetzen: quotet der laufende `cosmo-maker-daemon-live` diesen Market-Job automatisch, oder wird der
  Offer manuell (admin-entered) bzw. per M3-Wallet-Signatur des K1-Operators gesetzt? Kein Blocker für
  die Job-Anlage selbst.
- **Identität K1 (geklärt 2026-07-21)**: K1 ist die on-chain Handelsidentität des annehmenden Parts;
  die Operator-Wallet `0x11c1…da53` ist für diesen Pilot **extern kontrolliert**. Die externe/
  unabhängige Rahmung des Pilots bleibt bestehen — COSMO ist Käufer + unabhängiger Abnehmer, K1 der
  extern gesteuerte Solver.
- **Determinismus des Referenzservers**: `tools/list` ist für eine gepinnte Version stabil; sollte ein
  Minor-Update `2026.7.4` je überschreiben (npm immutable → praktisch ausgeschlossen), fällt der Diff
  fail-closed auf.
- **Kein State-Handedit**: Anlage strikt über die API (PM2 online).
