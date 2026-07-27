# COSMO Website Redesign — „Settlement Rail" als visuelles System

## Context

Die Site auf heros.cloud (`/root/workspace/meine-website/cosmo-clawagent`, Next 16 static export, 25 Routen, ~14k Zeilen TSX) ist über vier Tracks gewachsen. Optisch trägt sie ein Terminal/Neon-Purple-Idiom, das COSMO wie ein Krypto-Projekt aussehen lässt — während das Produkt eine Execution- und Settlement-Infrastruktur für bezahlte Agentenarbeit ist. Seit Etappe 2 ist `/` ein Render-Alias auf das Job-Board; ein Erstbesucher sieht Listings, bevor er versteht, was hier passiert.

Ziel: eine Landing auf `/`, die in zehn Sekunden den Ablauf **Request → Quote → Fund → Deliver → Verify → Settle** vermittelt, plus ein Designsystem, das dieses eine Motiv über die Produktseiten trägt. Alle funktionierenden Markt-, Wallet- und Settlement-Flows bleiben unangetastet.

**Entschieden (Rene, 27.07.):**
1. `/` = neue Landing; Market bleibt auf `/market/` (Route existiert bereits, rendert MarketHome).
2. Umbautiefe: Landing + Shell + Produktpfad (`/market/*`). Übrige Routen erben Tokens/Shell, behalten Layout.
3. 3D progressiv: WebGL nur bei fähigem Gerät + `motion ok`, sonst dieselbe Rail als SVG.

---

## Harte Guardrails

- **`npm run build` IST das Deployment** (`out/` wird live von PM2 `cosmo-clawagent` serviert). Vor dem ersten Build: `cp -r out out.pre-redesign`. Danach existieren zwei Snapshots — `out.pre-role-split` wird erst nach Rene-Freigabe gelöscht (Regel: nur EIN Snapshot behalten).
- **Keine Logikänderung** an: `useMarketFlow`, `marketApi.ts`, `marketWallet.ts`, `supraTx.ts`, `starkeySign.ts`, `computeTx.ts`, `nftGate.ts`, `useNextStepsDoc`, allen Tx-Buildern. Redesign ist reine Präsentationsschicht.
- **Keine erfundenen Zahlen.** Die Live-Sektion liest ausschließlich `useMarketJobs()` + `market-pilot001-2026-07-17.json`. Stand heute real: 4 settled, 1 open. Kein API-Ergebnis → sichtbarer „live data unavailable"-Zustand, nie ein Platzhalterwert, der wie eine Zahl aussieht.
- **Static export:** keine dynamischen Segmente, `trailingSlash: true` — alle neuen Links mit Slash. Cross-Route-`#hash` nur als plain `<a>`, nie `<Link>`.
- `HonestyBox` bleibt auf allen Marktseiten und bekommt einen Platz auf der Landing.
- Provider-Outreach-Links zeigen auf `/market/work/`, Buyer auf `/market/job/` bzw. `/market/post/` (Rollensplit-Regel).

---

## Architektur

### 1. Designsystem — `src/app/globals.css` + `src/design/tokens.ts`

Semantische Tokens statt Dekorfarben. Basis Graphit/Schwarz/gebrochenes Weiß; Akzent **nur** an Zustand gebunden:

```
--surface-0 #08090B   Seitengrund
--surface-1 #0D0F13   Panel
--surface-2 #14171D   erhöhtes Panel
--line-*              Hairlines 6/12/24 % Weiß
--ink-0 #F2F4F7  --ink-1 #A8B0BC  --ink-2 #6B7480
--phase-idle          Graphit  (Phase noch nicht erreicht)
--phase-active        Indigo   (Prozess läuft — der einzige „lebende" Ton)
--phase-proof         Cyan     (Hash, Signatur, Evidence)
--phase-settled       Emerald  (Settlement abgeschlossen)
--phase-fault         Rose     (Dispute/Slash)
```

**Hebel für die 18 nicht angefassten Seiten:** alle bestehenden Klassen (`.terminal-container`, `.grid-bg`, `.bento-item`, `.neon-text-*`, `.tier-*-badge`, `.cosmo-featured`, `glow-pulse`) bleiben **namensgleich erhalten**, werden aber auf die neuen Tokens umdefiniert — Neon-Textschatten raus, Purple-Grid entsättigt. Dadurch ziehen `/assurance`, `/compute`, `/vault`, `/cosmo`, `/wcosmo`, `/buy`, `/protocol/*` optisch mit, ohne dass eine einzige Zeile TSX dort angefasst wird. Ebenso `src/app/market/components/cta.ts`: gleiche Exports (`CTA_BIG`, `CTA_DANGER`, `BTN_GHOST`), neue Klassenwerte → alle Flow-Buttons erben automatisch.

### 2. Komponenten — `src/components/cosmo/`

| Komponente | Zweck |
|---|---|
| `Surface.tsx` | Panel-Primitive (`base` / `raised` / `inset`), ersetzt die verstreuten `rounded-xl border-white/10 bg-white/[0.02]`-Kopien |
| `Chip.tsx` | Ein Chip-Primitive für Status, on-chain/off-chain, Rolle — konsumiert `STATUS_BADGE` aus `marketStatus.ts` unverändert |
| `SectionHeader.tsx` | Kicker / H2 / Lead, konsistente Vertikalrhythmik |
| `Cta.tsx` | primary / secondary / ghost; `cta.ts` re-exportiert daraus |
| `Reveal.tsx` | GSAP-Einblendung mit `prefers-reduced-motion`-Guard (bei reduced motion: sofort sichtbar, kein Transform) |
| `PhaseRail.tsx` | **Kanonische 6-Phasen-Rail als SVG.** Wird von der Landing, vom 3D-Fallback und als Kopfzeile der Marktseiten benutzt |
| `usePhase.ts` | Ein Context: aktueller Phasenindex 0–5. Speist gleichzeitig Rail, Phasenkarten und 3D-Szene → DOM und WebGL laufen nie auseinander |

Die 6 Phasen sind kein Marketing-Modell, sondern eine Projektion der echten Schritte aus `src/app/market/lib/marketStatus.ts`:

| Landing-Phase | reale Schritte (`BUYER_STEPS`) | Kette |
|---|---|---|
| Request | `review` → `offers` | off-chain |
| Quote | `select` | off-chain |
| Fund | `escrow` (`create_outcome_request_v2`) | on-chain |
| Deliver | `accept` → `working` (`deliver_result_v2`) | on-chain |
| Verify | `approve` (result_hash-Abgleich) | on-chain |
| Settle | `settled` (`approve_delivery_v2`) | on-chain |

Jede Phasenkarte zeigt genau drei Zeilen: **STATUS · ACTION · PROOF** — und trägt das ehrliche off-chain/on-chain-Badge aus dem bestehenden `FlowRail`-Vokabular.

### 3. 3D-Kern — `src/components/cosmo/core/`

- `CosmoCore.tsx` — `next/dynamic(..., { ssr: false })`, lädt three erst nach Mount und nur wenn `useCapability()` grünes Licht gibt. **Three landet nie im First-Load-Bundle.**
- `scene.ts` — imperative Three-Szene, kein react-three-fiber (spart ~40 KB und eine Abstraktionsebene):
  - Rail als `CatmullRomCurve3` → `TubeGeometry`, additive Linienmaterialien statt Postprocessing-Bloom (Budget!).
  - 6 Knotenmarker an den Phasenpositionen; der aktive Knoten pulsiert.
  - Auftragsobjekte als `InstancedMesh` (ein Draw-Call), die entlang der Kurve wandern; beim Passieren eines Knotens ein kurzer „Ereignis"-Impuls (Hash/Signatur/Settlement).
  - `renderer.setPixelRatio(min(devicePixelRatio, 1.75))`, Render-Loop pausiert per `IntersectionObserver` außerhalb des Viewports und bei `document.hidden`.
  - Voller `dispose()`-Pfad beim Unmount.
- `useCapability.ts` — `prefers-reduced-motion`, `matchMedia('(min-width: 768px)')`, `navigator.hardwareConcurrency`, `deviceMemory`, WebGL2-Kontexttest. Ergebnis: `'webgl' | 'svg' | 'static'`.
- `CoreFallback.tsx` — dieselbe Rail als SVG mit denselben 6 Knoten und derselben `usePhase`-Anbindung. Bei `'static'` ohne Loop-Animation.

**Budget:** three-Chunk ≤ ~180 KB gzip, lazy. First-Load-JS von `/` darf gegenüber heute nur um GSAP+ScrollTrigger (~25 KB gzip) wachsen. Wird nach `next build` an der Route-Tabelle geprüft.

### 4. Scroll-Choreografie — GSAP

- `ScrollTrigger` mit `pin` + `scrub` über Sektion 3: die Rail bleibt stehen, sechs Phasenkarten laufen durch, `usePhase` setzt den Index → 3D-Kern und SVG-Rail folgen synchron.
- Sektion 4 (Evidence): gestaffelte Reveals entlang der Beweiskette.
- `matchMedia`-Guard: bei `prefers-reduced-motion` **kein Pin, kein Scrub** — die sechs Phasen stehen untereinander, alle sichtbar, Rail zeigt alle Knoten aktiv. Gleiche Information, null Bewegung.
- Alle Trigger werden im Cleanup `kill()`-t (Next-Client-Navigation).
- `framer-motion` bleibt installiert (nutzen `/demo`, `/vault`, `/assurance`) — GSAP kommt additiv für Scroll, kein Austausch.

---

## Etappen

### E0 — Fundament (kein sichtbarer Bruch)
- `npm i three gsap` + `@types/three`.
- `src/design/tokens.ts`, `globals.css` auf neue Tokens; Legacy-Klassen umdefiniert (siehe oben).
- `src/components/cosmo/*` Primitives + `cta.ts` re-export.
- **Prüfpunkt:** die 18 nicht angefassten Routen laufen visuell mit, kein TSX dort geändert.

### E1 — Shell
- `src/components/navigation.tsx`: Wortmarke statt Zap-Kreis-Icon, Hairline statt Purple-Border, Tabs `Market → /market/` (der `isActive`-Sonderfall für `/` fällt weg, `/` bekommt einen eigenen dezenten Home-Zustand über das Logo). Mobile-Menü mit Fokusfalle + `Escape`.
- `src/app/layout.tsx`: neuer Footer (Routenspalten statt Copyright-Zeile), `<a href="#main">Skip to content</a>`, `metadataBase` bleibt.

### E2 — Die Landing `/`
- Neu: `src/app/(landing)/…` bzw. konkret `src/app/page.tsx` → rendert `src/components/landing/Landing.tsx`; Sektionen als eigene Dateien unter `src/components/landing/sections/`.
- `src/app/market/page.tsx`: `alternates.canonical` von `/` auf `/market/` ziehen; Metadata der Landing neu (Titel/Description/OG).
- Sektionen 1–7 exakt nach Brief:
  1. **Hero** — „Execution Layer for Agent Economies on Supra" / „Publish tasks. Verify outcomes. Settle on-chain." / CTAs `Explore the live market → /market/` und `See how settlement works → #flow` (plain `<a>`). Kern im Hintergrund.
  2. **Problem** — drei präzise Sätze, kein Superlativ.
  3. **The COSMO flow** — gepinnte 6-Phasen-Sequenz (STATUS · ACTION · PROOF).
  4. **Verifiable outcomes** — Beweiskette `spec_hash → eingefrorene Spec-Bytes → result_hash → tx → Explorer`, echte Werte aus `market-pilot001-2026-07-17.json`, Links auf `/evidence/pilot-001/`, `/evidence/mcp-probe-002/`, `/evidence/buyer-proof-001/`.
  5. **Live market** — `useMarketJobs()`; abgeleitete Kennzahlen kommen aus einer **reinen Funktion** `deriveMarketSummary(jobs)` in `src/components/landing/lib/marketSummary.ts` (testbar, siehe Verifikation). Fehlerfall = expliziter Unavailable-Zustand.
  6. **Audiences** — Buyers → `/market/post/`, Providers → `/market/work/`, Protocols → `/assurance/`, Agent Builders → `/compute/`.
  7. **Closing** — „Agents do not need another place to talk. They need a place to complete paid work." + `Open the COSMO Market → /market/`.

### E3 — Produktpfad `/market/*`
`MarketHome`, `JobDetail`, `WorkDetail`, `PostJobForm`, `ProvidersView`, `FlowRail`, `NextStepPanel`, `OfferCard`, `DeliverPanel`, `JobInfoSections` auf `Surface`/`Chip`/`SectionHeader` umstellen. **Nur JSX/Klassen**, keine Hooks, kein State, keine Tx-Pfade. `FlowRail` bekommt intern die neue Knotenoptik, behält die `RoleStep`-Props-Signatur exakt.

### E4 — Zugänglichkeit & Politur
Fokusringe auf allen interaktiven Elementen, Kontrastprüfung (Ziel: Fließtext ≥ 7:1, sekundär ≥ 4.5:1), Tastaturpfad Hero → Rail → Board, `aria-label` an der Rail, `<canvas aria-hidden="true">` + textliche Beschreibung der Phasen im DOM, Tab-Reihenfolge im Mobile-Menü.

---

## Verifikation

**Statisch**
- `npx tsc --noEmit` sauber.
- `npm run lint` sauber.
- `npm test` — die bestehenden 18 Tests müssen grün bleiben (`marketStatus.test.ts` prüft die Schritt-Logik, die E3 nicht anfassen darf).

**Neue Tests** (Regel „Tests müssen beweisen, nicht korrelieren"):
- `marketSummary.test.ts`: `deriveMarketSummary` gegen eine eingefrorene API-Antwort — zählt settled/open korrekt, **und** eine Gegenprobe, dass bei leerer/fehlerhafter Antwort `null` statt `0` herauskommt (0 würde als echte Zahl gelesen).
- `phaseMap.test.ts`: die 6 Landing-Phasen decken jeden `BUYER_STEPS`-Eintrag genau einmal ab. Gegenprobe: ein entfernter Schritt lässt den Test rot werden — sonst kann die Landing still von der Realität abdriften.

**Manuell (dev, Port 3000)**
- `/api/market/*` fehlt im Dev-Server. Dafür ein **dev-only** Rewrite auf `http://127.0.0.1:4100`, hart hinter `process.env.NODE_ENV === 'development'` gegated, damit der Export-Build unberührt bleibt.
- Browser-Durchgang bei 390 px und 1440 px: Hero lesbar ohne Scroll, Rail-Sync 3D↔DOM, Live-Sektion zeigt die echten 4 settled / 1 open.
- `prefers-reduced-motion: reduce` erzwingen → keine Pins, keine Loops, alle sechs Phasen sichtbar.
- WebGL deaktivieren → SVG-Fallback trägt dieselbe Aussage.
- Tastatur-Durchlauf ohne Maus über die ganze Landing.

**Bundle**
- Nach `next build` die Route-Tabelle prüfen: First-Load-JS `/` und `/market/`; three darf nur in einem lazy Chunk auftauchen.

**Live-Smoke nach Deploy**
`/`, `/market/`, `/market/job/?id=job_mrz3g06c7z98w3`, `/market/work/`, `/market/post/`, `/assurance/`, `/compute/`, `/vault/`, `/buy/`, `/cosmo/`, `/protocol/` — jede Route lädt, Deep-Link mit Query-Param funktioniert, keine 404 auf Evidence-Pfade.

---

## Rollback

`cp -r out out.pre-redesign` vor dem ersten Build. Bricht etwas: `rm -rf out && mv out.pre-redesign out` — PM2 `serve` liest das Verzeichnis direkt, kein Neustart nötig (und weiterhin **ohne** `-s`, sonst brechen Deep-Links). Git: alles auf einem Branch, Etappen einzeln committet, damit E3 ohne E2 zurückgedreht werden kann.

---

## Annahmen

- Website-Sprache bleibt Englisch (bestehende Site + alle im Brief vorgegebenen Strings sind Englisch).
- Kein neues Logo/Wortmarken-Asset; die Wortmarke wird typografisch aus Geist Mono gesetzt.
- `/cosmo` behält die Token-Story unverändert (erbt nur die Tokens) — der Manifesto-Track ist ein eigener Strang.
