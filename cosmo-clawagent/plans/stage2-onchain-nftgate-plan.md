# Stage 2 — On-chain COSMO Holder Gate (nftGate) — Plan

Status: PLAN (no code). Scope: upgrade the `/access` holder gate from a static
allowlist (Stage 1) to a live on-chain ownership check, optionally with
signed-nonce wallet-proof. Implement in a fresh chat from this plan.

Stage 1 (shipped, commit `e909344`): `/access` = StarKey connect + static allowlist
(`src/data/cosmo-nft-allowlist.json`, 21 holders) + `isAllowlisted()`. Self-contained,
no live RPC, no secrets in bundle.

---

## 1. Goal

After connecting StarKey on `/access`, eligibility is decided by **current on-chain
COSMO NFT ownership**, not a hand-maintained list. Trades update access automatically.
Optionally prove the user controls the address (signed nonce) so eligibility can't be
spoofed by pasting someone else's address.

Non-goals (unchanged): no RFQ/trades, no Maker onboarding, no bond/vault, no Mainnet
writes. Still a read/verify access gate.

---

## 2. What already exists (reuse, don't rebuild)

- `src/lib/nftGate.ts` — `checkCosmoNFTHolder(addr) -> {isHolder, count}` via Tradeport
  indexer GraphQL (`api.indexer.xyz`, collection `215d2552-e25f-4f27-b5c6-e2a917b61331`).
  Uses `NEXT_PUBLIC_TRADEPORT_API_KEY/USER/COLLECTION_ID`.
- `context/WalletContext.tsx` — StarKey connect that already runs `checkCosmoNFTHolder`
  on connect (`isNFTHolder`, `nftCount`, `nftCheckLoading`, `nftCheckFailed`). Used by
  `/founder`. NOT wrapped globally (would inline the Tradeport keys into the shared
  bundle — see `layout.tsx`).
- `src/app/access/AccessGate.tsx` — self-contained StarKey connect (no WalletContext).
- `src/lib/starkeySign.ts` — StarKey tx signing (createRawTransactionData/sendTransaction).
  No message-signing path yet.

---

## 3. CENTRAL DECISION — static export vs. a server/edge endpoint

The site deploys as **`output: 'export'`** (PM2 `serve out/ -l 3001`). Static export has
**no API routes / no server runtime**. This is the pivotal fork:

- **Keep static export** → the on-chain check must run **client-side** (indexer key in
  the bundle). Signed-nonce server-verification is NOT possible without an endpoint.
- **Add a server/edge endpoint** → enables hiding the indexer key + signed-nonce
  verification, but changes infra/deploy.

### Decision needed from Rene (pick one path)
- **D1.** On-chain source: **(a) Tradeport indexer** (already wired, fast, but a 3rd-party
  index that can lag/be down) vs **(b) direct Supra node view** (authoritative, more work,
  needs the collection/token ownership view or full-node query).
- **D2.** Architecture: **(a) client-side only** (no infra change, key in bundle) vs
  **(b) server/edge endpoint** (hide key + enable signed nonce). If (b): which host —
  Next `next start` (drop static export, PM2 runs `next start`), a small standalone Node
  service on the VPS behind nginx, or a Cloudflare Worker?
- **D3.** Signed-nonce proof: **needed now** or **deferred**? (Gate only unlocks a UI view
  with no value transfer → spoofing risk is low; signed nonce is "nice", not load-bearing
  for Stage 1→2.)

Recommended default (pragmatic, matches incremental style): **Phase 2a now** (D1=a, D2=a,
D3=deferred), **Phase 2b later** (D2=b, D3=now). Details below.

> **DECISION — ACCEPTED 2026-06-24 (Rene): defaults.** D1 = (a) Tradeport indexer.
> D2 = (a) client-side for Phase 2a (no infra change); server/edge endpoint deferred to
> Phase 2b. D3 = signed-nonce deferred to 2b. Implement Phase 2a first.

---

## 4. Phase 2a — client-side live check + allowlist fallback (no infra change)

Smallest step that makes the gate live and self-updating.

- New `src/app/access/lib/eligibility.ts`: `resolveEligibility(address)` →
  1. try on-chain: `checkCosmoNFTHolder(address)` (import `@/lib/nftGate`),
  2. fallback to `isAllowlisted(address)` if the indexer errors/timeouts,
  3. return `{ eligible, source: 'onchain' | 'allowlist' | 'none', count }`.
- `AccessGate.tsx`: after connect, call `resolveEligibility(address)`; add states
  `checking` (spinner on the Eligibility card) and `degraded` (indexer down → "verified
  via cached allowlist"). Keep existing connected/eligible/not-eligible views.
- Keep the static allowlist as the resilience fallback (already populated, 21 holders).
- UI copy: Eligibility card shows "COSMO NFT holder (on-chain)" / "via allowlist" /
  "Not eligible"; caveat updated to "checked live on-chain, allowlist fallback if the
  index is unavailable".

### Cost / risk of 2a
- The Tradeport key is `NEXT_PUBLIC_*` and gets inlined into the `/access` JS bundle
  (same as `/founder` today). It is a **read-only indexer key**; exposure = potential
  rate-limit abuse, not fund risk. Mitigation: a scoped/rotatable indexer key; or accept
  for v1. THIS is the reason `/access` is currently key-free — 2a knowingly reverses that.
- No signed proof: a user could enter eligibility for an address they hold; but they can
  only paste THEIR connected wallet address (StarKey returns it), so practical spoofing is
  limited to "connect a wallet that holds an NFT" which is the intended check anyway.

### Files (2a)
- ADD `src/app/access/lib/eligibility.ts`
- EDIT `src/app/access/AccessGate.tsx` (call resolver, loading/degraded states)
- EDIT caveat copy
- (allowlist.ts + json stay as fallback)

---

## 5. Phase 2b — server/edge endpoint: hide key + signed-nonce proof

Full brief (signed nonce + server-side signature verify + on-chain check + edge endpoint).
Requires D2=(b).

Endpoint (Next route handler if leaving static export, else standalone service behind
nginx, else Worker):
- `GET /api/access/nonce?address=0x…` → issues a short-lived nonce (in-memory/Redis,
  TTL ~5 min), returns `{ nonce }`.
- `POST /api/access/verify` `{ address, nonce, signature }` →
  1. validate nonce (exists, unexpired, matches address, single-use),
  2. **verify the StarKey signature** over the nonce against the address's Ed25519
     public key (server-side),
  3. run the on-chain ownership check with the indexer key held **server-side** (no
     `NEXT_PUBLIC_`),
  4. return `{ eligible, count }` (optionally a signed short-lived access token / cookie).
- Client: connect → fetch nonce → `provider.signMessage(nonce)` (StarKey) → POST verify →
  render eligibility from the server verdict.

### Research items (2b)
- **StarKey message signing API**: confirm `window.starkey.supra.signMessage` (or
  equivalent) shape + what it returns (signature + public key) for Ed25519 verification.
  Not used anywhere yet.
- **Signature verification lib** server-side (Ed25519; Supra/Aptos auth-key derivation to
  bind pubkey→address).
- **Host choice** (D2b): `next start` on PM2 (drop `output:'export'`, change PM2 from
  `serve out` to `next start`, keep nginx → 3001) is the lowest-friction since the repo is
  already Next; a Worker avoids touching the VPS but splits the codebase.
- Nonce store (in-memory is fine for single instance; Redis if multi).

### Files (2b, indicative)
- ADD `src/app/api/access/nonce/route.ts`, `src/app/api/access/verify/route.ts`
  (if Next server) OR a `services/access-gate/` standalone.
- ADD `src/lib/serverNftGate.ts` (indexer call with server-only env key) + `src/lib/
  verifySupraSignature.ts`.
- EDIT `AccessGate.tsx` (nonce→sign→verify flow).
- EDIT `next.config` (remove `output:'export'`) + PM2 ecosystem (serve→next start) +
  deploy note. ENV: `TRADEPORT_API_KEY` (no NEXT_PUBLIC_) server-side.

---

## 6. On-chain source detail (D1)

- **Indexer (a):** reuse `nftGate.ts`. Pros: wired, fast, handles pagination/owner match
  incl. the EVM-prefix/leading-zero quirks already. Cons: 3rd-party trust + lag + key.
- **Node view (b):** query a Supra full node for token ownership in the collection
  (Move view / resource read). Pros: authoritative, no indexer key. Cons: need the right
  view/endpoint for Supra NFT ownership by address; more dev. Recommend (a) for v1, keep
  (b) as a later hardening.

---

## 7. Security model

- No private keys/seeds/keyfiles client- or server-side. Indexer key: 2a in bundle
  (read-only, rotatable) / 2b server-only.
- Signed nonce (2b) prevents address spoofing; single-use + TTL prevents replay.
- Gate grants UI access only — never trades, Maker access, or writes. Caveat stays.
- No automatic signatures: nonce-sign is an explicit user click.

---

## 8. Test plan

- Holder wallet → eligible (on-chain), non-holder → not eligible.
- Indexer forced-down → 2a falls back to allowlist + "degraded" UI; 2b returns a clear
  error (no false-grant).
- Leading-zero / EVM-prefix addresses resolve correctly (reuse the 8 isAllowlisted cases).
- 2b: tampered signature / expired nonce / reused nonce / address-mismatch all rejected.
- Regression: `/`, `/demo`, `/founder` and the S9 demo story unchanged. tsc + build green.
- Deploy verify: `/access` 200 public; eligibility reflects a live trade after refresh
  (the whole point of Stage 2).

## 9. Rollback

- 2a: revert AccessGate to allowlist-only (Stage 1) — one commit revert; allowlist json
  stays valid.
- 2b: if endpoint/infra unstable, fall back to 2a (client check) or Stage 1.

## 10. Sequencing

1. Rene decides D1/D2/D3.
2. If 2a: implement eligibility resolver + UI states → tsc/build → commit → deploy.
3. If 2b: stand up endpoint + signMessage research → verify flow → infra switch
   (next start) → deploy. Keep 2a/allowlist as fallback throughout.
