# Manifesto v6.0 — "Verifiable Liquidity Mandates" (Website heros.cloud)

Repo: `/root/workspace/meine-website/cosmo-clawagent` (master, clean). Plan-Kopie im Repo: `plans/manifesto-v6-plan.md` (erster Schritt der Umsetzung). Umsetzung im frischen Chat (Planmodus-Workflow).

## Kontext

- Live ist **Manifesto v5.0** ("The Institutional Layer for Autonomous Economies", Rene-Entwurf, 16.08., `bda8f46`): self-contained HTML `public/manifesto/index.html` (EN+DE, Sprach-Toggle per `#de`, ~2.570 Woerter EN) + Kurzfassung `public/manifesto/index.txt`. CTAs "Manifesto v5.0" in `src/app/cosmo/CosmoStory.tsx:191` und `src/app/compute/ComputeLanding.tsx:742`.
- Kanonische Positionierung ist seit 20.08. **v6.0** (`docs/POSITIONING.md`): Verifiable Liquidity Mandates fuer Market Maker / Liquiditaetsmanager mit anvertrautem Kapital; v5-Primitive bleiben als Fundament. Das Manifest erzaehlt noch die v5-Story. POSITIONING.md nennt als "Primary public document" sogar noch v4.0 (veraltet).
- Seit v5.0 neue oeffentliche Beweise, die im Manifest fehlen: **EVM-MICRO-001** (2 Ethereum-Mainnet-Trades 20.08.), **VLM-001** (kompletter Mandats-Lebenszyklus 22.08.–05.09. inkl. Terminierungsbeweis, Proof-Seite `/mandates/vlm-001/`, Bundle `/evidence/vlm-001/`), Verifier **1.3.2** (`/verifier/`), VSA-v1-Anforderungen (`/vsa/`).
- Entscheidungen Rene (25.09.): ich entwerfe den Text; Schnitt = **v6.0 mit VLM als Leitstory**; v5.0 wird unter `/manifesto/v5/` archiviert; **EN + DE gleichzeitig**.

Ziel: `/manifesto/` zeigt v6.0 (EN+DE), v5.0 bleibt unter `/manifesto/v5/` erreichbar, alle Verweise/Docs auf v6.0, jeder Beweis-Claim quellengedeckt, keine Guardrail-Verletzung.

## Bindende Sprachregeln (aus POSITIONING.md v6.0 + v5-Erbe)

- Kernaussage woertlich: **"Capital owners define the mandate. Agents execute within hard limits. COSMO proves every action."** Approved Hero: "Verifiable Liquidity Mandates — Delegate liquidity operations without delegating blind trust."
- Hierarchie: 1. Verifiable Liquidity Mandates, 2. Controlled treasury execution, 3. Execution and assurance infrastructure for agent economies. "Institutional Layer" nur noch als Kategorie-Label, nie erster Satz.
- Generalisierungs-Claim exakt: "One verification entry point, shared integrity guarantees, two domain-specific execution profiles." Marketplace != voller Execution Case (Wortlaut in POSITIONING.md).
- Verifier: "separate offline check of internal consistency", Standalone-Verifier oeffentlich (1.3.2), **einzelner Attestor, keine Third-Party-Attestation, keine Weltwahrheit**. Beweislisten: "backed by public evidence".
- Menschlicher ARM = Teil des Authority-Modells, nie Mangel. Fakten und Roadmap nie mischen.
- NIE behaupten: Kapitalgarantie, Profitabilitaet, Compliance, Best Execution (keine Referenzmarkt-Daten), volle Autonomie, beliebige Chains/Router/Strategien, Produktionsreife, "integrated with SupraOS", "official SupraFX partner", Nachfrage bewiesen. Nutzen: "built on Supra", "complementary to SupraOS and SupraFX".
- Principal-IDs: keine Klarnamen in neuen Texten (operator:zorg / Sponsor-Wallet).
- EVM-MICRO-001: Tx-Fakten sind on-chain oeffentlich, **Case-Bundles NICHT publiziert** -> nie "published evidence" dafuer behaupten (Kommentar in `Mandates.tsx` Z. 8-11).

## Gliederung v6.0 (EN; DE 1:1 gespiegelt)

Kopf: Kicker "COSMO · Manifesto v6.0" · H1 **Verifiable Liquidity Mandates** · Lede "Delegate liquidity operations without delegating blind trust." · Meta "v6.0 · September 2026 · heros.cloud" · Pull-Quote = Kernaussage · Positioning-Note (COSMO ist nicht Market Maker/Strategie/DEX/Custodian; komplementaer zu SupraOS/SupraFX) · Sprach-Toggle.

1. **In one sentence** — Approved short pitch aus POSITIONING.md.
2. **The delegation problem** — Zielgruppe (Kapitalgeber: Protokolle, Foundations, DAOs, Treasuries, Investoren; Operatoren: Market Maker, Liquiditaetsmanager, Agenten); Leitfrage "How does a capital owner delegate execution without handing over a wallet key with blanket authority?"
3. **What a capital owner does not want** — die 5 Luecken (Key, Hand-Signieren, Eigenreport, Breach nach Verlust, drei Systeme) -> Callout "Delegation without blanket authority. Autonomy without free disposal. Proof instead of reporting."
4. **What one mandate binds** — Liste aus POSITIONING.md (Kapitalgeber/Operator, Venues gepinnt per Adresse + Codehash, Amount/Position/Inventory-Limits, Slippage/Gas, Dauer/Aktionszahl, Retry/Stop, one-shot/zeitgebunden, Ausfuehrung, Settlement, Receipt).
5. **The life of a mandate** — Mandate -> Policy -> Ceremony (ARM) -> Execution (1 Submit, kein Auto-Retry) -> Settlement -> Receipt & Verification -> **Termination** (neu, aus VLM-001: Ablauf, Terminierungsbeweis, Nullresiduum, Seed-Retirement als falsifizierbare Attestation, Watch). Grundsatz: "A mandate that cannot provably end was never fully specified." Flow-Box im v5-Stil.
6. **Limiting is not proving** — Differenzierung aus POSITIONING.md (Policy-Wallets limitieren; COSMO beweist zusaetzlich welches Mandat/welche Policy/welche Marktbedingungen/exakte Tx/was gesendet/was gesettelt/ob Regeln eingehalten + unabhaengiger Recheck).
7. **The foundation: seven primitives, one Execution Case** — v5 §5/§6 kondensiert (Tabelle der 7 Primitive, Intent->...->Verify), "Capability is copyable. Authority is not." als Untersatz; Herleitung "the trade was the occasion, the primitives became the product, the mandate became the offer".
8. **Proof** — Tabelle mit Honest-Scope-Spalte, Reihenfolge nach Relevanz fuer v6:
   - VLM-001 (Ethereum mainnet, 2026-08-22 -> 2026-09-05): OPEN/RESET/CLOSE je ACCEPT 10/10 durch internen + oeffentlichen Verifier 1.3.2, LP-NFT direkt an den Sponsor, 4 Lifetime-Txs, Nullresiduum zweimal, Terminierungsbeweis P1-P5, Seed-Retirement attested_falsifiable; Bundle oeffentlich. Scope: Sponsor-Pilot EUR 40 Budget, kein Market-Making, kein COLLECT ausgefuehrt, JIT-Funding-Tx-Hashes nicht archiviert, Sweep-Proof "not_proven by shape".
   - EVM-MICRO-001 (Ethereum mainnet, 2026-08-20): 2 Trades je 0.0001 ETH -> SUPRA, gepinnter Pool/Router, 1 Submit, interner + Standalone ACCEPT; Trade 1 deckte einen Verifier-Defekt auf (kanonischer Vergleich), Trade 2 all-green ohne Nachbesserung. Scope: Txs oeffentlich, **Bundles nicht publiziert**, B2 partial (SUPRA-Token-Admin-Implementierungen unverifiziert), Micro-Format.
   - Case 001 / 002 / 002-G (Supra, August): wie v5 §8 gekuerzt, Bundles oeffentlich.
   - Absatz "Failures are part of the proof": 6 gestoppte ARM-Versuche VLM-001 (fee cap, RPC, Read-Gate), 1.3.1-REJECT bewusst im Bundle, Case-002-Fehlversuche.
9. **Truth, observation and verification** — v5 §9 aktualisiert (Verifier 1.3.2 oeffentlich, Provenance-Hash, single attestor, Konsistenz != Weltwahrheit, **kein Best-Execution-Claim ohne Referenzmarkt**, on-chain state > platform observation).
10. **Roles, and what COSMO is not** — Rollen-Tabelle (Capital owner / Operator / COSMO) + NOT-Liste + Never-claim-Liste (v6) als Kasten.
11. **Beyond liquidity** — Sekundaer: controlled treasury execution; Kategorie: execution and assurance infrastructure for agent economies; Use-Case-Liste aus POSITIONING.md ("bounded rebalancing", "deploying into approved pools", ...) mit klarer Markierung "demonstrated: one bounded LP mandate, one bounded swap, one marketplace delivery — everything else is to validate". VSA als Beispiel fuer venue-neutrale Attestation, ohne Nachfrage-Claim.
12. **Built on Supra, proven where the capital was** — Stack-Tabelle (Models/Identity/SupraOS/SupraFX/COSMO/Supra) gekuerzt; ehrlicher Satz: Piloten liefen auf Ethereum mainnet (EVM) und Supra chain 8; das ist **keine** Aussage ueber beliebige Chains.
13. **The Controlled Liquidity Pilot** — die 7 "one"-Zeilen + CTA "Run one bounded liquidity mandate with real capital and independently verify the result." -> Link `/mandates/`; "curated, one engagement at a time".
14. **$COSMO and the community** — v5 §15 gekuerzt, unveraendert im Anspruch.
15. **Principles** — v5-Liste + neu: "Possession of a key is not a mandate." · "A mandate names its own end." · "Reporting is an account; a receipt is a proof only if someone else can re-run it." · "Limits checked in hindsight are forensics."
16. **The declaration** — neu geschrieben um Kapitalgeber/Operator/Beweis; Supra-Saetze aus v5 sinngemaess uebernommen (soft framing).
17. **Public short version** + **Appendix: creator and community lines** (v5-Zeilen behalten + 4 neue VLM-Zeilen) + **Risk and honesty note** (Fuss): "The mandate mechanism has been demonstrated on bounded pilots. External demand remains to be proven. Version basis: positioning and evidence state as of September 2026. Supersedes v5.0 (archived at /manifesto/v5/)."

Laenge: EN ~2.800-3.200 Woerter (wie v5), DE gleich lang. Ton wie v5 (deklarativ, keine Marketing-Superlative).

## Claim-Audit (jede Zahl hat eine Quelle; bei Umsetzung gegen Quelle pruefen)

| Claim | Quelle |
|---|---|
| VLM-001 Daten, 4 Txs, ACCEPT x2 x3, Termination P1-P5, Seed attested_falsifiable, EUR 20/leg, Term bis 2026-09-05 | `public/mandates/vlm-001/index.html`, `public/evidence/vlm-001/` |
| EVM-MICRO-001: Tx `0xdeed939c…` Block 25796272, Tx `0x64a4e4e6…` Block 25796695, 0.0001 ETH, 1154.71 SUPRA, 1 Submit, beide Verifier ACCEPT | `src/app/mandates/Mandates.tsx` TRADES, `cosmo-contracts-v2/docs/evm-micro-001/final-live-record.md` |
| Verifier 1.3.2 oeffentlich, Provenance | `public/verifier/index.txt`, Memory institutional-layer |
| Case 001/002/002-G | v5 §8 (unveraendert), `/evidence/execution-case-00*/` |
| VSA v1 | `public/vsa/index.txt` |
| Alle Positionierungs-Saetze | `docs/POSITIONING.md` v6.0 |

## Dateien

1. **Neu** `docs/manifesto/COSMO_Manifesto_v6.0.html` — editierbarer Master (Konvention wie v4). Skelett = `public/manifesto/index.html` (CSS-Variablen, `.pull/.note/.box/.callout/.tablewrap/.flow/.toggle`, `setLang()` + `#de`-Hash) kopieren, Inhalt neu. `<title>COSMO Manifesto v6.0</title>`, Meta-Description = Approved Hero. Interne Links: `/mandates/`, `/mandates/vlm-001/`, `/evidence/vlm-001/`, `/verifier/`, `/institutional/`, `/evidence/execution-case-001/`…`002g/`, `/vsa/`, `/manifesto/v5/`.
2. **Archiv** `git mv public/manifesto/index.html public/manifesto/v5/index.html` + `index.txt` ebenso; in v5-HTML nur oben eine `.note` einfuegen: "Archived version (August 2026). The current manifesto is v6.0 at /manifesto/." + `<link rel="canonical" href="https://heros.cloud/manifesto/v5/">`; Back-Link bleibt. Sonst byte-gleich.
3. **Publish** `public/manifesto/index.html` = Kopie des Masters; `public/manifesto/index.txt` neu (v6-Kurzfassung: Titel, Kernaussage, Short pitch, Proof-Zeilen VLM-001/EVM-MICRO-001/Case 001-002G mit Pfaden, Pilot-CTA, Risk-Note, "Supersedes v5.0 -> /manifesto/v5/").
4. **CTAs** `src/app/cosmo/CosmoStory.tsx` Z. 191 "Read the Manifesto — v6.0"; `src/app/compute/ComputeLanding.tsx` Z. 742 "Manifesto v6.0 →". `src/app/mandates/Mandates.tsx` Block "The framework behind it" (Z. ~346): zusaetzlicher `CtaLink` "Read the Manifesto v6.0" -> `/manifesto/` (bestehende Komponente `CtaLink` aus `@/components/cosmo/Cta`).
5. **Docs** `docs/POSITIONING.md` Abschnitt "Primary public document": v6.0 unter `/manifesto/` (Master `docs/manifesto/COSMO_Manifesto_v6.0.html`), v5.0 archiviert `/manifesto/v5/`, v4.0-PDF historisch; "Known discrepancy"-Absatz entfernen. `README.md` Z. 27-29 + 46 auf v6.0 / `/manifesto/`.
6. v4.0-PDFs in `public/` bleiben liegen (Alt-Links), keine Aenderung.

## Ablauf

1. Plan nach `plans/manifesto-v6-plan.md` kopieren (Repo-Konvention).
2. Master EN schreiben (`docs/manifesto/COSMO_Manifesto_v6.0.html`), dann DE-Sektion im selben File. Lokale Vorschau OHNE Build: `npx serve docs/manifesto -l 4321` (nur lokal, nichts geht live).
3. **Rene-Review des Entwurfs** (STOPP): Rene liest EN+DE; Aenderungen im Master. Erst nach GO weiter.
4. Archiv-Move (Schritt 2 oben) + Publish-Kopie + index.txt + CTA-/Docs-Edits.
5. Snapshot-Rotation: `rm -rf out.pre-vlm001 && cp -r out out.pre-manifesto-v6` (immer nur EIN out.pre-*). Dann `npm run build` (= Deploy; src ist clean, Build spiegelt nur diese Edits). `public/manifesto/**` wird verbatim nach `out/` kopiert.
6. Verifikation (unten). Commit mit **explizit benannten Dateien** (nie `git add -A`), Push nach GO. Obsidian-Note + Memory (cosmo-positioning-v6, institutional-layer: "Manifesto v6.0 publiziert").

## Verifikation

- `curl -sL https://heros.cloud/manifesto/ | grep -c 'Manifesto v6.0'` > 0; `curl -sIL https://heros.cloud/manifesto/v5/` 200 und enthaelt "Archived"; `/manifesto/index.txt` und `/manifesto/v5/index.txt` 200.
- Alle internen Links des neuen HTML per Skript extrahieren und gegen heros.cloud auf 200 pruefen (serve leitet `/x/index.html` per 301 um -> `curl -sL`).
- Grep-Gate gegen Verbotsliste im Master (case-insensitive): `guarantee`, `profitab`, `compliant|compliance` (ausser in Negation "no … claim"), `best execution` (nur in Negation), `production-ready` (nur in Negation), `integrated with SupraOS`, `official SupraFX`, `any chain|arbitrary chain` (nur in Negation), `independently verifiable by anyone`, `rene`. Jeder Treffer manuell beurteilen.
- Zahlen-Gate: jede Zahl der Proof-Tabelle gegen die Quelle in der Claim-Audit-Tabelle nachlesen (Block, Tx-Prefix, Datum, Betrag).
- Browser (agent-browser): Toggle EN/DE, `#de`-Deep-Link, Mobile-Breite ohne horizontales Scrollen, CTAs auf `/cosmo/`, `/compute/`, `/mandates/` zeigen "v6.0" und landen auf `/manifesto/`.
- Verifier-Hash unveraendert (`/verifier/cosmo-verify.mjs` sha3 == PROVENANCE), Bundles `/evidence/vlm-001/` weiter 200 (Build darf public/ nicht beschaedigen).
- `git status` zeigt nur die geplanten Dateien; `out/` und `out.pre-*` bleiben ignoriert.

## Rollback

`rm -rf out && cp -r out.pre-manifesto-v6 out` (PM2 `cosmo-clawagent` serviert `out/` direkt, kein Restart noetig).
