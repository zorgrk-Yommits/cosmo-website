# Iterations-Log: Buyer-Flow

## Eintrag 0 — Baseline (2026-07-19, keine Iteration)

- Ausgangsbuild: Website `74d18d1` (Sprachpass Buyer-Flow: "Fund the job" / "Confirm & start"), Backend `deac8a3` (M5 delivery rail)
- Vorangegangene UX-Arbeit (entwicklergetrieben, ohne Nutzerbeobachtung): Buyer-Flow-UX-Overhaul 2026-07-17 (NextStepPanel-Hero mit einem CTA pro Zustand, Auto-Arm mit Budget 3/Session, FlowRail mit Buyer-Nodes ①②③, my-jobs via localStorage, Sprachpass weg von Escrow/Quote/Arm-Jargon)
- Status: Alle bisherigen Änderungen beruhen auf Entwicklerannahmen. **Technisch umgesetzt — Nutzbarkeit noch nicht durch reale Beobachtung belegt.**

## Eintrag 1 — 2026-07-23 (B7 Ursachen-Fixes)

- Auslösende Befunde: B7 (reale Strandung selected+self_quote, P1); Plan
  `plans/market-b7-selfquote-fixes-plan.md` (`6f48538`)
- Änderung (kleinste ursachenbeseitigende): Backend `cosmo-market-api` Commit `a443eaa`
  (selectPolicy.ts: checkSelect 422 / rebindBuyerWallet / resetSelection; self_quote in
  buildOfferReadiness via neuem optionalem `?wallet=`; offerReadiness auch im Status
  selected ohne Request; Admin-Route reset-selection; Klartext-Remedies nur mit echten
  Aktionen). Website (dieser Commit): WalletChip + passives getAccountSilent mit
  Erstbesucher-Popup-Schutz (localStorage-Flag), OfferPicker mit Eigen-Wallet-Warnung +
  disabled CTA, "Change selection"-Panel im blockierten Funding-Zustand,
  Rollen-Tab-Highlight beim Laden, personalisiertes next-steps-Fetch.
- Angrenzend geprüft: Re-Select-Route erlaubte Status selected bereits (kein neuer
  Zustand); requestId-Lock unverändert (Reset + Re-Bind verweigern nach Funding);
  Maschinen-Konsumenten: alles additiv, eine bewusste Änderung (Select → 422 statt
  Erfolg-in-Strandung); kahless-001 lief während des Deploys weiter (Poller-Skip aktiv).
- Automatisierte Tests: Backend 151/151 (137 Bestand + 14 neu); 4 Mutations-Gegenproben
  ausgeführt und rot belegt (R1 Readiness-Gate, R2 Select-Reject, R3 Re-Bind,
  R4 Reset-Schutz), danach zurückgedreht und Suite wieder grün. Scratch-Backend-Beweis
  :4101: 5/5 PASS (422-Reject mit Klartext, Fremd-Wallet-Select, Re-Bind mit Historie,
  Reset auf approved, Reset-Verweigerung) — Transkript im Session-Scratchpad.
  Live-Smoke: next-steps ohne `?wallet=` byte-kompatibel; mit K1-Wallet self_quote im
  offerReadiness des echten Jobs VOR Auswahl. Live-Walkthrough (agent-browser, ohne
  StarKey): Chip + Extension-Hinweis + Select-Stage + Observer/Admin intakt.
- Retest: **ausstehend** — StarKey-abhängige Pfade (passiver Chip, Eigen-Offer-Warnung,
  Change-selection-Re-Sign) brauchen die manuelle 5-Punkte-Checkliste (Rene) und danach
  TP01-Beobachtungen mit unvoreingenommenen Personen. Bis dahin gilt:
  **Technisch umgesetzt — Nutzbarkeit noch nicht durch reale Beobachtung belegt.**

## Eintrag-Template

```markdown
## Eintrag <N> — <Datum>

- Auslösende Befunde: F…
- Änderung (kleinste ursachenbeseitigende): <Commit(s)>
- Angrenzend geprüft: <Zustände, Fehlermeldungen, Rückwege>
- Automatisierte Tests: <was technisch prüfbar gemacht wurde>
- Retest: Sessions <NN…> mit Personen ohne Kenntnis der Vorversion — Ergebnis:
```
