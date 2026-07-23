# Usability-Plan: COSMO Buyer-Flow

Angelegt: 2026-07-19 · Skill: user-reality-check

## Geprüfter Ablauf

Kompletter Buyer-Funnel auf heros.cloud (Startseite = Market):

1. Job posten (`/market/post`: Title, Description, Acceptance criteria, Budget in wCOSMO, Deadline, Contact email)
2. Moderations-Wartephase ("in review") → "Open for offers"
3. Buyer-Schritt ① "Select offer & sign with StarKey"
4. Buyer-Schritt ② "Fund the job with StarKey" (Escrow)
5. Auto-Arm-Zwischenzustand "Preparing the final step…"
6. Buyer-Schritt ③ "Confirm & start with StarKey"
7. Provider liefert → Approve → Settled

## Getesteter Build

- Website: commit `74d18d1` (Neuschnitt Etappe 5, Sprachpass Buyer-Flow), live via PM2 `cosmo-clawagent`
- Backend: cosmo-market-api commit `deac8a3` (M5 delivery rail), PM2 `cosmo-market-api`, Port 4100
- Chain: Supra Move Mainnet (chain 8), wCOSMO
- Bei jeder Session den zum Zeitpunkt tatsächlich laufenden Commit notieren (`git -C <repo> rev-parse --short HEAD`).

## Zielgruppe

Agent-Entwickler und krypto-affine Käufer digitaler Arbeitsleistungen. Grundlegende Wallet-Erfahrung wahrscheinlich, aber KEINE Supra-/StarKey-/wCOSMO-Vorkenntnis vorausgesetzt. Projektbeteiligte (Rene als Betreiber, Claude, Provider-Operatoren) zählen NICHT als Testnutzer.

## Testauftrag (wörtlich vorlesen, nichts weiter erklären)

> DE: "Du möchtest eine kleine digitale Aufgabe — zum Beispiel einen Datensatz prüfen und zusammenfassen lassen — gegen Bezahlung von einem KI-Agenten erledigen lassen. Nutze dafür heros.cloud. Sag laut, was du erwartest und wonach du suchst. Ich helfe dir während der Aufgabe nicht."

> EN: "You want a small digital task done for payment by an AI agent — for example, verifying and summarizing a dataset. Use heros.cloud for that. Please think aloud: say what you expect and what you are looking for. I will not help you during the task."

Der Auftrag verrät bewusst KEINE Begriffe wie "post a job", "offer", "fund", "StarKey", "wCOSMO", "wrap".

## Startzustände

- **S1 (kalt, voller Funnel):** Eigener Browser der Testperson, kein StarKey installiert, kein wCOSMO. Misst die realen Eintrittshürden (Wallet-Installation, Token-Beschaffung via /wcosmo-Guide).
- **S2 (präpariert, 3-Button-Flow isoliert):** StarKey installiert, Test-Wallet mit kleinem wCOSMO-Bestand (<= 5 wCOSMO) vorhanden, ein approvter Job mit mindestens einem Offer liegt vor. Misst Select → Fund → Confirm → Approve isoliert.

Reihenfolge: Beobachtung 1-2 mit S1 (grobe Blockaden finden), danach je nach Befund S2, um den Kernflow ohne die Beschaffungshürde zu messen. Beide Varianten pro Session im Protokoll ausweisen.

## Erwartetes Endergebnis

- S1: Testperson hat einen Job gepostet und versteht, dass und wie es weitergeht (Moderation → Offers → drei eigene Schritte). Voller Settle ist in einer Sitzung nur erreichbar, wenn Moderation + Provider-Offer zeitnah erfolgen (siehe Betriebsbedingungen).
- S2: Testperson erreicht ohne Hilfe "Settled" (bzw. "Active", wenn die Lieferung außerhalb des Sitzungsfensters liegt) und kann benennen, was mit ihrem Geld passiert ist.

## Betriebsbedingungen während der Beobachtung

- Moderation: Admin approvt Testjobs zügig (< 10 min), aber nicht sofort — die Wartezustands-UI ("in review", "Nothing to do right now") ist selbst Testgegenstand.
- Provider: kuratierter Pilot-Provider (M2-Maker) gibt ein reales Offer ab. Das Offer-Timing gehört zur Beobachtung.
- Budget-Deckel je Testjob: 5 wCOSMO. Echte Mainnet-Settlements sind zulässig (Pilotbetrieb); ungenutzte Mittel fließen protokollgemäß zurück.

## Maximale sinnvolle Bearbeitungszeit

- S1: 45 Minuten
- S2: 25 Minuten

## Sicherheits- und Abbruchbedingungen

Eingreifen bzw. abbrechen NUR wenn:

- die Testperson im Begriff ist, Seed-Phrase, privaten Schlüssel oder Passwort zu zeigen oder zu diktieren (sofort unterbrechen — Sicherheitsregel),
- eine Signatur ansteht, deren Betrag den Budget-Deckel überschreitet,
- länger als 15 Minuten kein Fortschritt an derselben Stelle erfolgt,
- die Testperson abbrechen will,
- technischer Totalausfall vorliegt (Backend down, Chain paused).

Musste geholfen werden, gilt die Session als "Hilfe erforderlich", nicht als Erfolg.

## Nicht real auszulösen

- Keine Transaktionen über 5 wCOSMO pro Testjob.
- Keine Erfassung von Klarnamen, Wallet-Seeds, Passwörtern, privaten Schlüsseln, E-Mail-Inhalten. Die Contact-Email im Formular darf eine Wegwerf-Adresse sein.

## Annahmen (widerlegbar formuliert)

| # | Annahme | Erwartetes Verhalten | Widerlegendes Signal |
|---|---|---|---|
| A1 | Nutzer akzeptieren die StarKey-Pflicht und schaffen die Installation selbst | Sie installieren StarKey ohne Hilfe, wenn Schritt ① es verlangt | Sie fragen "was ist StarKey?", suchen nach MetaMask/WalletConnect, brechen bei der Installation ab |
| A2 | Der /wcosmo-"conversion guide" reicht, um an wCOSMO zu kommen | Sie folgen dem Link am Fund-Schritt und beschaffen wCOSMO selbst | Sie suchen nach "Buy", "Deposit", fragen "wo kaufe ich das?", verlassen die Seite Richtung Exchange, geben auf |
| A3 | Die Wartezustände ("in review", "Open for offers — nothing to do right now") werden als normal verstanden | Sie lesen den Status, schließen ggf. den Tab und kommen wieder | Sie reloaden wiederholt, halten die Seite für kaputt, fragen "ist das abgestürzt?", finden den Job nach Rückkehr nicht wieder |
| A4 | "Fund the job" wird als rückholbares Escrow verstanden, nicht als endgültige Zahlung | Sie signieren nach Lesen des Escrow-Texts ohne Rückfrage | Sie zögern sichtbar, fragen "ist das Geld dann weg?", brechen vor der Signatur ab |
| A5 | Der Unterschied zwischen ② Fund und ③ Confirm & start ist verständlich | Sie erkennen Confirm als bewussten Start und erwarten die Rückzahlung ungenutzter Mittel | Sie fragen "ich habe doch schon bezahlt — warum nochmal signieren?", halten Schritt ③ für einen Fehler oder Doppelzahlung |
| A6 | "Preparing the final step…" (Auto-Arm) wird als normaler Automatik-Zwischenschritt gelesen | Sie warten die angekündigten Sekunden ab | Sie reloaden, klicken zurück, brechen ab oder fragen, ob etwas hängt |
| A7 | Nutzer finden ihren Job später wieder (my-jobs = localStorage) | Sie kehren im selben Browser zurück und finden den Job über die Startseite | Sie kommen mit anderem Gerät/Browser oder Inkognito wieder, finden nichts und halten den Job für verloren |
| A8 | Nutzer erkennen selbst, dass sie fertig sind und was finanziell passiert ist | Bei "Settled" benennen sie unaufgefordert: Ergebnis erhalten, Preis gezahlt, Rest zurück | Sie fragen "bin ich jetzt fertig?", prüfen ratlos die Wallet, können den gezahlten Betrag nicht benennen |
| A9 | Der Wallet-Chip (oben rechts) wird bemerkt und als "damit bin ich gerade unterwegs" verstanden (neu nach B7, 2026-07-23) | Bei der Frage nach dem aktiven Konto zeigen/nennen sie den Chip; bei falschem Konto wechseln sie in der StarKey-Extension und laden neu | Sie übersehen den Chip, suchen das aktive Konto in der Wallet-Extension statt auf der Seite, oder verstehen das Provider-Wallet-Badge nicht |
| A10 | Im blockierten Funding-Zustand wird "Change selection" gefunden und als Ausweg verstanden (neu nach B7, 2026-07-23) | Nach dem Blocker-Hinweis scrollen sie zum Abschnitt, wählen ein anderes Angebot oder wechseln das Konto und wählen neu | Sie bleiben am deaktivierten Fund-Button hängen, reloaden wiederholt oder fragen "wie komme ich hier raus?" |

## Zielgröße und begründete Abweichung

Regelziel des Skills: 10 Beobachtungen. Abweichung für den aktuellen Stand: Der Markt läuft als kuratierter Pilot mit Moderation und einer sehr kleinen erreichbaren Zielgruppe (Outreach-Kontakte, Stand 2026-07-19 noch offen). Daher:

- **Runde 1: 3-5 Beobachtungen** (grobe Blockaden + erste Muster) — zulässige Basis für die erste Überarbeitung, NICHT für eine Nutzbarkeitsaussage.
- **Vor Öffnung über den kuratierten Pilot hinaus: mindestens 10 Beobachtungen kumuliert** plus Retest der überarbeiteten Version mit neuen, unvoreingenommenen Personen.

## Release-Gates

- **P0-Befund** (Sicherheit/Vermögen, z. B. Nutzer signiert etwas anderes, als die UI behauptet): Buyer-Flow sofort sperren (Moderation stoppt Approvals), Fix vor Wiederöffnung.
- **P1-Befund** (Kernaufgabe scheitert ohne Hilfe): Fix vor jeder Ausweitung des Pilots (Outreach pausieren).
- **P2**: vor "OBSERVATION-VERIFIED" schließen oder ausdrücklich akzeptieren (Eintrag in findings.md).
- Kennzeichnung bis dahin überall, wo der Flow beworben wird: **"Technisch umgesetzt — Nutzbarkeit noch nicht durch reale Beobachtung belegt."**
