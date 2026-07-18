# Website-Neuschnitt Etappe 5 — Sprachpass über den Buyer-Flow (letzte Etappe)

> Umsetzungsnotiz: zusätzlich zur Tabelle wurden die Leg-Prosa-Labels im
> pilot001-Daten-JSON angeglichen (Fund the job / Confirm & start / Provider
> offer prepared — Entrypoint-Namen in Klammern bleiben als Evidence).

## Kontext

Etappen 1–4 live + committet (`85a4701`, `8052d08`, `82eb62c`, `6f26845`). Etappe 5 (Konzept-Prinzipien): (a) Buyer-Vokabular entfachsprachlichen — explizite Beispiele: „Fund escrow" → „Fund the job (held on-chain, …)", „Accept quote" → „Confirm & start"; **„Arm" muss für Buyer unsichtbar sein** (leakt heute in 2 Stellen). (b) StarKey/Wallet erst erwähnen, wenn gebraucht (erstmals beim Select-Step; davor E-Mail-geführt). (c) Jede Wartephase nennt, WER als Nächstes handelt. (d) Übersetzungsfestes EN. Etabliertes Site-Vokabular: „security deposit", „penalty deduction".

**Wahrheits-Check (code-verifiziert):** Refund-Klausel = **„held on-chain, refunded if the job does not go ahead"** — deckt beide echten Pfade (cancel_request_v2 vor Confirm; claim_no_delivery nach verpasster Deadline). NICHT „refunded if not delivered" allein.

**Scope-Entscheidungen:** Nur Copy + EINE Funktionsänderung (StarKey-Footer im NextStepPanel nur noch in Wallet-relevanten Stages rendern). Optionales Wallet-Feld im PostJobForm bleibt funktional (nur Hint umformuliert). Provider-Flächen (DeliverPanel-Provider-Teile, OfferForm) OUT of scope. Evidence-Kontexte behalten rohe Identifier (PILOT-Panel `result_hash`, `Spec hash (SHA3-256)`-Fact — Absatz darüber liefert den Klartext-Gloss). HonestyBox: Gloss-Ansatz („funding (escrow)" genau 1x), „bonded" → „locked", „permissionless" → „open". Buyer-„quote" wird „offer"; interne Identifier (Stage `'escrow'`, `txKey`, `armState`, `f.rearm()`) bleiben. **Inklusive Addendum:** buyer-sichtbare Fehlertexte in `useMarketFlow.ts` (gleiche Vokabel-Map).

Repo-Regeln: `cp -r out out.pre-etappe5` VOR Build; NIE `git add -A`.

## Vokabel-Map

| Alt (buyer-facing) | Neu |
|---|---|
| escrow / fund escrow | funding / „Fund the job" (Gloss „funding (escrow)" nur 1x in HonestyBox) |
| quote | offer / „offer confirmation" |
| Accept quote | Confirm & start |
| arm / re-arm | unsichtbar — „preparing" / „Refresh the offer" |
| bond | security deposit |
| permissionless(ly) | open / „by anyone, without your signature" |
| on-chain rail | the on-chain contract |
| solver | provider |

## Ersetzungstabelle

### 1. `src/app/market/components/NextStepPanel.tsx` (Kern)

- Kommentar Z. 3–8: auf neues Vokabular anpassen (dev-facing).
- **escrow-Stage** (279–292): „Funding the job locks **{amount} {symbol}** on-chain against the frozen job specification. The money is held by the on-chain contract — not by us and not by the provider. Any unused part comes back to you when you confirm, and you can cancel and get everything back at any time before you confirm. Need {symbol}? See the conversion guide."
- 294–296: „Funding details are not available yet — refresh in a moment."
- 299–301: „The on-chain contract is paused — funding is disabled right now."
- 304–308: „The selected provider does not currently meet the on-chain requirements (security deposit or capacity). Funding is blocked until that is resolved."
- CTA 321: **„Fund the job with StarKey"**
- Post-CTA-Hint 323–326: „Held on-chain, refunded if the job does not go ahead. After this signature everything is prepared automatically — your next and final action is Confirm & start."
- **preparing** (333–337): „**Preparing the final step…** We verify your funding on-chain and set up the provider's offer for confirmation. No action needed from you — the Confirm & start button appears here in a moment." (ARM-Leak weg)
- **accept-Body** (343–358): „The provider's offer is ready on-chain: **{price} {symbol}** from provider {addr}…. Confirming starts the job and returns any unused funds to you. The chain checks your confirmation against the exact offer terms — if the terms changed in the meantime, the chain rejects it."
- Countdown 364: „Offer valid {countdown}" (+ „renews automatically" bleibt)
- CTA 379: **„Confirm & start with StarKey"**
- **arm-failed** (388): Copy-Restrukturierung — Leadsatz „Preparing the final step failed. Your funds are safe in the on-chain contract — you can retry below at no cost."; `f.armError` als sekundäre Zeile `Technical detail: {f.armError}` (font-mono text-[11px] text-slate-500).
- **expired-manual** (406/415): „The offer's validity window ran out. Get a fresh one — it is free and needs no wallet signature." / CTA **„Refresh the offer"** (ARM-Leak weg)
- **active** Deadline-passed (456–458): „The delivery deadline has passed without a result. Delivery is no longer possible on-chain, and you can get your locked funds back. Contact us and we will guide you through the steps." (claim_no_delivery + Idiom weg)
- **approve** (467–469): „The provider delivered a result. The chain stores a fingerprint (SHA3-256 hash) of this attestation document, so the document cannot be changed afterwards:"
- 490–492: „Review window until {ts} — it is your turn to approve. After that time, settlement can be triggered by anyone, without your signature."
- 495–496: „You can dispute it on-chain — contact us before the review window ends and do not approve."
- 511–514: „Approval settles everything in one transaction: the provider is paid and their security deposit is released."
- **settled** (522–524): „…was paid out to the provider and their security deposit was released. This job is complete — nothing more to do."

**Footer-Conditional** (einzige Funktionsänderung, Z. 565–568): Const bei ~Z. 61:
```tsx
const WALLET_STAGES: ReadonlySet<Stage> = new Set([
  'select', 'escrow', 'preparing', 'accept',
  'arm-failed', 'expired-manual', 'active', 'approve',
]);
```
Footer nur bei `WALLET_STAGES.has(stage)` rendern (nicht in loading/moderation/rejected/awaiting-offers/backend-down/settled).

### 2. `src/app/market/lib/marketStatus.ts`

- Z. 26: `'Offer selected — you fund next'`
- Z. 34: `'Delivered — buyer approval next'` (nennt WER)
- Z. 71: `label: 'Fund the job'` · Z. 72: `label: 'Confirm & start'`
- Kommentare 63–66 anpassen; ids/Logik unverändert. (FlowRail rendert `step.label` verbatim — kein Code-Change dort; verifiziert: kein Consumer vergleicht Label-Text.)

### 3. `src/app/market/job/JobDetail.tsx`

- TX_LABELS: 27 `'Job funded'`, 28 `'Provider offer confirmed'`, 29 `'Job confirmed & started'`
- 264–267: „On approval this job's specification was frozen to an immutable canonical document. The on-chain contract stores its SHA3-256 hash, so the specification cannot change after funding."
- 269 `Spec hash (SHA3-256)` BLEIBT.

### 4. `src/app/market/post/PostJobForm.tsx`

- Wallet-Hint 279: „If you already have one — this is the wallet you later pay from when you fund the job. You can add it later; we ask again when it is needed."
- 315–316: „Payment happens later and on-chain: after approval you select an offer and fund the job from your own wallet — the money is held on-chain and refunded if the job does not go ahead. Posting a job costs nothing and commits you to nothing."

### 5. `src/app/market/MarketHome.tsx`

- Hero 58–60: „…from your selection onward funding, delivery and payout run as verifiable transactions on Supra Mainnet."

### 6. `src/app/market/components/HonestyBox.tsx`

- 20–22: „…every step is a transaction on Supra Mainnet: funding (escrow), delivery, acceptance or dispute, and payout."
- 25–26: „…curated pilot partners with a security deposit locked on-chain. An open provider network is roadmap, not current fact."
- 30–31: „…their SHA3-256 hash is what the on-chain funding is locked to."

### 7. Metadata-Trio (synchron halten)

- `src/app/page.tsx` Z. 10 + `src/app/market/page.tsx` Z. 7 (byte-identisch!): „…from selection onward funding, delivery and payout run as verifiable transactions…"
- `src/app/layout.tsx` SITE_DESCRIPTION: „…and funding, delivery and payout settle as verifiable transactions…" („settle as" bleibt bewusst anders als „run as")

### 8. `src/app/market/lib/useMarketFlow.ts` (Addendum — buyer-sichtbare Fehlertexte)

Gleiche Vokabel-Map auf die `f.error`/`f.armError`-Strings: ~Z. 267 („Quote signing… Your escrow is safe on-chain" → „Offer preparation is temporarily unavailable… Your funds are safe in the on-chain contract"), 339–347 („escrow parameters" → „funding details"; „on-chain rail is paused — escrow is disabled" → „the on-chain contract is paused — funding is disabled"; „escrow would be wasted" → sinngemäß „funding would be lost"), 373–374 („Escrow transaction…" → „The funding transaction…; funds are recoverable via cancel" → „…you can cancel and get the funds back"), 386/392 („No quote is live…" → „No offer is ready on-chain…"; „The on-chain quote expired" → „The offer's validity window ran out"), 418–419 analog. Exakte Strings beim Umsetzen aus der Datei nehmen; nur Prosa, keine Identifier.

## Konsistenzkette „Confirm & start"

FlowRail-Node = Escrow-Hint = Preparing-Body = Accept-CTA = JobDetail-Tx-Label („Job confirmed & started") = Badge „you fund next"/„Fund the job". Kein Buyer-String sagt mehr „accept", „quote" oder „arm" („acceptance criteria"/„acceptance or dispute" = anderes Konzept, bleibt bewusst).

## Bewusst NICHT geändert

PILOT-Evidence-Panel (`result_hash`), `Spec hash`-Fact, SHA3-Zeile im approve-Stage, DeliverPanel + OfferForm (Provider), „Approve delivery with StarKey" (schon klar), interne Identifier, optionales Wallet-Feld (funktional).

## Plan ins Repo

Nach `plans/website-neuschnitt-etappe5-plan.md` kopieren.

## Build / Deploy / Verify

```bash
cp -r out out.pre-etappe5   # VOR Build
npm run build && npm run lint
```

**Statisches HTML** (prerendered: Hero, PostJobForm, HonestyBox, Metadata — NextStepPanel-Stages NICHT, die sind runtime-gated):
- `funding, delivery and payout` in `out/index.html` + `out/market/index.html`
- „escrow" in `out/index.html`, `out/market/index.html`, `out/market/post/index.html`, `out/market/job/index.html`: genau 1 Treffer pro Seite mit HonestyBox (der Gloss „funding (escrow)"), sonst 0
- `fund the job` in `out/market/post/index.html`

**Bundle-Grep** (Client-Chunks = Vollständigkeits-Check für Runtime-Strings):
- `grep -rl "Fund the job with StarKey" out/_next/static/chunks/` → Treffer
- `grep -rl "start with StarKey" out/_next/static/chunks/` → Treffer (Confirm &)
- `grep -rn "Re-arm\|arm the provider quote\|Accept quote\|Fund escrow\|Preparing your quote" out/_next/static/chunks/` → 0
- `grep -rn "escrow" out/_next/static/chunks/*.js` → verbleibende Treffer nur interne Identifier (escrowParams, `'escrow'`-Stage-id etc.), keine Buyer-Prosa

**Browser (heros.cloud; Post-Select-Stages brauchen Live-Job → begrenzt):**
- `/` Hero + Status-Chips; `/market/post/` Wallet-Hint + Reassurance + HonestyBox-Gloss
- Job-Seite: FlowRail-Nodes „FUND THE JOB" / „CONFIRM & START"; StarKey-Footer NICHT in moderation/awaiting-offers
- Meta-Description via view-source

**Git** (nur nach User-GO; Einzeldateien):
```bash
git add src/app/market/components/NextStepPanel.tsx src/app/market/lib/marketStatus.ts \
  src/app/market/job/JobDetail.tsx src/app/market/post/PostJobForm.tsx \
  src/app/market/MarketHome.tsx src/app/market/components/HonestyBox.tsx \
  src/app/market/lib/useMarketFlow.ts src/app/page.tsx src/app/market/page.tsx \
  src/app/layout.tsx plans/website-neuschnitt-etappe5-plan.md
```

**Rollback:** `rm -rf out && cp -r out.pre-etappe5 out`

## Ausdrücklich NICHT in Etappe 5

- Keine Funktionsänderungen außer dem Footer-Conditional; kein Backend-Touch
- Provider-Flächen unverändert; Evidence-Identifier bleiben
- Keine neuen Seiten/Sektionen — reiner Sprachpass
