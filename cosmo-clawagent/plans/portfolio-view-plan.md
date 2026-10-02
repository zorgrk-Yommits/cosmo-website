# Portfolio-Ansicht: "Wo sind meine wCOSMO?" (Bond-Moment + Abstimmungsansicht)

Stand: 2026-10-02. Status: PLAN, kein Code. Umsetzung in neuem Chat nach GO.

## Kontext

Renes Befund (02.10.): Wer wCOSMO bondet, sieht in der Wallet nur "500 weniger". Technisch ist nichts weg, UX-seitig fuehlt es sich so an. Eine oeffentliche Version braucht eine klare Anzeige der Zustaende, in denen Tokens eines Nutzers stecken koennen.

Code-Befund (02.10., read-only, Mainnet chain 8, Package `cosmoclaw` in `/root/cosmo-contracts-move`, Compute-Package in `compute-rfq/`):

| Zustand | On-Chain-Quelle | Pro Adresse abfragbar? | Rueckweg | Heute auf der Site |
|---|---|---|---|---|
| Wallet (COSMO, wCOSMO) | FA primary store | ja, `0x1::primary_fungible_store::balance` | wrap/unwrap | /wcosmo, /buy, /compute/bond (verbundene Wallet) |
| Maker-Bond (Operator) | `maker_vault::OperatorBond` | ja: `get_operator_bond` (abortet bei unbekannter Adresse, maker_vault.move:1195), `operator_available` (:1221, liefert 0), `operator_slash_basis` (:1206) | `withdraw_operator_bond` (:729) erst wenn `now >= locked_until_secs`; Lock 14 d (:61) wird NUR durch einen Slash gesetzt (`slash`, :1010-1053); Deposit setzt keinen Lock | nur hartcodierte M2/K1 auf /vault und /rfq; kein Withdraw-Button |
| Provider-Bond (Compute) | `provider_vault::ProviderBond` | ja: `get_provider_bond` (provider_vault.move:569), liefert Nullen ohne Abort | `withdraw_provider_bond` (:398): kein aktiver Job UND kein Lock; Lock 14 d wird NUR durch einen Slash gesetzt (:512); Deposit setzt keinen Lock (locked_until 0) | /compute/bond fuer verbundene Wallet; Withdraw nur als Text |

KORREKTUR 02.10. (beim Bau von Stufe 1 verifiziert): Der 14-Tage-Cooldown wird in beiden Vaults ausschliesslich durch einen Strafabzug gestartet, nicht pro akzeptiertem Quote oder Job. Die fruehere Formulierung "neu gestartet pro Quote/Job" war falsch. Withdraw-Blocker ohne Slash ist allein ein aktiver Job (Provider) bzw. ein laufender Quote-Lock (Maker, `release_bond_lock`).
| Council-Bond | `maker_vault::CouncilBond` | ja: `get_council_bond` (:1317) | KEINE Withdraw-Funktion vorhanden | nein |
| Stake auf Agent | `VaultRegistry.stakes` | NEIN, nur `get_total_stake_on_agent`, `get_stakers_of_agent` | `unstake_from_agent` (:852), gesperrt bei aktivem Quote | nein |
| Yield (Staker) | `StakeEntry.accrued_yield` | nein | KEINE Claim-Funktion; v1-Anteil 0 | nein |
| RFQ-Escrow (Maker-Leg, funded) | `rfq_engine` Request, Tokens im gepoolten Escrow-Account | nur per ID: `get_request`, `get_quote`; Zaehler `get_next_request_id` | `reclaim_unaccepted_quote` (rfq_engine.move:1039) nach `expires_at`; Request-TTL 5 min (:62) | /rfq listet Requests ohne Adressfilter; kein Reclaim-Button |
| RFQ-Escrow (akzeptiert, beide Legs) | `RFQRegistry.accepted` | nur per ID: `get_accepted_quote`, `accepted_quote_status`; Zaehler `get_next_quote_id` | `execute_settlement` vor Deadline; `claim_unwind` (:1504) danach, permissionless | /rfq, /founder Status pro Quote; `claim_unwind` existiert in `lib/supraTx.ts:121`, aber Testnet-gebunden (chain 6) |
| Compute-Job-Escrow | `compute_rfq::Job` | nur per ID: `get_job_v2` (compute_rfq.move:2868), `get_request_v2` (:2814) | `reclaim_expired_request_v2` (:2257), `claim_no_delivery_v2` (:2650), `claim_dispute_unwind_v2` (:2744) | /market pollt eigenen Job; keine Claim-Builder |
| Request-Fee | Fee-Account | nein, unwiderruflich weg | keiner | nein |
| Slash / Sequester | Burn + `wcosmo::OverhangLedger` | nur global (`sequestered_amount`, `reserved_amount`); pro Operator nur `slash_count` | `reserved_amount` "awaits v2 payout", keine Claim-Funktion | /vault indirekt ("penalty remainder") |

Kein Dokument plant bisher eine Per-Nutzer-Ansicht. Naechste Verwandte: `plans/vault-visibility-plan.md`, `plans/bond-ux-clarity-plan.md`, `plans/compute-selfservice-bond-plan.md`.

## Entscheide (abgeleitet aus Renes Befund 02.10., zu bestaetigen)

- Das Fuenfer-Schema "Wallet / Locked / Escrow / Bonded / Claimable" wird zu SECHS Zeilen umgebaut:
  1. **Wallet** (COSMO, wCOSMO)
  2. **Bonded** mit Zustand "withdrawable now", "withdrawable from DATUM" (Slash-Lock) oder "blocked while a job is active" (Locked ist kein eigener Topf, sondern ein Zustand von Bonded)
  3. **In escrow** pro Quote/Job mit Deadline und Satz "what happens next"
  4. **Claimable** = NUR Positionen, die per Klick zurueckkommen (abgelaufene Escrow-Legs). Yield und Reserve erscheinen hier NICHT (Claims-Disziplin: nichts anzeigen, was nicht einloesbar ist)
  5. **Gone, with reason** (Request-Fees, Strafabzuege) -- ohne diese Zeile geht die Summe nicht auf, und genau das erzeugt das Gefuehl "Geld weg"
  6. **Not readable per address yet** (Honesty-Box: Stakes, Yield, Reserve) -- ehrlich benennen statt weglassen
- Jede Nicht-Wallet-Zeile traegt "wann und wie kommt es zurueck", in Stufe 2b mit Button.
- Sprache: Englisch, uebersetzungsfest wie in bond-ux-clarity ("security deposit", "penalty deduction", "held in the vault"); Function-IDs unveraendert.
- Alle Zahlen live von Chain, Zeitstempel der Abfrage sichtbar. Keine hartcodierten Betraege.
- `/maker-onboarding/m2` bleibt eingefroren. `lib/supraTx.ts`, `rfqConfig`, `starkeySign` (Testnet chain 6) werden NICHT importiert; Muster ist `src/lib/mainnetOnchain.ts` + `ProviderBondHelper.tsx`.

## Stufe 1 -- Bond-Moment auf /compute/bond (kleinster Schritt, kein neuer Route)

STATUS: GEBAUT + LIVE 02.10.2026. Pure Logik in `src/app/compute/bond/lib/depositOutcome.ts` (12 Tests, 2 Mutationen rot), Box + Quittung in `ProviderBondHelper.tsx`, `bond_cooldown_secs` live gelesen. Rollback-Drill PASS vor dem Build (out.pre-portfolio, zurueckgespielt, md5 gleich, zurueckgetauscht). M2-Seite nach Normalisierung der Build-Hashes identisch.

Ziel: das Gefuehl dort abfangen, wo es entsteht, vor dem Signieren.

Datei: `src/app/compute/bond/ProviderBondHelper.tsx` (Fork-Pattern beibehalten)

1. **Vor "Sign in StarKey"** (Zeile ~712) eine Box "What happens to your tokens": exakter Payload-Betrag (nicht Projektion) geht in `provider_vault`; "withdrawable from DATUM" live aus `get_provider_bond` + `cooldown` (14 d, neu gestartet pro Job; `active_job_count > 0` blockiert Withdraw); Satz "Your wallet balance will show X less. The deposit is held in the vault, not spent."
2. **Nach Bestaetigung** (Zeile ~395) eine Quittung: neuer Bond, neue Wallet-Balance, withdrawable-from, Link auf Stufe-2-Seite (sobald vorhanden, sonst /vault).
3. **Withdraw** bleibt in Stufe 1 Text. Button kommt in Stufe 2b.

Kein Chain-Write ausser dem bestehenden Deposit-Flow. Keine neuen Views noetig.

## Stufe 2a -- `/portfolio` read-only Abstimmungsansicht

Neu:
- `src/app/portfolio/page.tsx` (Server-Wrapper, Metadata, indexierbar)
- `src/app/portfolio/PortfolioView.tsx` ('use client', StarKey-Connect wie ProviderBondHelper, Chain-8-Enforcement hart)
- `src/app/portfolio/lib/positions.ts` -- PURE Klassifikation (Request/Quote/Job-Record + now -> Zeile + Rueckweg), ohne Fetch; einzige Stelle mit Policy-Logik
- `src/app/portfolio/lib/portfolioData.ts` -- Fetch-Layer ueber `rpcView`/`rpcViewAll` aus `mainnetOnchain.ts`

Geaendert:
- `src/lib/mainnetOnchain.ts` -- Konstanten fuer `maker_vault`/`rfq_engine` Module (Adresse COSMOCLAW existiert), keine neuen Betraege
- `src/components/navigation.tsx` -- Link "Portfolio" (D-PV-1)
- `src/app/compute/bond/ProviderBondHelper.tsx` -- Quittungs-Link aus Stufe 1 auf /portfolio

Datenquellen pro Zeile:
- Wallet: `primary_fungible_store::balance` fuer COSMO_META und WCOSMO_META
- Bonded: `operator_available` + `get_operator_bond` guarded (abort -> "no deposit"), `get_provider_bond`, `get_council_bond`; Zustand aus `locked_until_secs` vs. Chain-Zeit. Council: Hinweis "no withdraw function in v1".
- In escrow / Claimable (RFQ): Fenster-Scan `get_next_request_id` rueckwaerts ueber N IDs (D-PV-2), `get_request` + `get_quote`; Treffer wenn maker == addr (funded) oder taker == addr; akzeptierte Quotes ueber `get_next_quote_id` rueckwaerts + `get_accepted_quote`. Claimable wenn `expires_at` bzw. `settlement_deadline_secs` < now und Status offen.
- In escrow / Claimable (Compute): Fenster-Scan ab `get_next_job_id` bzw. `get_next_request_id` (compute_rfq.move:1514-1522) rueckwaerts mit `get_job_v2`, `get_request_v2`.
- Gone: Request-Fee pro eigenem Request aus `request_fee_quants` im Record (`get_request`); Strafen: nur `slash_count` pro Operator, Betrag ist nicht pro Adresse on-chain -> Text "amount not recorded per address, see /vault".
- Honesty-Box: Stakes, Yield, Reserve mit je einem Satz warum nicht lesbar.

Harte Regeln:
- Scan ist ein FENSTER, kein Zensus. Anzeige immer "checked the last N requests / M quotes / K jobs at TIME". 0 Treffer = "none in window", nie "none".
- Zeitvergleiche gegen Chain-Zeit (Block-Timestamp aus RPC), nicht gegen `Date.now()` allein; Abweichung > 60 s als Warnung anzeigen.
- Keine Summe "total deposited": ohne Event-Indexer nicht beweisbar. Stattdessen Zeilen, die einzeln belegt sind.
- Seite fordert in 2a KEINE Signatur an.

## Stufe 2b -- Rueckweg-Buttons (separates GO, Chain-Writes)

Neue Mainnet-Tx-Builder in `src/app/portfolio/lib/portfolioTx.ts` (Muster: inline BCS wie ProviderBondHelper; NICHT supraTx.ts):
- `provider_vault::withdraw_provider_bond` (Vorbedingung: locked_until vorbei, active_job_count == 0)
- `maker_vault::withdraw_operator_bond` (Vorbedingung: locked_until vorbei)
- `rfq_engine::reclaim_unaccepted_quote` (nur Maker, nach expires_at)
- `rfq_engine::claim_unwind` (permissionless, nach Deadline)
- `compute_rfq::reclaim_expired_request_v2`, `claim_no_delivery_v2`, `claim_dispute_unwind_v2`

Button nur aktiv, wenn die Vorbedingung in derselben Abfrage gerade verifiziert wurde; Abort-Codes (hex + Symbol im vm_status) auf Klartext mappen. Zwei-Schritt-UX "Show payload" -> "Sign in StarKey" wie bisher.

## Stufe 3 -- Contract-Luecken (eigener Plan in `/root/cosmo-contracts-move`, nicht Teil dieses Plans)

Fuer eine oeffentliche Version noetig, alles als `upgrade_policy = "compatible"` ueber die 2-of-3-Multisig:
- Per-Staker-View `get_stake(nft, staker)`
- Adresse -> offene Request-/Quote-/Job-IDs: entweder On-Chain-Index (Storage-Wachstum pruefen) oder Event-Indexer off-chain (dann ersetzt er den Fenster-Scan aus 2a)
- Council-Bond-Withdraw
- Yield: Claim-Funktion bauen ODER Feld aus jeder UI fernhalten (v1-Anteil 0)
- Slash-Betrag pro Operator persistieren (heute nur Count), sonst bleibt "Gone" unvollstaendig

## Betrugs-/Fehlervektoren und Gegenmassnahmen

- Falsches "Claimable" -> Nutzer signiert, Tx abortet, Gas weg: Vorbedingung live pruefen, Button sonst gesperrt; Tests mit Fixtures an der Grenze (expires_at == now).
- Falsches "withdrawable now" waehrend Cooldown neu gestartet wurde: Abfrage direkt vor Button-Freigabe wiederholen.
- Scan-Fenster suggeriert Vollstaendigkeit: Pflicht-Label "last N checked"; aeltere Positionen ueber manuelle ID-Eingabe nachschlagbar.
- Phishing-Aehnlichkeit: 2a fordert nie eine Signatur; 2b zeigt Payload vor dem Signieren.
- RPC-Ausfall: jede Zeile einzeln "unavailable", nie 0 als Wert.

## Tests (muessen beweisen, nicht korrelieren)

- `positions.test.ts`: Klassifikation pro Record-Typ; Mutation: `expires_at` um 1 s verschieben MUSS die Zeile von "escrow" nach "claimable" bewegen; Status "settled" darf nie in escrow landen.
- Guard `get_operator_bond`-Abort -> `null` -> "no deposit" (nicht 0 Bonded mit Datum).
- Fenster-Scan mit 0 Treffern rendert "none in window" (Selektor-Test auf den Wortlaut).
- Stufe 1: Snapshot der Pre-Sign-Box enthaelt exakt den Payload-Betrag; Projektion und Payload duerfen nicht vertauscht sein.
- Regressionswache `maker-onboarding/m2` per HTML-Diff (byte-identisch).

## Streichliste (bewusst nicht gebaut)

- Kein globales Wallet-Widget in der Nav (erst wenn /portfolio steht).
- Kein Event-Indexer in diesem Plan.
- Keine "total deposited"-Summe.
- Kein Maker-Deposit-Pfad fuer die verbundene Wallet (Maker-Onboarding bleibt gated); nur read-only Anzeige + Withdraw in 2b.
- Keine Aenderung an /vault, /rfq, /market ausser Links.

## Kill-Conditions

- Fenster-Scan ueber N IDs dauert > 8 s am Mainnet-RPC -> N halbieren; unter N = 50 -> Stufe 2a bis Event-Indexer (Stufe 3) pausieren.
- Chain-Zeit vs. Browser-Zeit weicht wiederholt > 60 s ab -> Claimable-Zeile nur mit Warnhinweis, Buttons in 2b gesperrt.
- Zweiter Contract-Abort trotz "gruener" Vorbedingung -> 2b-Button abschalten, Ursache in Stufe 3 klaeren.

## Entscheidungen (Rene, 2026-10-02)

- D-PV-1 ENTSCHIEDEN: Route `/portfolio`.
- D-PV-2 ENTSCHIEDEN: Startwerte 200 Requests / 200 Quotes / 100 Jobs, kein Dogma. Laufzeit des Scans messen und automatisch reduzieren: Fenster halbieren, wenn ein Durchlauf laenger als 8 s dauert; aktuelles Fenster und gemessene Laufzeit im Label "checked the last N ... in X s" anzeigen. Untergrenze 50, darunter Kill-Condition.
- D-PV-3 ENTSCHIEDEN: Stufe 2b ist ein separates GO. Read-only und Chain-Writes sind zwei Risikoklassen und werden nie im selben Deploy ausgeliefert.
- D-PV-4 ENTSCHIEDEN: Stufe 1 separat, aber nur nach bewiesenem Rollback. Beweis = vor dem Deploy wird `out.pre-portfolio` angelegt UND einmal tatsaechlich zurueckgespielt (`out` gegen die Kopie tauschen, Seite im Browser pruefen, wieder vortauschen). Der Rollback-Schritt steht als Pflicht-Punkt im Umsetzungs-Runbook, nicht nur als Kopie.
- D-PV-5 ENTSCHIEDEN: Stufe-3-Plan wird jetzt angelegt, nichts gebaut. Begruendung: die fehlenden Per-Address-Views und der Event-Indexer bestimmen langfristig, was `/portfolio` ueberhaupt zuverlaessig versprechen darf. Plan: `/root/cosmo-contracts-move/plans/portfolio-onchain-views-plan.md`.

Beim Nachpruefen am 02.10. geschlossen:
- Zaehler-View fuer Compute-Jobs existiert: `compute_rfq::get_next_job_id` (compute_rfq.move:1520), Requests: `get_next_request_id` (:1514).
- Request-Fee liegt als Feld `request_fee_quants` im Request-Record (rfq_engine.move:246) und ist ueber `get_request` lesbar. Die Zeile "Gone" kann die Fee pro eigenem Request exakt ausweisen.

## Umsetzungsreihenfolge

1. Stufe 1 (eine Datei). Runbook: `cp -r out out.pre-portfolio`, Rollback einmal real durchspielen (D-PV-4), dann `npm run build` (build IST deploy).
2. Stufe 2a mit Tests und Laufzeit-Messung des Scans (D-PV-2), dann Build mit demselben Rollback-Runbook.
3. Stufe 2b nur auf eigenes GO (D-PV-3).
4. Stufe 3 liegt als Plan im Contracts-Repo (D-PV-5); Bau nur auf eigenes GO.
