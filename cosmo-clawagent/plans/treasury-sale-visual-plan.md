# Treasury-Block anschaulicher (Landing) -- Plan v0.1, 2026-10-01

Auftrag Rene 01.10.: Treasury auf der Website anschaulicher darstellen.
Entscheid: Layout **Kennzahlen + Balken**, **nur Startseite** (`/buy` bleibt unveraendert).

## Ziel-Bild (Block direkt unter dem Hero, `#treasury-sale`)

```
TREASURY SALE  [Live on Supra Mainnet]
Buy wCOSMO with SUPRA
Buy wCOSMO directly from the COSMO project treasury. Capped and floor-protected on-chain.

 119,453          0.2398           2,948
 wCOSMO available  SUPRA per wCOSMO  SUPRA in treasury

 sold so far ##........................ available now
 15,546 (11%)                     119,453 (89%)

 No buy-back commitment . wCOSMO unwraps 1:1 to COSMO      [ Buy wCOSMO -> ]
```

## Datenquelle (keine neue)

Einzige Quelle bleibt `/api/sale/status` (Quoter liest `cosmo_sale::sale_status` on-chain).
Felder existieren bereits im Payload, werden bisher nur nicht gelesen:

| Anzeige | Feld | Regel |
|---|---|---|
| wCOSMO available | `chain.status.inventoryRaw` (6 dec) | abrunden (wie heute) |
| SUPRA per wCOSMO | `probe.tiles.effectiveAsk` | nur wenn `probe.ok === true`, sonst Kachel "--" (kein Fallback-Preis) |
| SUPRA in treasury | `chain.status.treasuryRaw` (8 dec) | abrunden |
| sold so far | `chain.status.soldLifetime` (6 dec) | abrunden |

Ehrliche Labels:
- **NICHT "SUPRA raised"**: `treasuryRaw` ist der ungesweepte Bestand (T1-Sweep 19.07. hat 210 SUPRA
  abgezogen), nicht der Lifetime-Erloes. Label = "SUPRA in treasury".
- Balken = `sold / (sold + inventory)`; Labels "sold so far" / "available now" (kein "% of supply").

## Aenderungen

1. `src/lib/saleStatus.ts`
   - `SaleChainStatus` um `soldLifetime?`, `treasuryRaw?` erweitern.
   - `SaleAvailability` um `soldWcosmo: number | null`, `treasurySupra: number | null`.
   - `SUPRA_DECIMALS = 8` (Konstante neben `WCOSMO_DECIMALS`).
   - Parse fail-closed pro Feld: kaputtes/fehlendes Nebenfeld -> nur dieses Feld `null`, `selling` bleibt
     unberuehrt (Inventar bleibt das Live-Kriterium). Kaputtes `inventoryRaw` -> wie heute `unreachable`.
2. `src/lib/saleStatus.test.ts` -- neue Faelle:
   - Happy Path mit soldLifetime/treasuryRaw (Werte vom 01.10.: 15546024053 / 294800000000 / 119453975947).
   - Nebenfeld kaputt (`"abc"`) -> Feld null, selling true.
   - Nebenfeld fehlt -> null.
   - probe.ok false -> effectiveAsk null (existiert, beibehalten).
   - Mutationstest: Abrundung durch Rundung ersetzen -> Test muss rot werden.
3. `src/components/landing/sections/TreasurySale.tsx`
   - Drei Stat-Kacheln (grosse tabellarische Zahl + mono-Label), darunter Balken (`role="meter"`,
     `aria-valuenow`/`aria-valuemax`, Text-Labels unter dem Balken -- Farbe nie einziger Traeger).
   - Alles NUR wenn `sale.selling`; sonst bleibt der heutige neutrale Block (kein Skelett mit Fake-Zahlen).
   - Mobile (<= 375 px): Kacheln stapeln 1-spaltig bzw. 3 schmale Spalten mit kleinerer Zahl, kein
     horizontales Scrollen; CTA volle Breite wie heute.
   - Header-Kommentar anpassen: Preis + Kennzahlen jetzt auch hier, aber weiterhin NUR live aus derselben
     Quelle; Preis-Herleitung (TWAP/Spread/Floor), Caps, Worst Case bleiben exklusiv auf /buy.
   - Design-Tokens des Repos (`surface-*`, `ink-*`, `line-*`, `phase-*`), keine neuen Farben.
     Vor dem Bau `dataviz`-Skill laden (Meter/Stat-Tile-Regeln).
4. Kein Eingriff in Quoter, nginx, `/buy`, Navigation.

## Waechter / Gates

- `npm test` (vitest) gruen, inkl. neuer Faelle.
- `npm run build` -> `postbuild` `check:sale-live` muss gruen sein.
- Statisches HTML (`out/index.html`) darf KEINE der Live-Zahlen enthalten (grep auf "wCOSMO available"
  Zahlenwerte / "Live on Supra Mainnet") -- Zahlen nur zur Laufzeit.
- Sichtpruefung Desktop + 375 px, Light/Dark, auf https://heros.cloud/ nach Build.

## Deploy (build == deploy!)

1. Vorher `rm -rf out.pre-*` und `cp -r out out.pre-treasury-visual` (genau EIN Snapshot).
2. Bauen erst nach GO Rene (Build ist sofort live).
3. Rollback: `rm -rf out && cp -r out.pre-treasury-visual out`.
4. Commit nur die geaenderten Dateien einzeln (`git add <pfad>`), nie `git add -A`; Branch `master`.

## Streichliste (bewusst nicht)

- Kein Lifetime-Erloes in SUPRA (nicht on-chain ableitbar ohne Event-Scan).
- Keine 1:1-Peg-Anzeige (Status-API liefert sie nicht; waere Quoter-Erweiterung = eigener Schritt).
- Keine Preisskala/Floor-Visualisierung auf der Landing (Rene: Variante Kennzahlen + Balken).
- Kein USD-Wert (Oracle-Kurs nicht im Status-Payload; waere zweite Quelle).
- Keine Aenderung an /buy.

## Kill-Conditions

- `check:sale-live` rot oder statisches HTML enthaelt Live-Zahlen -> nicht deployen.
- Status-Endpoint liefert die Felder nicht (Quoter-Version) -> Block faellt auf heutige Ansicht zurueck,
  kein Bau von Platzhaltern.
