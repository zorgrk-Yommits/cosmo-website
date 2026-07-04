# Plan: M2 Bond Helper als Route /maker-onboarding/m2 in cosmo-clawagent

## Context

Phase 5 des Permissionless-Maker-Openings: M2 soll self-service mit StarKey 100 wCOSMO wrappen und als Operator-Bond einzahlen. Die bestehende Single-File-Vorlage `/root/obsidian-vault/supra/move_workspace/cosmo-contracts-move/tools/m2-bond-helper.html` (funktionierende Payload-/View-Logik, Mainnet chain 8) wird sauber in die Next.js-Website `/root/workspace/meine-website/cosmo-clawagent` integriert. Nur lokal bauen/testen — **kein Produktions-Deploy, keine On-chain-Tx**.

## Architektur-Fakten (aus Exploration)

- Next.js 16 App Router, `output: 'export'`, `trailingSlash: true` → jede Route wird `out/<route>/index.html`; PM2 `serve out -l 3001` ohne `-s` (Deep-Links funktionieren, weil echte Verzeichnisse).
- **ACHTUNG: `npm run build` schreibt direkt in `out/` = Live-Verzeichnis.** Bauen ohne Schutz = ungewolltes Deploy.
- Site-Config (`rfqConfig.ts`, `.env.local`) steht aktuell auf **Testnet chain 6** — die Bond-Seite braucht eigene, hartkodierte **Mainnet-chain-8**-Konstanten und darf `rfqConfig`/`starkeySign` (RFQ_CHAIN_ID-gebunden) NICHT wiederverwenden. Vorbild für bewusste Isolation: `src/app/access/AccessGate.tsx`.
- Kein bestehendes robots/noindex-Pattern in der Site → wird via `metadata.robots` neu eingeführt.
- `/founder` ist unlisted (nicht in `navLinks`) — gleiches Vorgehen hier: NICHT in `src/components/navigation.tsx` eintragen.

## Neue Dateien (einzige Änderungen)

### 1. `src/app/maker-onboarding/m2/page.tsx` (Server Component)
- `export const metadata`: Titel "M2 Maker Onboarding", `robots: { index: false, follow: false, nocache: true }` → rendert `<meta name="robots" content="noindex, nofollow">` ins statische HTML.
- Rendert nur `<M2BondHelper />`.

### 2. `src/app/maker-onboarding/m2/M2BondHelper.tsx` (`'use client'`, self-contained)
Logik 1:1 aus der Vorlage `tools/m2-bond-helper.html` übernommen, UI im Stil der Site (Tailwind, wie AccessGate/FounderCockpit).

**Hartkodierte Konstanten (keine freien Eingaben, keine Env-Abhängigkeit):**
```ts
const M2_ADDR     = "0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb";
const MODULE_ADDR = "0xf2785bf6510d738d2f58c48ee62f00ec56462a5bf0de4ccfdebd11cd2b1264e1";
const WCOSMO_META = "0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6";
const AMOUNT      = 100_000_000; // 100 wCOSMO (6 Dezimalen)
const CHAIN_ID    = "8";         // Supra Mainnet
const RPC         = "https://rpc-mainnet.supra.com";
```

**Flow (aus Vorlage übernommen):**
1. **Connect:** `window.starkey.supra` → `provider.connect()`; Adresse normalisiert (lowercase, no-0x, pad-64) gegen `M2_ADDR` prüfen → bei Mismatch harter Abbruch "FALSCHE ADRESSE", keine Buttons.
2. **Chain-Guard:** `getChainId()`; wenn ≠ "8" → `changeNetwork({ chainId: "8" })`, erneut prüfen, sonst Abbruch.
3. **Status-Views** (raw `fetch POST RPC/rpc/v1/view`, wie Vorlage):
   - `0x1::primary_fungible_store::balance(M2, WCOSMO_META)`
   - `maker_vault::operator_available(M2)`
   - `maker_vault::is_operator_quote_eligible(M2)`
   - `maker_vault::is_deposit_gate_open()`
4. **Button-Gating:**
   - **DONE-Zustand:** `operator_available >= AMOUNT` ODER `eligible === true` → Seite zeigt "DONE", beide Tx-Buttons dauerhaft gesperrt.
   - Button 1 (`wcosmo::wrap`) aktiv nur wenn Balance < AMOUNT und nicht DONE.
   - Button 2 (`maker_vault::deposit_operator_bond`) aktiv nur wenn Balance >= AMOUNT UND `is_deposit_gate_open` UND nicht DONE.
5. **Zwei-Schritt pro Tx (Prepare → Sign), Payload lesbar angezeigt** vor Signatur: Function-ID, Args (`u64: 100000000` = "100 wCOSMO"), Sequence-Number, Expiry. Payload-Bau exakt wie Vorlage:
   ```ts
   const rawTxPayload = [account, seq, MODULE_ADDR, modName, fnName, [], [bcsU64(AMOUNT)], { txExpiryTime: expiry }];
   const data = await provider.createRawTransactionData(rawTxPayload);
   // Sign: provider.sendTransaction({ data, from: account, to: MODULE_ADDR, chainId: 8, value: "" })
   ```
   `bcsU64` lokal (8-byte LE, identisch zu `u64Arg` in `src/lib/supraTx.ts`; lokal halten statt importieren, damit die Seite null Kopplung an den Founder-Stack hat).
6. Nach Send: Explorer-Link (suprascan.io/tx/), Status-Polling (20× / 3 s) bis Zustandswechsel sichtbar.

**Sicherheit/Anforderungen:** keine Secrets, keine Server-Signer, keine Admin-/Multisig-Calls, keine freien Function-/Amount-Felder; prominenter Warnbanner "Nur fuer die M2 Maker Wallet — alle anderen Wallets werden abgewiesen".

## Explizit NICHT geändert
- `src/components/navigation.tsx` (unlisted), `src/lib/*` (Founder-Stack unberührt), `.env.local`, PM2/nginx, `out/` (siehe Build-Schutz).

## Build & lokaler Test (ohne Produktions-Deploy)

`out/` ist live → Schutz-Sequenz:
1. `cp -a out out.live-backup-<datum>`
2. `npm run build` (schreibt neues `out/`)
3. `mv out out.staging-m2 && mv out.live-backup-<datum> out` → Live-Stand exakt wiederhergestellt, neuer Build liegt in `out.staging-m2`
4. Lokaler Smoke: `npx serve out.staging-m2 -l 3002`, dann per agent-browser `http://localhost:3002/maker-onboarding/m2/`:
   - Seite rendert, Warnbanner sichtbar, `<meta name="robots" content="noindex">` im HTML, Tx-Buttons disabled ohne Wallet, Connect-Button vorhanden.
   - Screenshot anfertigen.
   - StarKey-Flow selbst ist headless nicht testbar (Extension) → wird als "manuell durch Rene mit StarKey" dokumentiert.
5. Testserver auf 3002 danach stoppen. `out.staging-m2` bleibt liegen für späteres Freigabe-Deploy (`mv`-Swap).

Zusätzlich: Plan-Kopie nach `/root/workspace/meine-website/plans/m2-bond-page-plan.md` (Planmodus-Workflow-Konvention).

## Deliverables an den User
- Geänderte/neue Dateien + Route `/maker-onboarding/m2`
- Build-Ergebnis (`npm run build` Output)
- Screenshot + Smoke-Beschreibung (localhost:3002)
- Deploy-Kommando für später (nach Freigabe): `mv out out.pre-m2 && mv out.staging-m2 out` — wird NICHT ausgeführt.

## Verifikation (Abnahme-Kriterien)
- `out.staging-m2/maker-onboarding/m2/index.html` existiert und enthält noindex-Meta.
- Live-`out/` byte-identisch zum Stand vor dem Build (diff -r gegen Backup vor Restore ist implizit durch mv-Restore erfüllt).
- Keine On-chain-Tx, keine PM2-/nginx-Änderung.
