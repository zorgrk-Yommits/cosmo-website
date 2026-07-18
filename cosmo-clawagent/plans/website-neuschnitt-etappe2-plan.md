# Website-Neuschnitt Etappe 2 — Startseite = Buyer-Einstieg (Market nach /)

## Kontext

Etappe 1 (Nav 10→4 + /protocol-Archiv) ist live und committet (`85a4701`). Etappe 2 des beschlossenen Neuschnitts („Die Site IST der Marketplace", `plans/website-neuschnitt-konzept.md`): Die Market-Home wird die Startseite auf `/`; die bisherige Landing (Token-/Protokoll-Story) zieht 1:1 nach `/cosmo` um. Static export (`output: 'export'`, `trailingSlash: true`) → keine Redirects möglich, daher **Render-Alias**: `/` und `/market/` rendern dieselbe `MarketHome`-Komponente; `/market/job/?id=`-Deep-Links (in E-Mails) bleiben unverändert gültig.

**User-Entscheidungen (18.07., AskUserQuestion):** (1) Story-URL = `/cosmo`. (2) Landing zieht 1:1 um (inkl. Stats, Honesty-Box, Assurance-Card) — Trust-Konsolidierung ist Etappe 3, Sprachpass Etappe 5.

**Exploration bestätigt:** MarketHome ist voll portabel (API-Base `/api/market` root-relativ, kein `window.location`/`usePathname`, alle internen Links absolut `/market/...`); Backend/E-Mails generieren keine Frontend-`/market`-URLs; Landing ist rein statisches JSX ohne Hooks, alle Imports alias-basiert (`@/components/...`), `HomePage`-Export wird nirgends namentlich referenziert; keine Tests außer Lint.

Repo: `/root/workspace/meine-website/cosmo-clawagent`. **`npm run build` schreibt direkt ins live servierte `out/`** (PM2 `cosmo-clawagent` :3001, kein Restart). Regeln: vorher `cp -r out out.pre-etappe2`; **NIE `git add -A`**.

## Ziel-Routing

| Route | Inhalt | Metadata |
|---|---|---|
| `/` | MarketHome (Render-Alias) | Market-Titel/-Description (= heutige `/market`-Metadata) + `canonical: '/'` |
| `/market/` | MarketHome (bleibt) | wie bisher + `canonical: '/'` |
| `/cosmo/` | bisherige Landing 1:1 | alte SITE_TITLE/SITE_DESCRIPTION aus layout.tsx + eigene OG/Twitter-Blöcke + `canonical: '/cosmo/'` |

Nav: Market → `/` (match `['/market']`), $COSMO → `/cosmo` (match `['/wcosmo']`), Trust/Network unverändert. `isActive` braucht KEINE Änderung (verifiziert: `/` exakt→Market; `/market/*` via match→Market; `/community-rfq` matcht NICHT `/cosmo`, da `startsWith('/cosmo/')`).

## Änderungen (Reihenfolge)

### 1. `git mv src/app/page.tsx src/app/cosmo/CosmoStory.tsx` + In-File-Edits

- Zeile 139: `export default function HomePage()` → `CosmoStory()`
- Footer-Block komplett löschen (alte Zeilen 539–550 inkl. `{/* Footer */}`) — wandert ins Layout (Schritt 4)
- Header-Kommentar ergänzen: `// /cosmo — the COSMO protocol story (former landing page, moved 1:1 in Etappe 2).`
- Sonst NICHTS ändern (1:1-Umzug; alle `@/`-Imports bleiben gültig, `/images/cosmo3.jpg` + Manifesto-PDF sind public/-Pfade)

### 2. Neu: `src/app/cosmo/page.tsx` (Server-Komponente)

Trägt die ALTEN Layout-Default-Strings (wortgleich aus `layout.tsx:20–22` übernehmen):

```tsx
import type { Metadata } from 'next';
import CosmoStory from './CosmoStory';

// The former landing page (protocol story). Carries the old site-default SEO
// text; overrides openGraph/twitter so it does not inherit the buyer-first
// layout defaults (Next merges metadata shallowly per top-level key).
const TITLE = 'COSMO — Execution & Accountability Layer for the Agent Economy';
const DESCRIPTION = '<wortgleich SITE_DESCRIPTION aus layout.tsx>';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/cosmo/' },
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: 'COSMO', type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function CosmoPage() {
  return <CosmoStory />;
}
```

### 3. Neu: `src/app/page.tsx` (Root, Server-Komponente)

```tsx
import type { Metadata } from 'next';
import MarketHome from './market/MarketHome';

// Etappe 2: the Market IS the site. `/` renders the same MarketHome as /market/
// (render-alias — static export forbids redirects; /market/ deep links in
// emails keep working). Canonical points both routes at `/`.
export const metadata: Metadata = {
  title: 'COSMO — Agent Market: post jobs, agents deliver, the chain settles',
  description:
    'A pilot marketplace for digital work: post a job, curated pilot providers make offers, and from selection onward escrow, delivery and payout run as verifiable transactions on Supra Mainnet.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return <MarketHome />;
}
```

(Titel/Description = wortgleich `market/page.tsx`; MarketHomes relative Imports `./useMarketData` etc. lösen relativ zur eigenen Datei auf — Import von Root aus funktioniert.)

### 4. `src/app/layout.tsx`

- Import ergänzen: `import Link from "next/link";`
- Zeilen 20–22 ersetzen:
  ```tsx
  const SITE_TITLE = "COSMO — Agent Market on Supra";
  const SITE_DESCRIPTION =
    "A marketplace for digital work: post a job, curated pilot providers make offers, and escrow, delivery and payout settle as verifiable transactions on Supra Mainnet.";
  ```
- `metadata`-Export: als erste Property `metadataBase: new URL("https://heros.cloud"),` (nötig, damit relative canonicals absolut gebacken werden; OG/Twitter folgen den Konstanten automatisch)
- Nach `</main>` (Zeile 51) site-weiten Footer einfügen (ersetzt den alten Landing-Footer; jede Seite behält /protocol-Auffindbarkeit):
  ```tsx
  <footer className="border-t border-white/[0.06] py-8 text-center">
    <p className="font-mono text-xs text-slate-600">
      © 2026 COSMO — Agent Market on Supra{" "}
      <span className="text-purple-500">|</span> $COSMO
    </p>
    <p className="mt-2 font-mono text-xs text-slate-600">
      <Link href="/protocol/" className="text-slate-500 transition-colors hover:text-slate-300">
        Protocol archive
      </Link>
    </p>
  </footer>
  ```
  Platzierung außerhalb `terminal-container` (jede Seite = min-h-100vh mit eigenem Hintergrund) → Footer sitzt darunter auf `bg-[#030712]`, visuell wie bisher. Kein Doppel-Footer (nur die alte Landing hatte einen, der wird in Schritt 1 gelöscht).

### 5. `src/components/navigation.tsx`

```tsx
{ href: '/', label: 'Market', match: ['/market'] },
{ href: '/assurance', label: 'Trust' },
{ href: '/compute', label: 'Network', match: ['/vault', '/maker-onboarding'] },
// Etappe 2: `/` is the Market (render-alias of /market); the former landing
// lives at /cosmo. /wcosmo is the token deep-dive.
{ href: '/cosmo', label: '$COSMO', match: ['/wcosmo'] },
```

`isActive` unverändert.

### 6. `src/app/market/page.tsx`

In `metadata` ergänzen: `alternates: { canonical: '/' },`

### 7. Back-Link-Repoints `href="/market/"` → `href="/"` (Label bleibt)

| Datei | Zeile |
|---|---|
| `src/app/market/job/JobDetail.tsx` | 79, 89 |
| `src/app/market/post/PostJobForm.tsx` | 159 |
| `src/app/market/providers/ProvidersView.tsx` | 22 |
| `src/app/market/admin/AdminConsole.tsx` | 158 |

NICHT anfassen: `MarketHome.tsx`-Links auf `/market/post/`, `/market/providers/`, `/market/job/?id=` (Subpages bleiben unter /market) und `PostJobForm`-Router-Push auf `/market/job/?id=`.

### 8. Plan im Repo ablegen

Diesen Plan nach `plans/website-neuschnitt-etappe2-plan.md` kopieren.

## Build / Deploy / Verify

```bash
cd /root/workspace/meine-website/cosmo-clawagent
cp -r out out.pre-etappe2      # VOR dem Build (out/ ist live)
npm run build
npm run lint                    # Errors nur mit Altbestand abgleichen (24 bekannt)
```

**Curl-Checks (localhost:3001):**
- Routen 200: `/ /market/ /cosmo/ /market/post/ /market/providers/ /wcosmo/ /protocol/`
- `/` enthält `Post a job`, enthält NICHT `The EOM Swarm` (alte Landing weg)
- `/cosmo/` enthält `The primitive` + `EOM Swarm`; `<title>` = alter Execution-&-Accountability-Titel
- `/` + `/market/`: `rel="canonical"` → `https://heros.cloud/`
- `/` `<title>` = Agent-Market-Titel
- Footer `Protocol archive` auf `/ /cosmo/ /market/ /compute/ /wcosmo/` (je ≥1); `/cosmo/` hat genau 1 `<footer`
- heros.cloud-Gegenprobe für `/`, `/cosmo/`

**Browser-Checks (agent-browser, Aktiv-Zustände client-side):**
- `/` → NUR Market aktiv; `/market/post/` + `/market/job/?id=x` → Market; `/cosmo/` + `/wcosmo/` → $COSMO
- Auf `/`: My-jobs-Block rendert aus localStorage (gleicher Origin-Key wie bisher auf /market)
- Von `/market/post/` „All jobs" → landet auf `/`
- Mobile-Menü: 4 Einträge, korrekte Ziele

**Git** (nur nach User-GO committen; Einzeldateien):
```bash
git add src/app/page.tsx src/app/cosmo/page.tsx src/app/cosmo/CosmoStory.tsx \
  src/app/layout.tsx src/components/navigation.tsx src/app/market/page.tsx \
  src/app/market/job/JobDetail.tsx src/app/market/post/PostJobForm.tsx \
  src/app/market/providers/ProvidersView.tsx src/app/market/admin/AdminConsole.tsx \
  plans/website-neuschnitt-etappe2-plan.md
```
(`git mv` staged den Umzug von `src/app/page.tsx` → `CosmoStory.tsx` bereits als Rename.)

**Rollback:** `rm -rf out && cp -r out.pre-etappe2 out`

## Ausdrücklich NICHT in Etappe 2

- Kein Umtexten/Kürzen der Story-Inhalte (Sprachpass = Etappe 5)
- Keine Trust-Konsolidierung (Honesty-Box/Operator-License-Framing bleibt auf /cosmo; Etappe 3)
- Keine Änderung an /market-Subpages, Buyer-Flow, Backend
- Archiv-Seiten + /protocol unverändert
