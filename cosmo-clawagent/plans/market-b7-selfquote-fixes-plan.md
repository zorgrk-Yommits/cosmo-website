# Market-UX Ursachen-Fixes: Ein Mensch versteht, was zu tun ist

## Context

Anlass: Rene strandete am 23.07.2026 live auf der Job-Seite von kahless-001
(`job_mrufb7mkkl7xhe`, cosmo-website#3). Zustand: Job `selected`, self_quote-Blocker
(Buyer-Wallet == Provider-Wallet K1). Die UI zeigte "Step 2 of 3" mit deaktiviertem
Funding-CTA und dem Remedy-Text "Re-select with a different buyer wallet, or select a
different provider (operator can reset the selection)" — bot aber:
- keinen Weg, neu auszuwählen (Select-UI wird nur im Server-State `select` gerendert,
  obwohl die API Re-Select im Status `selected` erlaubt, solange kein On-chain-Request existiert),
- keine Anzeige, welche Wallet verbunden ist,
- keinen Hinweis, dass der Wallet-Wechsel in der StarKey-Extension passiert,
- einen Remedy, der auf einen "Operator-Reset" verweist, für den es keine API gibt
  (musste manuell via PM2-Stop + State-File-Edit erledigt werden).

Das ist eine echte Beobachtung (P1: Kernaufgabe scheitert ohne Hilfe) und deckt sich mit
den 6 Lifecycle-Befunden aus MCP-PROBE-001 (B1–B6). Ziel des Umbaus: Der Buyer-Ablauf
auf heros.cloud/market ist ohne Erklärung verständlich — jeder Zustand hat genau einen
klaren nächsten Schritt oder einen begehbaren Ausweg.

## Entscheidungen (Rene, 2026-07-23)

- **Scope:** Buyer zuerst. Provider/Observer nur, wo sie den Buyer verwirren.
- **Tiefe:** Ursachen-Fixes, kein Struktur-Neuschnitt. Bestehende Architektur
  (NextStepPanel server-getrieben, next-steps-Engine) bleibt.
- **kahless-001:** läuft parallel mit heutiger UI weiter (Deadline 26.07.); der
  Selection-Reset wurde bereits operativ durchgeführt (23.07., Audit-Eintrag
  `manual.job.reset`, Backup `market-state.json.pre-reset-20260723-094730`).

## Projektregeln, die gelten

- user-reality-check: Ursache im Produkt beheben, Erklärtext nur wenn Handlung nicht
  klarer gestaltet werden kann; keine behauptete "Intuitivität" ohne Beobachtung;
  Kennzeichnung "Technisch umgesetzt — Nutzbarkeit nicht belegt" bis reale Tests da sind.
- Mutations-Gegenprobe für jedes neue Gate/jeden Guard-Fix.
- Website: `npm run build` schreibt direkt ins live servierte `out/` → vorher
  `cp -a out out.pre-<thema>`; nur EIN out.pre-*-Snapshot behalten; kein `git add -A`.
- Übersetzungsfestes EN in der UI-Copy.
- Backend-Store ist in-memory → State-Edits nur bei gestopptem PM2.

## Befunde (Exploration 2026-07-23, 3 Explore-Agenten)

**B7 (neu, reale Beobachtung 23.07., P1):** Buyer strandet in `selected`+`self_quote`
ohne begehbaren Ausweg. Ursachenkette:

1. **Gate feuert nach dem Fehlschritt:** self_quote-Check nur im `selected`-Zweig
   (`cosmo-market-api/src/nextSteps.ts:332-338`), nicht in der Auswahl-Phase
   `offerReadiness` (`:270-287`) — Bond/Kapazität werden dort bereits vorab angezeigt,
   self_quote nicht. (Gleiche Klasse wie Befund B2.)
2. **Server kennt den Besucher nicht:** `GET /jobs/:id/next-steps` akzeptiert keinerlei
   Viewer-Parameter (`src/routes/next.ts:50`); `job.buyerWallet` ist vor der Auswahl oft
   unbelegt → Vorab-Warnung heute unmöglich.
3. **buyerWallet ist klebrig:** `j.buyerWallet = j.buyerWallet ?? buyerWallet`
   (`src/routes/flow.ts:177`) — Re-Select kann die Buyer-Wallet nie ändern; der
   Remedy-Text „Re-select with a different buyer wallet" verspricht Unmögliches.
4. **„Operator kann resetten" existiert nicht als API:** admin.ts hat nur
   approve/reject/Provider-CRUD/txrefs/Offer-Anlage; Reset = PM2-Stop + State-File-Edit.
   Remedy-Strings in `nextSteps.ts:336,400` verweisen auf nicht existente Aktionen.
5. **Frontend-Sackgasse:** Select-UI nur im Server-State `select`
   (`NextStepPanel.tsx:265-335`); im Escrow-Zustand mit Blocker ist der einzige CTA
   deaktiviert (`:195,:374`), Blocker-Texte werden wörtlich gerendert (`:40-55`).
6. **Wallet unsichtbar:** Keine Anzeige der verbundenen Wallet im Buyer-Flow; Wallet wird
   nur in Action-Handlern gelesen (`useMarketFlow.ts:279-408`); das stille
   `account()` von `marketWallet.ts:16` wird nie aufgerufen → Rollen-Tab-Auto-Highlight
   (`RoleNextStep.tsx:71-75`) greift beim Laden nie; Fehlbedienung wird erst beim
   Signieren als Exception gemeldet statt vorher angezeigt.

**Vorhandene Evidenzlage** (docs/usability/buyer-flow/): 6 Lifecycle-Befunde B1–B6
(21.07., Selbstnutzung Rene, B6 = P0-Klasse durch L3 adressiert), 8 falsifizierbare
Annahmen A1–A8, TP01-Testkit (Funnel A–I) — aber **0 Beobachtungen unvoreingenommener
Nutzer**. Release-Gates: P1 → Outreach pausieren; Kennzeichnung „Technisch umgesetzt —
Nutzbarkeit nicht belegt" bleibt Pflicht.

## Plan

Reihenfolge API-first (wie L1–L3), jeder Meilenstein einzeln deploybar, alles additiv —
kahless-001 läuft währenddessen weiter.

### M1 — Backend: selectPolicy + Engine (Repo `/root/cosmo-market-api`)

**1a. Neues pures Modul `src/selectPolicy.ts`** (Muster `chain/armGuard.ts`):
- `SelectRejected extends Error` (→ HTTP 422 in der Route, neben dem ArmRejected-Zweig).
- `checkSelect({providerWallet, signerWallet})` — wirft bei `addrEq(...)` (Import aus
  `./chain/client.js`) mit Klartext: "This offer comes from the wallet you are signing
  with — you cannot buy from yourself. Open the StarKey extension, switch to the wallet
  you want to pay with, and select again — or pick a different provider."
- `rebindBuyerWallet(current, signer, requestId)` — liefert `signer` solange
  `requestId === undefined`, sonst `current ?? signer` (R3 in einer testbaren Zeile).
- `resetSelection(job)` — wirft wenn `requestId` gesetzt oder Status ≠ `selected`; sonst
  `selectedOfferId`/`buyerWallet` löschen, Status → `approved`, alte Werte für Audit
  zurückgeben.
- Modul-Header dokumentiert, warum R3 sicher ist: vor `requestId` referenziert nichts
  on-chain die Buyer-Wallet; die Select-Signatur beweist die neue Wallet
  (`verifyBuyerSignature`, walletSig.ts:145-158); Exposure == bestehendes
  „first signer binds" (walletSig.ts:143-144); Wert-Gate bleibt Escrow; jede Neubindung
  auditiert. NEU ggü. heute: Dritte können eine bestehende Auswahl vor dem Funding
  überschreiben — im kuratierten Pilot akzeptiert, im Audit-Log sichtbar.

**1b. `src/nextSteps.ts`** — Gate in die Auswahl-Phase spiegeln (R1) + Klartext (R5):
- `DeriveInput` + `viewerWallet?: string` (optional, additiv).
- Readiness-Mapping (`:270-287`) in Helper `buildOfferReadiness(...)` extrahieren; pro
  Offer `self_quote`-Blocker pushen wenn `addrEq(provider.wallet, viewerWallet ?? job.buyerWallet)`.
  Blocker-`code` bleibt `self_quote` (stabiler Maschinen-Contract).
- `selected`-Zweig: Gate `:332-338` behalten, Strings neu — Remedy verweist auf das neue
  „Change selection" auf der Job-Seite + StarKey-Extension-Hinweis (nur echte Aktionen).
- `selected` ohne `requestId`: Buyer-Block bekommt zusätzlich `offerReadiness` für ALLE
  Offers (Feld ist überall optional → additiv; Daten für F3).
- R5-Sweep: `:400` request_closed-Remedy ohne falsches Reset-Versprechen; übrige Blocker
  nur sprachlich glätten, alle `code`-Werte unverändert.

**1c. `src/routes/next.ts`** — `?wallet=0x…` lesen (Regex-Familie wie model.ts:38),
ungültige Werte still ignorieren; `viewerWallet` durchreichen. Snapshot-Wallets: bei
`selected` ohne Request ALLE Offer-Provider-Wallets laden (wie im approved-Zweig).

**1d. `src/routes/flow.ts` POST /jobs/:id/select** — (R2+R3):
- Provider-Lookup (409 wenn fehlt, Muster `:345`).
- `verifyBuyerSignature(proof, undefined)` statt `job.buyerWallet` (`:166`) — Route
  garantiert bereits `requestId === undefined` (`:149-151`); ohne das bleibt R3 unerreichbar.
- `checkSelect(...)` VOR der Mutation; `SelectRejected` → 422 in `sendError`.
- Mutation: `j.buyerWallet = rebindBuyerWallet(j.buyerWallet, buyerWallet, j.requestId)`
  (ersetzt `??` an `:177`); `previousBuyerWallet` ins Audit-Payload.
- Stale Pre-Check im Frontend-`selectOffer` (useMarketFlow.ts:291-294) entfernen — mit
  R3 falsch; Checks bei escrow/accept/approve bleiben.

**1e. `src/routes/admin.ts`** — `POST /admin/jobs/:id/reset-selection`: dünne Route über
`mutate('selection_reset', …)` + `resetSelection` + `enqueueAlert`. Auth = bestehende
nginx-BasicAuth. Ersetzt die State-File-Chirurgie.

**1f. Tests (vitest, bestehende Harness):** neues `test/selectPolicy.test.ts` +
Erweiterung `test/nextSteps.test.ts` (Fixtures `mkJob`/`mkSnapshot`/`derive`, `:27-126`):
- approved + `viewerWallet: SOLVER` → `self_quote` in offerReadiness
- approved ohne viewerWallet + ohne buyerWallet → KEIN self_quote (beweist Viewer-Steuerung)
- approved + `buyerWallet: SOLVER` → self_quote (Intake-Bindung)
- selected ohne requestId → offerReadiness am Buyer-Block

**Mutations-Gegenproben (je Gate; ausführen, rot sehen, zurückdrehen, im Log notieren):**

| Gate | Mutation | Test der rot werden MUSS |
|---|---|---|
| R1 Readiness-Gate | `self_quote`-Push in buildOfferReadiness entfernen | "approved + viewerWallet=SOLVER shows self_quote" |
| R2 Select-Reject | `addrEq`-Throw in checkSelect löschen | "checkSelect rejects signer == provider wallet" |
| R3 Re-Bind | `current ?? signer` wiederherstellen | "re-select re-binds buyer wallet while no request" |
| R4 Reset-Schutz | requestId-Throw in resetSelection entfernen | "reset refuses once request exists" |

**1g. Deploy:** lokaler Commit (kein Remote), `pm2 restart cosmo-market-api` in ruhigem
Moment (persist synchron pro mutate, store.ts:36-52 verifiziert; Env inkl.
MARKET_POLLER_SKIP_JOBS bleibt). Smoke via heros.cloud: next-steps mit/ohne `?wallet=`.

### M2 — Scratch-Backend-Beweis (B7-Fixture, :4101)

Dress-Rehearsal-Muster: isolierter STATE_DIR, MARKET_CONFIG_FILE/TG_ENV_FILE=/dev/null.
Beweisen per curl-Transkript: (1) Select mit Provider-Wallet → 422 Klartext (B7 kann
nicht mehr entstehen); (2) künstlich gestrandeter Alt-Zustand (Scratch-Server gestoppt,
State-Edit erlaubt — Scratch!) → next-steps zeigt self_quote + offerReadiness, Re-Select
mit anderer Wallet gelingt + re-bindet, `reset-selection` setzt auf approved zurück.
Transkript für iteration-log aufheben.

### M3 — Frontend: passive Wallet + Chip (F1, F4) (Repo Website, `src/app/market/`)

- `lib/marketWallet.ts`: `getAccountSilent()` über das nie genutzte `provider.account()`
  (`:16`), try/catch → null. Popup-Risiko eingedämmt: nur aufrufen wenn
  `localStorage['cosmo_market_wallet_seen']==='1'` (Flag wird bei erfolgreichem connect
  gesetzt) — Erstbesucher bekommen nie ein überraschendes Popup. Optionaler 5-min-Spike
  in Renes Browser kann das Flag später entfernen.
- `lib/useMarketFlow.ts`: Effect on mount + window-focus → `getAccountSilent()` →
  `setWallet` (nie non-null mit null überschreiben). Damit feuert das bestehende
  Rollen-Tab-Auto-Highlight (RoleNextStep.tsx:71-75) beim Laden (F4).
- Neu `components/WalletChip.tsx` im RoleNextStep-Header: verbundene Wallet gekürzt +
  Badge (`provider wallet: <name>` / `buyer wallet`); ohne Wallet „Connect wallet"-Ghost-
  Button (`f.connect()`); immer die eine Klartext-Zeile: "To use a different account,
  switch it inside the StarKey browser extension, then reload." (Erklärtext gerechtfertigt:
  die Handlung liegt in einer Fremd-Extension.)
- RoleNextStep: Auto-Highlight zusätzlich gegen Offer-Provider-Wallets matchen.

### M4 — Frontend: Vorab-Warnung (F2) + Ausweg (F3)

- `lib/marketApi.ts`: `fetchNextSteps(jobId, viewerWallet?)` → `?wallet=`;
  RoleNextStep übergibt `f.wallet` (+ Dep im useCallback → Re-Fetch nach Connect).
- `NextStepPanel.tsx`: Offer-Radio-Liste (`:271-320`) als `OfferPicker` extrahieren,
  genutzt von Select-Stage UND neuem Panel. Pro Zeile: wenn `f.wallet` ==
  Provider-Wallet → Amber-Zeile "This is the wallet you are connected with — you cannot
  buy from yourself." + Select-CTA disabled (Server-R2 bleibt Guard of record).
- Escrow-Stage (`:337-390`): wenn `escrowBlocked && requestId == null` → unter den
  BlockerCards Abschnitt **„Change selection"**: "You can pick a different offer —
  nothing is locked yet." + OfferPicker (gespeist aus selected-Stage-offerReadiness) +
  Button über bestehendes `f.selectOffer`. Beseitigt die Sackgasse für die ganze
  Blocker-Klasse (self_quote, provider_bond, provider_capacity), nicht nur B7.

### M5 (optional, nur wenn Zeit) — AdminConsole-Button für reset-selection.

### M6 — Build + Deploy Website

`rm -rf out.pre-lifecycle-l3 && cp -a out out.pre-b7-selfquote` (genau EIN Snapshot),
dann `npm run build` (build IST deploy). Nur berührte Dateien stagen, kein `git add -A`.

### Abschluss: Plan-Datei nach Renes Workflow ins Website-Repo
Nach Freigabe: Plan als `plans/market-b7-selfquote-fixes-plan.md` committen;
Implementierung in frischer Session.

## Verifikation

1. **Backend:** `npm test` grün (~119 Bestand + ~10 neu) + `npm run typecheck`;
   die 4 Mutations-Gegenproben ausgeführt und dokumentiert.
2. **Scratch-Beweis (M2):** curl-Transkript belegt: B7 nicht mehr erzeugbar / Ausweg im
   Doc / Reset per API.
3. **Live-Walkthrough (agent-browser, ohne StarKey):** Job-Seite approved-Job rendert;
   Chip zeigt Connect-Affordance + Extension-Hinweis; Select-Stage rendert;
   Observer/Provider-Tabs intakt; AdminConsole lädt.
4. **Manuelle 5-Punkte-Checkliste für Rene (mit StarKey):** passiver Chip nach früherem
   Signieren; Eigen-Offer-Warnung; Change-Selection-Re-Sign; Re-Bind sichtbar;
   danach kahless-001 normal bedienbar.
5. **Docs (user-reality-check):** findings.md += B7 (reale Beobachtung, P1, Ursachen 1–6,
   Fix-Zuordnung, Erklärtext-Ausnahme nur StarKey-Switch-Hinweis); iteration-log.md +=
   Iteration mit Gegenproben-Ergebnissen; plan.md += neue Annahmen (Chip-Sichtbarkeit,
   Auffindbarkeit „Change selection") für die nächste reale Beobachtung.
6. **Kennzeichnung:** „Technisch umgesetzt — Nutzbarkeit noch nicht durch reale
   Beobachtung belegt." bleibt überall stehen.

## API-Kompatibilität (Maschinen-Konsumenten)

Nur additiv: optionales `?wallet=`; `self_quote` neu auch in `offerReadiness[].blockers`
(Code stabil); `offerReadiness` neu auch im Status `selected` ohne Request; neue
Admin-Route. Eine bewusste Verhaltensänderung: `POST /select` → 422 bei Self-Quote
(vorher „Erfolg" in garantierte Strandung). Nichts entfernt/umbenannt.

## Nicht-Ziele

Provider-Dashboard, Reputation, Dispute-UI, serverseitiges Auto-Arm, Reset-Routen für
On-chain-Zustände (bleiben Operator-manuell mit ehrlicher Copy), Admin-jobType-Picker
(außer trivial nebenbei), Frontend-Test-Harness.
