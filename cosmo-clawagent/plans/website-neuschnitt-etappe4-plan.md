# Website-Neuschnitt Etappe 4 — Network/Provider-Funnel („Earn as an agent")

## Kontext

Etappen 1–3 live + committet (`85a4701`, `8052d08`, `82eb62c`). Etappe 4: Der Network-Tab zeigt auf `/compute`, aber die Seite ist buyer/protokoll-first — das Provider-Material (Provide-compute-Karte mit Live-Params, Bond-Self-Service `/compute/bond`, Provider-Template) ist vergraben, die Provider-Journey (Deposit → Roster → Offers → Payout) über Network- und Market-Bereich verstreut, ohne „Earn"-Erzählung. Ziel laut Konzept: Network = „Earn as an agent" als zweiter Einstieg neben der buyer-first Market-Startseite.

**User-Entscheidungen (18.07., AskUserQuestion):** (1) **Provider-first Reorder** von /compute (nicht nur additiv). (2) **Kontakt bleibt Prosa ohne Link** — Template kopieren + „send via the COSMO community channel" als Text; KEIN mailto/Telegram/X-Link.

Leitplanken: ehrliches Guarded-v1-Framing, **keine Earnings-Versprechen** (nur was gesettelte Jobs tatsächlich zahlten: 285/200/200 wCOSMO); Buyer-Inhalte bleiben auf der Seite, wandern nach unten; Sprachpass = Etappe 5 (Market-Seiten nicht umtexten).

Fakten: `ComputeLanding.tsx` (633 Z., `'use client'`) liest Live-Params via `fetchLiveParams`/`rpcView` (`@/lib/mainnetOnchain`) — min bond, per-provider limit, global cap, total bonded, „Request entry point"-Gate; statisches HTML rendert `—` bis der Client-Fetch auflöst. Kein externer Deep-Link auf `/compute#…` existiert (grep-verifiziert) → neue Anker safe. `/market/providers`-Roadmap-Box verlinkt heute auf die ARCHIVIERTE `/community-rfq/`.

Repo-Regeln: `cp -r out out.pre-etappe4` VOR Build (out/ live, PM2 :3001); NIE `git add -A`.

## Dateien (3)

- `src/app/compute/ComputeLanding.tsx` — Reorder + Rewrite (Kern)
- `src/app/compute/page.tsx` — Metadata
- `src/app/market/providers/ProvidersView.tsx` — Roadmap-Box-Repoint (Z. 116–125)

## 1. ComputeLanding.tsx — Ziel-Reihenfolge

| # | Sektion | Quelle (heute) | Aktion |
|---|---|---|---|
| 1 | Hero | 186–231 | Badge 188–193 wortgleich; H1, beide Absätze, beide CTAs NEU |
| 2 | NEU `#journey` (5 Schritte) | — | direkt nach Hero einfügen |
| 3 | Deposit + Live-Params | 502–546 (Provide-compute-Karte) | aus dem 2-Spalten-Grid in eigene Vollbreiten-Sektion heben; + /vault-Cross-Link |
| 4 | `#proof` | 344–497 | bleibt an Position; nur Intro-`<p>` (348–352) neu |
| 5 | Buyer-Pfad (demoviert) | 547–567 („Bring a workload") | unter Proof; Vollbreite (`max-w-3xl`), + Buyer-Pointer-Zeile → `/` |
| 6 | Multi-Asset | 280–341 | wortgleich unter Buyer-Karte |
| 7 | „How a job settles" LOOP | 263–277 | wortgleich darunter (bleibt für Buyer) |
| 8 | Differentiation-Karten | 233–261 | wortgleich darunter |
| 9 | Honesty-Box | 571–588 | + `id="guarded"`; ein No-Earnings-Satz angehängt |
| 10 | `#pilot` Pilot-CTA | 590–630 | UNVERÄNDERT (beide Templates, Prosa-Kanal, kein Link) |

Grid-Wrapper 499–501/568–569 auflösen. Header-Kommentar (Z. 3–9) auf Provider-Funnel umschreiben. `Cpu`-Icon: auf neuem Bond-CTA wiederverwenden oder Import entfernen (sonst unused-Lint).

**Anker:** `#journey` NEU (Hero-CTA + ProvidersView-Link), `#guarded` NEU (Honesty-Box), `#proof`/`#pilot` unverändert (jetzt aus Journey verlinkt).

### Hero (Copy)

- H1: `Earn as an agent.` (neon) / Block-Subline: `Deliver digital work — get paid on-chain.`
- Mono-Lead: „Place a security deposit, take jobs with machine-checked acceptance, deliver against a verifiable result hash — and get paid from escrow, on-chain."
- Sans-Absatz (Ehrlichkeit): „This is guarded v1, not an open signup. Placing the security deposit is self-service via StarKey; everything after runs through personal onboarding — a curated roster, a gated quote path, one active job per provider. Three real jobs have settled end-to-end; what they actually paid is public below. No earnings promises."
- CTAs: primär (filled, mit `Cpu`-Icon) `Place your security deposit` → `/compute/bond/`; sekundär (outline) `How earning works` → `#journey`.

### `#journey` — datengetrieben (`JOURNEY`-Const nach `LOOP`, Render im LOOP-/Panel-Idiom: nummerierte Liste, mono Step-Nr. purple, mono Titel, sans Body, Link-Zeile; `Link` für Routen, `<a>` für Anker)

H2: „How earning works — the provider journey"

1. **01 · Understand the deal** — „You get paid per outcome, from escrow, once your delivery passes acceptance — with a wCOSMO security deposit at stake while you work; failing to deliver costs you a fixed penalty deduction paid to the buyer. This is guarded v1: small caps, one active job per provider, no earnings promises." → `Read the guarded-v1 terms →` `#guarded`
2. **02 · Place your security deposit** — „Self-service via StarKey: place an amount at or above the live minimum; it sits in on-chain custody under its own vault and is withdrawable after a cooldown when you have no active job." + Live-Zeile `Required minimum deposit right now: {live ? fmtAmt(live.minBond)+' wCOSMO' : '—'}` (bestehendes `fmtAmt` nutzen, keine neuen BigInt-Literale) → `Place your security deposit →` `/compute/bond/`
3. **03 · Get onboarded** — „Onboarding is personal, not a form: copy the provider template below, fill it in, and we review it and set up your first job together. Onboarded providers appear on the curated roster." → `Copy the provider template →` `#pilot` · `See the roster →` `/market/providers/`
4. **04 · Receive jobs & make offers** — „Buyers post jobs on the market and onboarded providers answer with wallet-signed offers. When a buyer selects your offer, the price is escrowed on-chain before you deliver." → `Browse the job board →` `/`
5. **05 · Deliver & get paid** — „Deliver against a verifiable result hash; where the job defines a machine acceptance check, payment is gated on it, and settlement pays you from escrow on-chain. The three settled jobs so far paid the delivering side 285, 200 and 200 wCOSMO — real settlements, not projections." → `See the settled jobs →` `#proof`

### Deposit-/Params-Sektion (gehobene Karte)

H2 „Your security deposit — self-service, live parameters"; Karten-Absatz (507–512), beide CTAs (Bond + wCOSMO), PARAMS-Tabelle (529–538) und Footnote inkl. „Request entry point"-Live-Zeile (539–545) wortgleich. NEU danach:
```tsx
<p className="mt-3 font-mono text-[11px]">
  <Link href="/vault/" className="text-purple-300 hover:text-purple-200">
    Watch your deposit in on-chain custody, live →
  </Link>
</p>
```

### Proof-Intro (ersetzt 348–352)

„Three settled jobs where the delivering side actually got paid — 285 wCOSMO for a machine-accepted software patch (PATCH-001), 200 wCOSMO for a signed attestation of live protocol invariants (ATTEST-001), 200 wCOSMO for the first compute job (JOB-001). Each went one step further, every leg links to its transaction, and the transparency notes say plainly who the parties were."

### Buyer-Pointer (über/als Einstieg der demovierten Buyer-Sektion)

„Buying rather than providing? The buyer-first entry point is the market home — " + `Post a job on the market →` (`Link` → `/`).

### Honesty-Box-Zusatz (an Absatz 578–586)

„To be explicit: nothing on this page is an earnings promise — the only numbers shown are what already-settled jobs actually paid."

## 2. ProvidersView.tsx (Z. 116–125)

`/community-rfq/`-Link ersetzen: „…if you run an agent or offer digital services and want in, `see how providers get onboarded` (→ `/compute/#journey`, Link-Stil sky wie bisher) — deposit, personal onboarding and the proposal template are all there." Andere `/community-rfq/`-Referenzen (rfq, wcosmo, protocol) NICHT anfassen.

## 3. compute/page.tsx Metadata

```
title: 'COSMO — Earn as an agent: outcome-settled work (guarded v1)'
description: 'The provider entry point for COSMO on Supra Mainnet: place your security deposit self-service via StarKey, get onboarded personally to a curated roster, take wallet-signed jobs on the market, and get paid from escrow after machine-checked acceptance. Guarded v1 — one active job per provider, gated quoting, no open signup, no earnings promises; the settled jobs and what they actually paid are public.'
```

## 4. Plan ins Repo

Nach `plans/website-neuschnitt-etappe4-plan.md` kopieren.

## Build / Deploy / Verify

```bash
cp -r out out.pre-etappe4   # VOR Build
npm run build && npm run lint   # Lint: keine NEUEN Errors in den 3 Dateien
```

**Statische Checks (out/ bzw. curl):**
- `Earn as an agent` ≥2x in `out/compute/index.html` (H1 + title)
- Anker `id="journey"`, `id="guarded"`, `id="proof"`, `id="pilot"` präsent
- `Required minimum deposit` + `Request entry point` präsent (Werte `—` server-seitig, Client-Fetch)
- Sektionsreihenfolge: journey → Proof → Bring a workload → Pay in the asset → How a job settles → pilot
- `out/market/providers/index.html`: `community-rfq` = 0; `see how providers get onboarded` mit href `/compute/#journey`

**Browser (agent-browser, Domain für Live-Params):**
- /compute: Network-Tab aktiv; `How earning works` scrollt zu #journey; Bond-CTA → /compute/bond/; Live-Params füllen sich (kein `—` mehr, Journey-Step-02-Minimum zeigt Zahl); Step-05 → #proof; Template-Copy-Buttons in #pilot funktionieren
- /market/providers → Roadmap-Box-Link landet auf /compute/#journey
- Mobile: Journey-Rail stackt, Params-Tabelle ohne Overflow
- heros.cloud-Gegenprobe

**Git** (nur nach User-GO; Einzeldateien):
```bash
git add src/app/compute/ComputeLanding.tsx src/app/compute/page.tsx \
  src/app/market/providers/ProvidersView.tsx \
  plans/website-neuschnitt-etappe4-plan.md
```

**Rollback:** `rm -rf out && cp -r out.pre-etappe4 out`

## Ausdrücklich NICHT in Etappe 4

- Kein Kontakt-Link (mailto/Telegram/X) — Prosa-Kanal bleibt
- Keine Earnings-Versprechen; nur real gezahlte Beträge aus den Daten-JSONs
- Market-Seiten (außer ProvidersView-Repoint) und /vault unverändert; Sprachpass = Etappe 5
- Proof-Panels inhaltlich unverändert (nur Intro-Absatz)
- Nav unverändert (Network → /compute, match deckt /vault + /maker-onboarding)
