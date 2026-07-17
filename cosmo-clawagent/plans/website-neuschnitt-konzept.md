# Website-Neuschnitt — Konzept (Brainstorm-Ergebnis 2026-07-17)

> Status: **Zielbild beschlossen (Richtung A), noch KEIN Plan, keine Umsetzung.**
> Nächster Schritt bei GO: Planmodus für Etappe 1 (Nav + Archiv).

## Ausgangslage / Warum

Die Site trägt 13 Routen in 10 Nav-Tabs aus vier gewachsenen Tracks (Token/Story, RFQ-Engine-Alt-Track, Compute-Rail, Marketplace). Das Produkt — der Marketplace — ist ein Tab von zehn. Beschlossene Schmerzpunkte (Rene, 17.07.): kein roter Faden/Einstieg, zu viele Seiten/Tabs, Abläufe zu kleinteilig, Optik unfertig/inkonsistent. Primär-Nutzer der neuen Oberfläche: **Buyer (Auftraggeber)**. Umbautiefe: **Neuschnitt um das Produkt** (Richtung A gewählt, Alternative B „App+Story auf Subdomains trennen" verworfen: doppelte Pflege + Infra-Overhead in der Pilot-Phase).

## Zielbild: "Die Site IST der Marketplace"

**Neue Struktur (Nav 10 -> 4):**

| Bereich | Inhalt | Herkunft |
|---|---|---|
| **Market** (= Startseite `/`) | Hero mit EINEM CTA "Post a job", Settled-Proof, Job-Board, How-it-works (die 3 Buyer-Schritte), My jobs | heutiges /market, aufgewertet |
| **Trust** | Assurance + Evidence-Index (patch-001, pilot-001) + Honesty-Prinzipien an einem Ort | /assurance + /evidence + Honesty-Boxen |
| **Network** | "Earn as an agent": Provider-Funnel, Bond-Self-Service, Rail-Status, Vault | /compute, /compute/bond, /vault |
| **$COSMO** | Token-Story, wCOSMO-Guide, Manifesto | Landing-Inhalte, /wcosmo |

**Archiv `/protocol`** (NICHT in der Nav): RFQ Live, Community-RFQ, Maker Capital, Access, Founder, Demo — URLs bleiben erreichbar (Evidence-Prinzip: keine toten Links), verwässern das Produkt aber nicht mehr.

**Ablauf-Reife (Sprachprinzipien):**
- Buyer-Vokabular entfachsprachlichen: "Fund escrow" -> "Fund the job (held on-chain, refunded if not delivered)", "Accept quote" -> "Confirm & start"; Arm bleibt unsichtbar (bereits umgesetzt).
- Wallet (StarKey) erst erwähnen, wenn sie gebraucht wird; davor E-Mail-geführt.
- Jede Wartephase sagt, WER dran ist und was als Nächstes passiert (NextStepPanel-Prinzip auf alles ausweiten).
- Übersetzungsfestes EN (bestehende Bond-UX-Regel).

**Optik:** Kein Total-Redesign. Das Market-Idiom (Panel `rounded-xl border-white/10 bg-white/[0.02]`, CTA_BIG, Status-Chips, FlowRail, mono/sans-Mix) wird zum verbindlichen Designsystem erklärt (Tokens zentralisieren, heute in `src/app/market/components/cta.ts`) und auf alle verbleibenden Seiten angewandt. Konsistenz durch Vereinheitlichung, nicht Neuerfindung.

## Etappen (jede einzeln schiffbar)

1. **Nav einstampfen + Archiv-Hub /protocol** — reines Umhängen, kein Redesign; größter Entwässerungseffekt pro Aufwand.
2. **Startseite = Buyer-Einstieg** — Market-Home nach `/` heben; Landing-Inhalte nach $COSMO/Trust verschieben.
3. **Trust-Konsolidierung** — Assurance + Evidence-Index zusammenführen.
4. **Network/Provider-Funnel** — "Earn as an agent" als zweiter Einstieg.
5. **Sprachpass über den Buyer-Flow** — Vokabular-Umstellung, Wartephasen-Texte.

## Offene Punkte (in der Planphase je Etappe klären)

- **URL-Strategie:** bestehende Links dürfen nicht brechen — `/market/job/?id=` steckt in E-Mails, `result_uri`/`workload_uri` on-chain zeigen auf `/api/market/...` (unkritisch), Evidence-URLs sind kanonisch. Startseiten-Hebung ggf. via Render-Alias statt Umzug.
- Wohin genau die heutigen Landing-Hero-Inhalte wandern (Stats "4 settled proofs", Primitive-Block).
- Founder/Access sind gated Funktionsseiten — passt das Archiv oder brauchen sie einen eigenen Ort?
- SEO/Metadata-Nachzug pro Etappe.

## Kontext-Verweise

- Landing-Regel: Konkurrenz-Abwehr raus, ehrliche Grenzen gebündelt (Honesty) — gilt weiter.
- Buyer-Flow-UX-Overhaul + M5 vom 17.07. (Commits `53accda`, `840418c`) sind die Basis; PILOT-001-Evidence (`2e615e3`) ist der Proof-Baustein der neuen Startseite.
