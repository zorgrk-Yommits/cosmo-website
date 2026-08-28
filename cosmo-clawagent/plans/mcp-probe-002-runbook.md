# MCP-PROBE-002 — Runbook fuer die StarKey-Schritte (Rene)

Alles, was ohne Wallet geht, ist erledigt: Job liegt approved als `artifact` auf dem Markt,
die Probe ist gelaufen, die Evidence ist veroeffentlicht und der Hash steht fest. Es fehlen
die vier Schritte, die eine Wallet brauchen.

## Bindende Werte

| Feld | Wert |
|---|---|
| Market-Job | `job_ms2ru3onlg98mo` |
| jobType | `artifact` (Attestations-Route antwortet 409 — der 001-Fehler ist verriegelt) |
| specHash | `0x6fae5efbe2c1627deff589bbffb4308beb2947af8747f5d017dcc239db5c0b32` |
| Job-Nonce | `mcpprobe002-c573b79c425d` |
| Budget | 5 wCOSMO |
| Buyer-Wallet | `0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb` |
| Provider | `prov_mruu19nhii516h` (ClawAgent K1) |
| Solver-Wallet | `0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53` |
| **result_hash** | `0xe6c22ac7add787612e84e672a21975715f5b14785ec63992e7925c5f258b1096` |
| **result_uri** | `https://heros.cloud/evidence/mcp-probe-002/evidence.json` |
| Erwartete On-Chain-Job-ID | **11** (korrigiert 2026-08-28; 9 und 10 sind seit dem 14./15.08. vergeben und stehen beide auf `status 2`) |

Der `result_hash` ist die SHA3-256 der Bytes, die die Live-URL heute ausliefert — nicht der
lokalen Datei. Die Datei wird nicht mehr angefasst.

## Schritt 1 — Offer als K1 (Provider-Seite)

`https://heros.cloud/market/work/?id=job_ms2ru3onlg98mo`, StarKey auf die **K1-Wallet**.
Preis 5 wCOSMO, Lieferfrist 24 h. Terms signieren.

Lehre aus buyer-proof-001: die `deliverySecs` des Offers sind die echte Provider-Deadline,
nicht die 6-Tage-Job-Deadline. Hier unkritisch, weil das Artefakt schon fertig und
veroeffentlicht ist — Schritt 3 ist reines Signieren.

## Schritt 2 — Select + Escrow als Buyer

`https://heros.cloud/market/job/?id=job_ms2ru3onlg98mo`, StarKey auf die **Buyer-Wallet**.
Offer auswaehlen, Escrow signieren, Accept abwarten (Poller synchronisiert selbst).

**Hier laeuft die 5-Punkte-Checkliste mit.** Bitte nur beobachten und notieren, nicht
interpretieren:

1. Bleibt der Wallet-Chip nach dem Signieren passiv (kein Auto-Arm)?
2. Kommt die Eigen-Offer-Warnung, wenn Buyer- und Provider-Wallet dieselbe waeren?
3. Verlangt ein Wechsel der Auswahl ein erneutes Signieren?
4. Ist ein Re-Bind sichtbar, wenn die Wallet im Browser wechselt?
5. Ist der Ablauf ohne Zuruf bedienbar — an welcher Stelle haettest du gefragt?

## Schritt 3 — Registrieren + Liefern als K1

`https://heros.cloud/market/work/?id=job_ms2ru3onlg98mo`, StarKey auf die **K1-Wallet**.
Zwei Schritte in dieser Reihenfolge:

1. **Registrieren**: `result_hash` und `result_uri` aus der Tabelle oben eintragen und
   signieren. Die Route prueft die Signatur gegen den On-Chain-Solver und nimmt sie nur an,
   solange der Job ACTIVE ist.
2. **Liefern**: erst danach erscheint das Deliver-Template — mit exakt dem registrierten
   Hash. Der Hash muss zur Bestaetigung abgetippt werden.

Das ist genau der Pfad, den MCP-PROBE-001 nicht hatte. Der Deliver-Button der alten
Attestations-Logik existiert fuer diesen Job nicht mehr.

## Schritt 4 — Abnahme und Approve

Vor dem Approve fahre ich die Probe im Container erneut und diffe gegen die gelieferte
`evidence.json`. Zwei Testlaeufe waren bereits byte-identisch (nur `probed_at` unterscheidet
sich), das Risiko ist also klein.

Danach Buyer-Approve mit StarKey. **Deliver heisst nicht bezahlt** — das Kriterium ist
`get_job_v2(11).status == 2`, nicht ein Label in der Oberflaeche (der Fehleindruck aus
buyer-proof-001).

**Vor dem Approve die ID verifizieren, nicht abschreiben.** Die urspruenglich notierte 9
gehoert inzwischen zu einem anderen, laengst gesettelten Job — das alte Kriterium haette
sofort gruen gemeldet, ohne dass mcp-probe-002 gelaufen waere. Richtige ID ist die, die
`accept_confirmed` im Market-Audit als `jobIdOnchain` meldet; zur Gegenprobe muss sie vor
dem Accept noch aborten:

```
curl -s -X POST https://rpc-mainnet.supra.com/rpc/v1/view \
  -H 'Content-Type: application/json' \
  -d '{"function":"0x0fd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0::compute_rfq::get_job_v2","type_arguments":[],"arguments":["11"]}'
```

## Abbruchbedingungen

- Hash der Live-URL weicht vom registrierten Hash ab: kein Approve, Job auslaufen lassen.
- Re-run-Diff zeigt Abweichungen ausserhalb der Zeitfelder: kein Approve.
- Die Registrierung antwortet 409 (Status nicht mehr ACTIVE): abbrechen, nicht umgehen.

## Was dieser Lauf NICHT zeigt

Provider ist K1, also ein eigener Agent, und die Probe hat COSMO-Tooling gebaut. Das steht
wortwoertlich in `environment.isolation` der Evidence. Bewiesen wird die Hash-Bindung
zwischen veroeffentlichter Datei und Kette — nicht Unabhaengigkeit und erst recht keine
Sicherheitsaussage ueber den geprueften Server.
