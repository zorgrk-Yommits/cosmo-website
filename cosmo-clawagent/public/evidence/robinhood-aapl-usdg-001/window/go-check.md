# M4 GO-Check 2.11.2026, 18:53:46 MESZ (commit 832a3e6) -> READY_WITH_DEVIATIONS

| # | Status | Befund |
|---|---|---|
| G1 | PASS | HEAD 832a3e6 detached true, drift none, tests green on 832a3e6 at 2026-11-02T16:46:34Z |
| G2 | PASS | policy 8a987c19 gates 2d97f3f4 pinned; SDK 0.4.1 7/7 modules == audit; delegate pin 228d291d8b |
| G3 | PASS | chain_id_hash == pin; lock release live true target 14784669; runPreflight ready true, fail [], warn [] |
| G4 | INFO | 13 open RFQs, 0 AAPL candidates, 0 new (none decided this pass); no AAPL/USDG RFQ can exist before the declared own taker 0xa3d79667 posts |
| G5 | INFO | no candidate; at 0.005 AAPL: rate 336770486, lock 1.683853 USDG; venue 0 bps / 3111 ms; DORA 11 s; chainlink 7 bps / 1972 s (ok);  |
| G6 | PASS | funds PASS (F1 S 1683853); USDG available 3 USDG locked 0/0/0; open orders {"rfqs":0,"quotes":0,"lockedOrderAssets":0} |
| G7 | PASS | active delegates (setup done) ["228d291d8b","d4098132bf"] (expected ["228d291d8b","d4098132bf"]); created 20 revoked 18 |
| G8 | DEVIATION | policy PASS: P-ACTIVE ok, P-MASTER ok, P-DELEGATE ok, P-ROLES ok, P-PAIRS ok, P-CAP-USDG ok, P-CAP-USDG-ROOM ok, P-CAP-AAPL ok, P-CAP-ETH ok, P-CAP-SUPRA ok, P-CAP-IUSDC ok, P-CAP-OTHER ok, P-EXPIRY ok //   P-PAIRS: allowed_pairs [] ACCEPTED BY RENE (dApp has no pair field); the pair restriction is carried by the asset caps (only USDG and AAPL and ETH and SUPRA and iUSDC capped) //   P-EXPIRY: expires_at_batch 26639394 (> window target 14792536) ACCEPTED BY RENE (dApp sets creation + 12,000,000 batches); compensating control: revoke + destroy-key after the window // F6 live PASS: active delegates == expected; no open orders (created 20, revoked 18) // funds PASS // SDK preflight ready true, not ok: [] // deviations accepted by flag: pairs_via_caps, venue_expiry (need Rene's GO text) |
| G9 | PASS | fills ledger 0 entries; arm absent |
| G10 | PASS | USDG fully_backed ratio 1.04 age 3191s; own L1 read vault 13000000 >= internal 12500000 |
| EXP | INFO | Delegate expiry for 2.11.2026, 20:15:00 MESZ: batch 14792243 (now 14784735, 1.540 batch/s over 45 s; +-10 % pace -> arrives 2.11.2026, 20:07:36 .. 2.11.2026, 20:24:01) |

Rene traegt in der dApp ein: Rolle Maker, Paar AAPL/USDG, USDG-Cap 2 USDG, AAPL-Cap 0.005, Public Key `1c6cd3588e8e740a149f348ee52c088784c173718b658157bdcec587e610315d`, Ablauf-Batch 14792243.
Vorgaben im GO-Check: Quote-Cutoff 2.11.2026, 20:00:00 MESZ, Auszahlungsziel Master-L1 0x0a0571a915... Aenderung nur per GO-Text.
