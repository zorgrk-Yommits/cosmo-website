# Website-Neuschnitt Etappe 3 — Trust-Konsolidierung (/assurance = Trust-Umbrella)

## Kontext

Etappen 1+2 live + committet (`85a4701`, `8052d08`). Etappe 3 („Trust-Konsolidierung"): Der Trust-Tab zeigt auf `/assurance`, aber die Seite ist bisher rein Price-Guard-scoped; die Settlement-Proofs liegen verstreut (/market, /compute) und ATTEST-001 hat als einziger gesettelter Proof kein kanonisches `/evidence/`-Bundle. Ziel laut Konzept: „Assurance + Evidence-Index + Honesty-Prinzipien an einem Ort."

**User-Entscheidungen (18.07., AskUserQuestion):** (1) Neues Bundle `/evidence/attest-001/` anlegen (Artefakte lokal in `cosmo-contracts-move/docs/jobs/`, byte-verifiziert). (2) Evidence-Index = 4 Karten (PILOT-001, PATCH-001, ATTEST-001, JOB-001 — passend zum „4 settled proofs"-Stat auf /cosmo) + kompakte Archiv-Zeile (RFQ-Ersttrade → /rfq/, Demo → /demo/).

**Hash-Vorabprüfung BESTANDEN** (2x nachgerechnet):
- `attest-001-request.json` → sha3-256 `7516be60f3e3512db7a776bc95a244ea6661e7abea4b020f576dfda786b2b6ee` = `input_hash` ✓
- `attest-001-delivery.json` → sha3-256 `665404a859e42b9be7a562812c18c1cf9437a31715d6ec21b1e72d4b7caec205` = `result_hash` ✓
- approve-tx (settle_path 0, 200 wCOSMO, job 1 / request r4): `0x6e71991bad87bd4c59ab75d37075f9cb0428ebc32062a19852bd74514e5394ab` (= `legs[4].hash`)

Fakten: `Assurance.tsx` (487 Z.) ist SERVER-Komponente ohne Hooks (CTAs = plain `<a>`, `<details>`); nur Nav + `cosmo/CosmoStory.tsx:531` verlinken auf /assurance, Anker `#evidence`/`#technical-baseline` nur seitenintern → Umbenennen safe. Evidence-URLs unter `/evidence/` sind kanonisch — patch-001/pilot-001 dürfen sich nicht ändern (byte-identisch bleiben).

Repo-Regeln: `cp -r out out.pre-etappe3` VOR Build (out/ ist live, PM2 :3001); NIE `git add -A`.

## Reihenfolge

1. ATTEST-Bundle (mit Hash-Gate) → 2. Daten-JSON + ComputeLanding-Link → 3. Assurance.tsx-Umbau → 4. Metadata → 5. Plan ins Repo → 6. Snapshot → Build → Verify

## 1. Bundle `public/evidence/attest-001/`

```bash
mkdir -p public/evidence/attest-001
cp /root/cosmo-contracts-move/docs/jobs/attest-001-request.json \
   /root/cosmo-contracts-move/docs/jobs/attest-001-delivery.json \
   public/evidence/attest-001/
```

`index.txt` exakt im patch-001-Stil:

```
ATTEST-001 -- public evidence artifacts (Supra mainnet chain 8, compute_rfq job 1)
Byte-identical copies of the repo artifacts. Verify with: openssl dgst -sha3-256 <file>

attest-001-request.json   sha3-256 7516be60f3e3512db7a776bc95a244ea6661e7abea4b020f576dfda786b2b6ee  (= on-chain input_hash, request r4)
attest-001-delivery.json  sha3-256 665404a859e42b9be7a562812c18c1cf9437a31715d6ec21b1e72d4b7caec205  (= on-chain result_hash, job 1)

approve tx (settle_path 0, 200 wCOSMO): 0x6e71991bad87bd4c59ab75d37075f9cb0428ebc32062a19852bd74514e5394ab
```

**HARTES GATE vor allem Weiteren:** sha3-256 der KOPIEN gegen `src/data/compute-attest001-2026-07-08.json` (`input_hash`/`result_hash`) per python3/hashlib prüfen — beide OK, sonst Abbruch.

## 2. Daten-JSON + ComputeLanding

- `src/data/compute-attest001-2026-07-08.json`: nach `"settle_path": 0,` einfügen (Feldposition wie bei patch-001): `"public_evidence": "https://heros.cloud/evidence/attest-001/",`
- `src/app/compute/ComputeLanding.tsx` ATTEST-001-Panel (~Z. 409–432): im Transparenz-Absatz nach dem PATCH-001-Muster (Z. ~374–386) einen Link `<a href={attest001.public_evidence} …>public evidence artifacts ↗</a>` ergänzen; GitHub-`workload_uri`-Link bleibt zusätzlich.

## 3. `src/app/assurance/Assurance.tsx` — Umbau zur Trust-Umbrella

Server-Komponente bleibt (keine Hooks). Neue JSON-Imports oben (single-sourced Hashes, Muster MarketHome/ComputeLanding):
`pilot001`, `patch001`, `attest001`, `job001` aus `@/data/…`. Modul-Helper: `short(h)` (Truncate 10…6), `quantsToWCOSMO(q)=q/1_000_000`.

**Anker-Schema:** `#evidence` = neuer Evidence-Index (Hero-CTA behält href); `#principles` = neu (Honesty-Prinzipien); `#price-guard` = Guard-Modul; Case-Studies-Section `id="evidence"` → `id="price-guard-cases"`, H2 „The evidence" → „Case studies"; `#technical-baseline` unverändert.

**Neue Sektionsfolge:**

1. **Trust-Hero** (ersetzt Z. 136–188): Eyebrow `COSMO Trust`; H1 **„Every claim links to a transaction or a hash."**; Chips `4 settled proofs · Supra Mainnet` + `Show, don't claim`; Lead: „This page collects what has actually settled on Supra Mainnet, the honesty rules this site holds itself to, and the Price Integrity Guard — a read-only research module. Facts and roadmap are kept separate; limits are stated next to the claims they qualify." CTAs: `View the evidence → #evidence` (purple), `Honesty principles → #principles`. Die 3 Status-Pills (Research Prototype/Read-only/Not Live Protection) wandern in den Modul-Header (sie beschreiben den Guard, nicht die Umbrella).
2. **`#evidence` Evidence-Index:** H2 „Settled proofs" + Intro „Four jobs settled on Supra Mainnet, each independently checkable. Newest first." Grid `sm:grid-cols-2`, Panel-Idiom. Karten (neueste zuerst), je: mono Name + Datum + Preis-Chip, Einzeiler, truncated Hashes, Link-Zeile (extern mit `target="_blank" rel="noopener noreferrer"`):
   - **PILOT-001 — marketplace trade** (2026-07-17, 2 wCOSMO): „First marketplace trade settled end-to-end: escrow, quote, accept, deliver, settle — every step its own mainnet transaction." Hashes `spec_hash`/`result_hash`. Links: Evidence bundle (`public_evidence`), Job page (`job_url`), Settle tx (`explorer_tx_base+legs[4].tx`).
   - **PATCH-001 — machine-accepted patch** (2026-07-10, 285 wCOSMO): „A software patch fixing a real defect, paid only after a ten-criteria machine acceptance check returned ACCEPT." Hashes `input_hash`/`diff_hash`/`result_hash`. Links: Evidence bundle, Details → `/compute/`, Approve tx.
   - **ATTEST-001 — first traded good** (2026-07-08, 200 wCOSMO): „The first traded good: a signed attestation of live protocol invariants, delivered against a security deposit and machine-accepted before approval." Hashes `input_hash`/`result_hash`. Links: Evidence bundle (NEU), Details → `/compute/`, Approve tx.
   - **JOB-001 — foundation compute job** (2026-07-06, 200 wCOSMO): „The foundation: the first real compute job — a deterministic 1,000,000-step SHA3 workload — settled through the full escrow lifecycle." Links: Workload (GitHub `workload_uri` — KEIN Bundle erfinden), Details → `/compute/`, Approve tx.
   - Honesty-Zeile unterm Grid: „Buyer and provider on JOB-001, ATTEST-001 and PATCH-001 are operating-team accounts, disclosed on their detail pages. PILOT-001 settled through the public marketplace flow."
   - **Archiv-Zeile:** „Earlier milestones: the first autonomous RFQ trade and the full demo round-trip are preserved in the archive." mit `<a href="/rfq/">` + `<a href="/demo/">`.
3. **`#principles` Honesty-Prinzipien:** H2 + Intro („These rules apply to every page. They are not centralized here — each page carries its own honesty box next to the claims it qualifies."), 4 Panels:
   1. **Fact and roadmap never mix.** Settled = settled on-chain; alles Nicht-Live ist als research/prototype/roadmap gelabelt — im selben Satz, nicht in der Fußnote.
   2. **Every claim links to a transaction or a hash.** Zahlen lösen zu Mainnet-Tx, On-Chain-Hash-Anker oder frozen Artifact auf.
   3. **Limits are disclosed next to claims.** Jede Seite trägt ihre Honesty-Box mit dem, was das Ergebnis NICHT beweist — inkl. Operating-Team-Beteiligung.
   4. **Evidence is frozen, not curated.** Artefakte byte-identisch, per SHA3-256 an On-Chain-Anker gepinnt; verifizierbar via `openssl dgst -sha3-256` gegen index.txt.
4. **`#price-guard` Guard-Modul** (bestehender Inhalt): Modul-Header NEU (Eyebrow „Assurance module 01 — Price Integrity Guard", Modul-Titel „Verify the data. Then verify the decision." = alte H1, die 3 Status-Pills, alter Hero-Absatz wortgleich, kleine Anker-Links `Case studies → #price-guard-cases` / `Technical baseline → #technical-baseline`). Danach UNVERÄNDERT: Dimensions-Grid (191–235), Results (238–264), Case studies (267–336, nur id+H2 umbenannt), Architecture (339–398), Technical baseline (401–438), Limitations (441–455).
5. **Closing** (458–473): Absatz auf Umbrella-Framing („COSMO publishes settled proofs instead of projections. …"), CTA `/compute/` bleibt.
6. **Footer-Honesty-Line** (478–482) aktualisieren: statischer Content, keine Wallet-Aktionen; Index verlinkt gesettelte Tx + frozen Artifacts; Guard = erstes Modul, read-only, recommendations only.

Datei-Header-Kommentar (Z. 1–16) auf Umbrella umschreiben; Positioning-Guardrail-Absatz wortgleich behalten. Neue lucide-Icons nach Bedarf (z.B. `ShieldCheck`, `ScrollText`, `Archive`).

## 4. `src/app/assurance/page.tsx` Metadata

```
TITLE = 'COSMO Trust — Evidence, Honesty Principles, Assurance'
DESCRIPTION = 'Four settled on-chain proofs, the honesty rules this site holds itself to, and the Price Integrity Guard research module. Every claim links to a transaction or a hash.'
```
Struktur (OG/Twitter spiegeln TITLE/DESCRIPTION) bleibt.

## 5. Plan ins Repo

Diesen Plan nach `plans/website-neuschnitt-etappe3-plan.md` kopieren.

## Build / Deploy / Verify

```bash
cp -r out out.pre-etappe3   # VOR Build
npm run build && npm run lint   # Lint-Errors nur mit Altbestand abgleichen
```

- **Alte Evidence byte-identisch:** `diff -r out.pre-etappe3/evidence out/evidence` → einzige Abweichung „Only in out/evidence: attest-001"
- **Neues Bundle:** `curl` auf `/evidence/attest-001/index.txt|…-request.json|…-delivery.json` (200); served Datei re-hashen → `7516be60…`
- **Anker:** `id="evidence"`, `id="principles"`, `id="price-guard"`, `id="price-guard-cases"`, `id="technical-baseline"` je genau 1x in `out/assurance/index.html`
- **Inhalt:** `Every claim links to a transaction or a hash` präsent; `evidence/attest-001` in `out/assurance/index.html` + `out/compute/index.html`; alle 4 Karten-Hashes (`335f1242…`? → tatsächliche `spec_hash`-Präfixe der 4 JSONs greppen)
- **Browser (agent-browser):** /assurance → Trust-Tab aktiv; Hero-CTAs scrollen zu #evidence/#principles; `<details>` Technical baseline öffnet; 4 Karten mit funktionierenden Links; Archiv-Zeile → /rfq/ + /demo/; /compute ATTEST-Panel zeigt neuen Evidence-Link; Mobile-Grid ok
- heros.cloud-Gegenprobe `/assurance/` + `/evidence/attest-001/`

**Git** (nur nach User-GO; Einzeldateien):
```bash
git add public/evidence/attest-001/index.txt \
  public/evidence/attest-001/attest-001-request.json \
  public/evidence/attest-001/attest-001-delivery.json \
  src/data/compute-attest001-2026-07-08.json \
  src/app/compute/ComputeLanding.tsx \
  src/app/assurance/Assurance.tsx src/app/assurance/page.tsx \
  plans/website-neuschnitt-etappe3-plan.md
```

**Rollback:** `rm -rf out && cp -r out.pre-etappe3 out`

## Ausdrücklich NICHT in Etappe 3

- Honesty-Boxen der Einzelseiten bleiben, wo sie sind (nur Prinzipien werden zentral formuliert)
- Guard-Inhalte (Dimensions/Results/Cases/Architecture/Baseline/Limitations) inhaltlich unverändert
- Kein JOB-001-Bundle erfinden (bleibt GitHub-Link)
- /evidence/patch-001 + /evidence/pilot-001 byte-unverändert
- Etappe 4 (Network/Provider-Funnel) + 5 (Sprachpass) separat
