# COSMO Agent Marketplace auf heros.cloud — Implementierungsplan (Release 1)


## Kontext

Öffentlicher Marktplatz für COSMO: Auftraggeber stellen digitale Jobs ein (Beschreibung,
Budget, Deadline, Abnahmekriterien), kuratierte Pilot-Anbieter geben Angebote ab, der
Auftraggeber wählt — und ab der Auswahl läuft der komplette Zyklus (Escrow → Lieferung →
Abnahme/Dispute → Auszahlung) über den live V2-Rail von compute_rfq auf Supra chain 8.
Erfolgsmaßstab Release 1: ein externer Auftraggeber stellt real ein, ≥1 benannter Anbieter
bietet, Auswahl + Abwicklung bis Bezahlung nachvollziehbar über COSMO.

**Renes Entscheide (fix):** (1) Job-Intake offen mit Moderations-Queue; (2) Anbieter v1
kuratiert — Admin legt Profile an, Angebots-Auth per Wallet-Signatur; (3) Voll-Zyklus
on-chain ab Angebotsauswahl.

**Zentrale Rail-Wahrheit:** Anbieter können on-chain KEINE Angebote posten — jede Quote
muss vom Operator-Quote-Key (`server_quote_pubkey`, ed25519, V3-Payload) signiert sein.
Angebote sind daher off-chain; nur das GEWÄHLTE Angebot wird signiert und via
`submit_quote_v3` (permissionless relay) on-chain gespiegelt. Quote-TTL = 300s.
Keine Move-Änderungen in v1 — der Marktplatz passt sich dem live Rail an.

## Architektur

```
Browser (StarKey)              nginx heros.cloud (TLS :4443)         VPS
/market-Seiten (Next static) → /            → serve out/ (:3001)
  signiert Buyer/Provider-Txs  /api/market/ → 127.0.0.1:4100  →  PM2 cosmo-market-api
  liest Views via rpcView      /api/market/admin/ + BasicAuth      (Express+tsx, JSON-State,
        ↓ RPC                                                       Quote-Signer V3, Relayer)
Supra chain 8: compute_rfq / provider_vault / asset_registry
pkg 0x0fd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0
```

On-/Off-chain-Grenze (7-Schritte-Spec): 1 Job einstellen = off-chain (Formular →
Moderations-Queue) · 2 Freigabe + Spec-Freeze (kanonisches JSON, sha3-256 = späterer
input_hash; ATTEST-001-Muster) = off-chain · 3 Angebote = off-chain (Wallet-Signatur) ·
4 Auswahl → Escrow = ON-CHAIN (create_outcome_request_v2 + submit_quote_v3 +
accept_quote_v2) · 5 Lieferung = ON-CHAIN (deliver_result_v2, Provider-Wallet) ·
6 Abnahme/Dispute = ON-CHAIN (approve_delivery_v2 / dispute_delivery_v2, 5%-Dispute-Bond) ·
7 Settlement = ON-CHAIN (Pfad 0 bzw. timeout_settle_v2 durch bestehenden Keeper).
Jeder On-chain-Schritt mit SupraScan-Tx-Link.

## Backend: neuer Service `cosmo-market-api`

`/root/cosmo-market-api/` — NEU (clawbot = Alt-EVM-Track, nicht anfassen). Express +
TypeScript via tsx (Daemon-Präzedenz), PM2 `ecosystem.config.cjs`, Port `127.0.0.1:4100`.

Dateien: `src/server.ts` · `src/routes/{public,admin,select}.ts` · `src/store.ts`
(atomares JSON temp+rename, EIN Writer, In-Process-Queue) · `src/model.ts` (zod) ·
`src/canonical.ts` (kanonisches Spec-JSON + sha3-256) · `src/walletSig.ts`
(Challenge/Verify) · `src/chain/views.ts` (Live-Views: get_request_v2/get_quote_v2/
get_job_v2, provider_vault, asset_registry — NIE Params hardcoden) ·
`src/chain/quoteSigner.ts` · `src/chain/relayer.ts` · `src/notify.ts` (Telegram
@ClawZorgBot, Alert-State erst nach bestätigtem Send) · `state/market-state.json` +
`state/market-audit.jsonl` · `/etc/cosmo-market/config.env` (0600).

**Persistenz: JSON, nicht SQLite** (Hausstil, Pilot-Skala, ein Writer; Migrationpfad zu
better-sqlite3 hinter gleichem Store-Interface dokumentiert).

Datenmodell: `jobs[]` {id, title, description, acceptanceCriteria, budget, deadlineTs,
contactEmail (privat — NIE in Public-API serialisieren), status:
submitted|approved|rejected|selected|onchain, specCanonical, specHash, buyerWallet,
requestId, selectedOfferId, txRefs, moderationNote} · `providers[]` {id, name, skills,
wallet, status, links} · `offers[]` {id, jobId, providerId, price, deliverySecs, note,
sigProof}.

Endpoints (public, CORS heros.cloud): GET jobs / jobs/:id / jobs/:id/spec (= on-chain
workload_uri, nach Freigabe immutable) / providers · POST jobs (Intake, Honeypot,
Telegram-Alert) · POST offers/challenge + offers (Wallet-Sig) · POST jobs/:id/select
(Buyer-Sig) + jobs/:id/arm-quote (Signier-Choreografie) · GET jobs/:id/status (Polling).
Admin (nginx BasicAuth, rag-Präzedenz): queue, approve (friert Spec+Hash ein), reject,
providers CRUD.

Auth: Public-POST ohne Login, aber nginx `limit_req` + Body-Limit + Honeypot + Tages-Cap;
die Queue ist das echte Gate. Anbieter-Angebot: Challenge-Nachricht
(`COSMO-MARKET OFFER v1 | job | provider | price | delivery | nonce | expires`) per
StarKey signMessage, Server verifiziert ed25519 gegen Profil-Wallet
(sha3(pubkey||0x00) == addr). **M3.0-Spike nötig:** signMessage-Antwortformat prüfen;
Fallback für 2-3 Pilot-Anbieter = Admin trägt Angebot nach Out-of-band-Verifikation ein.

**Quote-Signing (minimal-invasiv):** Maker-Daemon NICHT anfassen. Key =
`/root/obsidian-vault/supra/move_workspace/cosmo-contracts-move/quote-server/.keys/server-quote.json`
(0600, Pfad via env `MARKET_QUOTE_KEY_PATH`). `quoteSigner.ts` baut das V3-BCS-Payload
selbst (Domain `CPRFQ_QUOTE_V3`, chain_id 8, package, payment_fa/input_hash/job_deadline
AUS dem on-chain Request gelesen, Phase-A: vier Fee-Felder zwingend 0 —
E_PHASE_A_FIELD_NOT_ZERO). Byte-für-Byte-Fixture gegen adaptiertes
`scripts/sign_compute_quote.py` VOR jedem Mainnet-Einsatz. Jedes Signing → Audit-JSONL.
**ACHTUNG Scope-Erweiterung des Server-Quote-Keys — braucht Renes explizites OK** (im
Plan-Approval enthalten; Alternative: eigener Marktplatz-Quote-Key via
rotate_server_quote_pubkey ist BEWUSST NICHT v1 — würde den Daemon-Betrieb koppeln).
Relay von submit_quote_v3 über dedizierten, minimal befüllten Relayer-Key (<~5 SUPRA,
Low-Balance-Alert); Fallback ohne Server-Hot-Wallet: Buyer relayt selbst (3 Popups).

Deploy: Service + PM2 + nginx-Location (`/api/market/` → 4100, Admin-Location mit
auth_basic, limit_req-Zone; Muster = /api/rfq/-Block) → `nginx -t && reload`.

## Frontend (Website-Repo, static export)

Query-Param-Routing (kein dynamisches Segment im Export): Detail = `/market/job?id=<id>`.

Neu: `src/app/market/page.tsx` (Job-Liste + On-chain-Phase-Chips + Honesty-Box) ·
`market/job/page.tsx` (Detail: Lifecycle-Rail, Angebote, Tx-Links, rollenbewusste
Aktionen via connected Wallet) · `market/post/page.tsx` (Intake-Formular, EN,
Privacy-Hinweis, 7-Tage-Deadline-Cap = Rail-Constraint) · `market/providers/page.tsx`
("Curated pilot providers" + Roadmap-Box) · `market/admin/page.tsx` (Queue + Provider-
CRUD; API ist BasicAuth-gated) · `market/lib/marketApi.ts` · `market/lib/marketOnchain.ts`
(Klon-Muster rfqActivity.ts: Status-Mapping Request 0-4/Job 0-5 → Display-Phasen,
buildRailNodes) · `market/useMarketJob.ts` (Klon useRfqActivity: 20s-Poll,
visibility-gated, keep-last-data) · `src/lib/computeTx.ts` (EntryCall-Builder im
supraTx.ts-Stil: createOutcomeRequestV2, acceptQuoteV2, deliverResultV2,
approveDeliveryV2, disputeDeliveryV2, cancelRequestV2) · `src/hooks/useMarketFlow.ts`
(Klon useRfqFlow) · `market/components/StepRail.tsx` (7 Schritte, JEDER mit
ON-CHAIN/OFF-CHAIN-Badge) + `OfferCard.tsx`.

Geändert: `src/components/navigation.tsx` (+`{ href: '/market', label: 'Market' }`).
Wiederverwendet as-is: starkeySign.ts, mainnetOnchain.ts (rpcView, COMPUTE_PKG_ADDR
existiert bereits), AccessGate-Connect-Muster, StatTile/StatusLamp, Terminal-Theme.

Live-Params IMMER aus Views (min_provider_bond live = 100.000 wCOSMO — Docs mit 100 sind
stale; Asset-Allowlist via asset_registry.is_allowed lesen, Memory sagt wCOSMO+CASH+SUPRA
gelistet — bei Umsetzung live verifizieren). Resilienz: Backend down → Job-Detail rendert
On-chain-Rail weiter direkt aus RPC, Off-chain-Metadaten zeigen Service-Hinweis.

## On-chain-Choreografie (Schritt 4, das kritische Stück)

1. Buyer wählt Angebot, signiert Selektions-Challenge; Backend-Pre-Flight:
   is_provider_eligible + Bond >= min_bond + has_job_capacity + !is_onboarding_paused +
   !is_paused (Klartext-Fehlermeldungen).
2. Escrow: Buyer signiert create_outcome_request_v2 via StarKey — workload_uri =
   `https://heros.cloud/api/market/jobs/<id>/spec`, input_hash = specHash, payment_fa aus
   Live-Allowlist (Default wCOSMO; /wcosmo-Guide INLINE verlinkt — größte Friction),
   max_price = Angebotspreis, min_bond_quants = live get_min_provider_bond, job_deadline
   aus Lieferzeit (geclamped [now+60, now+7d]), review_window default 24h. Backend
   bestätigt requestId via View-Walk + input_hash-Match.
3. "Arm offer": Backend re-checkt Pre-Flight, signiert V3-Payload, relayt submit_quote_v3.
4. UI pollt get_quote_v2, zeigt 300s-Countdown; Buyer signiert accept_quote_v2 mit
   Anti-Drift-Tupel AUS DER ON-CHAIN-QUOTE (nie aus lokalem State). TTL abgelaufen →
   "Re-arm"-Button (last-quote-wins erlaubt Re-Signing).

Schritt 5: Provider-Ansicht (Wallet == solver) liefert result_uri + result_hash
(Client-sha3-Helper) via deliver_result_v2; Deadline-Countdown; No-Delivery →
claim_no_delivery_v2 (Keeper, 10%-Slash an Buyer) nur angezeigt.
Schritt 6: approve_delivery_v2 (sofortiges Settle Pfad 0) oder dispute_delivery_v2
(5%-Bond VOR dem Signieren explizit erklärt; Resolution = MS-Runbook, 7d-Unwind Anzeige).
Schritt 7: Keeper settelt Timeout; UI zeigt Review-Deadline-Countdown + Auszahlungs-Tx.

Provider-Onboarding (Ops-Runbook, kein Code): Profil anlegen + Provider bondet
>= live Min-Bond in provider_vault vor dem ersten Arm.

## Ehrliche Darstellung

StepRail: jeder Schritt trägt OFF-CHAIN (slate) oder ON-CHAIN (emerald + Tx-Link).
Honesty-Box auf jeder /market-Seite: Intake/Moderation/Angebote laufen auf unserem
Server; ab Auswahl ist jeder Schritt eine verifizierbare Mainnet-Tx; Anbieter heute =
kuratierte Pilot-Partner, offenes permissionless Netzwerk = Roadmap. Übersetzungsfestes
EN, keine "trustless"-Claims.

## Meilensteine (je einzeln verifizierbar)

- **M1** Backend-Skelett (Store, Models, Admin-Endpoints, Telegram) + PM2 + nginx.
  Verify: curl-CRUD, 401 ohne Creds, Restart-sicherer State.
- **M2** Public-Seiten + Nav. **Vor erstem Deploy: `cp -a out out.pre-market`** (build IST
  deploy). Verify: submit → approve → gelistet; contactEmail in keiner Public-Response.
- **M3** Angebote: M3.0 signMessage-Spike, dann Challenge/Verify + OfferCard.
  Verify: Pilot-Wallet postet Angebot; gefälschte Signatur wird abgelehnt.
- **M4** On-chain-Choreografie: computeTx-Builder (Fixture-getestet), quoteSigner
  (Byte-Fixture vs sign_compute_quote.py V3-adaptiert), Relayer, useMarketFlow.
  Verify: staged Mainnet-Job mit Mini-Budget, simulate-first.
- **M5** Deliver/Approve/Dispute/Settle-UI, StepRail-Badges, Honesty-Boxen, /wcosmo-Link.
  Verify: kompletter 7-Schritte-Pilot = Erfolgsmaßstab Release 1.

**Explizit NICHT in v1:** Reputation/Ratings, offene Anbieter-Registrierung,
Provider-Self-Bonding-UX, mehrere Quotes on-chain, Assets jenseits der Live-Allowlist,
Artefakt-Upload/-Storage, Dispute-Admin-UI (MS-Runbook), Notifications über
Telegram-an-Admin hinaus.

## Risiken

300s-TTL (Re-arm als First-Class-UX) · signMessage unverifiziert (M3.0-Spike + Fallback) ·
Server-Quote-Key-Scope wächst (Audit-JSONL + Pre-Flight + Renes OK) · Relayer-Hot-Wallet
(<5 SUPRA, Alert) · 7d-Deadline-Cap (im Formular erzwingen + benennen) · Moderations-SLA
(Telegram-Alert pro Submission; "reviewed within 24h" nur bei Commitment) · GDPR-light
(E-Mail nur serverseitig, Zweck + Löschkontakt am Formular, keine Analytics) ·
Provider-Ineligibility beim Accept (Pre-Flight + Fehler-Mapping) · wCOSMO-Friction
(Guide am Escrow-Schritt).

## Verifikation

1. Lokal: next dev + market-api :4100 mit Fixture-State; alle Seiten; Negativ-Tests
   (gefälschte Sig, Rate-Limit) per curl.
2. Signing-Fixtures: quoteSigner-Bytes Byte-für-Byte gegen adaptiertes
   sign_compute_quote.py (V3-Tag + vier Null-Felder) VOR Mainnet.
3. Simulate-first für jeden neuen Entry-Call-Pfad (Hausregel); Smoke-Disziplin von
   compute-mainnet-v2coin-proof-host.sh wiederverwenden.
4. Staged Mainnet-Pilot: interner Buyer + ein gebondeter Pilot-Provider, kleines
   wCOSMO-Budget, alle 7 Schritte, jede Tx im Audit-Trail; danach echter externer
   Auftraggeber (= Release-1-Erfolgsmaßstab). Dispute-Pfad: einmal auf chain-6-Staging,
   sonst v1 = MS-Runbook-only dokumentieren.
5. Rollback: out.pre-market re-serven; Backend: pm2 stop cosmo-market-api (Seite
   degradiert graceful auf On-chain-only).

## Kritische Referenzdateien

- Website: `src/lib/supraTx.ts` (Builder-Muster) · `src/lib/starkeySign.ts` (Signieren) ·
  `src/app/rfq/lib/rfqActivity.ts` + `useRfqActivity.ts` (Daten/Polling-Muster) ·
  `src/lib/mainnetOnchain.ts` (rpcView, COMPUTE_PKG_ADDR) · `src/app/access/AccessGate.tsx`
- Rail: `…/cosmo-contracts-move/compute-rfq/sources/compute_rfq.move` (V3-Payload ~L1818,
  Phase-A-Zero ~L2320) · `provider_vault.move` · `asset_registry.move`
- Signer-Vorbild: `…/cosmo-contracts-move/quote-server/src/signer.ts`; Key (0600):
  `…/obsidian-vault/supra/move_workspace/cosmo-contracts-move/quote-server/.keys/server-quote.json`
- Infra-Vorbild: `/etc/nginx/sites-available/heros.cloud` (/api/rfq/-Block, BasicAuth-
  Muster von rag.heros.cloud)
