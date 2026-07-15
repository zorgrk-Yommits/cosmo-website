# Plan: v1_paused sichtbar machen (Frontend) + Doku-Korrektur

## Context

Seit 2026-07-14 steht auf Supra Mainnet (chain 8) das `V1Gate` des Moduls `compute_rfq` auf
`v1_paused = true`. Neue Aufrufe von `create_outcome_request` (V1, wCOSMO-only) aborten mit
`E_V1_PAUSED` (66 / 0x42). Der O-5-Track ist damit inhaltlich zu; offen war laut Memory nur
noch "Frontend/Doku V1-als-geschlossen darstellen".

**Die ursprüngliche Annahme dieses Tasks war falsch und ist mit der Recherche widerlegt:**
Das Frontend hat nie einen Request-Pfad gebaut. `create_outcome_request` erscheint in `src/`
ausschließlich als Datentext in drei Proof-JSONs (Historie gesettelter Txs), und
`ComputeLanding.tsx:292` empfiehlt in der Prosa bereits V2. Buyer laufen über
Copy-Paste-Templates und persönliches Onboarding. **Es gibt keinen Button, der in 0x42 läuft.**
Der Task ist deshalb kein Abschalten, sondern zwei kleinere Dinge:

1. **Frontend:** Der Gate-Zustand ist extern nirgends sichtbar. Eine live gelesene Zeile auf
   `/compute` macht ihn prüfbar — im bestehenden `rpcView`-Muster und unter der Regel des
   Repos, Zustände nie hart zu kodieren (`mainnetOnchain.ts:6`).
2. **Doku:** Hier sitzt die echte Veraltung. Aktives buyer-facing Ansprache-Material nennt
   `create_outcome_request` als *den* Buyer-Pfad; die kanonische Operator-Referenz kennt das
   Gate nicht; zum Flip selbst existiert keine Vault-Note.

Ergebnis: Der Chain-Zustand ist auf der Website live prüfbar, die Doku beschreibt den Markt
so, wie er ist, und ein Rollback (`set_v1_paused(false)`) braucht keinen Website-Deploy.

### Live gegen chain 8 verifiziert (nicht angenommen)

| Fakt | Beleg |
|---|---|
| `compute_rfq::is_v1_paused` → `true` | curl auf `rpc-mainnet.supra.com/rpc/v1/view` |
| `compute_rfq::is_paused` → `false` (globale Pause offen) | dito |
| `V1Gate`-Resource existiert, `{"v1_paused":true}` | GET `/rpc/v1/accounts/<PKG>/resources/<PKG>::compute_rfq::V1Gate` |
| View gibt `false` zurück, **solange `V1Gate` nicht existiert** | `compute_rfq.move:1509` |
| `E_PAUSED` (32) wird **vor** `E_V1_PAUSED` (66) geprüft | `compute_rfq.move:622-631` |

Die letzten beiden sind der Grund für den dritten Zustand in A.2 und zwei Caveats im Runbook.
PKG-Adresse: `0x0fd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0`.

---

## Preflight — AUSGEFÜHRT 2026-07-15, Ergebnis: sauber

Geprüft, ob eines der 8 V1-fahrenden Scripts automatisiert läuft (`compute-mainnet-job001.sh`,
`-job001-host.sh`, `-attest001-host.sh`, `-patch001-host.sh`, `compute-mainnet-m6-smoke.sh`,
`compute-stage2a-smoke.sh`, `compute-stage1-smoke.sh`, `compute-staging-n4-smoke.sh`) über
`pm2 jlist`, `crontab -l` + `/etc/cron.d`, `systemctl list-units --type=timer|service`,
`ps -eo cmd`, sowie Grep nach externen Aufrufern in `/root/cosmo-contracts-v2` + `/root/workspace`.

**Befund: keines läuft automatisiert, kein externer Aufrufer.** Sie bleiben bewusst historische
bzw. manuelle Werkzeuge → so in B.4 festhalten.

**Ein Fund war zu klären und ist entwarnt:** `cosmo-compute-keeper.timer` läuft alle 5 Minuten
(`/opt/cosmo-compute-ops/compute_keeper.py`, M8 ops runner). Er ruft ausschließlich Views plus
die Exit-Pfade `reclaim_expired_request`, `claim_no_delivery`, `timeout_settle`,
`claim_dispute_unwind` — alle vom v1-Gate per Design **nicht** betroffen. Kein
`create_outcome_request` in der Quelle. Der Keeper ist unberührt; das gehört als bestätigte
Nicht-Regression in B.4.

**Methodenwarnung für die Wiederholung:** `pgrep -f <scriptname>` matcht die eigene
Kommandozeile und produziert acht Fehlalarme, wenn die Scriptnamen im eigenen Befehl stehen.
Stattdessen einen `ps -eo pid,ppid,etimes,cmd`-Snapshot ziehen und darin suchen — sonst prüft
man sich selbst. (Genau die Falsch-Grün-Klasse, die auch T2 betrifft.)

---

## A) Frontend — eine Live-Read-Zeile

Datei: `/root/workspace/meine-website/cosmo-clawagent/src/app/compute/ComputeLanding.tsx`
Wiederverwendet: `rpcView` + `COMPUTE_PKG_ADDR` aus `@/lib/mainnetOnchain` (Zeile 28, bereits
importiert). **Kein neuer Import, keine neue Route, kein neuer RPC-Host.** Dies wären die
ersten `compute_rfq`-Views im Frontend — bisher wird aus dem Compute-Package nur
`provider_vault` gelesen.

### A.1 `fetchLiveParams` (Zeile 39-56) — zwei neue Views + strikte Bool-Prüfung

`is_v1_paused` allein beantwortet **nicht**, welcher Request-Pfad benutzbar ist: bei
`compute_rfq::is_paused() == true` sind auch die V2-Creates blockiert, und 32 überschattet 66
(`compute_rfq.move:622-631`). Ohne den zweiten View würde die Seite während eines Incidents
einen Einstieg anzeigen, den es gerade nicht gibt. Also **beide** lesen — 5 → 7 Views:

```ts
const RFQ = `${COMPUTE_PKG_ADDR}::compute_rfq`;
// neu im bestehenden Promise.all:
//   rpcView(`${RFQ}::is_paused`, [], [])      -> systemPaused
//   rpcView(`${RFQ}::is_v1_paused`, [], [])   -> v1Paused

// Eine leere/kaputte View-Response darf NICHT still als "offen" rendern.
const bool = (v: unknown, name: string): boolean => {
  if (typeof v !== 'boolean') throw new Error(`view ${name}: expected bool, got ${typeof v}`);
  return v;
};
```

Grund für `bool()`: das heutige `paused === true` (Zeile 50) ist **fail-open** — liefert
`rpcView` `undefined`, rendert die Zeile "open (not paused)". Bei der Onboarding-Zeile ist das
kosmetisch, bei einer Gate-Zeile wäre es eine falsche Aussage über die Chain. `bool()` auf
**alle drei** Booleans anwenden, sonst stehen zwei Wahrheitsregeln in einer Funktion.

Achtung Namenskollision beim Lesen des Diffs: `live.paused` ist heute
`provider_vault::is_onboarding_paused`, **nicht** die globale Pause. Der neue Wert heißt
`systemPaused` (`compute_rfq::is_paused`) — zwei verschiedene Schalter, die im Code fast gleich
heißen. Beim Edit nicht verwechseln.

### A.2 `buildParams` (Zeile 60-86) — neue Zeile an Position 2, drei Zustände

```ts
{
  label: 'Request entry point',
  value: live
    ? live.systemPaused
      ? 'New requests globally paused'
      : live.v1Paused
        ? 'create_outcome_request_v2_coin<CoinType> only'
        : 'create_outcome_request_v2_coin<CoinType> + create_outcome_request'
    : '—',
},
```

Position direkt nach "Provider onboarding": beide sind live gelesene Zustände, alles darunter
sind Zahlen/Konstanten. Das Label darf `Request entry point` heißen, **weil** der globale
Zustand mitgelesen wird — ohne den siebten View müsste es auf das engere
`Configured buyer request functions` zurückfallen.

Hinweis: Diese Zelle ist damit die einzige Stelle der Seite, an der eine globale Pause
überhaupt sichtbar würde. Das ist für diesen Scope ausreichend (der Fall ist ein Incident, und
dann gilt ohnehin das Runbook), aber es ist eine bewusste Entscheidung, keine Lücke.

### A.3 Die V1/V2-Doppeldeutigkeit — der heikelste Punkt

"v1" bezeichnet auf der Seite **die Marktphase** (Zeile 79, 92, 165, 506, 515, 538: "guarded
v1"), "V2" in Zeile 67 die **Code-Generation**. Beide Bedeutungen stehen bereits in derselben
Tabelle. Ein Wert wie `V2 only (V1 closed)` direkt über `Active jobs per provider: 1 (guarded
v1)` lässt genau die falsche Lesart zu ("v1 ist zu, aber v1-Regeln gelten?").

**Regel für Tabelle + Fußnote:** „v1"/„V2" nie als Substantiv für einen Code-Pfad. Marktphase
heißt "the guarded phase", Code-Pfade heißen bei ihrem literalen Funktionsnamen. Der
Funktionsname ist die einzige Bezeichnung auf der Seite mit on-chain-Identität — und exakt der
String, den ein Buyer kopiert (steht schon in Zeile 291-294). Übersetzungsfest im Sinne von
[[bond-ux-clarity]], weil ein Identifier gar nicht übersetzt wird.

Daraus zwei Mit-Änderungen, sonst behebt man die Kollision an der neuen Zeile und lässt sie
eine Zeile weiter stehen:
- Zeile 67: `Payment assets (V2)` → `Payment assets` (das "(V2)" trug nie Information)
- Zeile 79: `1 (guarded v1)` → `1 (guarded phase)`

**Unangetastet:** Hero (165), Honesty-Box (538), "Bring a workload" (515). Dort ist "v1" ohne
Funktionsnamen in Sichtweite eindeutig die Phase und etablierter Begriff der Ansprache.

### A.4 Fußnote (Zeile 504-507)

Muss mit, sonst faktisch falsch ("provider_vault views"). Neu: nennt auch `compute_rfq`,
erklärt das Gate **gate-agnostisch** ("the older wCOSMO-only request function *can be* closed
for new requests…") und ersetzt "All parameters are v1 working values" durch "working values of
the guarded phase". Kein Datum in Live-Werte — ein Datum neben einem Wert, den die Chain fahren
kann, wird beim nächsten Flip zur Lüge.

### A.5 `Promise.all` bleibt — kein `allSettled`

`useVaultData.ts:28-51` benutzt `allSettled`, weil dort drei unabhängige Module mit **je
eigenem Error-Feld** gerendert werden. `ComputeLanding` hat weder Error-Feld pro Zeile noch
vorherige Daten; `allSettled` würde nur ein einsames `'—'` zwischen echten Live-Werten
erzeugen — auf einer Gate-Zeile lesbar als "keine Einschränkung". Eine komplett leere Tabelle
sagt dagegen unmissverständlich "Chain nicht lesbar" (Fail-Closed wie
`ProviderBondHelper.tsx:303-321`). Zudem gehen alle Views an denselben Host im selben Tick —
der realistische Ausfall trifft alle.
**Preis:** 5→7 Calls (+40% Exposure ggü. RPC-Rate-Limits). **Revisit-Trigger:** häufen sich
`'—'`-Tabellen im Feld, ist die Antwort Retry/Backoff in `rpcView` (hilft allen Seiten), nicht
partielles Rendern.

---

## B) Doku — 4 Ziele

### B.1 `/root/obsidian-vault/COSMO/COSMO_Compute_Outreach_v1_2026-07-07.md`
Aktives Ansprache-Material (Status FREIGEGEBEN, Rene spricht damit an) — der Fix mit dem
realsten Schaden. Ton: nüchtern, kein Marketing.
- **Zeile 27-28:** `create_outcome_request` → `create_outcome_request_v2_coin<CoinType>`, plus
  Satz zum gesperrten Altpfad (66, seit 2026-07-14).
- **Neue Tabellenzeile** nach Zeile 23: Buyer-Request-Pfad = nur V2-Funktion; Altpfad zu für
  NEUE Requests, laufende Jobs/Refunds/Exits unberührt.
- **Zeile 16 (Überschrift):** Datum **nicht** global auf 07-14 ziehen. Min-Bond 100 und Caps
  1.000/5.000 (Zeile 21-22) sind 07-07-Werte und wurden nicht nachverifiziert — ein neues
  Header-Datum würde sie fälschlich mit-adeln. Stattdessen Per-Zeilen-Provenienz:
  "Tabelle verifiziert 2026-07-07; Request-Pfad nachverifiziert 2026-07-14".
- **Guardrails (107-111):** ein Satz gegen den realen Failure-Mode (altes Snippet gepastet) —
  nie `create_outcome_request` ohne `_v2_coin` in einer Ansprache nennen.
- **Templates (49-83) bleiben** — sie nennen keine Funktionsnamen und überleben den Flip.

### B.2 `docs/compute-rfq-stage2a-h5-operations-runbook.md` (Repo `cosmo-contracts-move`)
Kanonische Operator-Referenz "was gated was"; §4.4 (Zeile 262-274) kennt nur `E_PAUSED`=32 +
Onboarding-Pause.
- **Nicht renumerieren** — Zeile 130 und 333 verweisen auf "4.4/4.5" als Paar. Stattdessen
  neuer **§4.4a** zwischen Zeile 274 und 276 (Kontrast liest sich nur adjazent: 4.4 Notbremse
  → 4.4a Produktschalter → 4.5 warum nur die Notbremse Disziplin braucht).
- **§4.4 bekommt ein Bullet:** dritter, separater Schalter; und **32 überschattet 66** — unter
  globaler Pause sieht ein Buyer nie 66 (verifiziert `compute_rfq.move:622-631`). Wer "66
  erwartet, 32 bekommt", debuggt sonst am falschen Schalter.
- **§4.4a Inhalt:** `set_v1_paused(bool)`, admin=MS, idempotent, State in eigener Ressource
  `V1Gate` (Abwesenheit == nicht pausiert, Republish bleibt neutral bis `init_v1_gate_entry`).
  Effekt: nur `create_outcome_request` → 66; V2-Creates, laufende Jobs, Refunds, Exits,
  Keeper-Pfade unberührt. Drei Schalter, drei Fragen (32 = Incident / 66 = Produkt /
  onboarding = keine neuen Deposits). Post-Check: `is_v1_paused()` == Ziel UND `is_paused()`
  unverändert.
  **Caveat + belastbare Prüfung:** `is_v1_paused()==false` beweist keinen bewussten
  Offen-Zustand — der View gibt false zurück, wenn `V1Gate` fehlt (`compute_rfq.move:1509`).
  Die stärkere Prüfung ist die Resource selbst (verifiziert praktikabel):
  ```
  curl -s https://rpc-mainnet.supra.com/rpc/v1/accounts/<PKG>/resources/<PKG>::compute_rfq::V1Gate
  # -> {"result":[{"v1_paused":true}]}   Gate existiert und ist gesetzt
  # -> leer/404                          Gate nie initialisiert -> false ist bedeutungslos
  ```
  Mainnet: true seit 2026-07-14, kein Incident.
- **§4.5 (276-284):** Scope-Zeile an den Anfang ("governs `set_paused(false)` ONLY") — sonst
  liest sich die 4-Punkte-Checkliste nach dem Einschub, als gälte sie auch für das v1-Gate.
  Absatz ans Ende: warum `set_v1_paused(false)` **keine** Incident-Disziplin braucht (nichts war
  kaputt, kein Escrow eingefroren). Incident-Zeremonie auf einen Produktschalter anzuwenden ist
  keine Extra-Sicherheit — es trainiert das Council, beide Schalter gleich zu gewichten, und
  genau so wird ein echtes Unpause irgendwann abgenickt.

### B.3 `/root/obsidian-vault/COSMO Compute — Hub.md`
MOC; wer hier einsteigt, bekommt ein V1-Weltbild. An drei Stellen falsch:
- **Zeile 53** `(offen: M6-Smoke, M7-OPEN)` ist schlicht falsch — `M6_B6_Smoke_COMPLETE`,
  `M7_MARKET_OPEN`, `M8_Ops_LIVE` (alle 2026-07-05) existieren im Vault-Root (verifiziert).
  Verlinken; Überschrift Zeile 42 → "M0–M8 (2026-07-04/05, abgeschlossen)".
- **Zeile 10-11 (Kette)** um "→ Multi-Asset V2 → O-5 V1-Request-Gate" ergänzen.
- **Zwei neue Sektionen** vor `## Verwandt`: Multi-Asset V2 (2026-07-10/11, beide
  `V2_Mainnet_Rollout_*`-Notes existieren) und O-5 V1-Request-Gate (2026-07-14 → B.4).

### B.4 NEU: `/root/obsidian-vault/COSMO_Compute_O5_V1-Request-Gate_2026-07-14.md`
Vault-**Root** (dort liegen alle `COSMO_Compute_M*`/`V2_*`-Notes, verifiziert), Stil analog
`COSMO_Compute_V2_Mainnet_Rollout_COMPLETE_2026-07-10.md`. Inhalt:
- **Was gilt:** zu / offen / unberührt (inkl. `is_paused=false`, Onboarding-Pause getrennt)
- **Tx-Kette:** PKG seq 15 publish `0x894cbf9d…c86423`, seq 16 `init_v1_gate_entry`
  `0x145ab960…ec5e8`, MS seq 17 `set_v1_paused(true)` — **inkl. konkreter Execute-Tx**; ist der
  Hash aus dem Snapshot nicht sauber zu ziehen, stattdessen expliziter Verweis auf den
  Smoke-Beleg (`docs/smoke/compute-mainnet-v1pause-upgrade-2026-07-14.md`, Neutral-Deploy 14/0,
  Flip 16/0) statt eine Kurzform zu erfinden.
- **Verifikation, reproduzierbar:** beide curl-Formen — View (`is_v1_paused`, `is_paused`) und
  **Resource-Existenz** (die stärkere, s. B.2)
- **Rollback:** `set_v1_paused(false)` via MS, kein Redeploy, **kein Website-Deploy**
- **Fallstrick:** `false`-Zweideutigkeit → über Resource prüfen, nicht über den View
- **Preflight-Ergebnis:** warum die 8 V1-fahrenden Scripts bewusst out of scope sind (mit dem
  konkreten Befund aus dem Preflight, nicht als Behauptung)

### Bewusst NICHT im Scope
Historische Evidence-Docs + die drei Proof-JSONs (faktisch korrekt als Historie), die 8
V1-fahrenden Scripts (vorbehaltlich Preflight), eine neue Error-Code-Tabelle (existiert
nirgends — eigener Task wert).

---

## Verifikation

Zu beweisen ist **nicht** "die Zeile zeigt gerade V2-only", sondern: **die Zeile ist eine
Funktion des Chain-Zustands zum Ladezeitpunkt, nicht des Build-Zeitpunkts.** Nur das trägt den
Rollback-Fall.

- **T1 — Baseline (bereits ausgeführt):** curl auf `rpc-mainnet.supra.com/rpc/v1/view`:
  `is_v1_paused` → `[true]`, `is_paused` → `[false]`; Resource → `{"v1_paused":true}`.
  Payload-Form identisch zu `rpcView` (`mainnetOnchain.ts:134-143`), also exakt der Call des
  Browsers.
- **T2 — kein Bake-in (der eigentliche Beweis):** `npm run build`, `out/` statisch ausliefern,
  `/compute` **mit deaktiviertem JavaScript** öffnen → in der Zeile `Request entry point` steht
  **ausschließlich `—`**. Das beweist direkt, dass kein Branch-Wert im Prerender steckt: ohne
  JS läuft `useEffect` nie, `buildParams(null)` rendert den Fallback. Damit ist bewiesen — nicht
  behauptet — dass nach `set_v1_paused(false)` die ausgelieferte Seite nichts Falsches erzählt
  und **kein Redeploy nötig** ist.
  *Zusatztest (nicht allein tragfähig):* Grep nach den **vollständigen, HTML-escapten**
  Branch-Strings (`&lt;CoinType&gt;`). Als alleiniger Test wäre er falsch-grün-anfällig — das
  Escaping und das Vorkommen des Funktionsnamens in statischer Prosa (Zeile 291-294) machen
  Treffer/Nichttreffer der neuen Tabellenzelle nicht eindeutig zuordenbar.
- **T3 — alle drei Branches, ohne Mainnet anzufassen:** `npm run dev`, `/compute`,
  DevTools/Network: POSTs mit `is_paused` + `is_v1_paused`, Zeile zeigt `… only`. Dann `fetch`
  stubben:
  - `is_v1_paused` → `{"result":[false]}` → Zeile springt auf `… + create_outcome_request`
    (simulierter Rollback an der einzigen Stelle, an der er entsteht)
  - `is_paused` → `{"result":[true]}` → Zeile zeigt `New requests globally paused`
  - eine Response `{"result":[]}` → `bool()` wirft → **ganze Tabelle `'—'`** (Fail-Closed aus
    A.1/A.5)
  Stubs entfernen.
- **T4 — Prod:** `heros.cloud/compute` hart neu laden, Network: 7 View-Calls (vorher 5), Zeile
  == T1-Ergebnis. Screenshot in B.4 nachtragen.

## Reihenfolge

1. **Preflight** (8 Scripts, s.o.) — Ergebnis fließt in B.4; ein Fund wird zuerst behoben
2. **Website-Backup, vor jeder Frontend-Arbeit:**
   ```
   cd /root/workspace/meine-website/cosmo-clawagent
   test ! -e out.pre-v1gate && cp -a out out.pre-v1gate
   ```
   So ist zweifelsfrei das **aktuell produktive** Artefakt gesichert, nicht ein bereits
   verändertes Verzeichnis. Muster: bestehende `out.pre-*` (zuletzt `out.pre-rfq`).
3. **B.4** (neue Note) → **B.3** (Hub verlinkt sie) — kostet nichts, macht den Rest referenzierbar
4. **B.2** (Runbook) — Operator-Wahrheit vor Buyer-Wahrheit
5. **B.1** (Outreach) — der Fix mit dem realsten Schaden
6. **A** (Frontend): Edit → `npm run lint` → T3 (dev) → `npm run build` → T2 (JS aus) → PM2 → T4
7. Obsidian-Hook: Note + `git push` in `/root/obsidian-vault`

**Rollback Website:** `out.pre-v1gate` zurückschieben + PM2 restart. Entkoppelt vom
Chain-Rollback (T2) — beide Richtungen unabhängig fahrbar. Es kommt keine neue Route dazu, die
`serve`-ohne-`-s`-Falle ist damit umgangen.

## Restrisiken

- **`'—'` auf einer Gate-Zeile ist semantisch schwach** ("unbekannt" vs. "keine
  Einschränkung"). Genau deshalb muss es *alle* Zeilen treffen, wenn es eine trifft — die leere
  Tabelle als Ganzes ist die eindeutige Botschaft.
- **Statische Prosa nicht verschärfen:** Zeile 290-297 ist heute zufällig deckungsgleich mit
  dem Gate. Dort "— the only way to open a request" zu ergänzen wäre ein Bug: nach einem
  Rollback widerspräche die Prosa der Live-Zeile, und die Prosa gewinnt beim Leser. Exklusive
  Aussagen ausschließlich in der Live-Zelle.
- **Bei einem künftigen Deploy auf eine neue Package-Adresse ohne `init_v1_gate_entry`** würde
  die Seite still "V1 offen" behaupten (`false`-Zweideutigkeit). Das Frontend kann das nicht
  heilen — deshalb steht die Resource-Prüfung als Caveat im Runbook (B.2).
- **Zahlen in aktivem Ansprache-Material:** "100 wCOSMO bond" steht hart in den Templates
  (Zeile 54, 78) und wird von niemandem live gelesen. Außerhalb dieses Scopes, aber notiert.
- **Lint:** die dreifach verschachtelte Ternary in `buildParams` kann je nach ESLint-Config
  (`no-nested-ternary`) anschlagen. Zeile 71 hat bereits eine verschachtelte Ternary und
  überlebt → vermutlich unkritisch; falls doch, in eine kleine Helper-Funktion ziehen statt die
  Regel abzuschalten.

## Ablage

Nach Freigabe gehört dieser Plan als `plans/v1-gate-visibility-plan.md` in
`/root/workspace/meine-website/cosmo-clawagent` (Muster: `plans/compute-selfservice-bond-plan.md`,
das die O-5-Interim-Regel bereits festhält) und wird laut deiner Regel in einem **frischen Chat**
umgesetzt.
