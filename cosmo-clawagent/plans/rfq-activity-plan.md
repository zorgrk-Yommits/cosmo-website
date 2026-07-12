# /rfq — Öffentliche RFQ-Activity-Visualisierung (autonomer Maker, live)

## Context

Der K1-Maker-Daemon handelt seit 2026-07-12 autonom auf Mainnet (D-14 C2 PASS: Settle req 4, Reclaim req 5). Rene will seine **On-Chain-Wirkung** öffentlich sichtbar machen — als Beweis „an autonomous maker is quoting this market", NIE als Serverprozess. Entschieden (abgefragt): **eigene Seite `/rfq`** mit Nav-Tab + **sanftes Auto-Polling** (~20s, Page-Visibility-gated, plus manueller Refresh — erstes Interval-Polling der Site).

**Harte Leitplanken:** Daten AUSSCHLIESSLICH aus öffentlichen on-chain Views (`/rpc/v1/view`); loopback-`/status` des Daemons wird NIE exponiert; KEINE scharfe Chain-Aktion; Daemon/Observe unangetastet; kein Deploy ohne separates GO; übersetzungsfestes Englisch (security deposit / penalty deduction; „locked stakers" → „locked backers"); `/maker-onboarding/m2` eingefroren.

## On-Chain-Datenmodell (aus rfq_engine.move verifiziert — Korrektheitskern)

- Enumeration: `get_next_request_id()` → N (aktuell 6, nie gepruned); pro id `get_request(id)` 11-Tupel: [0]request_id [1]requester [2]agent_nft [3]token_in [4]amount_in [5]token_out [6]min_amount_out [7]fee [8]created_at [9]expires_at [10]status(u8). `get_quote(id)` 7-Tupel: [0]has_quote [1]maker_operator [2]pubkey_hash [3]amount_out [4]settlement_deadline [5]signed_at [6]sig (has_quote=false → Defaults, kein Error).
- Req-Status: 0 REQUESTED, 1 QUOTED, 2 ACCEPTED, 3 CANCELLED, 4 EXPIRED, 5 FUNDED. **4 wird NUR von `reclaim_unaccepted_quote` geschrieben** (setzt FUNDED+abgelaufen voraus) → 4 heißt eindeutig RECLAIMED.
- **KRITISCH: Timeouts werden on-chain NIE geschrieben.** Unbedienter Request behält 0/1/5 für immer → UI leitet ab: status∈{0,1} && now≥expires_at → „Expired unserved"; status 5 && now≥expires_at → „Awaiting reclaim".
- Accepted-Seite: `get_next_quote_id()` → M (aktuell 4); `get_accepted_quote(q)` 15-Tupel: [0]quote_id [1]request_id [2]taker [3]cap_id [4]agent_nft [5]maker_operator [6]token_in [7]amount_in [8]token_out [9]promised_amount_out [10]accepted_at [11]settlement_deadline [12]status [13]resolved [14]locked_stakers_count. **Kein Reverse-View** → über q∈0..M-1 iterieren und per [1] indexieren. Acc-Status: 0 PENDING, 1 SETTLED, **2 = RESERVIERTES LOCH** (nie crashen → UNKNOWN), 3 VETOED, 4 FREEZE, 5 UNWOUND.
- **Nicht verfügbar aus Views:** Settlement-Zeitstempel + TX-HASHES (Events sind für statische Site unlesbar) → Live-Cards verlinken nur Adress-Seiten (`https://suprascan.io/address/…`); Tx-Belege liefert der kuratierte Proof-Block.
- Maker-Vitals-Views: `clawagent_v3::is_active_agent(K1_AGENT_NFT)`, `maker_vault::is_operator_quote_eligible(K1)`, `maker_vault::get_operator_bond(K1)` 3-Tupel (amount, locked_until, slash_count; ABORTET ohne Eintrag → guarded), `faBalance(K1, WCOSMO_META)` (aktuell ~9.006). Daemon-Schwellen (Floor 0,5 / 1 open / 2 Quotes/h) sind OFF-CHAIN-Policy → nur in Honesty-Box erwähnen; ableitbar ist „open funded quotes" = count(status==5 && !expired).

## Step 0 — Session-Vorbereitung

1. **dataviz- + frontend-design-Skill lesen** (Pflicht vor UI-Code).
2. Read-only verifizieren (curl /rpc/v1/view): tINTEST-Decimals (`0x1::fungible_asset::decimals` auf `0x64ceb0ff…0b7f`, erwartet 6) + `is_active_agent(0x38c02505…1738)` == true.
3. NICHT aus `rfqConfig.ts` importieren (env-driven, testnet-default) — alles über `mainnetOnchain.ts`.

## Step 1 — `src/lib/mainnetOnchain.ts` (additive Konstanten)

```ts
export const TINTEST_META = '0x64ceb0ff89e190cd58e66aa3702d887a0bcd084e205f1d5857e2ff3ae61a0b7f'; // tINTEST test-pair FA (6 dec)
export const TINTEST_DECIMALS = 6;
export const K1_AGENT_NFT = '0x38c02505865a8b08d6a2fd354554de5906263e1aedd702af3bb8299f1f191738'; // K1 Maker-Agent license (clawagent_v3)
export const EXPLORER_ADDR = 'https://suprascan.io/address/';
```

## Step 2 — Neue Dateien

```
src/app/rfq/
  page.tsx                       Metadata "COSMO — RFQ Activity: an autonomous maker, live"
  RfqActivity.tsx                'use client' Shell (SectionHeader/ErrorStrip lokal kopiert wie VaultDashboard)
  useRfqActivity.ts              Polling-Hook
  lib/rfqActivity.ts             Fetcher + Types + deriveDisplayPhase + buildRailNodes (Korrektheitskern)
  components/
    MakerVitals.tsx              Lampen-Reihe + Tiles (importiert StatusLamp/StatTile aus @/app/vault/components/ — bewusster Shortcut, kommentiert)
    RequestCard.tsx              Pro-Request-Karte (Facts-Grid, Countdown, PhaseRail)
    PhaseRail.tsx                Lokale schlanke Lifecycle-Rail (~70 Zeilen, KEIN Import der demo-LifecycleRail — deren Typen sind Capture-JSON-gekoppelt)
    FirstTradeProof.tsx          Kuratierter Proof-Block (legs.map + EXPLORER_TX, Muster ComputeLanding/CommunityMakerProof), id="first-autonomous-trade"
src/data/rfq-first-autonomous-trade.json   C2-Evidence
```

### Datenlayer (`lib/rfqActivity.ts`, Konventionen wie vault/lib/vaultData.ts inkl. guarded())

- `fetchMakerVitals()`: Promise.all über is_active_agent, is_operator_quote_eligible, guarded(get_operator_bond 3-Tupel), faBalance(K1, WCOSMO). K1-Adresse aus `MAKER_OPERATORS.find(o=>o.key==='K1')`.
- `fetchRfqFeed()`: Welle 1 [next_request_id, next_quote_id]; Welle 2 Promise.all über Requests (neueste zuerst, `CAP=25`, Fußnote nur wenn N>CAP) + alle Accepted (0..M-1, Map per [1]) + get_quote nur für Rows mit status∈{1,5} oder Accepted-Eintrag. Call-Budget ~20/Poll (2 Wellen) — Burst-Form wie /vault.
- **`deriveDisplayPhase(status, expiresAt, nowSec, accepted?) → DisplayPhase`** (pure, Prioritätsreihenfolge):
  status 2 + accepted → acc 0→ACCEPTED_PENDING, 1→SETTLED, **2→UNKNOWN (Loch!)**, 3→VETOED, 4→FROZEN, 5→UNWOUND; status 2 ohne Accepted → UNKNOWN; 3→CANCELLED; 4→RECLAIMED; status∈{0,1} && now≥expires → EXPIRED_UNSERVED; status 5 && now≥expires → AWAITING_RECLAIM; sonst 0→REQUESTED, 1→QUOTED, 5→FUNDED; unbekanntes u8 → UNKNOWN. Ableitungstabelle als Kommentar dokumentieren.

### Polling-Hook (`useRfqActivity.ts`, Muster useVaultData + NEU Interval)

`Section<T>` + allSettled + keep-last-data-on-error + lastUpdated + manueller refresh; dazu: `POLL_MS=20_000`-Interval mit `document.visibilityState==='visible'`-Gate, visibilitychange-Catch-up, Cleanup; In-flight-Guard per useRef (Tick überspringen wenn Poll läuft); nach Fehler einen Tick aussetzen (Mini-Backoff).

### PhaseRail

`PhaseNode {id,label,state: done|active|pending|terminal-bad|terminal-neutral}`; Builder `buildRailNodes(phase)`: Happy-Path Request→Quoted→Funded→Accepted→Settled; RECLAIMED ersetzt 4./5. Node (Undo2, terminal-neutral, „Reclaimed"); EXPIRED_UNSERVED truncate + TimerOff; AWAITING_RECLAIM Funded-done + pulsierendes Hourglass; CANCELLED XCircle; VETOED/FROZEN/UNWOUND terminal-bad (ShieldAlert/Snowflake/RotateCcw). **Dataviz: jeder Node Icon+Label, nie Farbe allein**; horizontal, mobile overflow-x-auto; done=Check-Dot, active=Pulse-Ring.

### Seitenaufbau (RfqActivity.tsx)

1. **Hero**: „RFQ Activity — live", Satz „An autonomous maker is quoting this market. Everything below is read directly from public on-chain view functions on Supra Mainnet — nothing comes from a private server."; Pulse-Dot; Refresh-Zeile (Updated + Button + „auto-refreshes every 20s while visible").
2. **Maker vitals**: 4 Lampen — Agent license active (is_active_agent) / Eligible to quote / Security deposit intact (good: slash_count==0 && amount>0; warning: penalty recorded; critical: amount==0) / Quoting inventory (>0 good, ==0 warning „drained"). 3 Tiles — Security deposit (fmtAmt, sub „penalty deductions: 0") / Free inventory (sub K1 shortAddr + EXPLORER_ADDR-Link) / Open funded quotes (abgeleitet, sub „derived from live requests").
3. **Live activity feed**: Cards neueste zuerst; Header `REQ #id` + Phase-Badge + Pair-Zeile (`fmtAmt` tINTEST → wCOSMO, bei Quote promised amount_out); PhaseRail; Facts-Grid (requester/maker shortAddr + Adress-Links, K1 = Tag „autonomous maker", created/expires absolut+relativ, bei Accepted: accepted_at, deadline, locked backers, resolution); Countdown für live Phasen über EINEN geteilten 1s-`nowSec`-Tick auf Feed-Ebene (FounderCockpit-Präzedenz).
4. **FirstTradeProof**: statisches JSON mit echten C2-Hashes — create `0x5ec8443a…51c0`, accept `0xb8b1ee91…99a0`, Cap-Renewal `0x2f67cdf7…7db0`; **fund_quote/submit/settle-Hashes read-only aus `/root/logs/cosmo-maker-daemon-live-out.log` extrahieren** (der Daemon loggt seine Tx; falls nicht auffindbar: `hash: null, note` → rendert „hash pending capture", keine toten Links). Schema `{request_id, quote_id, pair, maker, taker, legs:[{name, hash|null, signer, note?}]}`.
5. **Honesty-Box**: (a) Betriebs-Schwellen (Floor, Quote-Rate) sind Operator-Policy, nicht on-chain; (b) Views liefern keine Settlement-Zeitstempel/Tx-Hashes → Live-Cards verlinken Adressen, Tx-Evidenz im Proof-Block; (c) guarded v1, Test-Pair tINTEST; (d) Timeout-Zustände client-seitig aus expires_at abgeleitet.

## Step 3 — Edits (klein)

1. `navigation.tsx` navLinks: `{ href: '/rfq', label: 'RFQ Live' }` nach Vault, vor Community.
2. `community-rfq/CommunityRfq.tsx` (~Z. 356, „Stage 2 — Locked"-Karte): Teaser-Zeile + Link „The autonomous maker is already quoting this market on mainnet — watch it live → /rfq". Locked-Zustand unverändert.
3. `vault/VaultDashboard.tsx` Sektion 1: Cross-Link-Zeile „Operator K1 runs autonomously — see its live quoting activity → /rfq".

## Verifikation (OHNE Deploy)

1. tsc clean.
2. **Live-Feed-Korrektheit am Bestandskorpus** (6 Requests = Fixture, keine scharfen Aktionen): erwartet req 4 SETTLED, req 5 RECLAIMED (bzw. AWAITING_RECLAIM falls Status noch 5 — real: Reclaim lief, also 4), reqs 0–3 historische Zustände; für jede id Raw-Tupel + abgeleitete Phase im Dev-Log gegen die Ableitungstabelle prüfen; kein Card zeigt nackte Statuszahl; Accepted-Join: alle 4 Accepted-Rows finden ihre Card; acc-status-2-Pfad per Code-Review (kein Live-Row).
3. Vitals: license active, eligible, deposit intact (slash 0), inventory ~9.006, open-quotes-Count konsistent.
4. Polling: 2 Ticks im Network-Tab; Tab hidden → keine Requests; Rückkehr → Catch-up; Netz kappen → ErrorStrip + letzte Daten bleiben.
5. Terminologie-Gate: grep bond/slash/stake + „daemon|server|process" in User-Copy von src/app/rfq + JSON (Function-IDs/Kommentare erlaubt); „locked backers" konsistent.
6. agent-browser Screenshots Desktop + 375px (Hero, Vitals, settled-Card, reclaimed-Card, Proof-Block; PhaseRail-Mobile-Scroll).
7. Build ohne Deploy: `mv out out.keep && npm run build && mv out out.staging-rfq && mv out.keep out`. **Deploy = separates GO** (dann out.pre-rfq-Snapshot-Ritual).

## Risiken

- RPC-Burst ~20 Calls/20s: In-flight-Guard, Ein-Tick-Backoff, Visibility-Gate; bei 429 Request-Rows chunken (Kommentar-Marker).
- Client-Clock-Skew bei Timeout-Ableitung: |expiry−now|<60s als „still live" tolerieren; Honesty-Box offenbart Ableitung.
- Acc-Status-2-Loch + unbekannte u8 → UNKNOWN, nie crashen/Farbe-allein.
- Accepted-Reverse-Scan O(M): fein bei M=4; Kommentar-Bound für M>50.
- Import aus @/app/vault/components/: bewusster Shortcut, Refactor zu src/components/ beim dritten Konsumenten.
