# Plan: /compute Landing- + Onboarding-Seite (Track 1, Compute-first)

Stand 2026-07-07. Entscheid Rene: Compute-/Service-Provider bzw. Compute-Kunde wird VOR
Makern angesprochen (staerkste Differenzierung zu SupraFX). Externe Werbung dafuer erst,
wenn eine eigene Landing-/Onboarding-Seite existiert. Dieses Doc ist der Bauplan; Umsetzung
in frischer Session nach Freigabe.

## 1. Kontext + Konsistenz-Problem (muss der Deploy mitloesen)

- Homepage (src/app/page.tsx Z. ~262-267) sagt woertlich: "compute and service settlement
  are roadmap, not current capability". Das Copy stammt von VOR JOB-001.
- Das seit 2026-07-07 live verlinkte Manifesto v4.0 (sec 11/12/14) sagt: Compute-Markt live
  in guarded v1, erster Job settled. On-chain wahr (JOB-001, 2026-07-06).
- => Homepage und Manifesto widersprechen sich oeffentlich. FIX IM SELBEN DEPLOY:
  Honesty-Zeile praezisieren zu sinngemaess "accountable execution proven via RFQ mainnet
  round-trip; a first outcome-based compute market is live in a deliberately guarded
  v1 (see /compute); broader service settlement remains roadmap" + Absatz Z. ~256 analog
  ("Longer term ... attestation layers" bleibt fuer die breite Service-Klasse korrekt).
  Kein weiterer Homepage-Umbau, kein neuer Hero-Button (separates GO falls gewuenscht).

## 2. Route + Grundsatz

- Neue Route `/compute` (src/app/compute/page.tsx), statischer Export wie alle Seiten.
- OEFFENTLICH + indexierbar (Landing fuer Outreach; anders als /maker-onboarding/m2 noindex).
- Sprache EN (wie Rest der Site). Read-only, KEINE Wallet-Interaktion in v1 (bewusst:
  White-Glove-Onboarding, Kontakt-CTA statt Self-Service; Bond-Helper = Phase 2).
- Tonalitaet: Proof-first, guardrail-konform (kein "GPU marketplace"-Overclaim; v1 =
  deterministische Workloads, Job-Cap 1, Quote-Gate, Parameter als v1 working values).

## 3. Sektionen

1. **Hero:** "Outcome settlement for compute" — Einzeiler: escrowed payment, verifiable
   result hash, bonded provider, on-chain settlement. Sub: live on Supra mainnet in a
   deliberately guarded first version. CTA-Anker: "Become a provider" / "Bring a workload".
2. **Differenzierung (3 Karten):** SupraFX moves assets / COSMO settles work / not a
   competitor, one layer down (Kanon-Framing aus POSITIONING.md).
3. **How it works (Loop, 6 Schritte):** request (escrow max_price) -> quote (gated) ->
   accept (residual refund) -> deliver (result hash) -> approve/review window -> settle
   (path 0) mit Dispute-/Timeout-Pfaden als Fussnote.
4. **Proof-Block "JOB-001" (Muster /demo):** 5 Legs mit suprascan-Tx-Links:
   - create_outcome_request r3: 0xc7c4ab13d76bdd39ce89eae47eb23d4712bcf725ec05e6fcfca924bfd60d67b1
   - submit_quote (price 200 wCOSMO): 0xd0da92833c41192ba0082547c5e09dea100f45533942540b46cdc65851d8d60b
   - accept_quote -> job 0 ACTIVE: 0x9a74896ca9a19b93baad6b242dde889d39cf962263afea9a5c2e98f991531721
   - deliver_result: 0x4ada2ff262b80bc70e58dabd04be743c3e4c91436f413cb514bc7aff416dc500
   - approve_delivery -> SETTLED path 0: 0xaee22bea0f14ae7c9dfe284773e47f86920deb9592d8758d1615293910f1fc54
   Dazu: deterministischer Workload (sha3-Kette N=1M), input/result hash on-chain,
   Buyer==Provider-Org TRANSPARENT ausweisen (wie Evidence-Doc; Ehrlichkeit ist Feature).
   Datenquelle: docs/smoke/compute-mainnet-job001-2026-07-06.json aus dem move-Repo als
   statisches JSON einbinden (Muster /demo-Capture).
5. **Provider-Pfad:** on-chain verifizierte Fakten (Onboarding open/unpaused, min bond
   100 wCOSMO, per-provider cap 1.000, global cap 5.000 mit 100 belegt, 1 active job,
   10% no-delivery-slash an Buyer, dispute bond 500bps) als Tabelle; Schritte: contact ->
   white-glove wrap+bond -> first job. "Your keys, your bond, slashable — that is what
   makes the reputation credible."
6. **Buyer-Pfad:** requirements (deterministic/verifiable workload v1), escrow-Mechanik,
   review window, was passiert bei Nichtlieferung (Slash-Kompensation).
7. **Honesty-Box:** guarded v1 explizit (Caps klein, Job-Cap 1, Quote-Pfad server-gated,
   Parameter v1 working values, Aenderung via Governance).
8. **Kontakt-CTA:** Copy-Template-Muster von /community-rfq (kein Backend), Betreff-
   Varianten Provider/Buyer; Links Manifesto-PDF + /demo.

## 4. Explizit NICHT in v1 (Phase 2, eigenes GO)

- Self-Service Bond-Helper (StarKey, wrap + deposit_provider_bond, Gating via Views) —
  Muster M2BondHelper liegt vor, erst bauen wenn erster Kandidat konkret.
- wCOSMO-Beschaffungs-Guide fuer Externe (Kauf + wrap Schritt-fuer-Schritt) — Text folgt
  mit Phase 2; bis dahin White-Glove.
- Homepage-Hero-Link auf /compute.

## 5. Umsetzung + Verifikation

- Frische Session, dieser Plan als Input. Muster-Dateien: src/app/demo/ (Proof-Layout),
  src/app/community-rfq/ (CTA), docs/POSITIONING.md (Framing-Kanon).
- Vor Build: Live-Views gegenchecken (is_onboarding_paused, caps, total_bonded) und die
  Zahlen im Copy daraus uebernehmen (nicht hardcoden ohne Check).
- Build/Deploy: bekannte Sequenz (out/ ist live -> `cp -a out out.pre-compute`, build,
  Routen-Smoke alle Seiten 200 + neue Route, PDF-Links 200; Rollback
  `mv out out.failed && mv out.pre-compute out`). Quelldateien committen (master).
- Danach: Outreach-Kit-Templates um /compute-Link ergaenzen (Vault
  COSMO_Compute_Outreach_v1_2026-07-07.md), DANN erst DMs (Rene).

## 6. Offene Entscheide fuer Rene (bei GO beantworten)

- E1: Route-Name `/compute` ok? (Alternative: /compute-market, /outcome-rfq)
- E2: Homepage-Honesty-Fix im selben Deploy ok (sec 1)?
- E3: Kontaktkanal im CTA (aktuell generisch wie /community-rfq; konkreter Kanal = Einzeiler)
