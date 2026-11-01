# M4 GO-Check 1.11.2026, 13:51:00 MESZ (commit 8ec635d) -> READY_WITH_DEVIATIONS

| # | Status | Befund |
|---|---|---|
| G1 | PASS | HEAD 8ec635d detached true, drift none, tests green on 8ec635d at 2026-11-01T12:01:08Z |
| G2 | PASS | policy 0bfe3446 gates 2d97f3f4 pinned; SDK 0.4.1 7/7 modules == audit; delegate pin d4098132bf |
| G3 | PASS | chain_id_hash == pin; lock release live true target 14618510; runPreflight ready true, fail [], warn [] |
| G4 | INFO | 13 open RFQs, 0 USDG candidates, 0 new (none decided this pass); no USDG/SUPRA RFQ can exist before the declared own taker 0xa3d79667 posts |
| G5 | INFO | no candidate; at 1.5 USDG: rate 909444452596243453045639, lock 13641.67 SUPRA; venue 8 bps / 10863 ms; DORA 6/6/6 s;  |
| G6 | PASS | funds PASS (F1 S 1364166678895); SUPRA available 36419.44 locked 0/0/0; open orders {"rfqs":0,"quotes":0,"lockedOrderAssets":0} |
| G7 | PASS | active delegates (setup done) ["d4098132bf"] (expected ["d4098132bf"]); created 17 revoked 16 |
| G8 | DEVIATION | policy PASS: P-ACTIVE ok, P-MASTER ok, P-DELEGATE ok, P-ROLES ok, P-PAIRS ok, P-CAP-SUPRA ok, P-CAP-SUPRA-ROOM ok, P-CAP-IUSDC ok, P-CAP-USDG ok, P-CAP-OTHER ok, P-EXPIRY ok //   P-PAIRS: allowed_pairs [] ACCEPTED BY RENE (dApp has no pair field); the pair restriction is carried by the asset caps (only SUPRA and iUSDC and USDG capped) //   P-EXPIRY: expires_at_batch 26047362 (> window target 14629170) ACCEPTED BY RENE (dApp sets creation + 12,000,000 batches); compensating control: revoke + destroy-key after the window // F6 live PASS: active delegates == expected; no open orders (created 17, revoked 16) // funds PASS // SDK preflight ready true, not ok: [] // deviations accepted by flag: pairs_via_caps, venue_expiry (need Rene's GO text) |
| G9 | PASS | fills ledger 0 entries; arm absent |
| G10 | PASS | USDG fully_backed ratio 1.04 age 3025s; own L1 read vault 13000000 >= internal 12500000 |
| EXP | INFO | Delegate expiry for 1.11.2026, 15:45:00 MESZ: batch 14629267 (now 14618578, 1.563 batch/s over 45 s; +-10 % pace -> arrives 1.11.2026, 15:34:38 .. 1.11.2026, 15:57:40) |

Rene traegt in der dApp ein: Rolle Maker, Paar iUSDC/SUPRA, SUPRA-Cap 20000.00/20000.00, iUSDC-Cap 0.015/0.015, Public Key `1f44fe853cdd46f4e262b6d6fccbfb9514050c67ee289cbf883225fdddff2803`, Ablauf-Batch 14629267.
Vorgaben im GO-Check: Quote-Cutoff 1.11.2026, 15:30:00 MESZ, Auszahlungsziel Master-L1 0x0a0571a915... Aenderung nur per GO-Text.
