# Wallet v0.1 auf `/portfolio` — Beobachtungsplan

Stand 17.11.2026. Build: Worktree `/root/w-wallet`, Branch `feat/cosmo-wallet-v01`, uncommittet (Basis `5696954`).
**Es liegt keine reale Beobachtung vor.** Browser-Tests mit Schein-Wallet sind technische Evidenz, keine Nutzerevidenz.
`findings.md` und `iteration-log.md` entstehen mit der ersten Beobachtung; `sessions.md` enthält das leere Protokoll.

## Ablauf

- **Zielgruppe:** Personen mit StarKey und Token auf Supra Mainnet, die COSMO kennen, aber die Seite nicht gebaut haben.
- **Aufgabe (wörtlich):** "Du möchtest wissen, was Dir gerade gehört und was zuletzt mit Deiner Wallet passiert ist. Nutze dafür diese Seite."
- **Startzustand:** `/portfolio/` geöffnet, StarKey installiert, nicht verbunden.
- **Erwartetes Ende:** Person nennt SUPRA-, COSMO- und wCOSMO-Bestand, sagt, ob etwas gebunden ist, und nennt die letzte Transaktion.
- **Zeit:** 5 Minuten. **Abbruch:** Person will etwas signieren → stoppen. Es wird nichts signiert, nichts überwiesen.
- **Zahl:** 5 Beobachtungen vor der ersten Überarbeitung (kleine Zielgruppe, lokaler Prototyp); 10 vor einer Aussage zur Nutzbarkeit.

## Annahmen

| Annahme | Erwartetes Verhalten | Widerlegendes Signal |
|---|---|---|
| Der Wallet-Kasten oben wird als Einstieg erkannt | Klick auf "Connect wallet" in unter 20 s | Person tippt zuerst die Adresse ab oder sucht den Knopf im Kopfmenü |
| "Other network" + "Switch"-Knopf reicht | Person klickt den Knopf oder schaltet in StarKey um | Person lädt neu, verbindet erneut oder fragt, warum Knöpfe fehlen |
| "Held or locked" wird als "gehört mir noch" gelesen | Person zählt es zu ihrem Besitz | Person hält es für verloren oder für Gebühren |
| Zeile 6 wird als Liste zum Ansehen verstanden | Person öffnet einen Job über den Link | Person sucht in Zeile 6 nach Knöpfen zum Abbrechen/Zurückholen |
| "ran"/"failed" und Funktionsnamen genügen in Zeile 7 | Person kann sagen, was die letzte Transaktion war | Person fragt nach Betrag/Gegenpartei oder versteht den Namen nicht |
| "latest 20 … not the full history" wird gelesen | Person erwartet nichts Älteres | Person sucht nach Blättern oder hält die Liste für vollständig |
| Der Trace-Hinweis "as it was then" wird verstanden | Person nennt das Datum | Person hält den Trace für aktuell |
| Die graue Intel-Karte stört nicht | wird überlesen | Person klickt darauf oder fragt, wann es kommt |

## Release-Gates

- P0/P1 offen → kein Deploy. Bekannt und vor jedem Deploy zu entscheiden: `public/trace/` (Trace-Seite von M2 würde öffentlich).
- Echter StarKey-Durchlauf (Anleitung in `docs/wallet-v01/README.md`): bestanden am 17.11.2026 (Rene, Projektbeteiligter; zählt als technische Prüfung, nicht als Nutzerbeobachtung).
