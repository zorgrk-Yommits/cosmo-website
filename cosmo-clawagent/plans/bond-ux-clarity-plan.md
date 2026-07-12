# Bond-UX-Klarheit: /compute/bond + /vault Trennung + Provider-Parameter-Anhebung (Vorbereitung)

## Context

Renes Befund: Die Compute-Bond-Seite und die Vault-Seite vermischen fünf unabhängige Ebenen (wCOSMO-Reserve/1:1-Deckung, Maker-Vault K1/M2, Compute-Provider-Vault, persönliche Wallet-Bestände, globale Limits). Ein normaler Nutzer erkennt nicht, wo seine Tokens liegen, was gefordert ist und ob er jobberechtigt ist. Zusätzlich sollen die Provider-Parameter (min 100 → 100.000, max/Provider 1.000 → 1.000.000, global 5.000 → 5.000.000 wCOSMO) **vorbereitet, aber nicht ausgeführt** werden.

**Sprachentscheid (abgefragt):** Englisch bleibt, aber übersetzungsfest — `bond` → "security deposit" (→ Kaution/Sicherheitsleistung), `slash` → "penalty deduction" (→ Strafabzug/Einzug), `custody balance` → "held in the vault" (→ im Tresor verwahrt). Function-IDs/Payload-Zeilen/Identifier bleiben unverändert.

**Harte Leitplanken:** KEINE Chain-Writes, KEIN Produktions-Deploy ohne separates GO. Alle angezeigten Werte live von Chain (Konvention existiert schon). `/maker-onboarding/m2` ist eingefroren — nicht anfassen.

## Analyse-Ergebnisse (erledigt, live verifiziert 2026-07-12)

**Parameter-Verortung:** min/maxPer/global liegen AUSSCHLIESSLICH on-chain (`provider_vault::ProviderRegistry`, Setter admin-gated auf MS `0x680004a3…27fe2`). Frontend liest live — mit EINER Ausnahme: `ComputeLanding.tsx:36-38` hardcodet "100 wCOSMO" / "5,000 wCOSMO (100 bonded today)" → muss auf Live-Reads umgestellt werden (Teil dieses Umbaus).

**On-chain aktuell (v1/view):** min 100000000 (100), maxPer 1000000000 (1.000), global 5000000000 (5.000), total_bonded 1100000000 (1.100). Das gestrige Runbook (100k/100k, `61c520a`) lief NIE (kein Smoke-Snapshot) und wird durch das neue 3-Wert-Runbook ERSETZT.

**Funds-Safety bei Min-Anhebung (provider_vault.move):**
- `withdraw_provider_bond:424`: `rem == 0 || rem >= min` → **Voll-Exit IMMER erlaubt**, egal wie hoch min. Bestands-Provider verlieren nichts. Blocker nur temporär: 14d-Slash-Cooldown, aktiver Job.
- `is_provider_eligible:598` liest min live → Provider mit Bond < neuem Min wird SOFORT ineligible, aber **nur für NEUE Accepts** (Enforcement nur accept-seitig, compute_rfq:919/2376; Settle-Pfad prüft nicht → laufende Jobs liefern/settlen/slashen normal).
- `deposit_provider_bond:342`: Min gilt **pro Einzel-Deposit**, nicht Summe → kein "Differenz nachschießen"; kleinster gültiger Top-up = min. Caps dagegen prüfen die Summe → **Reihenfolge zwingend: Caps VOR Min anheben** (sonst E_MAX_BOND_EXCEEDED für jeden 100k-Deposit).
- `compute_rfq:2000`: V2-Request-Floor `min_bond_quants >= get_min_provider_bond()` → nach Anhebung fordert jeder neue Request ≥100k.
- Bekannter Mainnet-Provider: m6-provider `0x45461e…c4d0` mit 100 wCOSMO → wird ineligible (neue Jobs), Voll-Exit jederzeit möglich. Keine On-Chain-Provider-Enumeration (Events wären die Quelle).
- Konsequenz fürs Gesamtsystem (im Runbook-Preflight anzeigen): wCOSMO-Supply ist ~1.603 → nach der Anhebung kann NIEMAND eligible sein, ohne vorher ≥100.000 $COSMO zu wrappen. Der Markt ist bis dahin faktisch zu.
- Maker-Vault-Minimum (100 wCOSMO) ist eine **compile-time-Konstante** (MIN_OPERATOR_BOND_WHOLE_TOKENS) — Anhebung dort bräuchte Contract-Upgrade; NICHT in Scope, nur dokumentieren.

**Frontend-Bug (Beifang, wird gefixt):** UI-Validierung `ProviderBondHelper.tsx:273-278` prüft min gegen resultierenden Gesamt-Bond — Chain prüft Einzel-Deposit. Top-up < min passiert die UI und abortet on-chain.

**Bereits korrekt (nur schlecht kommuniziert):** Wrap-only-missing existiert (`wrapNeeded = max(0, target − wcosmoBal)`, Zeile 262-265); Step 1 wird übersprungen, wenn genug wCOSMO da ist.

## Teil 1 — `src/app/compute/bond/ProviderBondHelper.tsx` (Restructure)

Neue Reihenfolge: Header (neue Copy) → Prerequisites/Security (Sweep) → Connect + Wallet/Chain-Cards → **NEU `DepositSummary`** (Hauptanzeige, Refresh wandert hierher) → **Collapsible `<details>` "All on-chain parameters (read-only)"** (restliche StatusRows inkl. endlich gerendertem `lockedUntil`: "Withdrawal locked until …" / "no lock") → Eligible-Box → "Deposit amount"-Input → **NEU `TransactionPlan`** (ein kombiniertes "What will happen"-Panel ÜBER den Step-Cards) → 2 Step-Cards (neue Titel + Plain-English-Zeile, Raw-Payload in `<details open>`) → Honesty-Box → Footer. **State-Machine (prepare/sign/polling/Gating) UNVERÄNDERT — reine Präsentation.**

### DepositSummary (inline, Props: global, wallet, connected, refreshing, onRefresh)
Genau Renes fünf Zeilen, alle live:
```
Required minimum        fmtAmt(minBond) wCOSMO
Deposited by you        fmtAmt(bondAmount) | "— connect wallet"
Still missing           fmtAmt(max(0, minBond − bondAmount))   (emerald 0 wenn gedeckt)
wCOSMO in your wallet   fmtAmt(wcosmoBal)
Status                  pill: "Eligible for compute jobs" (emerald) / "Not yet eligible — deposit below the required minimum" (amber) / "Connect your wallet…" (slate; globale Zeilen rendern trotzdem)
```
Edge-Case-Fußnote wenn `deposited > 0 && missing > 0` (nach künftiger Min-Anhebung): *"Each single deposit must itself be at least the required minimum — the smallest valid top-up is {min} wCOSMO. Your existing deposit stays withdrawable in full."*

### TransactionPlan (inline, nur bei connected && valid)
- Heading: "What will happen — two separate transactions" (bzw. "one transaction" wenn wrap übersprungen)
- Nummerierte Sätze: 1. "Convert X $COSMO into X wCOSMO (transaction 1)." (greyed "skipped" wenn 0) 2. "Deposit Y wCOSMO as your provider security deposit (transaction 2)."
- Note: "StarKey asks you to sign each transaction individually — nothing is sent until you confirm."
- Before→After-Projektion (3 Mono-Zeilen): $COSMO wallet `c → c−wrap`; wCOSMO wallet `w → w+wrap−target`; Your security deposit `b → b+target`. Caption: "Projection assumes both transactions confirm; SUPRA gas not included."

### Copy (übersetzungsfest, exakt)
- h1 **"Compute Provider Security Deposit"**; Lead: refundable security deposit, 10% penalty deduction, "two separate transactions", StarKey-only.
- Steps: **"Step 1 of 2 — Convert $COSMO into wCOSMO (separate transaction)"** / **"Step 2 of 2 — Deposit wCOSMO as your security (separate transaction)"**; je Plain-English-Zeile über der Function-ID-Zeile; Button "Show payload" → **"Prepare transaction"**.
- Honesty-Box: "what the security deposit does and does not do"; Withdraw-Bullet: "…full exit is always allowed."
- Validierung: Min-Check ERSETZEN durch `target < minBond` → *"Each deposit must be at least the required minimum of {min} wCOSMO — this is checked per transaction, not on the total."*; Cap-Strings umformuliert ("per-provider limit", "remaining global capacity"); "Not enough $COSMO to convert: …".

## Teil 2 — `/vault` Drei-Bereichs-Trennung

- `SectionHeader` bekommt `index`- + `subtitle`-Props (Mono-Ziffern-Chip). Titel: **"1 · Maker security deposits — operators K1 & M2"** / **"2 · Compute provider security deposits"** (subtitle: "A separate vault with its own custody account…") / **"3 · wCOSMO reserve — 1:1 backing"**.
- **Hero-Diagramm wandert IN die Maker-Karte** (Standalone-Section VaultDashboard.tsx:186-192 löschen; SVG skaliert via viewBox). Im Diagramm Scope-Caption: *"Maker vault only — compute provider deposits live in a separate vault (section 2)."*; Node "Slash" → **"Penalty deduction"**.
- Lampen-Labels: "Custody balance = total locked" → "Held in the vault = total deposited"; warning → "Penalty remainder held in the vault"; critical → "Vault holds less than total deposited". Bar-Segment "Unattributed / slashed" → "Unattributed / penalty remainder".
- **Provider-Sektion parallel zur Maker-Sektion ausbauen:** `mainnetOnchain.ts` + `PROVIDER_VAULT_RESOURCE_ADDR = '0x76f115fcea64253ec60633c0cf197db38978822fae4af9cface9d88bf39bd576'` (Seed "cprfq_bond_v1", verifiziert: Balance == total_bonded == 1.100). `ProviderVaultData` + `custodyBalance` (faBalance im fetchProviderVault-Promise.all). Zweite StatusLamp (Invariante custody==total_bonded, good/warning/critical wie Maker) + 2 zusätzliche StatTiles ("Held in the vault (live balance)" / "Total deposited (bookkeeping)"). Relabels: "Required minimum deposit", "Per-provider limit", "Global deposit limit — utilization", Link "Place your security deposit".
- Footer: zwei Gruppen "Maker vault:" / "Provider vault:" (je Modul + Custody-Account), gemeinsame wCOSMO-FA-/Admin-Zeilen; Satz: "No private key exists for either custody account…".

## Teil 3 — Konflations-Fixes + Sweep

- **WcosmoGuide.tsx**: Hero "the bond asset" → "the security-deposit asset"; Zeilen 149-162 splitten "the vaults" in die zwei benannten Vaults (maker vault = operator deposits, provider vault = compute deposits); Sweep (35, 240-252, 288-308, 336).
- **ComputeLanding.tsx**: Zeilen 204-217 klargezogen (payment assets zahlen Arbeit, security deposit sichert Verhalten); Zeile 222 "SUPRA collateral" für CASH BLEIBT; **Zeilen 36-38 Hardcodes ("100 wCOSMO", "5,000 wCOSMO (100 bonded today)") auf Live-Reads umstellen** (rpcView analog ProviderBondHelper); Sweep restliche bond/slash-Stellen.
- **OperatorCard.tsx**: Label-Sweep (Bond → Security deposit, Slash basis → Penalty basis, Slash count → Penalty count).
- Keine Shared-Terminology-Konstanten (kontextuelle Sätze); stattdessen Glossar-Kommentar oben in ProviderBondHelper + Grep-Gate in der Verifikation.

## Teil 4 — Runbook-ERSATZ (Vorbereitung, KEINE Ausführung)

`scripts/compute-mainnet-bondcap-raise.sh` (alt, 100k/100k, nie gelaufen) **ersetzen** durch `scripts/compute-mainnet-provider-params-raise.sh`:
- 3 MS-2-of-3-Zyklen in ZWINGENDER Reihenfolge: (A) `set_max_bond_per_provider(u64:1000000000000)` [1M], (B) `set_global_bond_cap(u64:5000000000000)` [5M], (C) `set_min_provider_bond(u64:100000000000)` [100k] — **Caps vor Min** (deposit prüft Caps auf Summe, Min pro Einzel-Deposit).
- Preflight (read-only, bricht vor jedem Proposal ab): aktuelle Werte als PRE, admin==MS, threshold 2, V1 not paused + **WARN-Block mit den Konsequenzen** (m6-provider `0x45461e…c4d0` wird ineligible für neue Jobs — Funds voll abziehbar; jeder neue V2-Request fordert ≥100k; wCOSMO-Supply ~1.603 → Markt faktisch zu, bis jemand ≥100k wrappt; kein Top-up der Differenz möglich).
- Je Zyklus eigene Confirm-Eingabe (`RAISE-MAX` / `RAISE-GLOBAL` / `RAISE-MIN`), resumable (Skip wenn Zielwert schon steht).
- Post-Checks: 3 neue Werte, total_bonded/paused/admin/V1 unverändert, `is_provider_eligible(m6-provider) == false` als ERWARTETES Ergebnis dokumentiert.
- **Rollback-Sektion:** Setter sind wiederholbar → Rollback = 3 Gegen-Zyklen auf die dokumentierten PRE-Werte (100/1.000/5.000); Abbruchbedingung: jeder FAIL im Preflight oder zwischen den Zyklen stoppt hart (set -e + Checks).
- Hinweis im Runbook: beim Ausführungs-GO gehört der Deploy des neuen Frontends dazu (ComputeLanding zeigt dann Live-Werte; /compute/bond zeigt neue Min automatisch).
- Alt-Runbook löschen; Memory `provider-bondcap-raise` beim Abschluss aktualisieren (neue Zielwerte, neue Skriptreferenz).

## Verifikation (ohne Deploy!)

1. `npx tsc --noEmit` clean.
2. `npm run dev` (Port 3777) + agent-browser Screenshots Desktop + 375px: `/compute/bond` (disconnected: Summary zeigt live Min + Connect-Platzhalter, kein NaN), `/vault` (3 nummerierte Sektionen, Diagramm in Maker-Karte, Provider-Invariante good 1.100==1.100), `/wcosmo`, `/compute` (Live-Werte statt Hardcodes).
3. Terminologie-Gate: `grep -rniE '\b(bond|slash)' src/app/compute src/app/wcosmo src/app/vault` — jeder Treffer auf Allowlist (Function-IDs, Modulpfade, Kommentare); `git diff --stat` enthält KEIN `maker-onboarding`.
4. Build ohne Deploy: `mv out out.keep && npm run build && mv out out.staging-bondux && mv out.keep out` — Produktion unangetastet; `out.staging-bondux` liegt für das Deploy-GO bereit.
5. Runbook: `bash -n`, Preflight-Teil read-only gegen Mainnet laufen lassen (zeigt PRE-Werte + WARN-Block, stoppt vor Proposal).
6. Abschluss-Doku im Chat: Ursache der Verwirrung, geänderte Dateien, Screenshots, Parameterprüfung, nächste Schritte (Deploy-GO + Runbook-GO getrennt).
