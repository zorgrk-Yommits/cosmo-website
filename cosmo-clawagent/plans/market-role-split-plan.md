# Market-Rollensplit: Auftraggeber- und Auftragnehmer-Seite trennen

## Context

Produkt-Feedback Rene (2026-07-23, nach den B7-Fixes): Auftraggeber und Auftragnehmer
in EINER Lebenszykluskette sind nicht anschaulich — „Kann man das nicht aus zwei Seiten
bringen?" Die Exploration bestätigt: Die Vermischung sitzt nicht nur in den Rollen-Tabs,
sondern an vier Stellen außerhalb davon:

1. **FlowRail** (`marketStatus.ts` UNIFIED_STEPS): eine Kette mit Buyer-„you"-Schritten
   ①②③ UND dem Provider-Schritt „Delivery"; der Buyer-Schritt „Approve" fehlt als Node.
2. **OfferForm** (Provider-Aktion) rendert in der gemeinsamen Angebots-Sektion der
   Job-Seite (`JobDetail.tsx:309-318`) — außerhalb der Tabs.
3. **Tx-Link-Liste** (`TX_LABELS`) mischt Buyer-, Provider- und Server-Transaktionen.
4. Rollen-Tabs zeigen default „Buyer"; es existiert nirgends ein Provider-Einstieg
   (alle Links auf die Job-Seite sind Buyer-orientiert).

## Entscheidungen (Rene, 2026-07-23)

- **Zwei echte Seiten:** `/market/job?id=` bleibt Auftraggeber-Seite (Links bleiben
  gültig), NEU `/market/work?id=` als Auftragnehmer-Seite. Querlinks in beide
  Richtungen.
- **Nur eigene Schritte pro Kette:** Aktivitäten der Gegenseite kollabieren in EINEN
  Wartezustand.
- **Observer-Tab entfällt:** beide Seiten bekommen eine schlanke neutrale Statuszeile
  (Zustand + wessen Zug); der maschinenlesbare `/next-steps`-Link wandert in den Footer
  der Auftragnehmer-Seite.

## Rahmenbedingungen

- Frontend-only; Backend `cosmo-market-api` bleibt unberührt (das next-steps-Dokument
  liefert bereits getrennte Rollen-Blöcke).
- Statischer Export: neue Route = `page.tsx` (+ Suspense) + Client-View, Muster
  `market/job/page.tsx`; Query-Param via `useSearchParams`.
- build IST deploy → Snapshot-Rotation (aktuell `out.pre-b7-selfquote`, nur EINER);
  kein `git add -A`; übersetzungsfestes EN.
- user-reality-check: Kennzeichnung „Technisch umgesetzt — Nutzbarkeit nicht belegt";
  Docs-Updates (iteration-log Eintrag 2, plan.md neue Annahmen zum Split).
- kahless-001 läuft live (Job `job_mrufb7mkkl7xhe`, Status approved): Nach dem Split
  gibt der Auftragnehmer sein Angebot auf `/market/work` ab — die Kahless-Ansprache
  (Rene) muss auf die neue URL zeigen.

## Wiederverwendbare Bausteine (verifiziert)

- `NextStepPanel` (Buyer-Panel inkl. B7-Fixes) und `DeliverPanel` (Provider, bewusst
  self-contained ohne useMarketFlow) sind bereits sauber getrennt.
- `RoleNextStep` besitzt die teilbare Maschinerie: fetchNextSteps-Poll (10s),
  useMarketFlow-Instanz, WalletChip+Turn-Chip-Header, Wallet→Rollen-Matching.
- `buildUnifiedSteps`-Ableitungslogik (activeIdx aus status/selectedOfferId/requestId/
  jobIdOnchain/offersCount) als Basis für die zwei neuen Rollen-Ketten.

## Design-Entscheidungen

- **D1 Buyer-Nummerierung ①–④:** „Approve delivery" wird eigener Buyer-Node ④;
  `STAGE_STEP` bekommt `approve: 4`, Pill wird „Step {n} of 4", Escrow-Copy verliert
  „and final". Provider-Nodes bekommen „you"-Pill OHNE Nummern (der artifact-only
  „Register result"-Node würde sonst je Job-Typ umnummerieren).
- **D2 Geteilter Hook:** `useNextStepsDoc(jobId, wallet)` (Fetch + 10s-Poll,
  fail-closed null) + `usePassiveWallet()` in neuem `lib/useNextStepsDoc.ts`;
  useMarketFlow behält seine eigene Kopie (Refactor out of scope).
- **D3 Teilen durch Extraktion:** `components/JobInfoSections.tsx` (Fact, JobFactsCard,
  FrozenSpecCard, TxRecord) aus JobDetail; `components/TurnStatusLine.tsx` (Turn-Chip +
  WalletChip); FlowRail wird pure Renderer (`steps`, `txRefs`).
- **D4 Provider-Seite OHNE useMarketFlow** (kein Auto-Arm/Buyer-Poll dort); Wallet via
  usePassiveWallet + explizites connectWallet für den Chip.

## Die zwei Ketten (marketStatus.ts, ersetzt UNIFIED_STEPS/buildUnifiedSteps)

```
BUYER_STEPS
0 review   'Posted & review'      off-chain
1 offers   'Offers arrive'       off-chain  waiting
2 select   'Select offer'        off-chain  you ①
3 escrow   'Fund the job'        on-chain   you ②   tx: create
4 accept   'Confirm & start'     on-chain   you ③   tx: accept
5 working  'Provider is working' on-chain   waiting  tx: deliver
6 approve  'Approve delivery'    on-chain   you ④
7 settled  'Settled'             on-chain            tx: settle

PROVIDER_STEPS (Node 3 nur bei jobType === 'artifact')
0 open     'Job open for offers'   off-chain  waiting
1 offer    'Submit your offer'     off-chain  you
2 buyer    'Buyer selects & funds' on-chain   waiting  tx: accept
3 register 'Register result'       off-chain  you      [nur artifact]
4 deliver  'Deliver result'        on-chain   you      tx: deliver
5 settled  'Paid & settled'        on-chain            tx: settle
```

activeIdx-Ableitung: buildUnifiedSteps-Logik 1:1 wiederverwendet/remapped
(buildBuyerSteps: settled→8, delivered→6, jobIdOnchain→5, requestId→4,
selectedOfferId→3, approved+offers→2, approved→1, sonst 0; buildProviderSteps:
settled→Ende, delivered→settled-Node als „payout pending", onchain+artifact ohne
expectedResultHash→register, onchain→deliver, selected/requestId→buyer,
approved→offer, sonst open).

Außerdem: `STATUS_BADGE.selected.label` → 'Offer selected — buyer funds next'
(rollenbenannt statt „you"); TURN_LABEL nach marketStatus.ts (exportiert).

## Copy

- TurnStatusLine (seitenbezogen aus doc.turn): eigene Rolle → „Your turn"; Gegenseite →
  „Waiting for the provider"/„Waiting for the buyer"; server → „Automatic step running —
  no action needed"; nobody → „No action pending"; doc null → Chip versteckt.
- Buyer-Seite Provider-Banner (Wallet matcht solver-/Offer-Provider-Wallet; Matching-
  Logik aus RoleNextStep:69-86; schlanke Amber-Card, NIE Redirect): „You are connected
  with a provider wallet for this job. This page is the buyer's view — offers and
  delivery happen on the provider view." + „Open the provider view →".
- Statische Querlinks im Footer beider Seiten (Buyer→work, Provider→job).
- Provider-Footer (ersetzt Observer-Link): „Agents: this job is machine-readable at
  /api/market/jobs/<id>/next-steps — the same document that drives this page."

## Meilensteine

**M1 — Lib-Grundlagen:** Plan als `plans/market-role-split-plan.md` committen.
`lib/marketStatus.ts` (RoleStep, beide Ketten, Builder, TURN_LABEL, Badge-Fix,
UnifiedStep/buildUnifiedSteps löschen). NEU `lib/useNextStepsDoc.ts`.

**M2 — Geteilte Komponenten:** NEU `components/JobInfoSections.tsx`,
`components/TurnStatusLine.tsx`; `components/FlowRail.tsx` → pure Renderer
(isBuyer→isOwn, Grammatik unverändert).

**M3 — Buyer-Seite:** `job/JobDetail.tsx`: useMarketFlow + useNextStepsDoc direkt
(RoleNextStep löst sich auf), Reihenfolge TurnStatusLine → NextStepPanel →
Buyer-Rail + TxRecord → JobFactsCard → FrozenSpecCard → Offers-Card OHNE OfferForm
(Empty-Copy: „Providers submit offers on the provider view.") → Provider-Banner +
Querlink → HonestyBox; Moderation-Fallback auf buildBuyerSteps.
`NextStepPanel.tsx`: rounded-xl, STAGE_STEP+approve:4, „Step {n} of 4", Escrow-Copy.
DELETE `components/RoleNextStep.tsx`.

**M4 — Provider-Seite:** NEU `work/page.tsx` (Metadata + Suspense, Spiegel von
job/page.tsx) + `work/WorkDetail.tsx`: Header (Titel, Badge, Refresh, „Provider view"-
Subzeile, Backlink) → TurnStatusLine('provider') → Next-Step-Bereich: approved →
OfferForm (Komponente unverändert, nur Konsument zieht um); onchain+!settled →
DeliverPanel (rounded-xl); sonst Warte-Card aus dem Provider-RoleBlock (headline +
BlockerCards, Muster RoleNextStep:154-167) → Provider-Rail + TxRecord → JobFactsCard →
FrozenSpecCard → Machine-Link-Footer → Querlink → HonestyBox. Kein Moderation-Fallback.

**M5 — Build + Verifikation:** Snapshot-Rotation `rm -rf out.pre-b7-selfquote &&
cp -a out out.pre-role-split`, dann `npm run build`. agent-browser gegen den
Live-kahless-Job (`job_mrufb7mkkl7xhe`, approved): Buyer-Seite ohne Tabs/OfferForm,
Buyer-Rail aktiv bei „Select offer"; Work-Seite mit OfferForm, Provider-Rail aktiv bei
„Submit your offer", /next-steps-Footer auflösbar. Zusätzlich beide Seiten des
GESETTELTEN pilot001-Jobs (`job_mrnqscfbzcinte`) für die Rail-Endzustände + „Step 4 of
4"-Optik. `curl /next-steps` vor/nach Deploy → byte-identisch (Backend unberührt).

**M6 — Docs + Pilot-Kommunikation:** iteration-log Eintrag 2; plan.md neue Annahmen
(Provider finden /market/work; Buyer nicht verwirrt durch fehlende Provider-Elemente;
Ein-Wartezustand-Kollaps wird verstanden). WICHTIG: Kahless-Ansprache muss auf
`https://heros.cloud/market/work/?id=job_mrufb7mkkl7xhe` zeigen (alter Buyer-Link trägt
kein OfferForm mehr; Banner + Querlink sind das Sicherheitsnetz). Commit mit expliziten
Pfaden.

## Verifikation (Zusammenfassung)

1. `npm run build` fehlerfrei + `npx tsc --noEmit` (FlowRail-Signaturänderung fängt
   vergessene Konsumenten zur Buildzeit).
2. agent-browser-Walkthrough beider Seiten für kahless (approved) UND pilot001
   (settled); /next-steps vor/nach byte-identisch.
3. StarKey-Checkliste Rene: (1) Provider-Wallet auf Buyer-Seite → Banner, kein
   Redirect; (2) Offer-Abgabe auf /market/work erscheint in der Buyer-Offers-Card;
   (3) Buyer select→fund unverändert inkl. Self-Quote-Warnung; (4) „Step 4 of 4" im
   Approve-Zustand (erst nach Lieferung prüfbar — deferred); (5) Deliver-Flow auf der
   Work-Seite (deferred).
4. Kennzeichnung „Technisch umgesetzt — Nutzbarkeit noch nicht durch reale Beobachtung
   belegt."

## Risiken

- Kahless mitten im Pilot: API unverändert (0 Risiko für Maschinen-Konsumenten);
  menschlicher Offer-Einstieg zieht um → Banner + Querlink + Outreach-Link-Update.
- Snapshot-Rotation entfernt den Pre-B7-Rollback — akzeptabel, B7 ist committet
  (`ee22e3e`), Rollback = git checkout + rebuild.
- Doppelte 10s-Polls auf der Work-Seite (Doc + DeliverPanel) — wie heute mit Tabs.

## Nicht-Ziele

Backend-Änderungen jeder Art; Provider-Navigation von MarketHome/Board/ProvidersView
(Follow-up; Discovery läuft im Pilot über den Outreach-Link); Anfassen von
`market-pilot001-2026-07-17.json` (historische Evidenz); Auto-Redirect nach
Wallet-Rolle; Observer-Fläche; usePassiveWallet-Refactor in useMarketFlow; i18n.
