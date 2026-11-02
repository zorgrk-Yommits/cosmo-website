# Record: S0 Discovery "Tokenisierte Aktie AAPL -> USDG" (read-only)

Stand 01.11.2026 14:45 MEZ (13:45 UTC). GO Rene "go fuer S0 Discovery" 01.11. ~14:20 MEZ. Plan `plans/robinhood-stock-token-plan.md` v0.1.
Kein Kapital, keine Venue-Writes, keine Signaturen. Rohreads + Skripte + SHA256SUMS in `stock-discovery-2026-11-01/`.
Laufende Messung: `price-sources-logger.mjs` (PID auf VPS, 36 h ab 01.11. 14:36 MEZ, alle 5 min) schreibt
`/root/logs/killer-demo-robinhood/stock-discovery/price-sources-aapl-36h.jsonl` (Venue AAPL/USDG + DORA 6004 + Chainlink AAPL/USD);
Auswertung (Schritt S0.2, Staleness-Schwelle) folgt nach dem US-Handelstag Mo 02.11. (Open 15:30 MEZ = 14:30 UTC, US-Winterzeit ab 01.11.).

## Ergebnis in einem Satz

Zwei unabhaengige AAPL-Preisquellen sind lesbar (Supra DORA Index 6004 AAPL_USD auf Supra Mainnet; Chainlink "Robinhood AAPL / USD"
auf Robinhood Chain), der AAPL-Token ist ein frei transferierbarer, pausierbarer ERC-20 (Beacon-Proxy) mit laufender DEX-Aktivitaet,
SDK 0.4.1 kennt AAPL auf robinhood als registrierten Asset: **keine Kill-Condition ausgeloest, P1 kann starten** -- mit zwei Befunden,
die den Plan aendern (Anker-Form und Staleness, siehe unten).

## S0.1 Preisquellen

| Quelle | Lesbar | Wert (Stand Read) | Zeitstempel | Form |
|---|---|---|---|---|
| Supra DORA `get_price(6004)` (AAPL_USD) | JA, Mainnet RPC view | 344.45345 USD | 1793391786150 ms = Fr 30.10. 21:23:06 MEZ (20:23:06 UTC) | u128 bei 18 dec, round 1793391786000; gleicher Modul wie 500/48/89 |
| Chainlink "Robinhood AAPL / USD" Proxy `0x6B22A786bAa607d76728168703a39Ea9C99f2cD0` (Aggregator `0xBb11A21267cFDb63d4935d99a499133DD1744ACb`) | JA, eth_call `latestRoundData` (Alchemy-RPC aus .env; public RPC auch) | 344.90763487 USD | updatedAt 1793389873 = Fr 30.10. 20:51:13 MEZ (19:51:13 UTC) | 8 dec, roundId 18446744073709552463, heartbeat 86400 s, deviation 0.5 %, marketHours us_equities_24/5, feedCategory custom, productTypeCode primaryTokenizedPrice |
| Venue `GET /api/oracle?pair=AAPL/USDG` | JA | base aapl_usd 344.45345, quote usdc_usdt 1.0009, conversionRate 344.1437 | base.timestamp 1793391786150 | **identisch mit DORA 6004 (Wert + ms-Zeitstempel)**: der Venue-Feed IST DORA, keine zweite Quelle |
| Chainlink "USDG / USD" Proxy `0x61B7e5650328764B076A108EFF5fa7282a1B9aD2` | JA | 0.99985 | Sa 31.10. 16:48:40 MEZ | 8 dec, Stablecoin-Feed (Ersatz fuer die Annahme USDG = 1 USD, optional) |

Quellen: DORA-Katalog docs.supra.com/oracles/data-feeds/data-feeds-index (Equities 6000-6115, 116 Feeds, alle auf Mainnet lesbar:
`dora-equities-*.json`; AAPL_USD = 6004, SUPRA_USDT = 499 "Under Supervision", USDC_USDT = 47, USDT_USD = 48); Index-Scan 0-1049
(`dora-scan.jsonl`, 515 Feeds, hoechster Index 577). Chainlink-Liste `cl-robinhood-mainnet.json` =
reference-data-directory.vercel.app/feeds-robinhood-mainnet.json (58 Feeds; Stock-Feeds AAPL/AMZN/META/MSFT/NVDA/SPY/TSLA, dazu ETH/USD,
USDC/USD, USDG/USD). docs.robinhood.com/chain/oracles-and-price-feeds: "Stock feeds update 24/5, following market hours", Pausen bei
Corporate Actions.

Abweichung DORA vs Chainlink am Freitagsschluss: 344.45345 vs 344.90763 = 13.2 bps (Chainlink letzter Tick 19:51 UTC vor US-Close
20:00 UTC; DORA 20:23 UTC = After-Hours-Tick). K-10-Analog 25 bps haette gehalten; ueber den Handelstag messen (Logger).

**Befund A (Plan-Aenderung Anker):** Der Plan sah "Venue-Oracle = K-9/K-10-Cross-Check, DORA oder Chainlink = Anker" vor. Da der
Venue-Feed byte-gleich DORA 6004 ist, traegt der Venue-Check keine Unabhaengigkeit. Vorschlag P1: Anker = DORA 6004 (N-5-Muster,
Supra-RPC-View wie heute), unabhaengiger Cross-Check = Chainlink AAPL/USD per EVM-Read (Reader aus P1 vorhanden), Venue-Read nur noch
als Konsistenz-Check "Venue == DORA" (fail-closed bei Abweichung). Entscheid Rene nicht noetig (Details, Stack-Grundsatz), wird in P1 so gebaut.

**Befund B (Staleness nicht "< 10 min fuer beide"):** Chainlink aktualisiert nur bei 0.5 % Abweichung oder nach 24 h Heartbeat; eine
Chainlink-Altersgrenze von 10 min ist damit auch waehrend der Handelszeit meist verletzt. Form fuer P1: DORA-Alter <= X (aus dem
36-h-Log ableiten, Erwartung Sekunden bis wenige Minuten innerhalb 15:30-22:00 MEZ), Chainlink-Alter <= 86400 s + 60 s UND Abweichung
DORA/Chainlink <= 50 bps (zweifache Chainlink-Deviation; Schwelle nach Log festziehen, nicht raten). Ausserhalb der Handelszeit stehen
beide Feeds (41 h alt am Sonntag) -> UNDECIDABLE ohne Retry, wie geplant.

## S0.2 Venue-Oracle-Verhalten

Sonntag 01.11.: base aapl_usd steht seit Fr 21:23 MEZ (Alter 41 h), quote usdc_usdt laeuft (Alter Sekunden), updatedAt laeuft
(= Zeit der Berechnung, nicht der Daten). Also: `updatedAt` ist KEIN Frischemass; nur `base.timestamp` zaehlt. AAPL/USDC liefert
`quote: null` mit conversionRate = base.price (USDC ohne Feed); AAPL/SUPRA lesbar (supra_usdt 0.0001126). 36-h-Log laeuft, Auswertung offen.

## S0.3 SDK 0.4.1 (`sdk041-aapl-ids.json`)

- `canonicalChain('robinhood')` = robinhood-mainnet; `registeredAssetId('robinhood','AAPL')` =
  `0xeb163a6c925a3b4f117da05db1a3cde635683ed482c41060dcd7526150b228b2` (== deriveAssetId, registriert); USDG wie Policy v2
  `0x84f2da2b...`. Pair AAPL/USDG (Kunde gibt AAPL, erhaelt USDG) = `0x12c92144903b7dae62aadbf400663f2d4631310676b79a029ea630ceef2cb4b9`;
  USDG/AAPL = `0x5eeb0ed5...` (andere Richtung, nicht verwenden).
- Amounts in nativen Dezimalen (asset-registry.d.ts): 0.005 AAPL = `5000000000000000` (5e15). rate_BFT = rateDisplay * 10^(18 + 6 - 18)
  = 344.45 USDG/AAPL -> `344450000`. Lock = ceil(5e15 * 344450000 / 1e18) = `1722250` USDG-Micro = 1.72225 USDG (6 dec).
- Delegate-Caps (`AssetCapEntry`): `maxTradeSize`/`maxEarmarkTotal` als u128 Micro-Units pro AssetId, 0 = keine Trades, fehlend = nicht
  handelbar. AAPL-Cap 0.005 = 5e15 passt; USDG-Cap 3 = 3000000. Ob das dApp-Formular 18-dec-Betraege (0.005) annimmt, ist nur mit Rene
  im Browser pruefbar (P2 Schritt 3/4; Formular-Minimum ETH wie D-RH5 moeglich).
- `encodePlaceQuoteAmounts` liegt in `dist/src/asset-registry.js`, nicht im Index-Export (fuer P1: direkt importieren oder eigene BigInt-Form).

## S0.4 Quote-Mathematik vs 18 dec (Code-Review, keine Aenderung)

- `makerMarket.ts`: fair = 1e36 * scale / ref mit ref = USD je QUOTE-Einheit (SUPRA) und Base = Stable (1 USD). Fuer AAPL/USDG ist die
  Base das bepreiste Asset und die Quote der Stable: fair_rate_bft = ref_AAPL_1e18 * 10^(6 - 18) / ... -> **keine Inversion**, neue
  Anker-Form "base-priced" (P1.2). Auch `lockUsd`-Zweig ("quote asset is SUPRA") und `margin_base_units` (= fill_size - lock_usd in Base)
  sind auf Base = Stable gebaut -> fuer AAPL: Margin in USDG = lock_usd_fair - lock. `rateScale` (10^(6-18) = div 1e12) ist generisch.
- `stableAssetOf` (makerDecide.ts) akzeptiert stable = quote -> V-7M Backing-Read (USDG, evm) unveraendert nutzbar.
- `makerFunds.ts` F1 prueft das Quote-Asset der Policy (hier USDG, id generisch) gegen den Ceil-Lock -> passt (Lock in USDG-Micro).
- Kunde `customerOracle.ts` ist auf SUPRA/USDG-Inversion gebaut -> fuer AAPL/USDG direkter Base-Preis (plan P1.4), zusaetzlich Konsistenz
  Venue == DORA 6004.
- V-4M-Skala/F-ASSET/FP2: Deltas in Base-Units (18 dec) bleiben BigInt; keine Number-Pfade im Beweispfad gefunden (ts-Grep makerMarket,
  makerFunds, stable). Die Jest-Lehre (BigInt in --json) gilt weiter.

## S0.5 AAPL-Token auf Robinhood Chain (`rh-evm-reads-*`, `rh-aapl-proxy-*`, `rh-aapl-impl-*`)

- `0xaf3d76f1834a1d425780943c99ea8a608f8a93f9`: name "Apple (Punkt) Robinhood Token", symbol AAPL, 18 dec, totalSupply 11225.21367 AAPL,
  chainId 0x1237 (4663), Block 103422304 (01.11. 14:35 MEZ). Vault 0xC038 haelt 0 AAPL, Linked Address 0x8f38 haelt 0 AAPL.
- Contract = **Beacon-Proxy** (EIP-1967 Beacon-Slot -> Beacon `0xe10b6f6b275de231345c20d14ab812db62151b00`, implementation()
  `0xb35490d6f9163de4f80d88dc75c3516eb64c5ae2`, 11614 Bytes). Selektoren in der Implementierung: paused/pause/unpause, mint, burn(address,
  uint256), hasRole (AccessControl), permit, transfer; `paused()` = false. `isBlocked(address)`-Selektor im Bytecode, Aufruf revertet
  (vermutlich andere Signatur) -> Blocklist-Status von Vault/Linked Address nicht lesbar; Upgrade/Pause/Blocklist liegen beim Emittenten.
- Transferierbarkeit belegt: 19 Transfer-Events in den letzten 2000 Bloecken (public RPC, 01.11. Sonntag), u. a. DEX-Routing
  (Tx 0xbbd765af..., 0x4755f502...). Alchemy Free Tier: eth_getLogs max 10 Bloecke -> Transfer-Reads in P1 ueber public RPC oder blockweise.
- Blockscout (robinhoodchain.blockscout.com) ist hinter Cloudflare-Challenge: API v2 per curl nicht nutzbar, nur Browser.

## Kill-Conditions (Plan) -- Stand

| Kill-Condition | Stand |
|---|---|
| Keine zweite unabhaengige AAPL-Preisquelle | NICHT ausgeloest: DORA 6004 + Chainlink 0x6B22... beide lesbar; Venue = DORA (keine dritte) |
| Venue lehnt AAPL-Deposit ab / Cap-Form kennt 18 dec nicht | OFFEN bis P2 (nur mit Rene pruefbar); SDK-Form kennt 18 dec, Vault hat nie AAPL gesehen (0 Stueck, 0 RFQs) |
| AAPL nicht frei uebertragbar | NICHT ausgeloest: paused() false, laufende Transfers; Restrisiko Emittenten-Pause/Blocklist (Doku: Pausen bei Corporate Actions) |
| Uniswap-Kauf scheitert | OFFEN bis P2 Schritt 1 (Rene) |

## Naechster Schritt

P1 Code (neuer Chat, Branch feat/killer-demo-robinhood) mit Befund A (Anker DORA 6004, Cross-Check Chainlink, Venue == DORA) und
Befund B (Staleness-Form) als Plan-Aenderung v0.2; Staleness-Zahlen erst nach Auswertung des 36-h-Logs (Mo 02.11. abends) pinnen.
Rene-Handgriffe (P2) unveraendert; kein GO offen fuer P1 (Rene 01.11. 15:00 "wir machen das").
