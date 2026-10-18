# M4 GO-Check 17.10.2026, 13:50:35 MESZ (commit 975241d) -> READY_WITH_DEVIATIONS

| # | Status | Befund |
|---|---|---|
| G1 | PASS | HEAD 975241d detached true, drift none, tests green on 975241d at 2026-10-17T11:49:25Z |
| G2 | PASS | policy 09bcaec3 gates 2d97f3f4 pinned; SDK 0.4.1 7/7 modules == audit; delegate pin 7957e54793 |
| G3 | PASS | chain_id_hash == pin; lock release live true target 12553888; runPreflight ready true, fail [], warn [] |
| G4 | PASS | 10 open, 4 iUSDC candidates; case kdm-20261017T1150-11384716-1e323f45 R-261017-113847-16 -> FINAL AUTHORIZED, bundle ACCEPT |
| G5 | PASS | rate 7015971595364342546903 (fair 7051051203108607191032, floor 4664832624109000000000); lock 1403194319073 quants = 14031.94 SUPRA (cap 15000, room 6.5 %); margin 995017 iUSDC units; venue 12 bps / 10883 ms; DORA ages 5/5/5 s; ref 141822824880229 |
| G6 | PASS | funds PASS (F1 S 1403194319073); SUPRA available 131252.38 locked 0/0/0; open orders {"rfqs":0,"quotes":0,"lockedOrderAssets":0} |
| G7 | PASS | active delegates (setup done) ["7957e54793"] (expected ["7957e54793"]); created 16 revoked 15 |
| G8 | DEVIATION | policy PASS: P-ACTIVE ok, P-MASTER ok, P-DELEGATE ok, P-ROLES ok, P-PAIRS ok, P-CAP-SUPRA ok, P-CAP-SUPRA-ROOM ok, P-CAP-IUSDC ok, P-CAP-OTHER ok, P-EXPIRY ok //   P-PAIRS: allowed_pairs [] ACCEPTED BY RENE (dApp has no pair field); the pair restriction is carried by the asset caps (only SUPRA and iUSDC capped) //   P-EXPIRY: expires_at_batch 24385509 (> window target 12563259) ACCEPTED BY RENE (dApp sets creation + 12,000,000 batches); compensating control: revoke + destroy-key after the window // F6 live PASS: active delegates == expected; no open orders (created 16, revoked 15) // funds PASS // SDK preflight ready true, not ok: [] // deviations accepted by flag: pairs_via_caps, venue_expiry (need Rene's GO text) |
| G9 | PASS | fills ledger 0 entries; arm absent |
| G10 | PASS | iUSDC fully_backed ratio 1 age 2990s; own L1 read vault 27073896717 >= internal 27071664717 |
| EXP | INFO | Delegate expiry for 17.10.2026, 15:30:00 MESZ: batch 12563548 (now 12553958, 1.608 batch/s over 45 s; +-10 % pace -> arrives 17.10.2026, 15:20:57 .. 17.10.2026, 15:41:02) |

Rene traegt in der dApp ein: Rolle Maker, Paar iUSDC/SUPRA, SUPRA-Cap 15000/15000, iUSDC-Cap 3/3, Public Key `d15adb158fe7b0de3428b27fc31d1a65026ddedacf6cbbea3b47e05ccd0a81ca`, Ablauf-Batch 12563548.
Vorgaben im GO-Check: Quote-Cutoff 17.10.2026, 15:00:00 MESZ, Auszahlungsziel Master-L1 0x0a0571a915... Aenderung nur per GO-Text.
