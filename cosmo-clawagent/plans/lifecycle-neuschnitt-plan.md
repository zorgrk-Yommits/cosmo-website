# Lifecycle-Neuschnitt COSMO Agent Marketplace (L1/L2/L3)

## Context

Am 2026-07-21 durchlief Rene den kompletten Markt-Lifecycle real (MCP-PROBE-001, Job #6)
und stiess in einer Session auf sechs Waende — dokumentiert in
`cosmo-clawagent/docs/usability/buyer-flow/findings-2026-07-21-lifecycle.md` (`75d2880`).
Der On-chain-Rail settelte fehlerfrei, aber: verlorene Browser-Callbacks verklemmten das
Backend zweimal (B3/B4), Gates feuerten zu spaet mit nutzlosen Meldungen (B1/B2), niemand
wusste, wessen Zug es ist (B5), und die UI bot die destruktiv-falsche Deliver-Aktion an,
die den Piloten zerstoerte (B6). Entscheid Rene: MCP-PROBE-001 wird nach dem Neuschnitt
wiederholt; Job #3 (kahless) bleibt bis dahin eingefroren.

**Drei Saeulen:** (1) Chain-first-Sync — Backend liest die Chain selbst, Browser-Callbacks
werden vom Garanten zum Schnellpfad. (2) Rollenbasierte Ein-Zug-Ansicht — serverseitig
berechnet, maschinenlesbar (externe Solver-Agents konsumieren die API direkt, Website
rendert dieselben Daten). (3) Job-Typ-Begriff — das Liefergut bestimmt den Deliver-Pfad.

**Fixe Entscheide (Rene):** inkrementell L1→L2→L3 · Job #3 eingefroren · Next-Step-API-first
· KEINE Move-/On-chain-Aenderungen · keine offene Provider-Registrierung · kein Dispute-UI.

Repos: Backend `/root/cosmo-market-api` (Express+tsx, PM2 single fork, :4100, Store =
atomare JSON + Audit-JSONL, alle Writes via `mutate()` store.ts:48-58). Frontend
`/root/workspace/meine-website/cosmo-clawagent` (Next.js static export, out/ = live,
Snapshot-Konvention `cp -a out out.pre-<thema>`).

## Schritt 0 — Plan-Ablage

Diesen Plan nach `cosmo-clawagent/plans/lifecycle-neuschnitt-plan.md` kopieren + committen.
Umsetzung startet im frischen Chat mit diesem Plan als Referenz.

---

## L1 — Chain-Poller/Reconciler (behebt Verklemm-Klasse B3/B4)

**Ziel:** Der Backend-Store kann nie mehr hinter der Chain haengen bleiben.

**Design:**
- Tick 20 s (Config `MARKET_POLLER_INTERVAL_MS`), Muster `startAlertFlusher`
  (notify.ts:97-100): `setInterval().unref()` + In-flight-Bool, Start in server.ts neben
  dem Alert-Flusher. Single-fork-PM2 → keine Poll-Kollision.
- Scan-Menge (klein, begrenzt): Jobs in `selected`/`onchain`/`delivered`.
  - `selected` (+buyerWallet+specHash+selectedOfferId) → Request-Walk (Logik aus
    confirm-request flow.ts:336-352: buyer+inputHash+paymentFa+Preis, WALK_DEPTH 25).
  - `onchain` ohne jobIdOnchain → `getRequestV2`; bei ACCEPTED Job-Walk (flow.ts:534-543).
  - `onchain` mit jobIdOnchain → `getJobV2`; DELIVERED+Hash-Match → delivered; SETTLED → settled.
  - `delivered` → `getJobV2`; SETTLED → settled.
  - Skip-Liste `MARKET_POLLER_SKIP_JOBS` (Config, kommasepariert) — Job #3 eintragen.
- **Reconciler = pure Funktion** `decide(job, ctx{requestView?, jobView?, walkedRequestId?,
  walkedJobId?, expectedResultHash?, nowSecs}) → Transition[]` (Muster checkArm
  armGuard.ts:57-131, mockfrei testbar). Anwendung NUR via `mutate()` mit Audit-Events
  `poller.request_confirmed` / `poller.accept_confirmed` / `poller.deliver_confirmed` /
  `poller.settle_confirmed` / `poller.result_hash_mismatch`.
- ChainError (views.ts, fail-closed) → Tick fuer diesen Job abbrechen, nie raten. Walk-Miss
  → kein Vorruecken; nach ~15 Ticks ohne Fund bei vorhandenem txRefs.create einmalig
  `enqueueAlert` (Ops-Hinweis statt stilles Haengen).
- **Hash-Mismatch-Detektor (B6 serverseitig):** on-chain resultHash != erwarteter Hash →
  NICHT vorruecken, Flag `poller.result_hash_mismatch` + Alert (einmalig).
- **B4-Fix:** `freezeAttestation` (canonical.ts:38-53): `acceptTx` optional, Version
  `cosmo-market-attestation-v2` (canonicalize filtert undefined bereits); `ensureAttestation`
  (flow.ts:109-115) verlangt txRefs.accept nicht mehr. Zusaetzlich Admin-Backfill-Route
  `POST /admin/jobs/:id/txrefs` (auditiert) fuer nachgetragene Tx-Hashes.
- confirm-* Routen bleiben als Instant-Pfad (liefern den Tx-Hash, den der Poller nicht
  kennt), werden aber idempotent: bereits erreichter Zielzustand → 200 statt 409
  (Muster confirm-settle flow.ts:635-638 uebertragen).

**Dateien Backend:** NEU `src/chain/locate.ts` (Walk-Helfer, aus flow.ts extrahiert),
NEU `src/reconciler.ts` (pure decide + Transition-Typen), NEU `src/poller.ts`
(startChainPoller); AENDERN `src/server.ts`, `src/canonical.ts`, `src/routes/flow.ts`
(locate.ts nutzen, confirm-* idempotent, Attestation-Gate lockern), `src/routes/admin.ts`
(txrefs-Backfill). Frontend: keine Pflichtaenderung. Datenmodell: keins.

**Tests** (vitest, Fixture-Argumente statt Mocks, Muster test/armGuard.test.ts):
NEU `test/reconciler.test.ts` — alle Transitions, ChainError→leer, Walk-Miss, Hash-Mismatch
→ flag statt advance, terminal/frozen → no-op, Idempotenz (2x decide → leer).
`test/canonical.test.ts` erweitern (Attestation v2 mit/ohne acceptTx).
**Mutations-Gegenprobe (Projektregel):** Hash-Mismatch-Gate im decide() invertieren →
reconciler-Test MUSS rot werden; einmal belegen, im PR dokumentieren.

**Verifikation ohne Tx** (Chain-Historie = Gratis-Fixtures):
1. State-Kopie (`MARKET_STATE_DIR`), Job-#6-Eintrag kuenstlich auf `onchain` zuruecksetzen
   → Poller lokal → muss ueber echte Mainnet-Reads (get_job_v2(6)=SETTLED) bis `settled`
   reconcilen; Audit-Zeilen pruefen.
2. Analog `selected`-Rueckversetzung → Request-Walk findet Request #11.
3. Prod-Deploy: 30 min beobachten — Poller muss fuer Bestands-Jobs No-op sein.

**Rollback:** vorher `cp state/market-state.json state/market-state.pre-l1.json`;
`git revert` + `pm2 restart cosmo-market-api` (Restart rehydriert voll, store.ts:13-33).

---

## L2 — Next-Step-Engine + Rollen-Ansicht (behebt B1/B2/B5)

**Ziel:** Ein Endpoint beantwortet pro Rolle „wessen Zug, welche EINE Aktion, was blockt
und wie kommt man raus" — inkl. unterschriftsfertigem Tx-Payload fuer externe Agents.

**Endpoint:** NEU `GET /jobs/:id/next-steps` (eigener Endpoint; `/flow` bleibt fuers
Bestands-Frontend, beide teilen einen Chain-Snapshot-Loader; GETs sind nginx-ratelimit-frei
→ Solver-Polling ok).

**Response-Schema (Kern):**
```jsonc
{ "jobId", "jobType", "status", "requestId", "jobIdOnchain",
  "chain": {"requestStatus","jobStatus","quote","readAt"},
  "turn": "buyer|provider|server|nobody",
  "roles": [{
    "role": "buyer|provider|observer",
    "state", "headline",
    "action": null | { "id", "kind": "wallet_tx|api_call|server_auto",
      "txTemplate": { "function", "typeArgs", "args":[{"name","type","value"}],
                      "display": {"hashToCommit", "deadline"} },
      "signerWallet" },
    "blockers": [{"code","cause","remedy"}]
  }]}
```
Arg-`type`-Enum spiegelt exakt die Encoder in `computeTx.ts` (u64, address, hex_bytes,
utf8_bytes). `display.hashToCommit` ist bei jeder destruktiven Einmal-Aktion Pflicht.

- **Pure Decision-Core** `deriveNextSteps(job, offer?, provider?, snapshot, nowSecs)` in
  NEU `src/nextSteps.ts` — subsumiert die Frontend-`deriveStage()`-Logik
  (NextStepPanel.tsx:119-145) + Provider-Sicht + Blocker; Snapshot = Struct aus vorab
  getaetigten Chain-Reads (Muster checkArm).
- **Gates VOR der Auswahl (B1/B2):** im Buyer-Block `select` eine `offerReadiness`-Liste je
  Offer: eligible/bond/hasCapacity + Blocker mit Ursache+Ausweg (Views wie providerChecks
  flow.ts:252-266, je Provider mit 30s-Cache). Roster-Blocker nennt explizit „Provider-
  Profil muss vom Admin angelegt werden"; Kapazitaets-Blocker nennt best-effort den
  mutmasslich blockierenden eigenen Job.

**Dateien Backend:** NEU `src/nextSteps.ts`, `src/chain/snapshot.ts` (Loader+Cache),
`src/routes/next.ts`; Registrierung in server.ts. flow.ts unveraendert (Kompatibilitaet).

**Frontend:** NEU `components/RoleNextStep.tsx` (rendert Server-Dokument; Rollen-Tabs
Buyer/Provider/Observer, verbundenes Wallet bestimmt den hervorgehobenen Tab via
`sameWallet` gegen buyerWallet bzw. on-chain solver, Observer default; Blocker-Karten).
`NextStepPanel.tsx`: deriveStage() entfaellt, wird duenner Renderer + Action-Dispatcher
(StarKey-Signieren bleibt clientseitig, gespeist aus txTemplate). `DeliverPanel` geht im
Provider-Rollenblock auf; JobDetail.tsx mountet nur noch RoleNextStep → Ende der
Rollenmischung. `useMarketFlow.ts`: Self-Heal-Effekte (:194-220) und 10x/3s-Retry-Loops
RAUS (L1-Poller ist Garant); nach Tx genau EIN Instant-confirm mit Tx-Hash, danach „wird
automatisch synchronisiert". Auto-Arm bleibt vorerst clientseitig (Verhalten stabil).
Browser→Chain-Direkt-Reads (computeViews.ts) BLEIBEN (Resilienz). `marketApi.ts`: Typen +
fetchNextSteps().

**Tests:** NEU `test/nextSteps.test.ts` — Fixture-Matrix (Status x Chain-Snapshot x Rolle):
je Rolle genau eine Aktion oder null; Blocker-Faelle B1/B2; Deadline-Faelle; txTemplate-Args
bytegenau. Mutations-Gegenprobe: Rollen-Gate (z. B. Provider-Aktion trotz fremdem Solver-
Wallet) invertieren → Test MUSS rot werden.

**Verifikation ohne Tx:** next-steps gegen reale Bestands-Jobs (settled Job #5/#6 →
terminale Rollen-Stories; approved Job → Buyer-select mit Offer-Readiness gegen echte
Vault-Views). Frontend: `cp -a out out.pre-lifecycle-l2` → Build → Sichtpruefung aller
Rollen-Tabs auf Bestands-Jobs. **Rollback:** Backend git+PM2; Frontend Snapshot re-serven.

---

## L3 — Job-Typen (behebt B6)

**Typen v1:** `jobType: 'attestation' | 'artifact'`.
attestation = heutiges Verhalten (result_hash = eingefrorenes Attestation-Dokument).
artifact = result_hash = Hash eines externen Artefakts (z. B. evidence.json).

- **Setzung beim Admin-Approve** (admin.ts:21-39, Body-Param, Default 'attestation'),
  wandert in freezeSpec; danach unveraenderlich. Migration: keine — Leser nutzen
  `jobTypeOf(job) = job.jobType ?? 'attestation'` (Back-fill-Muster store.ts:24-26).
- **Artifact-Hash-Registrierung VOR Lieferung (verhindert B6, statt nur zu detektieren):**
  Der Solver kennt den Hash → Provider registriert ihn wallet-signiert (Challenge-Muster
  wie Offers, walletSig.ts): `POST /jobs/:id/result/challenge` + `POST /jobs/:id/result`
  (Signer MUSS on-chain solver aus getJobV2 sein, fail-closed; Re-Registrierung erlaubt
  solange nicht DELIVERED; Audit `result_registered`). Erst DANACH liefert next-steps dem
  Provider das deliver_result_v2-txTemplate — mit exakt dem registrierten Hash in args und
  display.hashToCommit.
- **Dispatch an den zwei Kopplungspunkten** (Kapselung NEU `src/resultPolicy.ts`,
  pure `expectedResultHashFor(job)`):
  1. `ensureAttestation`/`GET /attestation`: artifact → 409 „this job delivers an external
     artifact", kein Freeze.
  2. Hash-Gate (confirm-deliver flow.ts:600-604 + Poller-decide): erwarteter Hash =
     attestationHash bzw. expectedResultHash; artifact unregistriert + on-chain DELIVERED →
     Flag `poller.result_hash_unregistered` + Alert (dokumentieren, nie raten).
- **Frontend:** Provider-Block dispatcht nach jobType AUS next-steps (nie clientseitig
  geraten). artifact → Formular „Hash+URI registrieren (Wallet-Signatur)", erst danach
  Deliver-CTA. **Beide Typen:** destruktiver Bestaetigungs-Screen vor deliver_result_v2
  („Dieser exakte Hash wird unwiderruflich committet: 0x…", type-to-confirm) — NEU
  `components/DeliverConfirm.tsx`.

**Tests:** NEU `test/resultPolicy.test.ts` (Typ-Dispatch; unregistriert → kein Template +
Flag; Hash-Format 0x+64hex); nextSteps-Tests um artifact erweitern; walletSig-Tests fuer
Result-Challenge. **Mutations-Gegenprobe:** Dispatch invertieren (artifact bekommt
Attestation-Template) → Test MUSS rot werden — das ist exakt der B6-Waechter.

**Verifikation:** Registrierungs-Flow lokal gegen State-Kopie + echte getJobV2-Reads.
**Abschluss-Abnahme des gesamten Neuschnitts = Pilot-Wiederholung MCP-PROBE-002**
(artifact-Job, K1, vorhandenes Lieferpaket-Muster + Runbook wiederverwendbar) und danach
Auftauen von Job #3 (Skip-Liste leeren). Erst der Rerun beweist B6-Fix end-to-end mit
echten Txs.

---

## Risiken / Notizen

1. Request-Walk-Fehltreffer bei identischen Doppel-Escrows moeglich (wie heute in
   confirm-request); Audit macht es nachvollziehbar.
2. RPC-Last harmlos (20s x kleines Set); Snapshot-Cache begrenzt Readiness-Reads; bei
   Drossel Intervall per Config erhoehen.
3. Attestation v2 aendert das Dokumentformat KUENFTIGER Freezes (bestehende bleiben
   byte-identisch, Freeze ist einmalig).
4. Auto-Arm serverseitig = bewusst NICHT in diesem Neuschnitt (spaeterer Kandidat fuer
   browserlose Solver).
5. Kapazitaets-Ursache best-effort (has_job_capacity nennt den Blocker-Job nicht; externe
   Jobs desselben Solvers unsichtbar).
6. Job #3: via MARKET_POLLER_SKIP_JOBS geschuetzt; Vergessen beim Auftauen = nur
   verzoegerter Sync, kein Schaden.

## Kritische Dateien

- Backend: `src/routes/flow.ts`, `src/store.ts`, `src/chain/views.ts`,
  `src/chain/armGuard.ts` (Muster), `src/canonical.ts`, `src/notify.ts` (Muster)
- Frontend: `src/app/market/lib/useMarketFlow.ts`, `components/NextStepPanel.tsx`,
  `components/DeliverPanel.tsx`, `job/JobDetail.tsx`, `lib/computeTx.ts`,
  `lib/marketApi.ts`, `lib/marketStatus.ts`
