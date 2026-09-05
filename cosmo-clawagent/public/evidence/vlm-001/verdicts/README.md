# VLM-001 — Persisted verifier verdicts (2026-08-22)

Closes the evidence gap noted in the proof-surface design review: until now the
ACCEPT x2 verdicts for the two live cases existed only as prose in
`activation-record.md`. This directory holds the machine-readable outputs.

Produced at repo commit `b75517a` (worktree carried unrelated channel-scan
modifications only; nothing under src/, config/, state/ or standalone-verifier/
was modified). All runs are offline verifications of the archived case
directories — zero RPC calls, zero broadcasts, HALT untouched.

## Cases

- OPEN  `state/execution-cases/cases/case_mt4c82oge012a2` (evm.liquidity_mandate.open.v1, settled block 25810671, LP-NFT token_id 59)
- RESET `state/execution-cases/cases/case_mt4d5ua218f203` (evm.liquidity_mandate.approval_reset.v1, settled block 25810738)

## Runs and results

| File | Verifier | Trust source | Verdict | rc |
|---|---|---|---|---|
| open-internal.json | internal (`case:verify`) | `config/execution-case-trust.json` | ACCEPT 10/10 | 0 |
| reset-internal.json | internal (`case:verify`) | `config/execution-case-trust.json` | ACCEPT 10/10 | 0 |
| open-standalone-repo-trust.json | standalone code `cosmo-verify.mjs` 1.3.1 (module `verifyCase`) | repo trust (same file) | ACCEPT 10/10 | 0 |
| reset-standalone-repo-trust.json | standalone code `cosmo-verify.mjs` 1.3.1 (module `verifyCase`) | repo trust (same file) | ACCEPT 10/10 | 0 |
| open-standalone-embedded-1.3.1-profile.json | standalone CLI, EMBEDDED cosmo-trust-v4 profile as published | embedded (predates live pins) | REJECT | 1 |
| reset-standalone-embedded-1.3.1-profile.json | standalone CLI, EMBEDDED cosmo-trust-v4 profile as published | embedded (predates live pins) | REJECT | 1 |

The two REJECTs are EXPECTED and are kept deliberately: they document the known
profile skew (the published 1.3.1 distributable was frozen before the D3
activation, so the live policy pins cannot be in its embedded profile) and they
demonstrate the fail-closed property — the only failing criterion in both runs
is `P policy pinned`; all other criteria pass. The 1.3.2 republish (additive
live pins) is the separate gated act that turns these two runs into ACCEPTs
without touching the cases.

## Commands used

```
npm run -s case:verify -- state/execution-cases/cases/case_mt4c82oge012a2 > verdicts/open-internal.json
npm run -s case:verify -- state/execution-cases/cases/case_mt4d5ua218f203 > verdicts/reset-internal.json
# standalone under repo trust: dynamic import of standalone-verifier/cosmo-verify.mjs,
# verifyCase(caseDir, { trust: JSON of config/execution-case-trust.json })
node standalone-verifier/cosmo-verify.mjs <case-dir>   # embedded-profile runs
```

## 2026-08-28 addendum: CLOSE verdicts + the promised 1.3.2 flip

Produced at repo commit `f9b85d9` after the CLOSE execution
(`case_mtcn68amba4b26`, tx `0x770980c9..d549b`, settled block 25852377) and
after the 1.3.2 republish (website `e348513`). Offline verifications of
archived case dirs; the repo `standalone-verifier/cosmo-verify.mjs` is 1.3.2
and byte-identical to the published distributable (`0xfc513588..e2b5`).

| File | Verifier | Trust source | Verdict | rc |
|---|---|---|---|---|
| close-internal.json | internal (`case:verify`) | `config/execution-case-trust.json` | ACCEPT 10/10 | 0 |
| close-standalone-repo-trust.json | standalone code 1.3.2 (module `verifyCase`) | repo trust | ACCEPT 10/10 | 0 |
| close-standalone-embedded-1.3.2-profile.json | standalone CLI, EMBEDDED cosmo-trust-v4 profile as published | embedded 1.3.2 | ACCEPT 10/10 | 0 |
| open-standalone-embedded-1.3.2-profile.json | standalone CLI, embedded profile | embedded 1.3.2 | ACCEPT 10/10 | 0 |
| reset-standalone-embedded-1.3.2-profile.json | standalone CLI, embedded profile | embedded 1.3.2 | ACCEPT 10/10 | 0 |

The last two rows close the arc documented above: the 1.3.1 REJECT files are
kept unchanged as the historical skew proof; under the published 1.3.2 profile
the same untouched case dirs verify ACCEPT.

```
close-internal.json                            0xb3db5ebc2ca55c109c833b6e350fc44134b51044ff9eac741900d702510cc7ec
close-standalone-repo-trust.json               0x853e8434d0a7cf60a1e7db762e9c7b88459be25e0f366d44f7ea2fc7733e854f
close-standalone-embedded-1.3.2-profile.json   0xb56ec49df61e357ca14c8962c6cb2e179885a9a68eadf0d80b9ccafcba380568
open-standalone-embedded-1.3.2-profile.json    0x371284dab00819bb807efa3f2440bc52fdf08daf596f152e0f5554f959d1a5ca
reset-standalone-embedded-1.3.2-profile.json   0x0ab48b13a67cb8336fc23986e8bdb243caa680680d792db68e834bf104a423a9
```

## sha3-256 of the verdict files

```
open-internal.json                            0x7f26b3d87d77e34a83945527ae8f6b55a25c8d5037ef66d8e4a0de396d8dcddf
open-standalone-embedded-1.3.1-profile.json   0xf0ee1aa2d25beaa73500ad26786428a11366e625f5069de0a3caee0f4f5fc5d6
open-standalone-repo-trust.json               0x7397ba88b70503e32733dd42152dc3286ca8affa586a4f1a43a68475da7192d9
reset-internal.json                           0xc0b1636953ccc5c62bdd73b23171f47527dbfbf23163bbfaf9297dc5ff50ad5c
reset-standalone-embedded-1.3.1-profile.json  0x5408ebb798eee59bd8b858576a6f8ef894e8ca94fce4e5ef40213869a36d3135
reset-standalone-repo-trust.json              0xe17d7ecdcced9e5cdd5535fe66d8aedb7c4d060695f8a784d3587d0139d6cca3
```


## MTP L4 — termination record (2026-09-05, after term expiry 11:11:11Z)

Record `state/execution-cases/records/termination-proof-vlm-001_25a991ae…-1788632093822.json`
(sha3-256 `0x445e7dfb67cd7de1fb7bb78b03c0be53cdee97639a8bace3fc7d429a566bccb9`),
terminal block 25912857 / `0x25de324b…b969e` (timestamp 1788632087 >= expiry
1788606671), terminal nonce 4, start boundary 25809698 (nonce 0, code 0x,
balance 0), sources `rpc:mevblocker` + `rpc:tenderly` (two distinct transports,
every terminal fact re-read on the second one, 0 disagreements), rpc_write_count 0.
P1/P2/P4/P5 externally_verifiable, P3 derived (collect_1 terminal by expiry,
close executed), verdict TERMINATED, weakest_evidence_class `derived` (no
attestation yet — L5 adds the attested_falsifiable retirement claim).

| File | Verifier | Verdict | rc |
|---|---|---|---|
| termination-L4-internal.json | internal (`case:verify-termination`) | ACCEPT, sound, TERMINATED | 0 |
| termination-L4-standalone-embedded-1.3.2-profile.json | standalone `cosmo-verify.mjs --termination` 1.3.2, embedded cosmo-trust-v4 profile (served file sha3 == repo, `fc513588…`) | sound, TERMINATED | 0 |

Produced at repo commit `e1447a6` (cross-source CLI flags + lpWatch nonce watch).
Transport note: drpc answered "Can't route your request" (HTTP 400) on ~40 % of
the approval-scan chunks and on the termination read; publicnode refuses the
start-block state reads (archive, HTTP 403); tenderly rate-limits bursts (429).
The L3 nft-proof (record 1788631827766, CLEAN, block 25912835, scan
25809096-25912835 = 0 logs) ran through a read-only retry proxy (drpc 9 chunks,
tenderly fallback 2 chunks); the L4 read ran through per-endpoint read-only
retry proxies (one port = one upstream identity), zero retries needed.

## MTP L5 — attested termination record (2026-09-05 18:26Z, Rene typed `RETIRE VLM-001 SEED`)

Seed `.keys/vlm-001-execution-seed.hex` shredded (shred -u -z, 3 passes) at
18:26:25Z BEFORE the record was built. Record
`state/execution-cases/records/termination-proof-vlm-001_25a991ae…-1788632787140.json`
(sha3-256 `0xa42dd47633164afdbccfa4872e31431754e25e6e7f7f62fc213e92bf9101656a`),
terminal block 25912914 / `0x2c7303bb…41f39` (timestamp 1788632783), terminal
nonce 4, sources `rpc:mevblocker` + `rpc:tenderly`, rpc_write_count 0, verdict
TERMINATED, **weakest_evidence_class `attested_falsifiable`** — the one attested
claim (attestor `rene`, baseline nonce 4, watch = lpWatch nonce tick, horizon
perpetual, declared reaction = contested annotation). lpWatch re-pointed at this
record (tick 1788632802 clean).

| File | Verifier | Verdict | rc |
|---|---|---|---|
| termination-L5-internal.json | internal (`case:verify-termination`) | ACCEPT, sound, TERMINATED, attested_falsifiable | 0 |
| termination-L5-standalone-embedded-1.3.2-profile.json | standalone `cosmo-verify.mjs --termination` 1.3.2, embedded cosmo-trust-v4 profile | ACCEPT, sound, TERMINATED, attested_falsifiable | 0 |

The L4 record (derived, no attestation) stays as history: it is the record the
kill-condition-4 gate was checked against before the seed was destroyed.
