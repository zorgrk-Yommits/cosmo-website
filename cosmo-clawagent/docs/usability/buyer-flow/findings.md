# Befunde: Buyer-Flow

Stand 2026-07-23: Ein Befund mit realer Evidenz (B7). Weiterhin **0 Beobachtungen
unvoreingenommener Nutzer** — B7 stammt vom Projektinhaber, ist aber eine echte
Strandung im Live-Betrieb (keine Simulation) und zählt daher als Evidenz für die
Blockade, nicht als Usability-Beleg der Gesamtstrecke.

## B7 — Selected+self_quote ist eine Sackgasse ohne begehbaren Ausweg [P1] [GESCHLOSSEN 2026-07-23]

- Häufigkeit: 1 von 1 realen Strandungen (Rene, 2026-07-23, Job `job_mrufb7mkkl7xhe`)
- Schwere: Abbruch — Kernaufgabe scheiterte, Operator-Eingriff (PM2-Stop + State-Edit) nötig
- Reichweite: zentraler Ablauf (Buyer-Schritt 1→2)
- Behebbarkeit: strukturell (6 Ursachen über Backend + Frontend)
- Evidenz: UI-Zustand "Step 2 of 3" + deaktivierter Fund-CTA + Remedy-Text, der auf
  nicht existente Aktionen verwies; Audit `manual.job.reset` 2026-07-23; Backup
  `market-state.json.pre-reset-20260723-094730`
- Falsche Produktannahmen: (a) "der Nutzer weiß, mit welcher Wallet er verbunden ist"
  — die UI zeigte sie nirgends und las sie erst beim Signieren; (b) "Blocker-Remedy-
  Texte dürfen auf Operator-Handlungen verweisen" — die versprochene Aktion existierte
  nicht als API; (c) "das self_quote-Gate im Funding-Schritt reicht" — es feuerte erst
  NACH dem Fehlschritt (gleiche Klasse wie B2)
- Kleinste ursachenbeseitigende Änderung (umgesetzt, Backend `a443eaa` + Website-Commit
  dieser Iteration): self_quote-Warnung pro Angebot VOR der Auswahl (`?wallet=`-Param +
  Client-Vergleich), Select-Hard-Reject 422, Wallet-Chip immer sichtbar (passives
  `account()`-Read), "Change selection"-Ausweg im blockierten Funding-Zustand,
  buyerWallet-Re-Bind bei Re-Select solange nichts on-chain ist, Admin-Route
  `POST /admin/jobs/:id/reset-selection`. Einziger verbleibender Erklärtext: der
  StarKey-Extension-Wechselhinweis (Handlung liegt in der Fremd-Extension, nicht
  verlagerbar). Alle 4 neuen Gates mutations-gegengeprobt (siehe iteration-log
  Eintrag 1).

Diese Datei enthält ausschließlich Befunde mit realer Evidenz (Beobachtung, Zitat,
Zeitmarke, Screenshot, Log). Vermutungen stehen als widerlegbare Annahmen in
`plan.md` und wandern erst nach Beobachtung hierher.

## Prioritätsskala

- **P0** — Sicherheits-, Datenschutz- oder Vermögensrisiko; Release stoppen
- **P1** — Kernaufgabe scheitert oder erfordert Hilfe; vor Pilot-Ausweitung beheben
- **P2** — Deutlicher Umweg, Fehlinterpretation, wiederholte Unsicherheit
- **P3** — Kosmetisch oder selten

## Befund-Template

```markdown
## F<NN> — <Kurztitel> [P0|P1|P2|P3] [OFFEN|IN ARBEIT|GESCHLOSSEN|AKZEPTIERT]

- Häufigkeit: <n von m Sessions> (Sessions: …)
- Schwere: Irritation | Umweg | Fehler | Abbruch | Risiko
- Reichweite: <Randfunktion | zentraler Ablauf>
- Behebbarkeit: <kleine Änderung | strukturell>
- Evidenz: <Session-Refs, Zitate, Zeitmarken>
- Falsche Produktannahme: <Annahme A_n aus plan.md, falls zutreffend>
- Kleinste ursachenbeseitigende Änderung: 
```
