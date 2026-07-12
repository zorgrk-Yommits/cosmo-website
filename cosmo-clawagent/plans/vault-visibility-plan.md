# /vault — Graphics-First Custody Dashboard (COSMO Website)

## Context

Der Maker-Vault (200 wCOSMO Custody im Resource Account, zwei Operator-Bonds M2/K1 à 100) ist on-chain verifizierbar, aber auf der Website unsichtbar. Rene will den Vault sichtbar machen und die Website generell stärker mit Grafiken statt Text bespielen. Entscheidungen (abgefragt): **neue Seite `/vault`** mit Nav-Tab, **Scope = komplettes Custody-Bild** (Maker-Vault + Provider-Vault + wCOSMO-Peg), **Stil = animierte Custody-Flow-Grafik oben + Live-Daten als visuelle Blöcke** (Balken/Meter/Status-Lampen) statt Texttabellen.

Repo: `/root/workspace/meine-website/cosmo-clawagent/` — Next.js 16.1.6 App Router, **static export** (`output: 'export'`, `trailingSlash: true`), Tailwind v4, dark-only (#030712), **keine Chart-Library** (bewusst: hand-gerollte SVGs wie `src/components/IntelligenceLoop.tsx`), framer-motion ^12.35 + lucide-react vorhanden. Deploy = manuelles `out/`-Verzeichnis-Swapping, PM2 `cosmo-clawagent` serviert statisch.

**Workflow-Hinweis:** Diesen Plan zu Beginn der Implementierung nach `plans/vault-visibility-plan.md` im Website-Repo kopieren (Renes Planmodus-Konvention).

## On-chain-Fakten (Mainnet chain 8, live verifiziert 2026-07-12)

- Maker-Vault-Modul: `${COSMOCLAW_ADDR}::maker_vault` (COSMOCLAW_ADDR = `0xf2785bf6…64e1`, steht schon in `mainnetOnchain.ts`)
- Custody: Resource Account `0x04830c9b762bf0e00d2620026eb172426c686bc8b04a9c350f004482fa1fd54f` (Seed `maker_vault_v1`), wCOSMO im Primary Fungible Store. Kein Private Key — SignerCapability liegt im VaultRegistry.
- Views: `get_total_locked(): u64`, `get_operator_bond(addr): (amount, locked_until_secs, slash_count)` — **ABORTET bei Adressen ohne Eintrag** (live bewiesen) → try/catch Pflicht, `operator_available(addr)`, `operator_slash_basis(addr)`, `is_operator_quote_eligible(addr): bool`, `get_admin()`. **Keine Operator-Enumeration on-chain** → M2/K1 als Konstanten.
  - M2 (aktiver Maker Slot 1): `0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb` (100M raw)
  - K1 (D-14 Stage B): `0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53` (100M raw)
- Invariante: `faBalance(resource_addr, WCOSMO_META) == get_total_locked()` (aktuell beide 200.000.000 raw = 200 wCOSMO, 6 Decimals). Differenz > 0 = Slash-Overhang.
- Provider-Vault: `${COMPUTE_PKG_ADDR}::provider_vault` — Views identisch zu `ProviderBondHelper.tsx:71-93`: `get_min_provider_bond`, `get_max_bond_per_provider`, `get_global_bond_cap`, `get_total_bonded`, `is_onboarding_paused`.
- Peg: `${COSMOCLAW_ADDR}::wcosmo` — `peg_holds`, `wcosmo_supply`, `reserve_balance` (Muster: `WcosmoGuide.tsx:47-59`).

## Step 0 — Session-Vorbereitung (vor jeder Zeile Code)

1. **`dataviz`-Skill lesen** (Pflicht vor Chart-Code). Bindende Regeln: Marks ≤24px mit 4px gerundeten Daten-Enden, 2px Surface-Gaps zwischen Stack-Segmenten, Text nie in Serienfarbe, Status nie nur über Farbe (immer Icon+Label), Meter-Track = hellere Stufe des Fill-Hues, Legende ab 2 Serien, reduced motion respektieren.
2. **`frontend-design`-Projekt-Skill lesen** (scoped auf `workspace/meine-website/` — greift hier).
3. Palette gegen `#030712` validieren (dataviz-Validator): Kandidaten **M2 = violet-400 `#a78bfa`**, **K1 = cyan-400 `#22d3ee`** (400er-Stufen; die 500er-Brand-Tokens riskieren <3:1 auf near-black). Status: emerald-400 / amber / red nur in Lampen mit Icon+Label.

## Step 1 — `src/lib/mainnetOnchain.ts` erweitern (nur Konstanten)

An den Addresses-Block anhängen (Fetch-Logik bleibt seiten-lokal, wie beim ProviderBondHelper-Präzedenzfall):

```ts
// maker_vault custody resource account (seed "maker_vault_v1"). No private key
// exists; the SignerCapability is held in VaultRegistry at COSMOCLAW_ADDR.
export const MAKER_VAULT_RESOURCE_ADDR =
  '0x04830c9b762bf0e00d2620026eb172426c686bc8b04a9c350f004482fa1fd54f';

// Known maker operators. There is NO on-chain enumeration view — update this
// list manually when operators change (source of truth: maker_vault bond txs).
export const MAKER_OPERATORS = [
  { key: 'M2', label: 'Operator M2', role: 'Active maker · Slot 1',
    addr: '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb' },
  { key: 'K1', label: 'Operator K1', role: 'Stage B · D-14',
    addr: '0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53' },
] as const;
```

Wiederverwendet ohne Änderung: `rpcView`, `rpcViewAll`, `faBalance`, `fmtAmt`, `shortAddr`.

## Step 2 — Nav-Tab

`src/components/navigation.tsx`, `navLinks`-Array (Zeile 9–17): nach dem `wcosmo`-Eintrag `{ href: '/vault', label: 'Vault' },` einfügen. Sonst nichts.

## Step 3 — Neue Dateien

```
src/app/vault/
  page.tsx                   thin server component + Metadata (Muster: wcosmo/page.tsx)
  VaultDashboard.tsx         'use client' Shell, Sektionen, Refresh-Header
  useVaultData.ts            Aggregat-Fetch-Hook, Fehler pro Sektion
  lib/vaultData.ts           Types + Fetcher (alle View-Calls)
  components/
    CustodyFlowDiagram.tsx   animierte SVG-Custody-Flow-Grafik (Hero)
    CompositionBar.tsx       gestapelter Horizontalbalken (M2/K1/Overhang)
    UtilizationMeter.tsx     Cap-Auslastungs-Meter mit Marker-Ticks
    StatusLamp.tsx           Icon+Label-Statusanzeige (good/warning/critical/unknown)
    StatTile.tsx             Label/Wert/Sub-Kachel
    OperatorCard.tsx         Pro-Operator-Kachel (Bond, Available, Lock, Eligibility)
```

### 3a. `lib/vaultData.ts` — Types + Fetcher

```ts
export type OperatorState = {
  key: string; label: string; role: string; addr: string;
  bond: { amount: bigint; lockedUntilSecs: bigint; slashCount: bigint } | null; // null = kein Eintrag (View abortet)
  available: bigint; slashBasis: bigint; eligible: boolean;
};
export type MakerVaultData = { totalLocked: bigint; custodyBalance: bigint; admin: string; operators: OperatorState[] };
export type ProviderVaultData = { minBond: bigint; maxPerProvider: bigint; globalCap: bigint; totalBonded: bigint; paused: boolean };
export type PegData = { pegHolds: boolean; supply: bigint; reserve: bigint };
```

Drei Fetcher, je intern `Promise.all`:
- `fetchMakerVault()`: `get_total_locked`, `faBalance(MAKER_VAULT_RESOURCE_ADDR, WCOSMO_META)`, `get_admin` + pro Operator `get_operator_bond` (via `rpcViewAll`, **eigenes try/catch → `bond: null`**), `operator_available`, `operator_slash_basis`, `is_operator_quote_eligible` (alle vier guarden).
- `fetchProviderVault()`: die fünf Views aus `ProviderBondHelper.tsx:71-93` (Shapes dort abschreiben).
- `fetchPeg()`: identisch `WcosmoGuide.tsx:47-59`.

BigInt-Koersion: `BigInt(String(v ?? 0))` — **ES2017-Target, keine bigint-Literale** (`123n` verboten, wie `bcsU64` es vormacht). Gesamt ~19 parallele View-Calls in 3 Sektions-Promises.

### 3b. `useVaultData.ts`

```ts
type Section<T> = { data: T | null; error: string | null };
// returns { maker, provider, peg, refreshing, lastUpdated, refresh }
```
`refresh` = useCallback: `Promise.allSettled([fetchMakerVault(), fetchProviderVault(), fetchPeg()])` → fulfilled = `{data, error: null}`, rejected = `{data: prev.data, error: msg}`. **Eine fehlschlagende Sektion zeigt Inline-Error-Strip, die anderen zwei rendern normal — Seite nie blank.** Fetch-on-mount via useEffect, kein Polling, manueller Refresh-Button (Muster `WcosmoGuide.tsx:89-103`).

### 3c. `CustodyFlowDiagram.tsx` (Hero-Grafik)

Struktur wie `IntelligenceLoop.tsx`: absolut positionierte HTML-Node-Karten über SVG-Edge-Layer (`viewBox 0 0 1000 520`), responsive (mobil vereinfacht vertikal stapeln). Props: `{ custodyBalance, totalLocked, operators }` — Live-Werte annotieren die Nodes, `—` solange null.

Nodes (5): **M2** (links oben, violet Border, Bond-Betrag) · **K1** (links unten, cyan) · **Custody** (Mitte, featured mit Purple-Glow: „Resource Account Custody", shortAddr, live Balance, Badge „No private key — SignerCapability only" mit Lock-Icon) · **VaultRegistry** (oben Mitte, „holds SignerCapability", gestrichelte Hairline zur Custody = Autorität, kein Asset-Flow) · **Exit** (rechts, split: „Withdraw (after lock)" / „Slash → overhang pool" mit AlertTriangle).

Edges: Deposit-Flows M2/K1→Custody in Serienfarbe ~50% Opacity mit **einem** Animationsmechanismus (stroke-dashoffset-Loop ODER animateMotion-Punkt — konsistent für alle Edges); Custody→Withdraw emerald, langsamer Puls; Custody→Slash amber gestrichelt. `useReducedMotion()` → statische Pfade.

### 3d. Live-Visual-Komponenten

- **CompositionBar** `{ total, segments: {key,label,value,color}[], format, ariaLabel }`: ein 24px-Stapelbalken, 4px gerundete Außenenden, **2px #030712-Gaps** zwischen Segmenten (Sibling-Divs mit Margin). Keine Labels im Segment (M2/K1 sind gleich groß) — Legende darunter: Farbpunkt + Label + Wert in Slate. Rest (custodyBalance − Σ bekannte Bonds, falls >0) als slate-600-Segment „Unattributed / slashed".
- **UtilizationMeter** `{ value, max, label, format, markers?, warnPct=75, dangerPct=90 }`: Track = Purple ~15% Opacity, Fill violet-400 / amber / red je Schwelle, ~12px hoch, Prozent + Werte rechts in Slate, Marker als 1px-Ticks. Pct via `Number(value * BigInt(10000) / max) / 100`, Guard `max === 0`.
- **StatusLamp** `{ state, label, detail?, icon? }`: Pill mit Farbpunkt + lucide-Icon (ShieldCheck/AlertTriangle/ShieldAlert/HelpCircle) + Text — Status nie nur über Farbe. `unknown` bei Loading/Fehler.
- **StatTile** `{ label, value, sub? }`; **OperatorCard** `{ op, color }`: Header Farbpunkt+Key+Role+shortAddr, Body Bond/Available/Slash-Basis/Slash-Count, Lock-Zeile („Locked until {date}" / „Unlocked" — nur nach Client-Fetch gerendert, kein Hydration-Problem), Footer Eligibility-Lampe. `bond === null` → „No bond entry on-chain" + unknown-Lampe.

### 3e. `VaultDashboard.tsx` — Sektionsreihenfolge

Shell: `terminal-container terminal-theme-scope` + `grid-bg` (wie `WcosmoGuide.tsx:106`). Englische Copy, max. 1 Satz Prosa pro Sektion.

1. **Hero**: Badge „Vault · Supra Mainnet (chain 8)", h1 „Custody, verifiable.", Sub-Zeile, Refresh-Button (RefreshCw, spin bei refreshing) + „Updated {time}".
2. **Custody-Flow-Diagramm** (volle Breite, maker-Daten).
3. **Maker Vault**: Invarianten-StatusLamp (balance==locked → good „Custody balance = total locked"; balance>locked → warning „Slashed overhang: {diff}"; balance<locked → critical „Custody deficit"). Darunter CompositionBar + `md:grid-cols-2` OperatorCards. Error-Strip bei `maker.error`.
4. **Provider Vault**: UtilizationMeter (totalBonded/globalCap, Marker min-bond + max-per-provider) + Onboarding-StatusLamp + 2 StatTiles. Link → `/compute/bond`.
5. **wCOSMO Peg**: peg_holds-StatusLamp (good „Peg holds — 1:1 verified" / critical „Peg broken") + zwei Ein-Farb-Balken auf **gemeinsamer Skala** (Supply, Reserve). Link → `/wcosmo`.
6. **Footer-Strip**: Mono-Liste der drei Adressen (Modul, Resource Account, wCOSMO-Meta) via shortAddr + Satz „No private key exists for the custody account; movements are only possible through maker_vault entry functions."

## Step 4 — Verifikation

1. **RPC-Smoke vorab** (curl gegen `https://rpc-mainnet.supra.com/rpc/v1/view`): `get_total_locked` (erwarte „200000000"), `get_operator_bond(M2)` (3-Tupel), `get_operator_bond(<random addr>)` (Abort → bestätigt try/catch), `faBalance(resource, WCOSMO_META)` (200000000), `peg_holds`, `get_total_bonded`.
2. `npm run dev` → `/vault`: alle 3 Sektionen befüllt, Invariante good (200==200), CompositionBar zwei gleiche Segmente ohne Overhang, Refresh re-fetcht.
3. **Fehler-Granularität**: einen Fetcher temporär auf falschen Funktionsnamen zeigen → nur diese Sektion zeigt Error-Strip. Revert.
4. Reduced-motion in DevTools emulieren → Diagramm statisch.
5. `npm run build` clean, `out/vault/index.html` existiert, `grep -l '/vault' out/index.html` (Nav auf anderen Seiten aktualisiert).
6. Palette-Validator-Re-Run nach finalen Farben; Seite mobil + Desktop eyeballen (Label-Kollisionen).

## Step 5 — Deploy-Ritual (manuell)

```
cd /root/workspace/meine-website/cosmo-clawagent
cp -a out out.pre-vault        # Backup ZUERST
npm run build                  # regeneriert out/ — PM2 cosmo-clawagent läuft weiter, kein Restart
curl -sI http://localhost:3001/vault/ | head -1     # 200 erwartet
# Spot-Check: /  /wcosmo/  /compute/ weiterhin 200
# ROLLBACK: rm -rf out && mv out.pre-vault out
```

Danach: Obsidian-Vault-Note + git push (Renes Post-Task-Hook), Website-Repo-Commit auf master.

## Risiken

- `get_operator_bond` abortet bei fehlendem Eintrag → alle vier Operator-Views einzeln guarden.
- Keine Operator-Enumeration on-chain: dritter Bonder landet im „Unattributed"-Segment — Konstante mit Update-Hinweis kommentieren.
- 19 parallele View-Calls: bei 429/Latenz die drei Sektions-Gruppen sequenziell ketten.
- ES2017: keine bigint-Literale; static export: alle Live-Daten client-only post-mount (Seite prerendert mit nulls, kein `Date.now()` im Initial-Render-Pfad).
- Kontrast auf #030712: 500er-Brand-Töne können <3:1 fallen — Validator entscheidet, auf 400er-Stufen ausweichen.
