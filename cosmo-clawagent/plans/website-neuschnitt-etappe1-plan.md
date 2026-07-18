# Website-Neuschnitt Etappe 1 — Nav 10→4 + Archiv-Hub /protocol

## Kontext

heros.cloud trägt 13 Routen in 10 Nav-Tabs aus vier gewachsenen Tracks; das Produkt (Marketplace) ist ein Tab von zehn. Zielbild beschlossen 2026-07-17 („Die Site IST der Marketplace", `plans/website-neuschnitt-konzept.md`, Commit `1cf537c`). Etappe 1 = reines Umhängen, kein Redesign: Nav auf 4 Bereiche einstampfen, Alt-Tracks in einen Archiv-Hub `/protocol` (nicht in der Nav), alle alten URLs bleiben erreichbar (static export → keine Redirects möglich, Routen bleiben einfach bestehen).

**User-Entscheidungen (17.07., AskUserQuestion):** (1) Im Archiv nur `/access` listen (mit „holder-gated"-Chip); `/founder` bleibt komplett unverlinkt. (2) $COSMO-Tab zeigt in Etappe 1 auf `/` (Landing); Ziel wandert in Etappe 2 mit.

Repo: `/root/workspace/meine-website/cosmo-clawagent` — Next.js App Router, `output: 'export'`, `trailingSlash: true`. **`npm run build` schreibt direkt ins live servierte `out/`** (PM2 `cosmo-clawagent`, kein Restart nötig). Regeln: vorher `cp -r out out.pre-<thema>`; **NIE `git add -A`** (nur Einzeldateien).

## Neue Nav (4 Tabs)

| Tab | href | zusätzlich aktiv auf (`match`) |
|---|---|---|
| Market | `/market` | `/market/*` (Prefix) |
| Trust | `/assurance` | — |
| Network | `/compute` | `/vault`, `/maker-onboarding` |
| $COSMO | `/` (exakt) | `/wcosmo` |

Archivierte Routen (`/protocol`, `/rfq`, `/community-rfq`, `/maker-capital`, `/access`, `/demo`, `/founder`) highlighten keinen Tab.

## Änderungen

### 1. `src/components/navigation.tsx` (Zeilen 9–22, 46, 86)

- `navLinks`-Array ersetzen durch die 4 Einträge oben; Typ: `{ href: string; label: string; match?: string[] }`. Ungenutztes `external`/`download` samt der beiden toten `<a>`-Branches (Desktop 50–60, Mobile 90–101) entfernen — nur der `<Link>`-Branch bleibt.
- Aktiv-Logik: Helper über der Komponente, ersetzt `pathname === link.href` an Zeile 46 (Desktop) **und** 86 (Mobile):

```ts
function isActive(pathname: string, link: (typeof navLinks)[number]): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'; // trailingSlash-Normalisierung
  return [link.href, ...(link.match ?? [])].some((t) =>
    t === '/' ? path === '/' : path === t || path.startsWith(t + '/'),
  );
}
```

### 2. Neu: `src/app/protocol/page.tsx` (eine Datei, Server-Komponente, keine Client-Interaktivität)

- Metadata nach dem Muster von `src/app/rfq/page.tsx`: `title: 'COSMO — Protocol Archive'`, description = ehrlicher Index-Satz („Kept online as a record; not the current product surface.").
- Seiten-Chrome wie die archivierten Seiten (`terminal-theme-scope` / `terminal-container` / `grid-bg`, Container `relative z-10 mx-auto max-w-3xl px-5 py-16 md:py-24` — Muster: `MakerCapital.tsx:66–70`). Kicker mono uppercase `tracking-[0.25em]`, H1 mono. Kein CTA_BIG (Index, kein Funnel).
- Intro (EN, übersetzungsfest): "These pages document earlier stages of the COSMO protocol. They stay online as a record — every link keeps working — but they are not the current product surface. For that, use Market, Trust and Network in the navigation."
- 5 Karten (Panel `rounded-xl border border-white/10 bg-white/[0.02] p-5`, mono-Titel, sans-Einzeiler aus den jeweiligen Seiten-Metadaten, `Open →`-Link mono `text-purple-300 hover:text-purple-200`, hrefs mit trailing slash):
  - **RFQ Live** `/rfq/` — Live read of an autonomous maker quoting, funding and settling RFQ trades on Supra Mainnet, reconstructed from public on-chain view functions.
  - **Community RFQ** `/community-rfq/` — Stage-1 controlled community experiment: an allowlisted wallet previews a small intent-only RFQ. No funds move.
  - **Maker Capital** `/maker-capital/` — Research draft on community-provided capital as maker inventory. Not live — no deposits, no launch decision.
  - **Mainnet Demo** `/demo/` — Click-through replay of a controlled Mainnet RFQ round-trip with full transaction evidence. Static on-chain data.
  - **Holder Access** `/access/` + Chip `holder-gated` (amber: `rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-300`) — StarKey wallet gate that verifies COSMO NFT holder access. No trades, no on-chain transactions.
- `/founder` wird NICHT gelistet.

### 3. Neu: `src/components/ProtocolNotice.tsx` + Einbau auf 5 Archiv-Seiten

Kleines Banner (keine Hooks, funktioniert in den `'use client'`-Komponenten):

```tsx
import Link from 'next/link';

// Small archive banner rendered at the top of every archived protocol page.
export default function ProtocolNotice() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 font-mono text-[11px] text-slate-500">
      <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
      <span>Part of the COSMO protocol archive — not the current product surface.</span>
      <Link href="/protocol/" className="text-purple-300 hover:text-purple-200">Protocol archive →</Link>
    </div>
  );
}
```

Einbau als erstes Kind des gepolsterten Containers, vor dem Header/Hero (+ Import je Datei):

| Datei | Stelle |
|---|---|
| `src/app/rfq/RfqActivity.tsx` | in Hero-`<section>` (~78), vor Live-Badge (~79) |
| `src/app/community-rfq/CommunityRfq.tsx` | im Container (~176), vor `<header>` (~178) |
| `src/app/maker-capital/MakerCapital.tsx` | im Container (~70), vor `<header>` (~72) |
| `src/app/access/AccessGate.tsx` | im Container (~102), vor `<header>` (~104) |
| `src/app/demo/RfqReplay.tsx` | im Container (~101), vor `<NarrativeHeader />` (~102) |

### 4. Zwei Cross-Links (Erreichbarkeit)

- **`/vault` wäre sonst verwaist** (heute nur von `/rfq` verlinkt): in `src/app/compute/ComputeLanding.tsx` Link-Zeile ~609–614, zwischen „RFQ mainnet proof →" und Manifesto-PDF: `<Link href="/vault/" className="text-purple-300 hover:text-purple-200">Maker vault →</Link>` (`Link` bereits importiert).
- **Auffindbarkeit /protocol:** in `src/app/page.tsx` Footer (~540–544) nach dem Copyright-`<p>`: zweite Zeile `<p className="mt-2 font-mono text-xs text-slate-600"><Link href="/protocol/" className="text-slate-500 transition-colors hover:text-slate-300">Protocol archive</Link></p>` (`Link` bereits importiert).

### 5. Plan im Repo ablegen

Diesen Plan nach `plans/website-neuschnitt-etappe1-plan.md` kopieren (User-Workflow: Plan liegt im Projektverzeichnis).

## Reihenfolge

1. `ProtocolNotice.tsx` + `protocol/page.tsx` (rein additiv)
2. 5 Notice-Einbauten + 2 Cross-Links
3. `navigation.tsx` zuletzt (sichtbarer Cutover)
4. Snapshot → Build → Verify

## Build / Deploy / Verify

```bash
cd /root/workspace/meine-website/cosmo-clawagent
cp -r out out.pre-nav-archiv     # Rollback-Snapshot VOR dem Build
npm run build                    # Build IST Deploy (kein PM2-Restart nötig)
npm run lint
```

**Routen-Check** (alle 200 erwartet):
```bash
for p in / /market/ /assurance/ /compute/ /wcosmo/ /vault/ /protocol/ /rfq/ /community-rfq/ /maker-capital/ /access/ /demo/ /founder/; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" http://localhost:3001$p; done
```

**Inhalts-Checks** (statisches HTML):
- `/protocol/`: enthält `holder-gated`, `RFQ Live`, `Maker Capital`; enthält KEIN `/founder`
- alle 5 Archiv-Seiten: enthalten `protocol archive` (Notice gebacken)
- `/compute/`: enthält `Maker vault`; `/`: enthält `Protocol archive`
- Nav im servierten HTML: genau 4 Tabs; alte Labels `>RFQ Live<`, `>Community<`, `>Maker Capital<`, `>Access<` weg

**Browser-Checks** (Aktiv-Zustand ist client-side, agent-browser):
- `/market/post/` → Market aktiv; `/vault/` + `/maker-onboarding/m2/` → Network aktiv; `/` → NUR $COSMO aktiv; `/wcosmo/` → $COSMO aktiv; `/protocol/`, `/rfq/` → kein Tab aktiv
- Mobile: Hamburger öffnet, 4 Einträge, Tap schließt

**Git** (nur nach User-GO committen; Einzeldateien, nie `add -A`):
```bash
git add src/components/navigation.tsx src/components/ProtocolNotice.tsx \
  src/app/protocol/page.tsx src/app/rfq/RfqActivity.tsx \
  src/app/community-rfq/CommunityRfq.tsx src/app/maker-capital/MakerCapital.tsx \
  src/app/access/AccessGate.tsx src/app/demo/RfqReplay.tsx \
  src/app/compute/ComputeLanding.tsx src/app/page.tsx \
  plans/website-neuschnitt-etappe1-plan.md
```

**Rollback:** `rm -rf out && cp -r out.pre-nav-archiv out` (PM2 serviert sofort wieder den alten Stand).

## Ausdrücklich NICHT in Etappe 1

- Landing-Inhalte verschieben / Market nach `/` heben (Etappe 2)
- Trust-Konsolidierung Assurance+Evidence (Etappe 3), Provider-Funnel (Etappe 4), Sprachpass (Etappe 5)
- Inline-Evidence-Links auf `/demo` von Landing/Compute bleiben unverändert (Proof-Links, „zeigen statt behaupten")
- Kein Redesign der archivierten Seiten
