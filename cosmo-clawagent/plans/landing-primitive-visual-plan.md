# Plan: Primitive-Block der Landingpage — von Abwehr-Prosa zu zwei Diagrammen

## Context

Rene: „auf der Landingpage ist mir zuviel Verteidigung — wir sollten proaktiver sein, nicht
sagen was wir alles nicht sind, sondern was wir können." Präzisierung: **mehr graphische Arbeit
als Text.**

Der Befund aus der Analyse: Auf `heros.cloud/` stehen **zwei verschiedene Sorten Negation**, die
gerade vermischt sind und deshalb beide schaden.

- **Sorte 1 — Konkurrenz-Abwehr (muss weg).** „not a competitor" steht **dreimal** auf einer
  Seite (Hero, H2, Fußnote). Dazu Eyebrow „The primitive, **not the venue**" und eine H2, die
  mit „COSMO **does not compete** to be the venue" *anfängt* — die größte Schrift des Abschnitts
  sagt, was COSMO nicht ist. Niemand hat gefragt. Dreimal wiederholt liest es sich nervös.
- **Sorte 2 — ehrliche Grenzen (muss bleiben).** „guarded v1", „not permissionless yet",
  `PLANNED`-Badges auf 7 von 8 Agenten. Das ist Glaubwürdigkeit und steht so im eigenen
  Guardrail („Proof-Links statt Superlative, keine Overclaims"). Antasten wäre der Fehler.

Der eigentliche Schaden: Weil beide Sorten in derselben Prosa stehen, färbt die Nervosität auf
die Ehrlichkeit ab — alles klingt nach Kleinmachen.

**Die visuelle Diagnose ist zugleich die Lösung.** Der Primitive-Block ist der textlastigste
*und* defensivste Abschnitt der Seite: große Abwehr-H2, zwei Absätze, darunter ein grauer
Mikro-Text, den niemand liest. Direkt darunter steht mit dem Intelligence Loop das beste Asset
der Seite. Wo die Seite zeichnet, wirkt sie souverän; wo sie schreibt, rechtfertigt sie sich.

**Ein Schichten-Diagramm macht „not a competitor" ersatzlos überflüssig.** Wer SupraOS, SupraFX
und COSMO als gestapelte Bänder *sieht*, für den ist die Komplementarität eine sichtbare
Tatsache statt einer Beteuerung. Man muss nicht mehr sagen, dass man kein Konkurrent ist — man
zeigt, dass die Frage sich nicht stellt. Kein Informationsverlust, drei Beteuerungen weg.

**Scope (mit Rene abgestimmt):** nur der Primitive-Block (`page.tsx:229-272`). Ehrliche Grenzen
werden gebündelt in eine Honesty-Box statt in jeden Absatz gemischt. Hero, Stats-Leiste und
Operator-Gates bleiben unangetastet (Hero-Wording = Manifesto-Linie, eigener Entscheid).

---

## Ausgangslage im Code (recherchiert, nichts davon muss erfunden werden)

Alles Nötige existiert bereits — der Umbau ist Zusammensetzen, nicht Neubau:

| Baustein | Vorbild im Repo |
|---|---|
| Ketten-Diagramm | `src/app/demo/components/LifecycleRail.tsx` — `flex-col md:flex-row` + zwei absolute `h-px`-Linien bei `top-[44px]`. Kein SVG nötig. |
| Kettenglied | `src/app/demo/components/StepNode.tsx` — `w-[148px] rounded-xl border bg-[rgba(15,15,35,0.7)] backdrop-blur`, Stagger `delay: 0.04 * index` |
| LIVE/PLANNED-Grammatik | `page.tsx:328-338` — LIVE = emerald + Border + `animate-pulse`-Dot; PLANNED = nacktes `text-slate-600`, kein Border. Die Asymmetrie trägt die Aussage. |
| „das hier ist COSMO" | `.cosmo-featured` (globals.css:262) bzw. `#7B2FBE` + `boxShadow: '0 0 12px rgba(123,47,190,0.4)'` (IntelligenceLoop `featured`-Node) |
| Honesty-Box | `ComputeLanding.tsx:562-579` — `rounded-xl border-amber-500/20 bg-amber-500/[0.04] p-5`, lucide-Icon + `font-mono text-sm` H3 + genau *ein* `font-sans`-Absatz |
| a11y + Reduced-Motion | `src/app/vault/components/CustodyFlowDiagram.tsx` — `role="img"` + `aria-label`, SVG `aria-hidden`, `useReducedMotion()` |

**Farbkanäle der Seite (etabliert, einhalten):** Purple = Protokoll · Emerald = live/proven ·
Cyan = off-chain · Amber = Vorbehalt · Rot = Fehlerpfad.
**Schrift-Regel:** `font-mono` = alles Strukturelle (Headings, Labels, Badges, Metriken);
`font-sans` = nur Fließtext-Absätze.

---

## A) Zwei neue Komponenten

Beide nach `src/components/` (wo `IntelligenceLoop.tsx` liegt), damit `page.tsx` nicht weiter
wächst.

### A.1 `src/components/LayerStack.tsx` — der Kern der Lösung

Drei gestapelte Bänder, kein SVG. Reine Panels im etablierten Idiom:

```
+-- SupraOS ---------- coordinates agents ---------------------+   gedämpft
+-- SupraFX ---------- market & liquidity rails ---------------+   gedämpft
+== COSMO ============ execution & accountability =============+   hervorgehoben
   no trusted operator in the settlement path
```

- Obere zwei Bänder: neutral (`border-white/10`, `text-slate-400`) — sie sind Kontext, nicht
  Konkurrenz. Genau diese visuelle Zurückhaltung *ist* die Aussage „andere Schicht".
- COSMO-Band: `.cosmo-featured` + Purple-Glow, volle Textfarbe. Trägt als einzige Zeile eine
  Eigenschaft: **„no trusted operator in the settlement path"** — der stärkste positive
  Differenzierer der Seite, der heute in Absatz 1 vergraben liegt.
- `role="img"` + `aria-label`, das die Schichtung ausformuliert (Screenreader sehen sonst nur
  drei Wörter).
- Mobil: identisch (ist bereits ein vertikaler Stapel) — der einzige Diagrammtyp ohne
  Responsive-Risiko.

### A.2 `src/components/PrimitiveChain.tsx`

`LifecycleRail`-Mechanik, statisch (kein aktiver Schritt, also **kein `motion.div`
Progress-Balken** — nur die Basis-Linie):

```
[Request] -> [Bond] -> [Capability] -> [Atomic Settlement] -> [Accountability]
  LIVE        LIVE         LIVE              LIVE                  LIVE
```

- Glieder à `w-[148px]` aus `StepNode`, Purple-Ring (`onchain`-Kanal), „Atomic Settlement"
  bekommt den Emerald-Sonderfall (`step.isSettlement`-Muster, `StepNode.tsx:65`).
- Status-Badges nach dem LIVE/PLANNED-Paar aus `page.tsx:328-338`.
- Stagger `delay: 0.04 * index` beim Reveal (`frontend-design`: „one well-orchestrated page load
  with staggered reveals" statt Dauer-Animation), `useReducedMotion()` respektieren.
- Mobil `flex-col`, `↓` als Text-Konnektor (Muster `IntelligenceLoop.tsx:246-272`). **Kein
  horizontaler Scroll** (`ui-ux-pro-max` Prio 5).

**Die eine echte Ermessensfrage — alle fünf Glieder LIVE.** Begründung: Request/Bond/Settlement
sind über den Round-Trip und drei gesettelte Compute-Jobs belegt; Capability ist belegt („all
three gates fired and passed in the live round-trip", steht heute schon auf der Seite);
Accountability ist im Kern live (Bond ist slashbar, 10%-No-Delivery-Penalty greift, Settlement
wird on-chain in Events festgeschrieben) — **roadmap ist nur der Reputations-Score auf der
Lizenz**, und genau das trägt die Honesty-Box. Damit lautet die Botschaft: *„Das Primitive ist
vollständig auf Mainnet bewiesen — guarded ist der Zugang, nicht das Primitive."* Das ist die
stärkste wahre Aussage der Seite und exakt das Proaktive, das gefordert war. Wer das zu forsch
findet, markiert „Accountability" als `planned` — dann fällt die Aussage aber deutlich ab,
obwohl sie belegbar ist.

## B) `src/app/page.tsx:229-272` umbauen

| Zeile | Jetzt | Neu |
|---|---|---|
| 235 | Eyebrow „The primitive, **not the venue**" | „The primitive" |
| 239-244 | H2 „**COSMO does not compete to be the venue.** COSMO defines the primitive: request, bond, …" | Erster Satz ersatzlos. Und die Aufzählung fällt auch — das Ketten-Diagramm *ist* die Aufzählung, zweimal dasselbe wäre Redundanz. Neue H2 = die Behauptung, Diagramme = der Beleg. Vorschlag: **„COSMO defines the primitive: an agent's commitment becomes binding on-chain, and settlement either completes in full or reverts."** (greift die stärkste Zeile des Hero auf, rein positiv) |
| 246-261 | Zwei Prosa-Absätze | **Ersetzt durch `<LayerStack />` + `<PrimitiveChain />`.** ¶1 ist inhaltlich die Kette in Prosa, ¶2 ist Heute/Roadmap → wandert in die Status-Badges + Honesty-Box. |
| 263-270 | Grauer Mono-Mikrotext (`text-slate-600`, faktisch unlesbar) mit dem dritten „not a competitor" | **Amber-Honesty-Box** nach dem Muster `ComputeLanding.tsx:562-579`. „not a competitor" fällt; guarded v1 / one active job / gated quote path / 7-von-8-roadmap / Reputations-Score-noch-nicht bleiben — sichtbar statt grau versteckt. |

Der Panel-Container (231) und die Sektion (230) bleiben.

### Was NICHT angefasst wird
Hero (`page.tsx:163-174`, inkl. „explores" und dem ersten „not a competitor") — Manifesto-Linie,
eigener Entscheid. Stats-Leiste („1 round-trip settled"). Operator-License-Block (inkl. „Not a
collectible" und den drei Gates). Intelligence Loop. Agent-Karten. `layout.tsx`-Metadata (trägt
ebenfalls „complementary to SupraOS"). — Alle bleiben als eigene Kandidaten notiert.

---

## Verifikation

Zu beweisen ist: **das Diagramm ersetzt die Aussage der Prosa, statt nur hübscher zu sein** —
und die Seite verliert keinen Fakt.

- **V1 — Fakten-Erhalt (der wichtigste Test).** Vorher/Nachher-Textabgleich des Abschnitts:
  jeder Fakt aus den alten ¶ (guarded v1, one active job per provider, deterministic workloads,
  gated quote path, not permissionless, roadmap-Umfang, „no trusted operator") muss nachher
  entweder im Diagramm oder in der Honesty-Box wiederauffindbar sein. Fällt einer weg, ist es
  kein Redesign, sondern ein Overclaim. Explizit auflisten, nicht nur behaupten.
- **V2 — „not a competitor"-Zähler.** `grep -c` auf `out/index.html`: die drei Konkurrenz-
  Beteuerungen müssen im Primitive-Block auf **0** stehen. Hero-Treffer bleibt (out of scope) —
  also gezielt im Abschnitt prüfen, nicht seitenweit, sonst wird der Test falsch-grün.
- **V3 — Build + Render.** `npm run lint`, `npx tsc --noEmit`, `npm run build`; `out/` lokal auf
  Port 3999 servieren und im Browser prüfen (Muster aus der v1-Gate-Session).
- **V4 — Responsive, hart.** Viewport 375px: **kein horizontaler Scroll** (`document.body.scrollWidth
  <= window.innerWidth`), Kette stapelt vertikal, Schichten lesbar. Das ist der reale
  Bruchpunkt einer 5-Glieder-Kette.
- **V5 — a11y.** Reduced-Motion aktiv → kein Stagger. `role="img"`/`aria-label` vorhanden.
  Kontrast der gedämpften Bänder gegen `#030712` ≥ 4.5:1 — die Zurückhaltung der oberen zwei
  Schichten darf nicht in Unlesbarkeit kippen.
- **V6 — Screenshot** volle Seite, vorher/nachher nebeneinander. Der Zweck ist visuell; die
  Abnahme muss es auch sein.

## Reihenfolge

1. Backup: `test ! -e out.pre-primitive && cp -a out out.pre-primitive` (**vor** allem anderen)
2. `LayerStack.tsx` → isoliert im Browser prüfen
3. `PrimitiveChain.tsx` → isoliert prüfen, inkl. 375px
4. `page.tsx:229-272` umbauen (Eyebrow, H2, Diagramme, Honesty-Box)
5. V1-Fakten-Abgleich → V2 → V3 → V4/V5 → V6
6. Deploy (PM2 serviert `out/` von Platte), Prod-Check
7. Commit + Push nach Freigabe

**Rollback:** `out.pre-primitive` zurückschieben. Keine neue Route → die `serve`-ohne-`-s`-Falle
ist nicht berührt.

## Restrisiken

- **Das Schichten-Diagramm kann als Hierarchie gelesen werden** („COSMO ist unten = unwichtig").
  Gegenmittel: „unten" muss als *Fundament* lesbar sein, nicht als Fußnote — deshalb trägt nur
  das COSMO-Band Glow, volle Textfarbe und die Eigenschaftszeile. Am Screenshot prüfen, nicht
  im Kopf.
- **Fünf Glieder sind viel für 375px.** Vertikal gestapelt wird der Abschnitt lang. Falls es
  kippt: Kette auf einer Achse zusammenfassen (`Request → Bond → Capability` als „binding",
  `Settlement → Accountability` als „settle") — aber erst messen, dann kürzen.
- **`frontend-design` verbietet „purple gradients"** — Bestand gewinnt, die Seite ist auf
  `#8b5cf6` + Geist Mono committed. Bewusst unterlaufen, „muss aussehen als gehörte es zur
  Seite" hat Vorrang.
- **Kein `prefers-reduced-motion`-Block in `globals.css`** — alle CSS-Animationen laufen immer.
  Neue Animation deshalb nur über framer-motion + `useReducedMotion()`, nicht über eine neue
  CSS-Keyframe.
- **Der Hero behält seinen „not a competitor"-Satz.** Nach diesem Umbau steht die Abwehr nur
  noch dort — auffälliger als vorher. Das ist kein Fehler des Plans, aber der nächste logische
  Schritt, und Rene sollte ihn bewusst treffen.
