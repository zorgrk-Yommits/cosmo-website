# Evidence-Seite PILOT-001 (+ Regression-Fix PATCH-001-Evidence)

> Plan zu Implementierungsbeginn nach `plans/market-pilot001-evidence-plan.md` (Website-Repo) kopieren.

## Context

PILOT-001 ist gesettelt (On-chain Job #5, 5 Txs, result_hash == Attestation byte-verifiziert) — es braucht eine öffentliche, dauerhaft verifizierbare Evidence nach dem PATCH-001-Muster. **Nebenbefund (Regression, wird mitgefixt):** Die PATCH-001-Evidence wurde damals manuell in `out/` gelegt; `npm run build` wischt `out/` → `https://heros.cloud/evidence/patch-001/` ist seit einem späteren Build **live 404**, obwohl /compute darauf verlinkt (`public_evidence` in `src/data/compute-patch001-2026-07-10.json`). Die 4 Dateien existieren intakt in `out.pre-patch001proof/evidence/patch-001/`. **Lehre/Regel: Evidence-Bundles gehören nach `public/` — alles dort wird vom Export verbatim nach `out/` kopiert und überlebt jeden Build.**

Repo: `/root/workspace/meine-website/cosmo-clawagent`. Kein Backend-Change. Kein Plan-Agent nötig (mechanische Umsetzung zweier vollständig explorierter Muster: patch-001-Bundle + FirstTradeProof-Tabelle).

## Umsetzung

### 1. PATCH-001-Evidence restaurieren (Regression-Fix)
`mkdir -p public/evidence/patch-001` und die 4 Dateien **byte-identisch** aus `out.pre-patch001proof/evidence/patch-001/` kopieren (`index.txt`, `patch-001-request.json`, `patch-001.patch`, `patch-001-delivery.json`). Danach Hashes gegen die im index.txt notierten sha3-256 prüfen (`openssl dgst -sha3-256`): request `20eef057…`, patch `92b0c80a…`, delivery `7a5847bb…`.

### 2. Neues Bundle `public/evidence/pilot-001/`
- `pilot-001-spec.json` — **exakte Bytes** von `https://heros.cloud/api/market/jobs/job_mrnqscfbzcinte/spec` (sha3-256 MUSS == on-chain input_hash `0x335f12423cda9aa8ff9ef44c9983cbe7a1a5d46f215bf25c2af2774b757328be`).
- `pilot-001-attestation.json` — **exakte Bytes** von `…/attestation` (sha3-256 MUSS == on-chain result_hash `0x967005090332e014792b7183c3c07a01e7c3494985ce2cf23c7c327c06d8040c`).
- `index.txt` — Manifest im patch-001-Stil (ASCII): Kopf „PILOT-001 — public evidence artifacts (Supra mainnet chain 8, compute_rfq job 5 / request 10, market pilot)"; je Datei sha3-256 + welchem On-chain-Wert er entspricht (input_hash / result_hash); Verify-Anleitung `openssl dgst -sha3-256 <file>` + View-Hinweis `get_job_v2(5)`; die 5 Txs mit Rolle:
  - escrow (buyer) `0xa8d69c340f5acb053b9a4aa05ae3a65a54c611b6c4120088913dc77fd4a00f03`
  - submit_quote_v3 (server-relayed, auto-arm) `0xa26cf49bbee2a9d7d87a38cb90b675722fa0105e03ca8625a720fcdf7c490f71`
  - accept (buyer) `0x33ab980daa30a47bba25b35ec675f3ccaaf981df5b2b51cb2a235233bfe01ce4`
  - deliver (provider) `0x28801fb4f4d12966584bf6b14a8d9a81cab3e95037c0f94a9e94668915e60684`
  - settle/approve (buyer, settle_path 0, 2 wCOSMO) `0x92ecb9d284cf249fc12369974e97dc61db34d463a1d86f96fc15aeeb0cc6fa68`
  - Wallets: buyer `0xfe09b3…103f`, solver M2 `0x0a0571…e1bb`.

### 3. `src/data/market-pilot001-2026-07-17.json` (committete Quelle für die UI)
Struktur analog `compute-patch001-2026-07-10.json`: `{ version, date: '2026-07-17', jobId: 'job_mrnqscfbzcinte', jobIdOnchain: 5, requestId: 10, buyer, solver, solverName: 'Operator M2', price: '2', asset: 'wCOSMO', spec_hash, result_hash, explorer_tx_base: 'https://suprascan.io/tx/', public_evidence: 'https://heros.cloud/evidence/pilot-001/', job_url: '/market/job/?id=job_mrnqscfbzcinte', attestation_url: '/api/market/jobs/job_mrnqscfbzcinte/attestation', legs: [5 Einträge {step, actor: 'buyer'|'server'|'provider', tx}] }`.

### 4. Proof-Panel auf `/market` (MarketHome.tsx)
Neuer Abschnitt **zwischen Job-Board und HonestyBox**: Panel im bestehenden Idiom (`rounded-xl border border-white/10 bg-white/[0.02] p-6`), Heading „Settled proof — PILOT-001" (ShieldCheck-Icon), 1–2 Sätze („The first marketplace trade settled end-to-end on Supra Mainnet — every step is a transaction:"), dann 5-Zeilen-Tabelle im FirstTradeProof-Stil (`src/app/rfq/components/FirstTradeProof.tsx` als Vorlage: `short(hash)` = slice(0,10)…slice(-8), Link `${explorer_tx_base}${tx}` ↗, Actor-Badge buyer/server/provider), darunter drei Links: Job-Seite, Attestation-Dokument, Evidence-Bundle (`public_evidence`). Daten aus dem JSON von Schritt 3 importiert — kein Fetch, export-sicher.

### 5. Auch verlinken
`src/data`-JSON hat `public_evidence`; KEINE weiteren Seitenänderungen (kein /compute-Umbau — pilot-001 ist Market-Track; /compute behält patch/attest).

## Verifikation

1. `npx tsc --noEmit`.
2. `cp -r out out.pre-p1evidence` (PFLICHT) → `npm run build`.
3. Hash-Beweise nach Deploy (öffentliche URLs!):
   - `curl -s https://heros.cloud/evidence/pilot-001/pilot-001-attestation.json | openssl dgst -sha3-256` == `9670…040c`
   - `…/pilot-001-spec.json` == `335f…28be`
   - `curl -s -o /dev/null -w '%{http_code}' https://heros.cloud/evidence/patch-001/index.txt` == **200 (Regression-Fix bestätigt)** + die 3 patch-001-Hashes stimmen weiter.
4. Browser: `/market/` zeigt das Proof-Panel mit 5 Tx-Links; Links klickbar (suprascan, Job-Seite, Bundle).
5. Gegenprobe Build-Festigkeit: nach dem Build existiert `out/evidence/pilot-001/` UND `out/evidence/patch-001/` (aus public/ kopiert).

**Abschluss:** Website-Commit (public/evidence + data + MarketHome), Obsidian-Note-Ergänzung (inkl. Regression-Lehre „Evidence nur via public/, nie manuell in out/"), Memory-Update (agent-marketplace + cosmo-patch-001-Hinweis).
