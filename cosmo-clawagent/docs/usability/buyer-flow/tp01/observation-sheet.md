# TP01 — Beobachtungsbogen (S1, kalter Einstieg)

Session-Kopf (vor Start ausfüllen):

- TP-Code: TP01 · Datum: · Start: · Ende:
- Erfahrung: Wallet ja/nein · Krypto-Käufe ja/nein · Marktplatz-Erfahrung · Supra-Kontakt
- Gerät / Browser / Bildschirmgröße:
- Build: Website-Commit `____` · Backend-Commit `____`
- Bildschirmübertragung: ja/nein · Aufzeichnung: ja/nein

Notation: Zeiten als mm:ss ab Aufgabenstart. "Zeit bis zur ersten Aktion" = vom
ersten Sichtkontakt mit der Stufe bis zum ersten zielgerichteten Klick/Tastendruck.
Nur beobachtbares Verhalten notieren — Interpretation gehört in den Report.

Die erwarteten Handlungen unten nennen die realen UI-Labels des getesteten Builds.
Stufen A und B haben keine feste Position: Sie treten dort auf, wo die UI sie
erzwingt (A typisch bei Stufe E, B typisch bei Stufe F). Bei Auftreten die
tatsächliche Position notieren.

---

## Stufe C — Job-Erstellung (/market/post)

- Erwartete Handlung: Von der Startseite zum Posting-Formular finden; Felder
  Title / Description / Acceptance criteria / Budget (wCOSMO) / Deadline /
  Contact email ausfüllen; absenden. (Kein Wallet nötig.)
- Zeit bis zur ersten Aktion: ____
- Tatsächlich beobachtete Handlung:
- Fehlklicks / Rückwege (mit Ziel des Fehlklicks):
- Sichtbare Unsicherheit (Pausen > 10 s, Scroll-Suchen, Zögern vor Feldern — v. a. "Budget (wCOSMO)" und "Acceptance criteria"):
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe D — Moderationswartezeit ("Your job is in review")

- Erwartete Handlung: Statustext lesen; verstehen, dass nichts zu tun ist;
  Seite ggf. verlassen und Job später wiederfinden (my-jobs, gleicher Browser).
- Zeit bis zur ersten Aktion (nach Erscheinen des Status): ____
- Tatsächlich beobachtete Handlung (reloaden? Tab zu? my-jobs gefunden?):
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit:
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe E — Offer-Auswahl (Schritt ①, "Select offer & sign with StarKey")

- Erwartete Handlung: Nach "Open for offers" zurückkehren; ein Offer per Radio
  wählen; Button "Select offer & sign with StarKey" klicken; StarKey-Signatur
  durchführen.
- Zeit bis zur ersten Aktion: ____
- Tatsächlich beobachtete Handlung:
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit (v. a. beim ersten StarKey-Popup):
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

### Stufe A — StarKey-/Wallet-Onboarding (falls hier oder früher ausgelöst)

- Auslösepunkt (Stufe/mm:ss): ____
- Erwartete Handlung: Erkennen, dass eine StarKey-Wallet nötig ist; Extension
  finden, installieren, Wallet anlegen (Seed-Backup: Übertragung pausieren!),
  zur Seite zurückkehren und verbinden.
- Zeit bis zur ersten Aktion: ____
- Tatsächlich beobachtete Handlung (Suchbegriffe wörtlich notieren):
- Fehlklicks / Rückwege (z. B. Suche nach MetaMask/anderer Wallet):
- Sichtbare Unsicherheit:
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe F — Funding (Schritt ②, "Fund the job with StarKey")

- Erwartete Handlung: Escrow-Text lesen (Betrag, "held by the on-chain
  contract", Rückzahlungszusage); Button "Fund the job with StarKey" klicken;
  Signatur durchführen. Betrag der Signatur MUSS <= 5 wCOSMO sein (sonst Stopp).
- Zeit bis zur ersten Aktion: ____
- Tatsächlich beobachtete Handlung:
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit (Zögern vor der Signatur? Wie lange? Wird der Betrag laut geprüft?):
- Aussagen (wörtlich — v. a. alles zu "ist das Geld dann weg?"):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

### Stufe B — wCOSMO-Beschaffung (falls hier oder früher ausgelöst)

- Auslösepunkt (Stufe/mm:ss): ____
- Erwartete Handlung: Erkennen, dass wCOSMO fehlt; dem Link "conversion guide"
  (/wcosmo) folgen; Beschaffung selbstständig durchführen; zurückkehren.
- Zeit bis zur ersten Aktion: ____
- Tatsächlich beobachtete Handlung (Weg wörtlich: Guide? Exchange? Suche?):
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit:
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe G — Confirm & Start (Schritt ③, inkl. Auto-Arm-Wartezustand)

- Erwartete Handlung: Zwischenzustand "Preparing the final step…" abwarten
  (keine Aktion nötig); danach Offer-Countdown ("Offer valid …") wahrnehmen;
  Button "Confirm & start with StarKey" klicken; Signatur durchführen.
  Falls "Refresh the offer" / Retry erscheint: selbstständig klicken.
- Zeit bis zur ersten Aktion: ____
- Verhalten während "Preparing…" (warten? reloaden? zurück?):
- Tatsächlich beobachtete Handlung:
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit (v. a. "warum nochmal signieren?"):
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe H — Lieferung und Abnahme ("the provider is working" → Approve)

- Erwartete Handlung: Verstehen, dass jetzt der Provider dran ist ("Nothing to
  do right now; the approval button appears here once the result is delivered");
  nach Lieferung das Ergebnis prüfen und die Abnahme signieren.
  (Ggf. zweites Sitzungsfenster — Zeiten getrennt notieren.)
- Zeit bis zur ersten Aktion (nach Erscheinen des Approve-Buttons): ____
- Tatsächlich beobachtete Handlung (wird das Ergebnis geprüft? Wogegen — Acceptance criteria?):
- Fehlklicks / Rückwege:
- Sichtbare Unsicherheit:
- Aussagen (wörtlich):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

## Stufe I — Erkennen des Settlements

- Erwartete Handlung: Ohne Nachfrage benennen: fertig; Ergebnis erhalten;
  Preis gezahlt; ungenutzter Rest zurück. (Moderator fragt NICHT "bist du
  fertig?" — warten, ob die Person es selbst erklärt.)
- Zeit bis zur Selbst-Erklärung "ich bin fertig": ____
- Tatsächlich beobachtete Handlung (Wallet-Check? view-tx-Links genutzt?):
- Sichtbare Unsicherheit:
- Aussagen (wörtlich — kann die Person den gezahlten Betrag nennen?):
- Intervention nötig: nein / ja → Grund:
- Ergebnis: GESCHAFFT / MIT HILFE / ABGEBROCHEN bei: ____

---

## Sessionsumme

- Letzte erreichte Stufe: ____
- Gesamtzeit aktiv (ohne Wartefenster): ____
- Interventionen gesamt: ____ (jede einzelne oben begründet)
- Gesamtergebnis: ERFOLG SELBSTSTÄNDIG / HILFE ERFORDERLICH / ABBRUCH bei Stufe ____
- Nachfragen 1-5 gestellt und wörtlich erfasst: ja/nein
