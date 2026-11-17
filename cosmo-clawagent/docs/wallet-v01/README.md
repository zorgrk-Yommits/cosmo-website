# COSMO Wallet v0.1 — lokaler Prototyp (Erweiterung von `/portfolio`)

Stand 17.11.2026. Plan: `plans/cosmo-wallet-v01-plan.md` (Repo-Wurzel). Worktree `/root/w-wallet`, Branch
`feat/cosmo-wallet-v01`. **Nichts committet, nichts gepusht, nichts deployt.** Port 3001, PM2, nginx und
`cosmo-releases` wurden nicht angefasst.

**Technisch umgesetzt — Nutzbarkeit noch nicht durch reale Beobachtung belegt.**

## Was neu ist

| Bereich auf `/portfolio` | Inhalt | Quelle |
|---|---|---|
| Wallet-Status (oben) | verbunden/nicht verbunden/StarKey fehlt, Adresse mit Explorer-Link, Netzwerk, Connect, bei fremdem Netzwerk "Switch to Supra mainnet" | `src/lib/walletSession.ts`, `components/WalletStatus.tsx` |
| 1 · In your wallet | SUPRA (neu), COSMO, wCOSMO, je mit Block und Chain-Zeit; nicht lesbar = "unavailable" | `portfolioData.ts` `coinBalance`, `components/Balances.tsx` |
| Held or locked | Überschrift über Zeile 2 und 3 mit Summe je Token | `PortfolioView.tsx` |
| 6 · Jobs and offers | On-Chain-Einträge mit gebundenen Token; Market-Jobs mit dieser Adresse als Käufer; im Browser gemerkte Jobs getrennt | `lib/walletLinks.ts`, `components/Orders.tsx` |
| 7 · Latest transactions | die 20 neuesten bestätigten Transaktionen, Explorer-Link je Zeile | `lib/walletActivity.ts`, `components/Activity.tsx` |
| 8 · Trace | Link auf gespeicherte Trace-Seite der Adresse; "Open in local TRACE" nur auf localhost | `components/TracePanel.tsx`, `scripts/import-trace-run.cjs`, `public/trace/` |
| 9 · Intel agent | ausgegraute Karte, keine Funktion, kein Datenabruf | `components/IntelPlaceholder.tsx` |

Unverändert: Claim/Withdraw (`ClaimPanel`, `portfolioTx.ts`), `signBlock`-Texte, Kill-Regel, Honesty-Box, Scan-Fenster.
`Row`/`KV`/`Empty` wurden wortgleich nach `components/parts.tsx` verschoben (Row hat zusätzlich den Ton `neutral`).

## Eine Wallet-Sitzung (`src/lib/walletSession.ts`)

- Ein modulweiter Zustand mit Hook `useWalletSession()`; keine Signaturfunktion im Modul.
- `connect()`: genau ein laufendes Promise. Ein zweiter Klick hängt sich an, es gibt keinen zweiten Dialog.
- Beim Laden: stiller Read nur, wenn dieser Browser schon einmal verbunden hat (Flag der Market-Seiten). Wer auf
  Market verbunden hat, ist auf `/portfolio` ohne Dialog verbunden.
- Netzwerkwechsel auf Chain 8 wird nur bei einem Klick angefragt (Connect oder "Switch to Supra mainnet"), nie beim Laden.
- Listener für Konto- und Netzwerkwechsel werden einmal pro Seite registriert; bei Fensterfokus wird neu gelesen.
- Kontowechsel: alter Zustand wird sofort geleert (kein Knopf wirkt auf das alte Konto), dann still neu gelesen.

Abweichung vom Plan, klein: der Knopf "Switch to Supra mainnet" stand nicht im Plan. Ohne ihn gab es im Zustand
"verbunden, fremdes Netzwerk" keinen Weg, die Umschaltung von der Seite aus anzustoßen (im Browser-Test aufgefallen).

## TRACE

- **Statisch:** `node scripts/import-trace-run.cjs <laufverzeichnis>` kopiert nur `index.html` nach
  `public/trace/<run>/` und pflegt `public/trace/index.json`. Importiert: `run-20261106T085338Z` (M2, Supra, 1 Hop, 809 KB).
- **Prefill** (in `/root/w-trace`, uncommittet): die lokale Oberfläche liest `?input=&chain=&hops=`, prüft mit den
  Mustern aus `util.ts` und füllt nur das Formular. Ein Lauf startet nie von selbst.
- **Achtung:** alles unter `public/` geht beim nächsten Build nach `out/`. Würde dieser Stand deployt, wäre die
  Trace-Seite von M2 öffentlich. Das ist laut Plan ein eigener Entscheid; vor einem Deploy `public/trace/` entfernen
  oder freigeben.
- Eine volle 64-stellige Supra-Adresse gilt in TRACE formal als Tx-Hash-Muster (`util.ts`); der Server erkennt beim
  Lauf selbst, dass es eine Wallet ist. Für den Prefill ist das ohne Folge.

## Testbericht (17.11.2026)

| Prüfung | Ergebnis |
|---|---|
| `npm test` (vitest + Plain-Language-Check) | grün, 14 Dateien, 167 Tests; `plain-language: ok` |
| Neue Tests | Sitzung 10, Transaktions-Parser 14, SUPRA-Parsing 3, Jobs/Trace-Helfer 7 |
| Mutationen (Fix zurückdrehen → Test rot) | 12 von 12 rot: ein Connect-Promise, Listener einmal, Kontowechsel leert, kein stiller Read beim Erstbesuch, Netzwerkwechsel nur per Klick, Ausführungsstatus nötig, Block-Header nötig, Zusammenführung nach Hash, unlesbarer Bestand ≠ 0, Local-Knopf nur lokal, Jobs nur für eingetragenen Käufer, Laufname geprüft |
| `npx jest src/trace` in `/root/w-trace` | grün, 7 Suites, 66 Tests inkl. Prefill; Prefill-Mutation rot |
| Diff auf `src/app/market`, `compute`, `buy`, `wcosmo`, `starkeySign.ts`, `context/` | leer |
| `tsc --noEmit`, `eslint` auf `/portfolio` und `walletSession.ts` | sauber |
| `npm run build` | Kompilieren, Typen und Export grün (`/portfolio`, `out/trace/` vorhanden). **`postbuild` rot**: `check-sale-live-consistency` meldet fehlendes `NEXT_PUBLIC_SALE_LIVE=1`, weil `.env.local` im Worktree fehlt (siehe unten) |
| Browser ohne StarKey (:3100) | Hinweis "StarKey not found", Adressfeld nutzbar; SUPRA 7.755,75289155 = direkter View-Aufruf `775575289155`; die 20 gezeigten Transaktionen = die 20 neuesten der Vereinigung beider Endpunkte; Trace-Link öffnet die importierte Seite |
| Browser mit Schein-Wallet (ohne Signierfunktion) | Erstbesuch: nicht verbunden, 0 Wallet-Aufrufe. Zwei schnelle Klicks: 1 `connect()`. Kontowechsel: neue Adresse, kein neuer Dialog. Fremdes Netzwerk: Chip "Other network", Claim-Knöpfe weg, 0 `changeNetwork`. "Switch"-Knopf: zurück auf Mainnet, Knöpfe wieder da. Neu laden mit Market-Flag: verbunden, 0 `connect()`. Signaturaufrufe insgesamt: 0 |
| Lokales TRACE (:4777) | Link von der Seite füllt Adresse und Chain, Status "press Trace to start", Anzahl Läufe vorher/nachher gleich (11), `busy` leer. Dienst danach gestoppt |

| Echter StarKey (Rene, 17.11.2026, per SSH-Tunnel) | alle Prüfpunkte der Anleitung unten ok: ein Dialog bei zwei Klicks, Chips und Bestände, Kontowechsel ohne Dialog, fremdes Netzwerk und "Switch"-Knopf, stiller Wiedereinstieg nach Market, TRACE-Prefill ohne Selbststart. Nichts signiert. Dienste danach gestoppt |

Nicht geprüft: `npm run lint` über das ganze Repo.

### Umgebung, Abweichungen

- `node_modules` per Symlink scheitert am Build (Turbopack lehnt Symlinks nach außerhalb ab) → `npm ci` im Worktree, wie im Plan als Ausweichweg vorgesehen.
- `.env.local` wurde **nicht** kopiert: das Kopieren wurde von der Rechteprüfung der Sitzung abgelehnt und nicht umgangen. Folge: nur der `postbuild`-Check ist rot und `/buy` im lokalen Build hat den Kaufpfad aus. `/portfolio` braucht keine Env-Variable.
- Der `prebuild`-Schritt schrieb `public/evidence/index.html` um (im Worktree fehlen untrackte Evidence-Ordner); die Datei wurde auf den Git-Stand zurückgesetzt.

## Echter StarKey-Durchlauf (Rene)

1. Auf dem eigenen Rechner einen Tunnel öffnen: `ssh -L 3100:127.0.0.1:3100 -L 4777:127.0.0.1:4777 root@76.13.136.132`
2. Auf dem VPS, erstes Terminal: `cd /root/w-wallet/cosmo-clawagent && npx next dev -p 3100 -H 127.0.0.1`
3. Auf dem VPS, zweites Terminal: `cd /root/w-trace && npx ts-node -T --project tsconfig.src.json src/trace/run.ts serve --port 4777`
4. Im Browser mit StarKey: <http://localhost:3100/portfolio/> öffnen.
5. "Connect wallet" zweimal schnell klicken. **Prüfpunkt:** genau ein StarKey-Dialog.
6. Nach dem Verbinden: Chip "Connected" und "Supra mainnet", Deine Adresse, SUPRA/COSMO/wCOSMO mit Block.
7. In StarKey das Konto wechseln. **Prüfpunkt:** die Seite zeigt ohne Klick die neue Adresse; kein Dialog.
8. In StarKey auf Testnet schalten. **Prüfpunkt:** Chip "Other network", keine Knöpfe zum Zurückholen. Dann "Switch to Supra mainnet" klicken.
9. <http://localhost:3100/market/> öffnen, zurück zu `/portfolio/`, Seite neu laden. **Prüfpunkt:** verbunden ohne Dialog.
10. In Zeile 8 "Open in local TRACE" klicken. **Prüfpunkt:** Adresse steht im Feld, es läuft nichts, bis Du "Trace" drückst.
11. Nichts signieren. Beide Terminals mit Strg+C beenden.

Rückmeldung bitte je Prüfpunkt: ok / nicht ok, und was Du stattdessen gesehen hast.

## Offene Punkte (je eigener Entscheid)

- Market, Bond, Buy, Unwrap auf die gemeinsame Sitzung umstellen (heute weiter eigener Wallet-Code).
- Veröffentlichung von Trace-Seiten bzw. öffentlicher TRACE-Dienst; bis dahin `public/trace/` nicht deployen.
- Ältere Transaktionen (Blättern), vollständige Auftragsliste (braucht Indexer).
- Intel-Agent-Funktionen.
- Abgleich mit `website-cosmo-stack-plan.md` (verlangt dort leeren Diff auf `/portfolio`).
- Nutzerbeobachtung: `docs/usability/wallet-v01/plan.md`.
