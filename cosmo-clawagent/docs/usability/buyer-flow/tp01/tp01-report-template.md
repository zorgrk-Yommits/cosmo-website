# TP01 — Ergebnisbericht (Template)

Erst nach der Session ausfüllen. Quellen: observation-sheet.md (Verhalten),
Nachfragen-Zitate. Regel: Erst Beobachtung, dann — getrennt — Interpretation.

## 1. Rahmen

- Datum / Fenster 1 / Fenster 2 (falls Lieferung später):
- Startzustand: S1 (kalt) — Abweichungen:
- Build: Website `____` · Backend `____`
- Gesamtergebnis: ERFOLG SELBSTSTÄNDIG / HILFE ERFORDERLICH / ABBRUCH bei Stufe ____
- Trichter (aus funnel-stages.md): letzte erreichte Stufe ____, erste nicht bestandene Stufe ____

## 2. Beobachtung (nur Verhalten, keine Deutung)

Chronologisch, mit Zeitmarken. Nur was gesehen/gehört wurde:

- mm:ss —
- mm:ss —

Wörtliche Zitate (inkl. Antworten auf die fünf Nachfragen):

- "…"

## 3. Interpretation (getrennt, als Vermutung gekennzeichnet)

- Vermutung:  — gestützt auf Beobachtung(en):

## 4. Annahmen-Abgleich (gegen plan.md A1-A8)

| Annahme | Status | Evidenz (Zeitmarke/Zitat) |
|---|---|---|
| A1 StarKey-Hürde | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A2 wCOSMO-Beschaffung | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A3 Wartezustände | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A4 Escrow-Verständnis | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A5 Fund vs. Confirm | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A6 Auto-Arm-Wait | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A7 my-jobs-Wiederfinden | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |
| A8 Fertig-Erkennung | BESTÄTIGT / WIDERLEGT / UNBEOBACHTET | |

Regeln: "BESTÄTIGT" nur bei beobachtetem erwartetem Verhalten, "WIDERLEGT" nur
bei beobachtetem widerlegendem Signal. Nicht erreichte Stufen → UNBEOBACHTET.
Eine einzelne Session bestätigt eine Annahme nie endgültig — sie kann sie nur
widerlegen oder vorläufig stützen.

## 5. Befundkandidaten mit Priorität

| # | Befund (eine Zeile) | Stufe | Prio | Schwere | Evidenz |
|---|---|---|---|---|---|
| 1 | | | P0/P1/P2/P3 | Irritation/Umweg/Fehler/Abbruch/Risiko | |

(P0 = Sicherheits-/Vermögensrisiko → Buyer-Flow sperren; P1 = Kernaufgabe
scheitert/braucht Hilfe → vor Pilot-Ausweitung beheben. Übertrag nach
`../findings.md` nach Abgleich mit späteren Sessions; bei P0/P1 sofort.)

## 6. Erster irreversibler Abbruchpunkt

Die früheste Stelle, an der die Person real verloren gewesen wäre — d. h. ohne
Moderator-Anwesenheit hätte sie den Prozess nicht mehr selbst fortgesetzt
(Seite verlassen, Ziel aufgegeben, falscher Weg ohne Rückkehr):

- Stufe / Zeitmarke:
- Beobachtung, die das belegt:
- Abgrenzung: War die Stelle nur langsam (reversibel) oder terminal (Person
  hätte extern Hilfe gesucht oder aufgegeben)?

## 7. Entscheidung: Darf das Produkt verändert werden?

Regel aus dem Skill: Nach spätestens 5 Beobachtungen werden Muster priorisiert;
EINE Session rechtfertigt Änderungen nur in zwei Fällen:

- [ ] P0 beobachtet → JA, sofort (Release-Gate: Moderation stoppt Approvals bis Fix)
- [ ] Harte technische Blockade (Flow terminal kaputt, kein Usability-Urteil nötig) → JA, Bugfix
- [ ] Sonst → NEIN. Befundkandidaten dokumentieren, TP02/TP03 abwarten, erst bei
      wiederkehrendem Muster kleinste ursachenbeseitigende Änderung entwerfen

Entscheidung: JA (Grund: ____) / NEIN — nächste Beobachtung zuerst

## 8. Empfehlung für TP02 (S2, präpariert)

TP02 startet per Definition mit StarKey installiert + >= 5 wCOSMO in der Wallet
und beginnt bei Stufe C, um den Marktprozess (C-I) isoliert zu beobachten.

- Was TP01 offen ließ (unbeobachtete Stufen): ____
- Worauf der TP02-Beobachter besonders achten soll (aus TP01-Verhalten, OHNE
  dem TP02-Nutzer etwas zu verraten): ____
- Anpassungen am Protokoll/Skript (NICHT am Produkt): ____
- Rekrutierungskriterium bestätigt/angepasst (unvoreingenommen, kein
  Projektbeteiligter, alte Version nicht gesehen): ____

## 9. Ehrlicher Statussatz für Doku/Außenkommunikation

Nach dieser Session gilt weiterhin/neu:

> "Technisch umgesetzt — Nutzbarkeit belegt bis Stufe ____ durch 1 Beobachtung;
> alles danach unbeobachtet."
