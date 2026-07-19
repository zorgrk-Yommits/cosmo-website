# TP01 — Verbindliche Funnel-Stufen für die Auswertung

Jede Auswertung von TP01 (und aller S1-Folgesessions) trennt die Ergebnisse in
genau diese neun Stufen. Eine Aussage "der Buyer-Flow funktioniert / scheitert"
ohne Stufenangabe ist unzulässig. Abbruch in einer frühen Stufe ist ein gültiges
Ergebnis über diese Stufe — KEINE Aussage über spätere Stufen.

Positionshinweis: A und B sind bedarfsgetriggert. Im kalten S1-Einstieg erzwingt
die UI StarKey erst bei Stufe E (erste Signatur) und wCOSMO erst bei Stufe F
(Funding). Beobachtet wird, WO die Testperson die Notwendigkeit erkennt — ein
früheres oder späteres Erkennen ist selbst ein Befundkandidat.

| Stufe | Eintritt (beobachtbar) | Austritt = bestanden (beobachtbar) | Prüft Annahme |
|---|---|---|---|
| A. StarKey-/Wallet-Onboarding | UI verlangt erstmals eine Wallet-Verbindung/Signatur, keine Wallet vorhanden | StarKey installiert, Wallet angelegt, Verbindung zur Seite hergestellt — ohne Hilfe | A1 |
| B. wCOSMO-Beschaffung | UI verlangt Funding, kein/zu wenig wCOSMO vorhanden | Wallet hält genug wCOSMO für das Job-Budget (<= 5) — ohne Hilfe | A2 |
| C. Job-Erstellung | Aufgabenstart auf heros.cloud | Job abgesendet, Bestätigung/Statusseite erreicht | (Einstiegs-Auffindbarkeit) |
| D. Moderationswartezeit | Status "in review" sichtbar | Person deutet den Wartezustand korrekt (wartet oder verlässt die Seite geplant) UND findet den Job später wieder | A3, A7 |
| E. Offer-Auswahl (①) | Mindestens ein Offer sichtbar | "Select offer & sign with StarKey" erfolgreich signiert | A1 (Erst-Signatur) |
| F. Funding (②) | Escrow-Karte sichtbar | "Fund the job with StarKey" erfolgreich signiert, Betrag <= 5 wCOSMO | A4 |
| G. Confirm & Start (③) | "Preparing the final step…" oder Confirm-Karte sichtbar | "Confirm & start with StarKey" erfolgreich signiert; Auto-Arm-Wartezustand ohne Panik-Reload überstanden | A5, A6 |
| H. Lieferung und Abnahme | "the provider is working" sichtbar | Ergebnis geprüft und Abnahme signiert | (M5-UI, bisher ohne Annahme — Kandidat für neue Annahmen) |
| I. Erkennen des Settlements | Status "Settled" sichtbar | Person erklärt SELBST: fertig, Ergebnis erhalten, Betrag X gezahlt, Rest zurück | A8 |

## Metriken je Stufe (aus observation-sheet.md übertragen)

- Zeit bis zur ersten Aktion
- Anzahl Fehlklicks / Rückwege
- Interventionen (jede Intervention → Stufe maximal "MIT HILFE")
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN

## Auswertungsregeln

1. **Trichter-Darstellung:** Für jede Stufe festhalten: erreicht? bestanden?
   Die erste nicht bestandene Stufe ist DER Befund der Session — alles danach
   ist für diese Person unbeobachtet, nicht "vermutlich ok".
2. **Hilfe kontaminiert nachfolgende Stufen nicht automatisch,** wird aber je
   Stufe ausgewiesen: eine Stufe nach vorheriger Hilfe kann höchstens als
   "geschafft nach Hilfe in Stufe X" gewertet werden, nie als unabhängiger Beleg
   für Selbstständigkeit des Gesamtflows.
3. **A/B-Sonderregel:** Scheitert TP01 in A oder B, ist das ein gültiges
   S1-Ergebnis über die Eintrittshürde. Der Marktprozess (C-I) bleibt dann
   unbeobachtet → genau dafür ist TP02 (S2, präpariert: StarKey + >= 5 wCOSMO
   vorhanden) vorgesehen, der bei Stufe C startet und A/B überspringt.
4. **Wartefenster** (D, H) werden zeitlich getrennt erfasst und nicht auf die
   45-Minuten-Grenze angerechnet; das Verhalten IN den ersten Minuten des
   Wartens gehört aber zur Bewertung von D bzw. H.
5. Befunde aus den Stufen wandern mit Evidenz (Zitat, Zeitmarke) nach
   `../findings.md` und referenzieren Stufe + Session.
