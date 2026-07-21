# Lifecycle-Befunde 2026-07-21 — Session MCP-PROBE-001 / kahless-001

Beobachtung: Rene (erfahrenster Nutzer des Systems, Betreiber aller drei Rollen
Buyer / Solver-Operator / Admin) durchlief den Markt-Lifecycle real und stiess
in EINER Session auf sechs Waende. Ein unvoreingenommener externer Nutzer waere
bei Befund 1 abgesprungen. Diese Liste ist der Faktinput fuer den
Lifecycle-Neuschnitt-Planzyklus.

Entscheid Rene 2026-07-21: MCP-PROBE-001 wird NICHT oeffentlich dargestellt;
der Pilot wird nach dem Lifecycle-Neuschnitt wiederholt.

## Befunde

### B1 — Offer geblockt: Roster-Gate ohne Handlungsanweisung
"The connected wallet … is not on the curated pilot roster, so it cannot submit
offers." Die Meldung sagt nicht, wer das beheben kann (Admin muss Provider-Profil
anlegen) oder wie. Ursache: K1-Provider-Profil fehlte; Registrierung ist ein
Admin-API-Schritt ohne UI.

### B2 — Funding geblockt: Sammel-Fehlermeldung verdeckt die echte Ursache
"…does not currently meet the on-chain requirements (security deposit or
capacity)." Tatsaechliche Ursache: `max_active_jobs_per_provider = 1` und K1
hing bereits in Job #6. Bond war korrekt. Weder die Ursache (welcher Job blockt)
noch der Ausweg stand in der UI. Gate feuerte erst beim Funding — nicht bei der
Offer-Auswahl, wo es haette sichtbar sein muessen.

### B3 — Schritt 3 "kaputt", obwohl on-chain alles gut war
"on-chain request status is 2, expected open/quoted." Der Accept war laengst
erfolgreich (Job #6 ACTIVE); nur der Browser-Callback `confirm-accept` ging
verloren (Reload nach StarKey-Signatur). Der Retry versuchte den falschen
Schritt erneut. Manuell geheilt via confirm-accept-Route.

### B4 — Deliver geblockt: Folgefehler desselben verlorenen Callbacks
"The attestation is not ready…" `ensureAttestation` verlangt `txRefs.accept`,
der beim Callback-Verlust nie gespeichert wurde. Accept-Tx-Hash musste manuell
aus der Chain-Historie rekonstruiert und nachgetragen werden.

### B5 — Rollenchaos: niemand weiss, wessen Zug es ist
Buyer-CTAs, Provider-Panel und Wartekarten auf einer Seite; keine serverseitig
berechnete Antwort "Zug: X, Aktion: Y". Realer Effekt: "K1 weiss nicht was er
machen soll" — der Solver hatte keinerlei zugaengliche Handlungsanleitung
(die Spec beschreibt das Handelsgut, nicht die Tx-Mechanik).

### B6 — STAERKSTER BEFUND: UI bot die destruktiv-falsche Aktion an — sie wurde benutzt
Der M5-Deliver-Button committet den Markt-Attestation-Hash als `result_hash`.
Fuer MCP-PROBE-001 verlangte die eingefrorene Spec `sha3-256(evidence.json)`
(Kriterium 8). Der Button wurde gedrueckt → Job #6 settelte mit dem falschen
Hash; die Evidence-Bindung des Piloten war damit irreversibel zerstoert
(deliver_result_v2 ist einmalig). Der Rail settelte fehlerfrei — das Produkt
hat den Piloten gebrochen, nicht die Chain.

## Wurzelursachen (Scope-Vorschlag fuer den Neuschnitt)

1. **Chain-first-Sync statt Browser-Callbacks.** Der State lebt an drei Orten
   (Chain, Backend-Store, Frontend); Synchronisation haengt an fire-and-forget-
   Callbacks aus dem Tab. Ein Reload zur falschen Zeit verklemmt das System
   (B3, B4). Das Backend muss die Chain selbst lesen (Poller/Event-Walk).
2. **Rollenbasierte Ein-Zug-Ansicht.** Pro Rolle genau ein Zustand und eine
   Aktion, serverseitig berechnet; Gates (Roster/Bond/Kapazitaet) VOR der
   Auswahl sichtbar, mit Ursache und Ausweg (B1, B2, B5).
3. **Job-Typ-Begriff.** Liefergut bestimmt den Deliver-Pfad. Ein Job, dessen
   result_hash NICHT die Markt-Attestation ist, darf den Attestation-Deliver-
   Button gar nicht anbieten (B6). Destruktive Einmal-Aktionen brauchen eine
   explizite Bestaetigung mit Anzeige des zu committenden Hashes.

## Referenzen

- On-chain: Request #11, Job #6 (create `0x9b049f64…260a`, submitQuote
  `0x0565ca85…29af`, accept `0x60be83e2…fbff`, deliver `0xf31561bc…ba95`,
  approve `0x759f92f3…`), settled 2026-07-21 16:39 UTC.
- Probe-Evidence (Verdict WARN, add→get-sum-Deviation): lokal archiviert in
  `/root/mcp-probe-001-delivery/` — bewusst NICHT publiziert.
- Solver-Runbook (entstand als Notbehelf fuer B5): `plans/mcp-probe-001-k1-runbook.md`.
