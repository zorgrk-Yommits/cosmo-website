# Marketplace Buyer-Flow UX-Überarbeitung (heros.cloud /market)

> **Konvention:** Diesen Plan zu Beginn der Implementierung nach
> `/root/workspace/meine-website/cosmo-clawagent/plans/market-buyerflow-ux-plan.md` kopieren (Planmodus-Workflow des Users).

## Context

Der Abwicklungsprozess im Agent Marketplace ist unübersichtlich: Der Buyer muss heute 6+ Einzelaktionen über mehrere Seiten ausführen (Job posten und die Job-ID selbst merken → auf Freigabe warten → Offer auswählen + signieren → Escrow funden → „Arm quote" klicken → „Accept quote" signieren), mit zwei konkurrierenden Step-Anzeigen (`StepRail` + `StepHeader` in `BuyerFlow`) und kleinen Inline-Buttons ohne „Das ist jetzt dein nächster Schritt"-Führung.

**Beschlossen (User):**
1. **3-Button-Flow mit Auto-Arm:** „Arm" braucht keine Wallet-Signatur (reiner Server-Call `POST /jobs/:id/arm`) und läuft künftig automatisch nach der Escrow-Bestätigung. Sichtbare Buyer-Aktionen: ① Offer wählen & signieren, ② Escrow funden (StarKey), ③ Quote akzeptieren (StarKey). Arm-Fehler → prominenter Retry-Button. Quote-TTL 300s → Countdown + Auto-Re-Arm bei Ablauf.
2. **Scope = kompletter Buyer-Pfad:** Next-Step-Hero-Panel mit großem CTA + PostJobForm-Auto-Redirect + „My jobs" via localStorage + EINE einheitliche Step-Anzeige. Provider-`OfferForm` bleibt unverändert. Seitensprache Englisch.
3. **Nur Frontend.** Backend `/root/cosmo-market-api` unverändert. Keine neuen Dependencies.

**Repo:** `/root/workspace/meine-website/cosmo-clawagent` (Next.js 16 App Router, static export, Tailwind v4, React 19). `npm run build` schreibt DIREKT in das live servierte `out/` → **vorher `cp -r out out.pre-buyerflow`**.

## Verifizierte Codebase-Fakten

- `src/app/market/lib/useMarketFlow.ts` (273 Z.) — Buyer-State-Machine-Hook. `arm()` = reiner `armQuote(jobId)`-Call via `run('arming',…)` (Z. 205–212). Quote-Poll alle 5s solange `requestId != null && jobIdOnchain == null` (Z. 89–107), setzt `quote` auf `OnchainQuote | null` — null bedeutet sowohl „noch nicht gelesen" als auch „keine Quote" (muss für Auto-Arm zum Tri-State werden). `accept()` failt closed bei `now > signedAt + ttl − 15` (Z. 224). `createEscrow()` endet mit confirm-request-Retry 10×3s + `refreshFlow()` — der Escrow→Arm-Handoff braucht daher KEINE Änderung an `createEscrow` (Effect feuert auf `flow.requestId`).
- `src/app/market/job/JobDetail.tsx` (252 Z.) — hostet StepRail (Z. 124) + TX-Links-Grid `TX_LABELS` (Z. 125–140) + BuyerFlow ganz unten (Z. 242). `useSearchParams` bereits Suspense-gewrappt in `job/page.tsx`.
- `GET /jobs/:id` 404t für `submitted`/`rejected` (Backend `PUBLIC_STATUSES`), aber `GET /jobs/:id/status` funktioniert für JEDEN Status — typisierter Client `fetchJobStatus(id)` existiert UNBENUTZT in `lib/marketApi.ts:109`. Der Status-Endpoint liefert keinen Titel → Titel im Wartezustand aus localStorage.
- `buildSteps`/`StepRail` und `BuyerFlow` werden NUR von `JobDetail.tsx` benutzt → gefahrlos ersetzbar.
- Kein Toast/Modal-System; Inline-Feedback-Boxen (rose/emerald), lucide-react-Icons, Panel-Muster `rounded-xl border border-white/10 bg-white/[0.02] p-6`. shadcn-Button in `src/components/ui/button.tsx` existiert, wird im Market nicht benutzt → NICHT adoptieren (Theme-Tokens passen nicht zum terminal-scope); stattdessen geteilte CTA-Klassen-Konstanten.
- `lastArm.expiresAtSecs` ist direkt nach dem Armen die maßgebliche Expiry (Chain-Poll hinkt ≤5s hinterher).

## Dateien

**Neu:**
| Datei | Zweck |
|---|---|
| `src/app/market/lib/myJobs.ts` | localStorage-Helper „My jobs" |
| `src/app/market/components/cta.ts` | geteilte CTA-Klassen-Konstanten |
| `src/app/market/components/FlowRail.tsx` | einheitliche Lifecycle-Rail |
| `src/app/market/components/NextStepPanel.tsx` | Hero-Panel mit großem Next-Action-CTA (ersetzt BuyerFlow) |

**Geändert:** `lib/useMarketFlow.ts`, `lib/marketStatus.ts`, `job/JobDetail.tsx`, `post/PostJobForm.tsx`, `MarketHome.tsx`, `useMarketData.ts`.

**Gelöscht:** `components/BuyerFlow.tsx`, `components/StepRail.tsx`, sowie `buildSteps`/`ACTIVE_STEP`/`STEPS` aus `marketStatus.ts`.

## 1. `useMarketFlow.ts` — Auto-Arm-State-Machine (Kernarbeit)

Neue API-Felder auf `MarketFlow`:
```ts
export type ArmState = 'idle' | 'arming' | 'armed' | 'failed' | 'expired';
armState: ArmState;
armError: string | null;   // 503 → eigener Text
autoArmsLeft: number;      // 0..3
quoteChecked: boolean;     // erster Chain-Quote-Poll ist durch
rearm: () => Promise<void>; // manueller Retry/Re-Arm: Budget auf 3, dann arm
```

Interne Änderungen:
1. **Quote-Tri-State:** intern `OnchainQuote | null | undefined` (`undefined` = noch nicht gelesen); nach außen `quote` (undefined→null) + `quoteChecked`.
2. **Effektive Expiry:** `quoteExpiresAt = max(chainExpiry, armExpiry)` — `chainExpiry = quote.signedAtSecs + (rail.quoteTtlSecs || 300)`, `armExpiry = lastArm.expiresAtSecs` falls `lastArm.requestId === flow.requestId`. Überbrückt die ≤5s Poll-Latenz nach dem Armen.
3. **1s-Ticker** `nowSec` (State), aktiv nur solange `requestId != null && jobIdOnchain == null` (für Expiry-Erkennung im Hook).
4. **`arm()` → `doArm()`** mit eigenem `armState`/`armError` statt `run` (damit Fehler anderer Phasen nicht überschrieben werden), `armInFlight`-Ref als Reentrancy-Guard. Bei `ApiError.status === 503`: Text „Quote signing is temporarily unavailable on our server. Your escrow is safe on-chain — retry in a moment." `rearm()` = Budget-Reset auf 3 + `doArm()`.
5. **Ein Auto-Arm-Effect** deckt alle drei Fälle (nach Escrow, Reload-Resume, TTL-Ablauf):
   - Guards: `flow.requestId` gesetzt, `jobIdOnchain == null`, `quote !== undefined` (nie blind armen), `busy === null`, `!armInFlight`, `armState !== 'failed'` (Fehler nie auto-retryn).
   - Quote live (`quoteExpiresAt − nowSec > 15`, spiegelt den 15s-Guard von `accept()`) → `armState='armed'`, nichts tun.
   - Quote fehlt/abgelaufen: `autoArmsLeft > 0` → dekrementieren + `doArm()`; sonst `armState='expired'` (Hero zeigt manuellen „Re-arm quote"-Button).
   - **Auto-Arm-Budget: 3 pro Seiten-Session** (deckt Initial-Arm + Re-Arms); manueller Klick resettet.
6. In `accept()` beim „expired — re-arm first"-Branch (Z. 224–226) vor dem Throw `setArmState('expired')` → Auto-Re-Arm greift, sobald `busy` frei ist.
7. **Reload-Rekonstruktion** (muss halten, kein flowkritischer Component-State): `jobIdOnchain` → done; Live-Chain-Quote → armed+Countdown (Chain-Pfad, kein `lastArm` nötig); `requestId` ohne Live-Quote → Auto-Arm resumed; nur `selectedOfferId` → Escrow-Stage; nichts → Select-Stage.

## 2. `components/cta.ts` — geteilte Button-Klassen

```ts
export const CTA_BIG = 'inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-purple-400/60 bg-purple-500/20 px-6 py-4 font-mono text-base font-bold tracking-wide text-purple-100 shadow-[0_0_24px_rgba(168,85,247,0.18)] transition-all hover:border-purple-300 hover:bg-purple-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
export const CTA_DANGER = /* wie CTA_BIG, rose statt purple — als Literal ausschreiben */;
export const BTN_GHOST = /* kleiner Sekundär-Button, bestehendes Refresh-Muster */;
```
Lucide-Icons (`Wallet`/`Send`/`RefreshCw`/`Loader2`) `h-5 w-5` im großen CTA.

## 3. `marketStatus.ts` → `buildUnifiedSteps` + `FlowRail.tsx`

`UnifiedStep`: `id: 'review'|'offers'|'select'|'escrow'|'accept'|'deliver'|'settle'`, `label`, `onchain` (f,f,f,t,t,t,t), `buyerAction?: 1|2|3` (select/escrow/accept), `future?` (deliver+settle = M5, „soon"-Tag, nie actionable), `state: done|active|pending`, `txKey?: keyof TxRefs` (escrow→create, accept→accept, deliver→deliver, settle→settle).

Aktiver Step (genau einer): `submitted|rejected`→review; `approved` ohne Offers→offers; `approved` mit Offers ohne `selectedOfferId`→select; `selectedOfferId` ohne `requestId`→escrow; `requestId` ohne `jobIdOnchain`→accept (**Arm ist unsichtbar**); `jobIdOnchain`→deliver (passiv, „Delivery — coming with M5", amber-Wartestil statt Action-Look). `MarketJob` trägt alle nötigen Felder → Rail braucht keine Hook-Daten.

`FlowRail.tsx` (Props `{ job, offersCount }`): StepRail-Optik übernehmen (emerald done / purple-ping active / dim pending, on/off-chain-Badges, `overflow-x-auto`), Buyer-Nodes betont (größerer Dot `h-8 w-8`, Ziffern ①②③, `ring-2 ring-purple-500/30` wenn aktiv, „you"-Pill). `view tx`-Link unter dem Node wenn `txRefs[txKey]` existiert (`EXPLORER_TX`).

## 4. `NextStepPanel.tsx` — Hero-Panel (ersetzt BuyerFlow)

Props wie BuyerFlow: `{ job, offers, providers, onChanged }`. Besitzt `useMarketFlow` + 1s-`nowSec`-Ticker. Rendert für ALLE Status (kein early return) — immer präsentes „Your next step"-Panel, montiert GANZ OBEN unter dem Titel.

Stages (genau eine aktiv):
| Stage | Bedingung | Inhalt |
|---|---|---|
| `moderation` | `status==='submitted'` | Wartekarte „Your job is in review…", kein Button |
| `rejected` | `status==='rejected'` | Terminalkarte + Link „post a new job" |
| `awaiting-offers` | approved && 0 Offers | Wartekarte „Open for offers — curated providers have been notified." |
| `select` | approved && Offers && !selectedOfferId | **Step 1 of 3.** Offer-Radioliste (Logik aus BuyerFlow portieren) + CTA_BIG „Select offer & sign with StarKey" → `selectOffer` |
| `escrow` | selectedOfferId && !requestId | **Step 2 of 3.** Betragszusammenfassung + bestehende paused/eligibility-Warnungen + CTA_BIG „Fund escrow with StarKey" → `createEscrow` |
| `preparing` | `busy==='confirming'` \|\| `armState==='arming'` \|\| (requestId && !quoteChecked) | Spinner „Preparing your quote… no action needed" |
| `accept` | requestId && !jobIdOnchain && armed && secsLeft>15 | **Step 3 of 3.** Quote-Summary + Countdown `m:ss` (amber <60s, Hinweis „renews automatically") + CTA_BIG „Accept quote with StarKey" → `accept` |
| `arm-failed` | `armState==='failed'` | rose Karte mit `armError` + CTA_DANGER „Retry" → `rearm` |
| `expired-manual` | `armState==='expired'` | „Quote expired — get a fresh one (free, no wallet needed)" + CTA_BIG „Re-arm quote" → `rearm` |
| `active` | jobIdOnchain != null | Erfolgskarte „On-chain job #N is active. Delivery & settlement (M5) come next — nothing to do right now." + Accept-Tx-Link |
| `backend-down` | flow===null obwohl Status Flow braucht | amber „Market service unreachable — on-chain state is safe" + Retry (`refreshFlow`) |

Gemeinsames Chrome: Header „Your next step", `Step X of 3`-Label in Buyer-Stages, `f.error`/`f.info`-Boxen DIREKT unter dem CTA, Trust-Zeile „You sign with your own StarKey wallet; this site never holds funds or keys."

## 5. `JobDetail.tsx` — Umbau + Moderations-Fallback

1. Neue Reihenfolge: Titel/Status → **NextStepPanel (Hero)** → **FlowRail-Panel** („Lifecycle", TX_LABELS-Grid unverändert darunter) → Job facts → Frozen spec → Offers (+OfferForm unverändert) → HonestyBox.
2. Imports: StepRail/buildSteps/BuyerFlow raus, FlowRail/NextStepPanel rein.
3. **Moderations-Fallback:** neuer Hook in `useMarketData.ts`: `useMarketJobStatus(id, enabled)` (poll auf `fetchJobStatus`), enabled = `!!id && !!section.error && !job`. Liefert der Status-Endpoint `submitted` → Titel aus `getMyJobs()` (Fallback „Your submitted job"), STATUS_BADGE-Chip, Rail aus minimalem synthetischen Job, Moderations-Wartekarte (kleines separates `ModerationPanel`, NextStepPanel bleibt gegen volles `MarketJob` typisiert). `rejected` → Rejected-Karte. Auch Status 404 → bisherige „not publicly visible"-Meldung als letzter Fallback.

## 6. PostJobForm-Redirect + „My jobs"

`lib/myJobs.ts` — Key `'cosmo.market.myJobs.v1'`, Array `{ id, title, createdAt }`, newest first, dedupe by id, max 20, alle Zugriffe try/catch + `typeof window`-Guard (private mode → no-op).

`PostJobForm.tsx`: `useRouter` aus `next/navigation` (kein Suspense nötig); im Success-Pfad `addMyJob(...)` + `router.push('/market/job/?id=' + encodeURIComponent(res.id))`; Submitted-Block auf kurze „Submission received — taking you to your job page…"-Karte eindampfen (ID + manueller Link als Fallback behalten).

`MarketHome.tsx`: `useEffect(() => setMine(getMyJobs()), [])` (Hydration-safe). Panel „My jobs" ÜBER dem Board, nur wenn Einträge existieren: Titel, Status-Chip (Cross-Referenz gegen `jobs.data`; nicht öffentlich → slate „In review"), Link zur Job-Seite, Fußnote „Stored only in this browser."

## 7. Edge Cases

| Fall | Handling |
|---|---|
| Arm 503 (Server-Keys fehlen) | eigener `armError`-Text + CTA_DANGER Retry; KEIN Auto-Retry |
| TTL-Ablauf mid-accept | `accept()`-Pre-Check setzt `armState='expired'` → Auto-Re-Arm nach `busy`-Freigabe |
| Auto-Re-Arm-Cap | 3 pro Seiten-Session, danach manueller Re-Arm-Button (resettet Budget) |
| Wallet-Mismatch | bestehende Throws unverändert; rose Box direkt unterm großen CTA |
| Reload mid-flow | Rekonstruktion rein aus `GET /flow` + `get_quote_v2`; Auto-Arm wartet auf `quoteChecked` |
| Backend down | `backend-down`-Karte; Rail rendert weiter aus 20s-gepolltem Job |
| Rail paused / Provider ineligible | bestehende amber-Warnungen; CTA disabled bei `rail.paused` |
| Redirect auf submitted-Job (404) | `fetchJobStatus`-Fallback, Titel aus localStorage |
| Countdown ≤15s | wie expired behandeln (spiegelt fail-closed-Guard von `accept()`) |

## 8. Reihenfolge

1. `lib/myJobs.ts` → 2. `useMarketFlow.ts` (additiv, BuyerFlow kompiliert weiter) → 3. `cta.ts` + `buildUnifiedSteps` + `FlowRail.tsx` → 4. `NextStepPanel.tsx` (fmtQuants/Offer-Liste/Warnungen aus BuyerFlow portieren) → 5. `JobDetail.tsx`-Umbau + `useMarketJobStatus` + Löschungen → 6. `PostJobForm.tsx` + `MarketHome.tsx` → 7. `npx tsc --noEmit` + `npm run lint`.

## 9. Verifikation

**Build/Deploy (out/ ist LIVE):**
```bash
cd /root/workspace/meine-website/cosmo-clawagent
cp -r out out.pre-buyerflow   # ZWINGEND vor dem Build
npm run build
```
Rollback: `rm -rf out && mv out.pre-buyerflow out`.

**Manueller E2E-Walkthrough** (agent-browser für Nicht-Wallet-Schritte; StarKey-Signaturen manuell durch User):
1. Post → Auto-Redirect auf Job-Seite → „In review"-Hero ohne Button, Rail-Node 1 aktiv, Titel aus localStorage; `/market/` zeigt „My jobs"-Panel; Reload → bleibt.
2. Admin-Approve (`/market/admin/`) → „Open for offers"-Karte; Offer anlegen (OfferForm unverändert prüfen).
3. Step 1 Select: Radioliste + genau EIN großer CTA; nach Signatur → Step 2. Prüfen: nur EINE Step-Anzeige auf der ganzen Seite.
4. Step 2 Escrow signieren → **ohne weiteren Klick**: „Preparing your quote…" → Step 3 mit Countdown; `submitQuote`-Tx erscheint im Explorer-Grid (Auto-Arm lief).
5. TTL auslaufen lassen → Auto-Re-Arm (frischer Countdown); 3× auslaufen lassen → „Quote expired"-Karte mit manuellem Re-Arm-Button.
6. Hard-Reload im Accept-Stage → Zustand rekonstruiert korrekt inkl. Countdown.
7. Step 3 Accept signieren → Erfolgskarte mit On-chain-Job-#, Rail 1–5 done, Delivery-Node im M5-Wartestil.
8. Fehlerpfade: `pm2 stop cosmo-market-api` mid-flow → backend-down-Karte, Restart + Retry; Wallet-Wechsel vor Escrow → rose Fehler unterm CTA.
9. Regression: Board-Links, OfferForm, Frozen spec, HonestyBox, keine Console-Errors, `out/market/job/index.html` prerendered.

**Abschluss (Repo-Konventionen):** Commit im Website-Repo, Obsidian-Note + git push in `/root/obsidian-vault`, Memory-Update `agent-marketplace.md`.
