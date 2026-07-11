# Positioning Phase 2: Self-Service-Bond-Helper + wCOSMO-Guide

## Kontext

Track 1 (Compute-first) läuft im Outreach, aber Provider-Onboarding ist heute White-Glove: /compute sagt „every provider is onboarded personally". Phase 2 (GO Rene 2026-07-11) ersetzt das durch Self-Service: externe Compute-Provider wrappen COSMO→wCOSMO und hinterlegen ihren Bond selbst per StarKey; dazu ein öffentlicher wCOSMO-Guide. Senkt die Friction für den ersten externen Provider, ohne die Guarded-Gates anzufassen (alle Limits sind on-chain).

**On-Chain ist alles bereit (heute read-only verifiziert, Mainnet chain 8):** `wcosmo::wrap(&signer,u64)` permissionless (ABI bestätigt); `provider_vault::deposit_provider_bond(&signer,u64)` self-service — is_configured=true, payment_fa=wCOSMO, min 100 wCOSMO, Cap 1000/Provider, global 5000 (100 gebondet), onboarding_paused=**false**, max 1 aktiver Job; peg_holds=true. Es fehlt nur Frontend + Guide.

**Entscheide (Rene, 2026-07-11):** Helper öffentlich + aus /compute verlinkt · Guide als eigene Route `/wcosmo` · COSMO-Beschaffung ehrlich „kein öffentliches Listing, OTC/Community" · Scope nur Compute-Provider (kein Maker-Pfad).

**Bindende Governance-Regeln:** O-5-Interim: V1-Create-Pfad (`create_outcome_request`) wird nirgends mehr angeboten, V2 ist der einzige empfohlene Pfad (historische Proof-Tx-Labels bleiben). Language-Guardrails v4 („built on Supra", kein „integrated with SupraOS"/„official partner"). Honesty-Box-Pattern fortführen.

## Vorlage

`src/app/maker-onboarding/m2/M2BondHelper.tsx` ist die 1:1-Vorlage (self-contained, hart auf chain 8, direkter `window.starkey.supra`-Zugriff ohne WalletProvider/NFT-Gate, inline BCS + RPC-fetches, Zwei-Schritt-UX „Payload anzeigen"→„In StarKey signieren", Poll nach Send). **Entscheidung: Fork, kein Refactor** — M2 ist live, als „ported 1:1, do not vary" markiert und bleibt byte-identisch. Nur die puren Helpers werden EINMAL neu in einer Shared-Lib angelegt (nur für die zwei neuen Seiten; M2 behält seine Inline-Kopien).

## Dateien

**Neu:**
- `plans/compute-selfservice-bond-plan.md` — dieser Plan im Repo (Format wie founder-dapp-stufe1-plan.md)
- `src/lib/mainnetOnchain.ts` — hartkodierte Mainnet-Konstanten + pure Helpers für beide neuen Seiten: COMPUTE_PKG `0x0fd8940d…8003c0`, COSMOCLAW `0xf2785bf6…1264e1`, WCOSMO_META `0x4799c7cc…00cff6` (6 Decimals!), COSMO_META `0x11188bb7…c17ab0`, CHAIN_ID '8', RPC rpc-mainnet.supra.com, Explorer suprascan.io/tx/; `bcsU64` (ES2017: nur `BigInt(...)`, keine Literale!), `rpcView`, `fetchSeqNum`, `fmtAmt`, `shortAddr`, `getSupra`/SupraProvider-Typ. **Kein env** — bewusst fest (rfqConfig/starkeySign hängen am env-Testnet chain 6 und werden NICHT importiert). Beträge/Caps nie hardcoden — immer live aus Views.
- `src/app/compute/bond/page.tsx` — Server-Wrapper, Metadata **indexierbar** (kein noindex)
- `src/app/compute/bond/ProviderBondHelper.tsx` — der Helper ('use client', Fork von M2)
- `src/app/wcosmo/page.tsx` + `src/app/wcosmo/WcosmoGuide.tsx` — Guide ('use client' wegen Live-Peg-Widget)

**Geändert:**
- `src/app/compute/ComputeLanding.tsx` — Provider-Sektion (~Z.417): „onboarded personally" → self-service bond + CTA-Buttons „Post your provider bond → /compute/bond/" + „What is wCOSMO? → /wcosmo/"; Honesty-Box (~Z.468): „not self-service" differenzieren (Bond self-service, Quoting weiterhin gated); **Buyer-Bullet ~Z.450 korrigieren: „10% of the job price … from their bond" ist V1-Ökonomie — V2 ist bond-denominiert (10% des geforderten Bonds, fixiert beim Accept, O-3)**; Datums-/Verifikationszeile der PARAMS aktualisieren.
- `src/app/compute/page.tsx` — Metadata-Description analog anpassen.
- `src/components/navigation.tsx` — navLinks + `{ href: '/wcosmo', label: 'wCOSMO' }`. `/compute/bond` NICHT in die Nav (Werkzeug, verlinkt aus /compute + /wcosmo).

**Unangetastet:** `maker-onboarding/m2/*` (Regressionswache per HTML-Diff), `supraTx/rfqConfig/starkeySign` (Testnet-gebunden), historische Proof-JSON-Labels.

## Helper-Design (Delta zu M2)

1. **Address-Lock raus** — jede Wallet darf verbinden; Chain-8-Enforcement bleibt hart (getChainId → changeNetwork → Check).
2. **Zwei Ziel-Adressen:** Schritt 1 `wcosmo::wrap` gegen COSMOCLAW, Schritt 2 `deposit_provider_bond` gegen COMPUTE_PKG — `to` im sendTransaction pro Step korrekt setzen (M2 hatte nur eine Adresse!).
3. **Amount-Input** (einziger freier Input): Zielbetrag in wCOSMO, Default = live `get_min_provider_bond`. String-basiertes Parsen zu Basiseinheiten ×10^6 (kein Float). Live-Validierung: bestehender Bond+Input in [min, max_bond_per_provider]; Input ≤ global_cap−total_bonded; Balancen reichen. Verletzung ⇒ Buttons gesperrt + klare Fehlerzeile.
4. **Wrap-Schritt überspringbar:** Wrap-Betrag vorbelegt mit max(0, Ziel − wCOSMO-Balance); reicht die wCOSMO-Balance ⇒ Schritt 1 „übersprungen", direkt Schritt 2.
5. **fetchStatus()** via Promise.all: wallet-gebunden (COSMO-/wCOSMO-Balance via `0x1::primary_fungible_store::balance`, `get_provider_bond(addr)` 5-Tupel, `is_provider_eligible`), global (min/caps/total_bonded/is_onboarding_paused/`payment_fa_addr` mit Sanity-Check ==WCOSMO_META, bei Mismatch rote Warnung).
6. **Bond-Status-Panel** mit eligible-Badge, locked_until/active_jobs/slash_count + globale Parameterzeile. Copy: Deposit geht auch bei Pause (D-16), Job-Vergabe dann nicht.
7. **Poll nach Sign:** Schritt 1 = wCOSMO-Balance > Snapshot; Schritt 2 = Bond-Amount > Snapshot.
8. **DONE-Panel:** eligible ⇒ „Nächste Schritte" (Pilot-Template auf /compute; Quoting via zentralem Quote-Signer).
9. **Kein Withdraw-/Unwrap-Signierpfad in v1** — nur als Copy (Cooldown, kein aktiver Job).

## Copy-Struktur

- **/compute/bond:** Intro (Bond = slashbare Sicherheit; wrap→deposit→eligible) · Voraussetzungen (StarKey, SUPRA-Gas, COSMO — Verweis /wcosmo/ für Beschaffung) · Sicherheits-Block (nie Seed/Key, Signatur nur im StarKey-Popup, feste Function-IDs, einziger Input = Betrag, Payload vor Signatur lesbar) · Status-Panel · Schritt 1/2 · **Honesty-Box:** guarded v1; Quotes laufen zwingend über den zentralen engine-globalen Quote-Signer (Provider stellt nicht autonom Preise); Jobs entstehen durch Buyer-Accept (eligible + !paused + bond≥min + Job-Cap); max 1 aktiver Job; Bond slashbar (10% des geforderten Bonds bei No-Delivery); Withdraw: Cooldown + kein aktiver Job; Parameter änderbar per Governance.
- **/wcosmo:** Was ist wCOSMO (1:1-Wrapper, beide FA-Adressen, 6 Decimals) · Warum Bond in wCOSMO · **Live-Peg-Widget** (peg_holds-Badge, wcosmo_supply vs. reserve_balance, Refresh) · Wrap/Unwrap-How-to + CTA zum Helper · **COSMO beschaffen: ehrlich kein Listing, OTC/Community, Copy-Template-CTA** (Muster /compute-Pilot) · Rolle im Compute- und Maker-Track (nur beschreibend; Create-Pfad ausschließlich V2) · Honesty-Box (keine Anlageberatung/Renditeversprechen).

## Schritte + Commits (alle auf master, targeted git add)

1. Plan ins Repo: `plans/compute-selfservice-bond-plan.md` → `plans: phase-2 self-service-bond + wcosmo-guide plan`
2. `src/lib/mainnetOnchain.ts` → `lib: mainnet onchain konstanten + view helpers (phase 2)`
3. Helper (`compute/bond/`) — tsc+build grün, Prepare-only-Test → `compute: self-service provider-bond-helper /compute/bond`
4. Guide (`wcosmo/`) inkl. Peg-Widget → `wcosmo: oeffentlicher guide mit live-peg-status`
5. Integration: ComputeLanding-Delta (inkl. V2-Slash-Korrektur) + Metadata + Nav → `compute: provider-sektion auf self-service-bond nachgezogen + nav wcosmo`

## Verifikation + Deploy

1. `npx tsc --noEmit` + `next build`; Export enthält `out/compute/bond/index.html` + `out/wcosmo/index.html`.
2. Routen-Smoke lokal: 200 auf /, /compute/, /compute/bond/, /wcosmo/, /maker-onboarding/m2/, /demo/; grep: bond-Seite OHNE noindex, m2 WEITER MIT noindex; **M2-HTML vor/nach diffen** (Regressionswache).
3. curl-Checks gegen rpc-mainnet: alle genutzten Views == UI-Anzeige (min_bond 100000000, paused=false, payment_fa==wCOSMO-Meta, peg_holds=true …).
4. Sign-Pfad risikofrei: StarKey-Connect + Validierungs-Checks; „Payload anzeigen" für beide Schritte und Dump prüfen (Function-ID, u64-Arg, chain 8, `to` pro Step!) — NICHT signieren. Optional durch Rene: Klein-Wrap 1 COSMO + unwrap als Realtest; echter Bond-Deposit nur auf Renes bewussten Entscheid (Kapitalbindung + Cooldown).
5. Deploy: `cp -a out out.pre-phase2` → build → Smoke → PM2 `cosmo-clawagent` serviert weiter. Rollback: `mv out out.failed && mv out.pre-phase2 out`. Post-Deploy-Smoke live.

## Nicht-Ziele / Guardrails

Kein Maker-Pfad im Helper · kein V1-Create-Angebot (O-5) · keine Server-Signer/Keys im Frontend · keine Admin-Funktionen in der UI · M2-Seite byte-identisch · kein Withdraw-Signierpfad v1 · Language-Guardrails v4 · keine Capital-Advice-Formulierungen · keine neuen Dependencies, keine Server-Routes (statischer Export).

**Hinweis Workflow:** Umsetzung laut Renes Planmodus-Regel in frischem Chat; dieser Plan wird dort als Erstes nach `plans/compute-selfservice-bond-plan.md` übernommen (Schritt 1).
