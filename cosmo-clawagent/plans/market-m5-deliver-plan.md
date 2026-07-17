# M5 Deliver/Approve — Marketplace-Lieferschritt (ZEITKRITISCH)

> **Konvention:** Plan zu Implementierungsbeginn nach
> `/root/workspace/meine-website/cosmo-clawagent/plans/market-m5-deliver-plan.md` kopieren.
> **DEADLINE: On-chain Job #5 muss vor 2026-07-18 10:51:26 UTC geliefert sein** (deliver_result_v2 abortet danach; dann bleibt nur claim_no_delivery = 10%-Slash auf M2s Bond). Approve hat danach ein weiteres 24h-Review-Window.

## Context

Pilot-001 Anlauf 3 ist durch: On-chain Job #5 ACTIVE (Request #10, Buyer `0xfe09b3…103f`, Solver M2 `0x0a0571…e1bb`, 2 wCOSMO, alle txRefs create/submitQuote/accept). M5 (Deliver/Settle) existiert weder im Backend noch in der UI. Scope v1 (beschlossen): **Deliver (Provider) + Approve (Buyer, settlet atomar)**. KEIN Dispute-Button (nur Hinweistext), KEINE timeout_settle-UI (permissionless Ops-Fallback). Seitensprache Englisch.

**Move-Fakten (verifiziert, compute_rfq.move pkg `0x0fd8…03c0` chain 8):**
- `deliver_result_v2(solver, job_id: u64, result_hash: vector<u8> len==32, result_uri: vector<u8>)` — Solver signiert; braucht Status ACTIVE + now < job_deadline; setzt DELIVERED. result_uri unbeschränkt (Event-only, nicht im View).
- `approve_delivery_v2(buyer, job_id)` — Buyer signiert; braucht DELIVERED; **settlet atomar** (zahlt Solver price+dispute_bond), Status SETTLED. Auch nach Review-Window noch gültig.
- `timeout_settle_v2(caller, job_id)` — permissionless nach delivered_at+review_window (Ops-Fallback, keine UI).
- `get_job_v2` 12-Tupel: (request_id, buyer, solver, price, job_deadline_secs, review_window_secs, accepted_at, delivered_at, result_hash, status, payment_fa, bond). JOB_STATUS: ACTIVE=0 DELIVERED=1 SETTLED=2 SLASHED=3 DISPUTED=4 REFUNDED=5.
- RPC strippt führende Nullen bei Adressen (Solver kommt als `0xa0571…`) → **Vergleiche NUR via sameWallet/addrEq/normAddr.**

**Wiederverwendbar:** Backend `getJobV2` (chain/views.ts), `canonicalize`/`sha3Hex` (canonical.ts, NIST SHA3-256 == Move), confirm-request/-accept-Muster (flow.ts: findJob/httpError/sendError/confirmRequestSchema/enqueueAlert/mutate), Spec-Serving „stored exact bytes" (public.ts `res.type('application/json').send(...)`), `PUBLIC_BASE` (flow.ts:58). `TxRefs.deliver/settle/dispute` existieren schon (model.ts). Frontend: BCS-Builder-Muster computeTx.ts (`call`/`u64Arg`/`hexArg`/`utf8Arg`), `signAndSendCompute`, `rpcViewAll`, `sameWallet`, OfferForm-Wallet-Match-Muster, NextStepPanel-Stage-Machine + CTA_BIG, 10×3s-Confirm-Retry-Muster. Router-Mount: flowRouter VOR publicRouter (server.ts:39-40) → GET /attestation im flowRouter kollisionsfrei.

## Teil A — Backend `/root/cosmo-market-api` (ZUERST — liefert die result_uri)

**A1 `src/model.ts`:** `JOB_STATUSES` += `'delivered','settled'`. `Job` += `attestationCanonical?: string; attestationHash?: string;` (public by design, publicJob filtert nur email/note/ip — kein Change nötig). Kein Zod-Change (Status nur serverseitig; `confirmRequestSchema` wiederverwenden).

**A2 `src/canonical.ts`:** `freezeAttestation(input)` analog freezeSpec: doc = `{ version:'cosmo-market-attestation-v1', jobId, jobIdOnchain, requestId, price, asset, solver, buyer, acceptTx, specHash, acceptedAt }` → `canonicalize` + `sha3Hex`. Adressen vorher `normAddr()`; price = Decimal-String des gewählten Offers, asset = budgetAsset, solver/buyer/acceptedAt aus `getJobV2`, acceptTx = txRefs.accept.

**A3 `src/routes/flow.ts`:**
- Helper `ensureAttestation(jobId)`: braucht jobIdOnchain + txRefs.accept + specHash + selectedOfferId (sonst 409); wenn schon gefroren → stored zurück (kein Chain-Read im Poll-Pfad); sonst getJobV2 → freezeAttestation → `mutate('attestation_frozen', …)` mit Re-Check im Callback (Single-Writer-Queue löst die Freeze-Race — erster Writer gewinnt, alle servieren dieselben Bytes).
- `GET /jobs/:id/attestation`: ensureAttestation → `res.type('application/json').send(attestationCanonical)` (exakte Bytes, nie re-serialisieren). 404/409/502.
- `POST /jobs/:id/confirm-deliver` (Body confirmRequestSchema, optional txHash): Gates jobIdOnchain!=null, Status in `['onchain','delivered']` (idempotent für Retry). ensureAttestation; getJobV2: SETTLED→409 „call confirm-settle", !DELIVERED→409 „not delivered yet" (frisst der Retry-Loop), **resultHash != attestationHash → 409 hart** („does not match the frozen attestation — refusing to confirm", eigene Message, nicht retryfähig). mutate `deliver_confirmed`: status→'delivered' (nur von 'onchain'), txRefs.deliver=txHash (nur wenn leer), updatedAt. enqueueAlert. 200 `{jobId, status, resultHash}`.
- `POST /jobs/:id/confirm-settle`: status 'settled' → early 200 (idempotent); sonst Status in `['onchain','delivered']` — **'onchain' bewusst erlaubt** (Self-Heal wenn confirm-deliver nie lief). getJobV2 !SETTLED→409. mutate `settle_confirmed`: status→'settled', txRefs.settle, updatedAt. enqueueAlert „SETTLED — payout released". 200.
- `GET /jobs/:id/flow` (res.json ~Z.220) += `deliver: jobIdOnchain!=null ? { attestationUri: \`${PUBLIC_BASE}/jobs/${job.id}/attestation\`, attestationHash: job.attestationHash ?? null } : null` — NICHT lazy freezen im Flow-Poll (bleibt read-only).

**A4 `src/routes/public.ts:24`:** `PUBLIC_STATUSES` += `'delivered','settled'` (sonst 404t die Job-Seite nach Delivery!).

**A5 Auditierte No-Changes (geprüft):** Offer-Gate public.ts:95 ('approved') korrekt zu; flow.ts-Gates select/confirm-request/arm/confirm-accept korrekt; GET /flow, /spec, /status ohne Status-Gate; admin.ts + AdminConsole (Status als string) unkritisch; keine Zod-Status-Enums.

**A6 Deploy:** `npx tsc --noEmit` → `pm2 restart cosmo-market-api` → health-curl.

## Teil B — Frontend-Libs `…/src/app/market`

**B1 `lib/marketApi.ts`:** JobStatus-Union += 'delivered'|'settled'; MarketJob += `attestationHash?`; FlowState += `deliver: {attestationUri: string; attestationHash: string|null} | null`; neue Fns `confirmDeliver(jobId, txHash?)`, `confirmSettle(jobId, txHash?)`, `attestationUrl(id)`.

**B2 `lib/computeTx.ts`:**
```ts
deliverResultV2({jobIdOnchain, resultHash, resultUri}) // Guard: 64 Hex-Chars; call('deliver_result_v2',[u64Arg, hexArg, utf8Arg])
approveDeliveryV2({jobIdOnchain})                       // call('approve_delivery_v2',[u64Arg])
```

**B3 `lib/computeViews.ts`:** `JOB_ONCHAIN_STATUS`-Const + `fetchOnchainJob(jobId)` — 12-Tupel-Decode (Spiegel von Backend views.ts), Felder requestId/buyer/solver/price/jobDeadlineSecs/reviewWindowSecs/acceptedAt/deliveredAt/resultHash/status/paymentFa.

**B4 `lib/useMarketFlow.ts`:**
1. FlowBusy += `'approving'`; MarketFlow += `onchainJob: OnchainJob|null; onchainJobChecked: boolean; approve(): Promise<void>`.
2. **Neuer separater Poll-Effect** (Quote-Poll bleibt unverändert auf jobIdOnchain==null gegated): get_job_v2 alle 5s solange `flow.jobIdOnchain != null && flow.status !== 'settled'`; Tri-State wie quote; bei Chain-Fehler letzten Wert behalten.
3. **Self-Heal-Effect** (deckt „on-chain DELIVERED/SETTLED aber confirm nie gelaufen"): onchainJob DELIVERED + flow.status 'onchain' → einmalig `confirmDeliver(jobId)` + refreshFlow (Guard-Ref, bei Fehler Ref zurücksetzen); onchainJob SETTLED + flow.status != 'settled' → einmalig `confirmSettle`.
4. **`approve()`** (Klon von accept, via run('approving')): fetchFlow → jobIdOnchain nötig; Anti-Drift `fetchOnchainJob`: SETTLED → confirmSettle + Info; !DELIVERED → throw; connectMainnetWallet; sameWallet gegen f.buyerWallet UND jv.buyer (Chain ist Wahrheit); signAndSendCompute(approveDeliveryV2) → Retry 10×3s `confirmSettle(jobId, txHash)`; Erfolg: „Delivery approved — job settled, payout released to the provider."

**B5 `lib/marketStatus.ts`:** STATUS_BADGE += `delivered` (amber „Delivered — awaiting approval") + `settled` (emerald „Settled"); Record<JobStatus,…> erzwingt via tsc. UNIFIED_STEPS: `future` bei deliver/settle ENTFERNEN (+ FlowRail „soon (M5)"/waitingOnM5-Zweige löschen — tote Pfade raus). buildUnifiedSteps: `status==='settled'`→active=7 (alles done); `'delivered'`→6 (settle); `jobIdOnchain!=null`→5 (deliver); Rest unverändert.

**B6 Auditierte No-Changes:** JobDetail OfferForm-Gate ('approved') korrekt; TX_LABELS enthält deliver/settle schon (Links erscheinen automatisch); MarketHome/JobDetail-Badge-Lookups via B5 abgedeckt; useMarketData statusagnostisch; myJobs/OfferCard/PostJobForm ohne Status-Literale.

## Teil C — Komponenten

**C1 `NextStepPanel.tsx`:** Stage-Union += `'approve'|'settled'`. deriveStage-Kopf neu:
```
'settled'  wenn job.status==='settled' || flow.status==='settled' || oj.status===SETTLED
'approve'  wenn jobIdOnchain!=null && (oj.status===DELIVERED || status==='delivered')
'active'   wenn jobIdOnchain!=null (= wartet auf Lieferung)
… Rest unverändert
```
- **'active' neu:** „On-chain job #N is active — the provider is working." + `Delivery due {fmtTs(oj.jobDeadlineSecs)} ({fmtRel})`, Countdown via vorhandener 1s-Clock; **Edge Deadline vorbei** (oj ACTIVE && now>deadline): amber Warntext claim_no_delivery (kein Button, „contact us").
- **'approve' (CTA_BIG):** Attestation-Link (`flow.deliver.attestationUri` bzw. `attestationUrl(job.id)`) + Hash break-all + „hash on-chain = SHA3-256 of that document"; Review-Window-Note `Approve by {fmtTs(deliveredAt+reviewWindow)}`; **Dispute nur als Hinweistext** („contact us before the review window ends and do not approve"); CTA „Approve delivery with StarKey" (disabled wenn oj.status!==DELIVERED || busy) → f.approve(); Subnote „Approval settles atomically — price + provider bond are paid out in this one transaction."
- **'settled':** Erfolgskarte „Job settled on-chain … the marketplace loop is closed." + deliver-/settle-Tx-Links (je guarded). Kein „Step N of 3"-Pill für approve/settled (3-Schritte-Framing war select/escrow/accept).

**C2 `DeliverPanel.tsx` NEU** (Provider-Seite, bewusst OHNE useMarketFlow — kein Doppel-Poll):
Props `{ job, providers, onChanged }`. Intern: get_job_v2-Poll 10s (stop bei SETTLED) + 1s-Clock; **Attestation-Bootstrap in A-then-flow-Reihenfolge**: erst `fetch(attestationUrl)` (triggert Freeze), dann fetchFlow → deliver-Block; ohne Hash rendert der CTA NIE (fail closed, amber Retry-Hint). Wallet-Gate wie OfferForm, aber Match gegen **oj.solver** (sameWallet, wegen Leading-Zero-Quirk); Fremd-Wallet → „Only the solver wallet can deliver". Render: ACTIVE+vor Deadline → Attestation-Karte (Link+Hash) + Countdown (amber <1h) + CTA_BIG „Deliver result with StarKey"; ACTIVE+Deadline vorbei → Text, CTA disabled; DELIVERED → emerald „waiting for buyer approval" (+deliver-Tx-Link); SETTLED → „payout received". Deliver-Action: connectMainnetWallet → sameWallet(oj.solver) → signAndSendCompute(deliverResultV2 mit attestationHash/attestationUri) → confirmDeliver-Retry 10×3s → onChanged. Fehler-/Busy-Rendering nach OfferForm-Muster.

**C3 `JobDetail.tsx`:** DeliverPanel zwischen NextStepPanel und Lifecycle mounten: `{job.jobIdOnchain != null && job.status !== 'settled' && <DeliverPanel …/>}`.

## Teil D — Edge Cases
| Fall | Handling |
|---|---|
| Deliver-Deadline vorbei | Move abortet; UI: CTA disabled + claim_no_delivery-Warntext (Ops-Pfad bleibt CLI) |
| Freeze-Race | mutate-Queue + Re-Check im Callback; alle servieren stored bytes |
| DELIVERED/SETTLED on-chain, confirm nie gelaufen | Self-Heal-Effect (B4.3) + confirm-settle akzeptiert 'onchain' |
| Reload mid-flow | Stage rein aus GET /flow + get_job_v2 ableitbar; Retries stateless |
| Adress-Normalisierung | RPC strippt führende Null → nur sameWallet/addrEq/normAddr |
| result_hash-Mismatch | confirm-deliver 409 hart; Buyer approved nicht; Fehler unter dem CTA |
| Backend down | Chain-Reads laufen weiter; DeliverPanel ohne Attestation-Hash → CTA zurückgehalten (fail closed) |
| Approve nach Review-Window | on-chain weiter gültig; Note ist informativ |

## Teil E — Verifikation

**Backend zuerst:** tsc → pm2 restart → health. Attestation 2× curlen + diff (Byte-Stabilität) + `python3 hashlib.sha3_256` == attestationHash im Job-JSON. confirm-deliver vor Delivery → 409 „not delivered yet". `/jobs`-Listing + `/flow` mit deliver-Block prüfen.

**Frontend:** `npx tsc --noEmit` → `cp -r out out.pre-m5` (PFLICHT, out/ ist live) → `npm run build`.

**Browser-Walkthrough** auf `/market/job/?id=job_mrnqscfbzcinte` (StarKey-Schritte durch Rene):
1. Neutral: 'active'-Karte mit Delivery-Countdown (bis 18.07. 10:51 UTC), Rail-Node „Delivery" aktiv ohne „soon", DeliverPanel mit Attestation-Link+Hash.
2. Provider (M2): Connect → Name aufgelöst → Deliver signieren → „Result delivered", Backend-Status `delivered`, Telegram-Alert, deliver-Tx-Link.
3. Buyer (`0xfe09…103f`): 'approve'-Stage → Approve signieren → 'settled'-Karte, Badge „Settled", Rail komplett grün, settle-Tx-Link.
4. Chain-Wahrheit: get_job_v2(5) status 2, result_hash == Attestation-Hash; M2-wCOSMO +2.
5. Self-Heal-Spot-Check: zwischen 2 und 3 anonym hart neu laden — Status bleibt `delivered`, Listing intakt, OfferForm abwesend.

**Abschluss:** Website-Commit + Backend-Commit, Obsidian-Note + Vault-Push, Memory-Update agent-marketplace (Pilot = R1-Erfolgsmaßstab, wenn settle durch).
