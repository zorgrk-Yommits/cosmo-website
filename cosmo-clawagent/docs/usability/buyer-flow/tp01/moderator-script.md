# TP01 — Moderator-Skript (S1, kalter Einstieg)

Rolle: Der Moderator ist stiller Beobachter, kein Helfer. Alles Wörtliche steht in
Anführungszeichen und wird genau so gesagt — nicht paraphrasieren.

## 0. Setup vor Beginn (ohne Testperson)

- [ ] Backend erreichbar (`pm2 describe cosmo-market-api` → online), Chain nicht paused
- [ ] Moderations-Admin bereit (Approval < 10 min zusichern)
- [ ] Pilot-Provider bereit, ein reales Offer abzugeben
- [ ] Build notieren: Website-Commit + Backend-Commit (`git rev-parse --short HEAD`)
- [ ] Aufzeichnung/Notizen vorbereitet (observation-sheet.md ausgedruckt oder zweiter Bildschirm)
- [ ] Timer bereit (Zeit bis zur ersten Aktion je Stufe)

## 1. Begrüßung (wortgetreu)

> "Danke, dass du dir Zeit nimmst. Wichtig vorab: Wir testen nicht dich, sondern die
> Software. Du kannst nichts falsch machen — alles, was dich verwirrt oder aufhält,
> ist ein Fehler des Produkts, nicht deiner.
>
> Bitte sprich während der ganzen Aufgabe laut aus, was du erwartest, wonach du
> suchst und was dich überrascht.
>
> Ich werde dir während der Aufgabe nicht helfen und keine Fragen beantworten —
> auch nicht mit Ja oder Nein. Das ist keine Unhöflichkeit, sondern der Zweck des
> Tests. Erst danach reden wir über alles.
>
> Du kannst jederzeit abbrechen, ohne Begründung.
>
> Noch ein Sicherheitspunkt: Falls dir die Software irgendwann eine Liste geheimer
> Wörter anzeigt — eine sogenannte Seed-Phrase — sag kurz Bescheid, dann pausieren
> wir die Bildschirmübertragung. Diese Wörter darf außer dir niemand sehen, auch
> ich nicht."

## 2. Testauftrag (wortgetreu, danach schweigen)

> DE: "Du möchtest eine kleine digitale Aufgabe — zum Beispiel einen Datensatz
> prüfen und zusammenfassen lassen — gegen Bezahlung von einem KI-Agenten
> erledigen lassen. Nutze dafür heros.cloud. Fang an, wann du willst."

> EN: "You want a small digital task done for payment by an AI agent — for
> example, verifying and summarizing a dataset. Use heros.cloud for that.
> Start whenever you like."

Der Auftrag verrät bewusst keine Begriffe: nicht "Job posten", "Offer", "Fund",
"StarKey", "wCOSMO", "Wallet", "wrap". Bei Nachfrage zum Auftrag nur den
Auftragstext wiederholen.

## 3. Verhaltensregeln während der Beobachtung

VERBOTEN:

- Hilfe jeder Art: zeigen, deuten, Maus/Cursor-Hinweise, "schau mal oben/unten"
- Erklärungen zu Begriffen, Buttons, Zuständen, Wartezeiten
- Bestätigen oder Verneinen vermuteter Handlungen ("ja genau", "nicht ganz", Kopfnicken)
- Zustimmende oder warnende Laute ("mhm", "hm!", Einatmen)
- Suggestivfragen ("Würdest du nicht erst …?", "Hast du das X gesehen?")
- Das Design verteidigen oder die beabsichtigte Logik erklären — auch nach Abbruch
  erst, wenn alle Nachfragen (Abschnitt 5) vollständig erfasst sind

ERLAUBTE NEUTRALE RÜCKFRAGEN (nur diese, wortgetreu):

- "Sprich gern weiter laut."  (wenn die Person verstummt)
- "Was denkst du gerade?"
- "Was erwartest du gerade?"
- "Wonach suchst du gerade?"
- Neutrales Echo der letzten Aussage: "Du sagst, du bist unsicher?"
- Bei direkten Hilfe-Fragen: "Ich kann dir während des Tests nicht helfen.
  Mach so weiter, wie du es alleine tun würdest."
- Bei "Bin ich fertig?": "Entscheide selbst, ob du fertig bist, und sag es mir."

## 4. Abbruch- und Sicherheitsregeln

SOFORT eingreifen (Sicherheits-Ausnahme, einzige erlaubte Hilfe):

- Seed-Phrase, privater Schlüssel oder Passwort ist im Begriff, sichtbar/diktiert
  zu werden → Bildschirmübertragung pausieren; nichts notieren, nichts aufzeichnen
- Eine Wallet-Signatur zeigt einen Betrag über **5 wCOSMO** oder ein anderes Ziel
  als erwartet → "Stopp, bitte noch nicht bestätigen." Session an dieser Stelle
  als abgebrochen werten und Grund notieren

ABBRECHEN (Session gilt als ABBRUCH an dieser Stelle, Ergebnis bleibt gültig):

- Länger als 15 Minuten kein Fortschritt an derselben Stelle
- Testperson will aufhören
- Technischer Totalausfall (Backend down, Chain paused) — Zustand notieren, der
  angezeigte Fehlerzustand ist selbst Testgegenstand (erst 2-3 Minuten beobachten,
  wie die Person damit umgeht, dann beenden)
- Gesamtzeit über 45 Minuten (Wartefenster ausgenommen, siehe unten)

WICHTIG: Ein Abbruch VOR dem eigentlichen Buyer-Flow (z. B. an Wallet-Installation
oder Token-Beschaffung) ist ein gültiges, wertvolles Ergebnis — nicht "retten".

## 5. Wartefenster (Moderation, Lieferung)

- Moderations-Wartezeit: erst 3-5 Minuten still beobachten, was die Person im
  Wartezustand tut (reloaden? Tab schließen? my-jobs suchen?). Danach ist eine
  Sitzungspause zulässig: "Wir machen Pause, bis es weitergeht. Verhalte dich so,
  wie du es alleine tun würdest." Keine Auskunft, WANN es weitergeht.
- Lieferung durch den Provider kann außerhalb des Sitzungsfensters liegen. Dann
  Folgetermin für die Stufen H/I (Abnahme + Settlement-Erkennung) vereinbaren.
  Beide Fenster im Protokoll getrennt ausweisen.

## 6. Budget und Kosten

- Harte Grenze: **5 wCOSMO** je Testjob (plus geringe SUPRA-Gaskosten)
- Die Testperson nutzt eigene Wallet und eigene Mittel (S1: Beschaffung ist
  Testgegenstand). Der Betreiber kann die Auslagen NACH der Session erstatten —
  das vorher NICHT ankündigen, es verändert das Verhalten am Fund-Schritt
- Ungenutzte Mittel fließen protokollgemäß on-chain zurück; nicht vorab erklären

## 7. Nachfragen (erst nach Abschluss oder Abbruch, wortgetreu)

1. "Was dachtest du, würde als Nächstes passieren?"
2. "Wo warst du am unsichersten?"
3. "Welche Begriffe waren unklar?"
4. "Woran hättest du erkannt, dass du fertig bist?"
5. "Was würdest du an dieser Stelle als Erstes ändern?"

Antworten wörtlich notieren. Erst danach darf auf Wunsch die beabsichtigte
Logik erklärt werden.

## 8. Direkt nach der Session

- observation-sheet.md vervollständigen (aus Notizen, solange frisch)
- tp01-report-template.md ausfüllen
- Session in `../sessions.md` als Session 01 / TP01 eintragen
