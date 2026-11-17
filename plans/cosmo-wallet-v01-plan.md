# COSMO Wallet v0.1 — Plan (lokaler Prototyp)

## Context

Die Website (heros.cloud, Next.js Static Export) hat bereits `/portfolio` ("My tokens") mit StarKey-Verbindung, wCOSMO/COSMO-Beständen, Sicherheitsleistungen und Claim/Withdraw. Es fehlen: Wallet-Status (Adresse, Netzwerk), SUPRA-Bestand, Transaktionen, Marketplace-Aufträge, ein Einstieg in TRACE und ein Platz für spätere Intel-Agent-Funktionen. Ziel ist eine Erweiterung von `/portfolio`, keine neue Wallet-Anwendung.

Grenzen aus dem Auftrag: keine Keys/Seeds, keine neuen Signatur- oder Handelsfunktionen, Marketplace unverändert, nur bestätigte Chain-Daten, nichts am Produktivsystem, **keine Commits/Pushes/Merges/Deploys**. Der allgemeine Website-Umbau (`plans/website-cosmo-stack-plan.md`) bleibt ausgesetzt.

## Ist-Zustand (Ergebnis der Prüfung)

**StarKey**
- Kein gemeinsamer Wallet-Zustand auf der öffentlichen Seite. Rund 10 Stellen lesen `window.starkey.supra` selbst und halten die Adresse in eigenem React-State (`PortfolioView.tsx:168-216`, `ProviderBondHelper.tsx:229-286`, `market/lib/marketWallet.ts`, `market/lib/computeSend.ts`, `BuySaleHelper`, `UnwrapHelper`, `AccessGate`, `CommunityRfq`, `M2BondHelper`, `lib/starkeySign.ts`).
- `context/WalletContext.tsx` existiert, ist aber nur auf `/founder` gemountet (zieht `nftGate.ts` mit Tradeport-Env ins Bundle, `layout.tsx:6-9`). Für `/portfolio` nicht wiederverwenden.
- Ursachen für doppelte Dialoge / Widersprüche: (1) nur Market merkt sich die Wallet (`cosmo_market_wallet_seen` + stilles `account()`), `/portfolio` verlangt erneut `connect()`; (2) `accountChanged`-Listener werden bei jedem Klick neu registriert und nie entfernt; (3) kein Listener für Netzwerkwechsel; (4) `starkeySign.ensureNetwork` schaltet auf `RFQ_CHAIN_ID` (Default Testnet 6), Mainnet-Seiten zurück auf 8.

**/portfolio** (`src/app/portfolio/`)
- Freies Adressfeld + Connect, Snapshot (Block, Chain-Zeit), wCOSMO/COSMO, Sicherheitsleistungen, offene Jobs/Offers (Scan-Fenster), "Ready to take back", "Gone", Honesty-Box, Claim/Withdraw nur für verbundene Adresse auf Chain 8.
- Fehlt: SUPRA-Coin-Bestand, Transaktionshistorie, Market-Jobs, TRACE, Intel.

**Marketplace / Sicherheitsleistungen**
- Market: `marketWallet.ts` (connect ohne Chain-Check, stiller Read) + `computeSend.ts` (Chain 8). Bond: `ProviderBondHelper` mit eigenem Zustand über `@/lib/mainnetOnchain`. `/vault` ohne Wallet.

**TRACE-005** (`/root/w-trace`, `feat/trace-005-local-ui` @ `3568662`, eingefroren)
- `run.ts serve` bindet nur `127.0.0.1:4777`, keine CORS-Header, kein Login, ein Lauf gleichzeitig; Doku: "not for public deployment".
- Oberfläche liest weder Query noch Hash → keine Adressübergabe per URL möglich.
- `index.html` eines Laufs ist eigenständig (keine Netzwerkzugriffe) → als statische Datei auslieferbar. Supra-Wallet-Referenzlauf für M2 vorhanden: `docs/trace/runs/run-20261106T085338Z` (809 KB).

**RPC geprüft (17.11., `rpc-mainnet.supra.com`, CORS `*`)**
- `POST /rpc/v1/view` `0x1::coin::balance<0x1::supra_coin::SupraCoin>` → liefert SUPRA-Bestand.
- `GET /rpc/v3/accounts/{a}/transactions?count=` und `GET /rpc/v1/accounts/{a}/coin_transactions?count=` → liefern Transaktionen mit `block_header` (Höhe, Zeit).

## Wiederverwendung

| Baustein | Quelle |
|---|---|
| Provider-Zugriff, Adressvergleich, Formatierung | `src/lib/mainnetOnchain.ts`: `getSupra`, `CHAIN_ID`, `sameAddr`, `normAddr`, `shortAddr`, `rpcView`, `faBalance`, `fmtAmt`, `fmtSupraAmt` |
| Bestände, Positionen, Scan-Fenster | `portfolio/lib/portfolioData.ts` (`fetchWalletSnapshot`, `scanPositions`, `bondPositions`), `positions.ts` |
| Claim/Withdraw (unverändert) | `portfolio/lib/portfolioTx.ts`, `ClaimPanel` in `PortfolioView.tsx` |
| Stiller Wallet-Read + Seen-Flag | `market/lib/marketWallet.ts`: `getAccountSilent`, `markWalletSeen` (nur importieren) |
| Market-Jobs | `market/lib/marketApi.ts` `fetchJobs()` (GET), `market/lib/myJobs.ts` `getMyJobs()` |
| UI | `components/cosmo/`: `Surface`, `Chip`, `TokenPosition`, `TechDetails`, `MaturityBadge`; lokale `Row`/`KV`/`Empty` in `PortfolioView.tsx` |
| TRACE | bestehende CLI/Server in `/root/w-trace/src/trace/` (keine zweite Implementierung) |

## Erweiterungskonzept

### A. Arbeitsumgebung
- Eigener Worktree, damit der Master-Checkout (fremde uncommittete Dateien, Parallel-Sessions) unberührt bleibt: `git worktree add /root/w-wallet -b feat/cosmo-wallet-v01 master`. Alles bleibt uncommittet.
- `node_modules` per Symlink aus dem Hauptcheckout; falls Next damit nicht startet: `npm ci` im Worktree. Untrackte `.env*` aus dem Hauptcheckout kopieren.
- Diesen Plan als `plans/cosmo-wallet-v01-plan.md` in den Worktree legen.
- Dev-Server nur `npx next dev -p 3100 -H 127.0.0.1`. Kein `scripts/deploy.sh`, Port 3001 nicht anfassen. Achtung: Dev-Rewrite `/api/market/*` zeigt auf die Live-API (:4100) → ausschließlich GET.

### B. Eine Wallet-Sitzung für `/portfolio` — neu `src/lib/walletSession.ts`
- Modulweiter Store + Hook `useWalletSession()` (`useSyncExternalStore`): `{ status: 'no-wallet' | 'disconnected' | 'connected', address, chainId, onMainnet, connect(), refresh() }`.
- `connect()`: genau ein laufendes Promise (zweiter Klick hängt sich an → kein zweiter Dialog); Ablauf wie heute in `PortfolioView` (`p.connect()`, `getChainId`, `changeNetwork('8')` nur beim expliziten Klick); danach `markWalletSeen()`.
- Beim Laden: stiller Read über `getAccountSilent()` (nur wenn Market-Flag gesetzt) → wer auf Market verbunden hat, ist auf `/portfolio` ohne Dialog verbunden. Kein Netzwerkwechsel ohne Klick.
- Listener für Konto- und Netzwerkwechsel genau einmal pro Seite registrieren; bei Fokus des Fensters `refresh()`.
- Keine Signaturfunktion in diesem Modul.
- `PortfolioView.tsx`: lokalen Connect-Block (L168-216) durch den Hook ersetzen; `signer` wird aus der Sitzung abgeleitet. `signBlock`, `ClaimPanel`, Kill-Regeln bleiben wortgleich.
- Market, Bond, Buy, Unwrap bleiben in v0.1 unverändert (Umstellung auf die Sitzung = offener Punkt für später).

### C. Neue Bereiche auf `/portfolio` (Komponenten unter `src/app/portfolio/components/`)
1. **Wallet-Status** (oben): Adresse (kurz + Explorer-Link), Netzwerk ("Supra mainnet" bzw. "other network — switch in StarKey"), Status-Chip, Connect-Knopf. Ohne StarKey: Hinweis, Adressfeld bleibt nutzbar.
2. **Bestände**: SUPRA neu über `coinBalance(addr)` in `portfolioData.ts` (`rpcView`, 8 Dezimalen, `fmtSupraAmt`), dazu COSMO und wCOSMO wie bisher. Nicht lesbar = "unavailable", nie 0. Jede Zahl mit Block/Chain-Zeit des Snapshots.
3. **Gebundenes Kapital**: vorhandene Zeilen "Safety deposits" und "Locked in open jobs and offers" unter einer Überschrift, Summe je Token über `sumByToken`. Honesty-Box bleibt.
4. **Aufträge**: (a) On-Chain-Positionen aus `scanPositions` (vorhanden); (b) Market-Jobs: `fetchJobs()` gefiltert auf `buyerWallet` = Adresse, plus lokale `getMyJobs()`; Link auf `/market/job/?id=`. Nur lesen.
5. **Transaktionen**: neu `portfolio/lib/walletActivity.ts` — liest je 20 Einträge aus beiden Account-Endpunkten, führt nach Hash zusammen, zeigt nur Einträge mit Block-Header und Ausführungsstatus (also in einem Block bestätigt), Felder: Zeit, Funktion (kurz), Erfolg/Fehlschlag, Explorer-Link. Text: "latest 20 confirmed transactions, not the full history". Reiner Parser `parseActivity()` mit Tests.
6. **TRACE-Einstieg**: siehe D.
7. **Intel-Agent**: ausgegraute Karte "Not available yet", ohne Funktion und ohne Datenabruf.

Textregeln beachten: `scripts/check-plain-language.cjs` (Fachbegriffe nur in `TechDetails`), kein "Staked"/Vollständigkeits-Versprechen.

### D. TRACE-Anbindung (Entscheid: statisch + Prefill)
- **Statisch**: `scripts/import-trace-run.cjs <laufverzeichnis>` kopiert nur `index.html` nach `public/trace/<run>/` und pflegt `public/trace/index.json` (`{ address, chain, run, generated_at, hops }`). Import des M2-Referenzlaufs `run-20261106T085338Z`. Die Wallet-Seite lädt `index.json`, zeigt bei Treffer "Open trace of this address (generated <Datum>)" → `/trace/<run>/index.html`; ohne Treffer: "No trace published for this address yet".
- **Prefill** (in `/root/w-trace`, uncommittet): im `SHELL`-Skript von `src/trace/server.ts` (L176-232) `URLSearchParams` lesen (`input`, `chain`, `hops`), mit denselben Mustern wie `util.ts` prüfen, Felder füllen, **kein** automatischer Start. Ein Server-Test dazu in der bestehenden Testdatei.
- Knopf "Open in local TRACE" → `http://127.0.0.1:4777/?input=<adresse>&chain=supra`, nur sichtbar, wenn die Seite selbst von `localhost`/`127.0.0.1` geladen ist. Für öffentliche Besucher erscheint er nie.
- Öffentlicher TRACE-Dienst und Veröffentlichung von Trace-Seiten auf heros.cloud: nicht Teil von v0.1, eigener Entscheid.

## Geänderte / neue Dateien

Website-Worktree `/root/w-wallet`:
- neu `src/lib/walletSession.ts`, `src/lib/walletSession.test.ts`
- neu `src/app/portfolio/lib/walletActivity.ts` + Test; `portfolioData.ts` (+ `coinBalance`)
- neu `src/app/portfolio/components/{WalletStatus,Balances,Orders,Activity,TracePanel,IntelPlaceholder}.tsx`
- `src/app/portfolio/PortfolioView.tsx` (Hook statt lokalem Connect, neue Bereiche einhängen)
- neu `scripts/import-trace-run.cjs`, `public/trace/index.json`, `public/trace/run-20261106T085338Z/index.html`
- neu `plans/cosmo-wallet-v01-plan.md`, `docs/wallet-v01/README.md` (Ist-Zustand, Wiederverwendung, Testbericht, offene Punkte)

TRACE-Worktree `/root/w-trace`: `src/trace/server.ts` (Prefill) + Server-Test.

Nicht angefasst: `src/app/market/**`, `compute/bond`, `buy`, `wcosmo`, `starkeySign.ts`, `context/WalletContext.tsx`, PM2, nginx, `cosmo-releases`.

## Verifikation

1. `npm test` im Worktree (vitest + Plain-Language-Check) grün; neue Tests: `parseActivity` (bestätigt/ohne Block-Header verworfen, Zusammenführung nach Hash), `coinBalance`-Parsing, Sitzung (ein Connect-Promise bei zwei Klicks, Listener nur einmal, Kontowechsel leert Zustand). Je Wächter eine Mutation: Fix zurückdrehen → Test rot.
2. `npx jest src/trace` in `/root/w-trace` grün inkl. Prefill-Test.
3. `git diff --stat master -- src/app/market src/app/compute src/app/buy src/app/wcosmo` leer.
4. Browser (agent-browser, Dev-Server :3100):
   - ohne StarKey: Hinweis, Adressfeld mit M2-Adresse → SUPRA-Bestand stimmt mit direktem `curl`-View überein, Transaktionen = Hashes aus dem Endpunkt, Trace-Link öffnet die importierte Seite.
   - mit Schein-Provider (`window.starkey.supra` nur `account/connect/getChainId/on`, kein Signieren): verbunden-Zustand, fremdes Netzwerk, Kontowechsel, zwei schnelle Connect-Klicks = ein `connect()`-Aufruf; Market-Flag gesetzt → `/portfolio` ohne Dialog verbunden.
   - TRACE lokal starten (`run.ts serve`), Knopf "Open in local TRACE" → Feld vorbelegt, Lauf startet nicht von selbst; Dienst danach stoppen.
5. `npm run build` im Worktree als Typ-/Export-Check (schreibt nur ins Worktree-`out/`).
6. Skill `user-reality-check` vor dem Testbericht anwenden.
7. Echter StarKey-Durchlauf bleibt Rene vorbehalten: nummerierte Anleitung (SSH-Tunnel :3100/:4777, Schritte, Prüfpunkt) im Testbericht.

## Offene Punkte (nach v0.1, je eigener Entscheid)
- Market/Bond/Buy/Unwrap auf die gemeinsame Sitzung umstellen.
- Veröffentlichung von Trace-Seiten bzw. öffentlicher TRACE-Dienst.
- Ältere Transaktionen (Blättern), vollständige Auftragsliste (braucht Indexer, Stufe 3 des Portfolio-Plans).
- Intel-Agent-Funktionen.
- Abgleich mit dem ausgesetzten `website-cosmo-stack-plan.md` (verlangt dort leeren Diff auf `/portfolio`).
