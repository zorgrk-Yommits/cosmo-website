# Site-Clarity-Refactor: "In 10 Sekunden verstanden"

Repo: `/root/workspace/meine-website/cosmo-clawagent` (Next 16 App Router, static export, Tailwind v4, Branch `master`).
Erster Schritt der Umsetzung: diesen Plan nach `plans/site-clarity-plan.md` ins Repo kopieren und committen; Umsetzung in neuem Chat, Etappe fuer Etappe.

## Context

Jede Seite soll nach 10 Sekunden ohne Blockchain-Wissen erklaerbar sein: Bild zuerst, dann ein Klartext-Satz, Technik aufklappbar. Die Bestandsaufnahme zeigt drei Ursachen, warum das heute nicht gilt:

1. **Kein gemeinsames Vokabular, keine gemeinsamen Bausteine.** Alle Texte stehen inline je Seite; es gibt keinen Baustein fuer Ablaufbild, Statusleiste, "Technical details", Reifegrad-Kennzeichnung, Wallet-Verbindung oder Transaktionsstatus (10 eigene `connect`-Varianten, 5 verschieden gestylte `<details>`).
2. **Die Startseite erzaehlt zwei Geschichten.** Hero = Mandates, das einzige Bild darunter = Job-Ablauf. Erster Bildschirm mobil ist reiner Text, CTAs unter dem Falz.
3. **Die Oberflaeche sagt an mehreren Stellen etwas anderes als der Code.** Einfachere Texte wuerden das nur sichtbarer machen, also wird es mit behoben.

Entscheidungen (Rene, 03.10.): **Jobs zuerst** als Leitstory (POSITIONING wird v6.1) · **nur Texte ehrlich machen**, keine neuen Transaktionen · **Kernseiten voll, Archiv nur Rahmen**, Manifesto unangetastet.

## Leitplanken

- Keine neue Funktion, keine neue Transaktion, keine Aenderung an Tx-Buildern (`computeTx.ts`, `portfolioTx.ts`-Payloads, `computeSend.ts`).
- Nichts Technisches wird entfernt: es wandert in `TechDetails` (Funktionsnamen, Hashes, Payloads, Explorer-Links).
- POSITIONING-Verbote gelten weiter (kein Sicherheits-/Rendite-/Compliance-Versprechen; Marktplatz ist nicht das volle Execution-Case-Framework; "built on Supra"). "COSMO gets it done" braucht direkt daneben: die Arbeit machen kuratierte Provider, Pilotphase.
- Uebersetzungsfestes Englisch, Abwehr-Ton raus, ehrliche Grenzen direkt neben der Aussage.
- Keine fest verdrahteten Parameterzahlen im Text: live lesen (`bond_cooldown_secs`, `dispute_bond_bps`, `dispute_ttl_secs`, Mindest-Deposit) oder ohne Zahl formulieren.
- Farbe bleibt Prozesszustand (`src/design/tokens.ts`), `font-sans` auf `<body>`, plain `<a>` bei Cross-Route-#hash.
- Ernst und technisch, nicht verspielt: vorhandene Tokens, Geist/Geist Mono, lucide-Icons, ruhige Bewegung mit reduced-motion-Fallback.

## Vokabular (ein Ort: `src/components/cosmo/terms.ts`)

| Technisch | Oberflaeche |
|---|---|
| Request | Job |
| Quote | Offer |
| Settlement / settle | Payment / paid |
| Escrow | Locked payment |
| Provider bond / security deposit | Safety deposit |
| Slash / penalty deduction | Deposit penalty |
| Mandate | Rules |
| Artifact | Result |
| Acceptance criteria | What counts as done |
| Solver | Provider |
| Frozen specification | Fixed job description |
| Review window | Time to check the result |

Der technische Begriff erscheint weiter in `TechDetails` und einmal als Klammerzusatz, wo Experten ihn suchen ("Rules (mandate)").

## Statusleiste: ehrliche Abbildung

Quelle: `market/lib/marketStatus.ts`, `computeViews.ts`, `NextStepPanel.tsx:231-262`. On-chain gibt es zwischen "angenommen" und "laeuft" keinen Unterschied, deshalb:

| Stufe | Deckt ab | Unterzeile sagt, wer dran ist |
|---|---|---|
| Waiting | `submitted`, `approved` | "In review" / "Waiting for offers" |
| Accepted | `selected` bis Request OPEN/QUOTED | "You: lock payment" / "You: confirm the offer" |
| Running | Job ACTIVE | "Provider is working, due <time>" |
| Checking | Job DELIVERED | "You: check the result by <time>. After that the provider is paid automatically." |
| Paid | Job SETTLED | "Provider paid" |

Endzustaende neben der Leiste, nie in sie gepresst: Not approved · Cancelled · Expired (payment can be taken back) · Not delivered (payment refunded, provider penalised) · Disputed · Refunded. Die rohe Zustandszahl aus `DeliverPanel.tsx:339-347` entfaellt.

Abweichung vom Brief, bewusst: Provider druecken nicht "Accept job", sie geben ein Angebot ab und der Kaeufer waehlt. Provider-Ablauf heisst daher **Wallet → Safety deposit → Make an offer → Do work → Get paid → Withdraw deposit**.

## Etappe 0: Fundament (kein sichtbarer Umbau)

Neue Bausteine in `src/components/cosmo/`, jeweils aus Bestehendem herausgeloest:

| Baustein | Basis | Zweck |
|---|---|---|
| `FlowStrip` | `components/PrimitiveChain.tsx` | Ablaufbild aus Icon + 1-2 Woertern je Schritt; mobil umbrechend, nie horizontal scrollend |
| `StatusTrack` | `market/components/FlowRail.tsx` + `rfq/components/PhaseRail.tsx` | Fuenf Stufen, "you"-Marker, Endzustaende |
| `TechDetails` | `<details>` aus `assurance/Assurance.tsx:745-748` | einheitlicher Aufklapper "Technical details" |
| `MaturityBadge` | `cosmo/Chip.tsx` | Live · Pilot · Tested · Experimental · Planned · Archive, eine Definition je Stufe |
| `TokenPosition` | `vault/components/StatTile.tsx`, `depositOutcome.ts` | In your wallet / Locked / Free to withdraw / At risk, als Balken + Zahlen |
| `PageIntro` | `cosmo/SectionHeader.tsx` | Kopf jeder Seite: ein Satz, `FlowStrip`, naechste Aktion, `MaturityBadge` |
| `WalletButton`, `TxStatus` | `market/components/WalletChip.tsx` | einheitliche Anzeige; `TxStatus` = Waiting for your signature → Sent → Confirmed / Failed / Not confirmed yet |

Dazu:
- `explainAbort`, `parseVmAbort`, `fetchTxStatus`, `waitForTx` aus `portfolio/lib/` nach `src/lib/txStatus.ts` verschieben (Tests ziehen mit), damit Market und Deposit sie nutzen koennen.
- `terms.ts` + Waechter `scripts/check-plain-language.cjs` (in `npm test`): verbotene Begriffe in JSX-Text ausserhalb `TechDetails` und einer Allowlist (Archivseiten, Admin). Waechter per Gegenprobe pruefen: Begriff einsetzen → rot.
- `docs/POSITIONING.md` → v6.1: Hierarchie 1. Jobs ("AI needs work done. COSMO gets it done."), 2. Liquidity under rules, 3. Kategorie. Dabei bereinigen: "private verifier" (Verifier ist oeffentlich), Widerspruch "independent".
- Vertragsfakten gegen den deployten Stand bestaetigen (Quelle `cosmo-contracts-move/compute-rfq/sources/`). Vorab gelesen: Einzahlung setzt keine Sperre (`provider_vault.move:369`), nur eine Strafe setzt `locked_until` (`:512`); `cancel_request_v2` (`compute_rfq.move:2223`) und `dispute_delivery_v2` (`:2606`) existieren on-chain, nur nicht in der Oberflaeche; bei Abnahme erhaelt der Provider den Preis, der Dispute-Bond ist ohne Dispute 0 (`:1304-1328`).

## Etappe 1: Landing, Navigation, Rahmen

- **Hero** (`landing/sections/Hero.tsx`): H1 "AI needs work done. COSMO gets it done." · ein Satz: Agent postet Job, Provider liefert, bezahlt wird erst nach Pruefung · `FlowStrip` **AI Agent → COSMO → Provider → Result → Payment** im ersten Bildschirm, auch mobil · zwei Buttons: "Post a job", "Earn as a provider" · `MaturityBadge` Pilot. WebGL-Szene raus aus dem Hero (dekorativ, verdraengt das Ablaufbild); Promo-Download wandert nach unten.
- **Reihenfolge** (`Landing.tsx`): Hero → How a job works (6 Schritte als `FlowStrip` mit Karten statt 432vh-Scroll-Pin; Move-Aufrufe in `TechDetails`) → Live jobs → Liquidity-Saeule (Bild + Satz + Link) → Where you come in (3 statt 5 Wege: Get work done / Earn / Manage liquidity) → Proof → Treasury sale → Closing. `Problem.tsx` schrumpft auf einen Vorher/Nachher-Vergleich.
- **Navigation** (`components/navigation.tsx`): Get work done `/market/` · Earn `/compute/` · Liquidity `/mandates/` · My tokens `/portfolio/` · Proof `/assurance/` · Button "Post a job"; "Buy wCOSMO" und "$COSMO" sekundaer. Mobil: Scroll-Lock + Fokusfalle.
- **Rahmen** (`app/layout.tsx`): Footer auf dieselben Begriffe; Metadata/OG-Titel auf die Job-Story; `app/not-found.tsx` mit drei Wegen zurueck.
- Tote Links "All jobs" → `/market/` (`JobDetail.tsx:81,91`, `WorkDetail.tsx:70,80`, `PostJobForm.tsx:159`, `ComputeLanding.tsx:162,548`, `ProvidersView.tsx`).

## Etappe 2: Kaeuferweg (`/market`, `/market/post`, `/market/job`)

- `PageIntro` mit **Post job → Get offer → Lock payment → Work happens → Check result → Pay provider**.
- `/market/job`: `StatusTrack` oben, darunter genau eine naechste Aktion. Buttons nennen die echte Handlung mit echtem Betrag aus `escrowParams`: "Choose this offer", "Lock 200 wCOSMO", "Confirm and start", "View result", "Pay provider". On/off-chain-Pillen, Hashes, Tx-Belege in `TechDetails`.
- Vor "Lock payment": `TokenPosition` (Wallet-Guthaben, was gesperrt wird, was bleibt), dazu Frist und Pruefzeit in Klartext. Guthaben-Lesen ueber vorhandenes `faBalance` (`lib/mainnetOnchain.ts`).
- Ehrliche Texte statt der heutigen Zusagen (`NextStepPanel.tsx:407-408, 605-611, 647-650`): "Before you confirm, an expired job lets you take the payment back on My tokens" (Link `/portfolio/`) · "No result by the deadline: take your payment back on My tokens" · "Disagree with the result? Contact us before <time>. There is no button for this yet."
- `TxStatus` mit `waitForTx`/`explainAbort`: ein gescheiterter Versand wird als "Failed" gezeigt statt "sent, server syncs" (`useMarketFlow.ts:357-366, 401-410, 444-453`).
- `PostJobForm.tsx`: Feld "What counts as done", Hilfetexte in Klartext, Fehlermeldungen als Satz mit Abhilfe.

## Etappe 3: Providerweg (`/compute`, `/compute/bond`, `/market/work`, `/market/providers`)

- `PageIntro` mit dem Provider-Ablauf (siehe oben), `MaturityBadge` "Pilot, curated providers".
- `/compute/bond`: Titel "Safety deposit". `TokenPosition` vor und nach dem Signieren aus `depositOutcome.ts`. Aktive Jobs und Strafen-Zaehler raus aus dem Aufklapper, sichtbar. Roh-Payload in `TechDetails`. Hinweis + Link "Withdraw on My tokens". `TxStatus` mit echtem Fehlerzustand (`ProviderBondHelper.tsx:403-436`).
- Auszahlungsregel ueberall gleich und wahr: "Free to withdraw when no job is active. A deposit penalty locks the rest for <live cooldown>." Korrigiert `ComputeLanding.tsx:145`, `CustodyFlowDiagram.tsx:238`; "14 days"/"10%" (`ProviderBondHelper.tsx:466,824,829`, `PortfolioView.tsx:356`, `ComputeLanding.tsx:111,565`) live oder ohne Zahl.
- `/compute`: richtige Funktionsbezeichnung in `TechDetails` (`ComputeLanding.tsx:80-84,612-619`), Risiken als eigene sichtbare Karte "What can go wrong".
- `/market/work`: "Make an offer", "Hand in result", "You will receive <price>" sichtbar; "solver"/"artifact"/SHA-Felder erklaert, Technik aufklappbar.

## Etappe 4: Wo sind meine Tokens (`/portfolio`, `/vault`, `/buy`, `/wcosmo`)

- `/portfolio`: `TokenPosition` als Kopf (In wallet · Locked in jobs · Safety deposit · Ready to take back), darunter Zeilen mit je einem Button ("Withdraw deposit", "Take payment back"). Hinweis, dass Provider-Einnahmen aus Jobs hier noch nicht erscheinen (`positions.ts:397,430`).
- `/vault`: ein Satz + `CustodyFlowDiagram` als Einstieg; Peg, Operatoren, Parameter in `TechDetails`-Gruppen.
- `/buy`, `/wcosmo`: `PageIntro` + `FlowStrip` (Pay SUPRA → Get wCOSMO; wCOSMO ↔ COSMO 1:1), einheitliche `WalletButton`/`TxStatus`.

## Etappe 5: Liquidity, Proof, Archiv

- `/mandates`: H1 "Let an agent manage liquidity without giving it unlimited control." Neues SVG `RulesDiagram` nach dem Motiv von `public/mandates/vlm-001/share-image.png`: Your wallet → Rules (limit, end date, allowed actions) → Agent acts → Proof. Tabelle "Allowed / What happened" aus der VLM-001-Seite. Kennzeichnung wahr: "Tested once on Ethereum mainnet, ended 28 Aug 2026. No mandate is running now." Begriff "mandate" erst danach.
- `/assurance`: Einstieg "Every claim links to something you can check" + Zaehlfehler beheben (7 statt 6 Belege, VLM-001 aufnehmen), "private verifier" korrigieren (`Assurance.tsx:77,95,376-377`).
- Statische Seiten: `public/mandates/vlm-001/index.html` und `public/verifier/index.html` bekommen oben einen Klartext-Einstieg; Widersprueche der VLM-Seite (Titel "Three" vs "Four", CLOSE "unused") beheben. `/vsa/` und Evidence-Ordner ohne `index.html` bekommen eine schlichte Indexseite statt Verzeichnislisting. Manifesto unveraendert.
- Archiv (`/rfq`, `/demo`, `/community-rfq`, `/maker-capital`, `/access`, `/protocol`, `/institutional`): `ProtocolNotice` wird einheitlicher Archiv-Kopf mit `MaturityBadge` Archive und einem Erklaersatz. `/founder`: "live" → "testnet".

## Ablauf je Etappe

1. Eigener Commit-Satz, kein `git add -A` (untracked `public/media/`, `portfolio-k1.png` bleiben draussen). Push nur auf Auftrag.
2. Pruefen ohne Deploy: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run dev` auf freiem Port.
3. Sichtpruefung mit agent-browser bei 390 px und 1440 px: erster Bildschirm zeigt Satz + Bild + naechste Aktion, kein horizontales Scrollen.
4. Deploy erst nach GO: `cp -r out out.pre-site-clarity-eN`, dann `npm run build` (schreibt ins live `out/`; `postbuild` prueft Sale-Konsistenz), Stichprobe live, Rollback = Ordner zuruecktauschen.

## Verifikation (Abnahme)

- **10-Sekunden-Test je Kernseite:** ein frischer Agent bekommt nur den Screenshot des ersten Bildschirms und beantwortet "What is this? What happens here? What do I do next?"; Antwort wird gegen den Soll-Satz der Seite verglichen. Das ist ein Vorfilter; der echte Test mit einer Person ohne Krypto-Wissen liegt bei Rene (Skill `user-reality-check`, Kit in `docs/usability/buyer-flow/`).
- **Wahrheitstest:** jede sichtbare Aussage zu Status, Geld und Fristen hat eine Code- oder Vertragsstelle; Waechter-Skript gruen; vorhandene Tests (`marketStatus`, `positions`, `portfolioTx`, `depositOutcome`, `phases`) gruen und um die Stufen-Abbildung erweitert.
- **Experten-Test:** jede frueher sichtbare Tx/Hash/Funktions-/Payload-Angabe ist in hoechstens einem Klick erreichbar.
- **Rundlauf:** der fuer 03.10. vereinbarte Test (1 wCOSMO auf `/compute/bond` einzahlen, auf `/portfolio` abheben) dient nach Etappe 3/4 als echter Sign-Test der neuen Zustandsanzeigen.

## Nicht in diesem Plan

Storno- und Dispute-Button, Provider-Einnahmen im Portfolio, Zusammenlegen der vier StarKey-Wrapper, Aenderungen am Market-Backend, Manifesto-Text.

## Status

### Etappe 0: umgesetzt 03.10.2026 (nicht deployt, keine sichtbare Aenderung)

- Bausteine in `src/components/cosmo/`: `FlowStrip`, `StatusTrack`, `TechDetails`, `MaturityBadge`, `TokenPosition`, `PageIntro`, `WalletButton`, `TxStatus`. Noch von keiner Seite benutzt. Sichtpruefung ueber eine temporaere Vorschauseite bei 390 px und 1440 px, kein horizontales Scrollen (auch 360 px); Vorschauseite wieder entfernt.
- `src/lib/txStatus.ts`: `fetchTxStatus`, `waitForTx`, `parseVmAbort`, `explainAbort` aus `portfolio/lib` hierher verschoben (alte Importe laufen ueber Re-Exports weiter), neu `outcomeOf` und `explainSignError`.
- `terms.ts` + `scripts/check-plain-language.cjs`, in `npm test` eingehaengt. 44 Dateien stehen in `scripts/plain-language-pending.json`; die Liste darf nur schrumpfen. Grenze des Waechters: er sieht JSX-Text, Strings in JSX und Copy-Properties, nicht Saetze, die eine Hilfsfunktion zusammenbaut.
- `docs/POSITIONING.md` v6.1.
- 6-Schritte-Ablaeufe passen bei 390 px nicht in eine Zeile: dort `layout="stack"` nehmen oder Umbruch akzeptieren. 5 Schritte passen.

Vertragsfakten, am 03.10.2026 live von Mainnet gelesen (alle vier sind Views, spaetere Etappen lesen sie live statt Zahlen in Texte zu schreiben):

| View | Wert | Bedeutung |
|---|---|---|
| `provider_vault::bond_cooldown_secs` | 1209600 | 14 Tage Sperre, nur nach einer Strafe |
| `provider_vault::slash_comp_bps` | 1000 | Strafe 10 %, laut Quelle vom Jobpreis (v1) bzw. vom geforderten Deposit (v2), gedeckelt auf das Deposit |
| `compute_rfq::dispute_bond_bps` | 500 | Kaeufer hinterlegt 5 % des Preises beim Reklamieren |
| `compute_rfq::dispute_ttl_secs` | 604800 | 7 Tage bis zur Rueckabwicklung einer Reklamation |

Quelle der Regeln: `cosmo-contracts-move/compute-rfq/sources/` auf Branch `feat/gpu-provider-poc`; ob dieser Stand byte-gleich deployt ist, wurde nicht geprueft, die vier Werte oben stammen von der Chain.

### Etappe 1: umgesetzt 03.10.2026 (lokal, NICHT deployt; Deploy erst nach GO)

- Hero: "AI needs work done. COSMO gets it done." + Ablaufbild AI Agent → COSMO → Provider → Result → Payment im ersten Bildschirm (390 px und 1440 px geprueft), Buttons "Post a job" / "Earn as a provider", Pflicht-Zusatz (COSMO macht die Arbeit nicht selbst, Pilot) darunter. WebGL-Szene, `PhaseRail`, `usePhase` geloescht (three.js steht noch in package.json, wird nicht mehr importiert).
- Reihenfolge: Hero → Why it is needed (Vorher/Nachher) → How a job works (6 Karten, Move-Aufrufe in TechDetails) → Live jobs → Liquidity → Three ways in → Proof → Treasury sale → Closing.
- `phases.ts`: Schritte heissen Post job / Get offer / Lock payment / Work happens / Check result / Pay provider; Feld `proof` heisst jetzt `technical` und wird nur in TechDetails gezeigt.
- Navigation: Get work done · Earn · Liquidity · My tokens · Proof, dahinter leiser "Buy wCOSMO", Button "Post a job"; volle Leiste ab 1024 px, darunter Menue mit Scroll-Sperre und Fokusfalle; "$COSMO" im Menue und Footer.
- Footer nach denselben vier Gruppen, Titel/Description/OG auf die Job-Story, `app/not-found.tsx` neu.
- Sieben "All jobs"-Links zeigen jetzt auf `/market/` statt auf die Startseite.
- Waechter-Liste 44 → 32 Dateien.
- Offen fuer spaeter: `HonestyBox` im Live-jobs-Abschnitt spricht noch Fachsprache (Etappe 2); Evidence-Kacheln fuehren teils noch auf Verzeichnislistings (Etappe 5); Abschnitte mit `Reveal` erscheinen erst beim Scrollen (bestehendes Verhalten).
