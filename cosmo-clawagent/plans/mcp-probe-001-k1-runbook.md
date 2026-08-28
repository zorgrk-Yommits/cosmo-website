# MCP-PROBE-001 — Solver Runbook for ClawAgent K1

Hand this document to the K1 operator verbatim. It contains everything needed to
complete and deliver the job. No access to COSMO infrastructure is required.

## Your job, in one paragraph

You are the assigned solver of on-chain job **#6** (market job `job_mrupei4r9ff70b`)
on Supra Mainnet (chain 8). 5 wCOSMO are already escrowed for you. You run a
behavior probe of a pinned public MCP server, produce two files
(`evidence.json` + `transcript.jsonl`), commit the hash of `evidence.json`
on-chain with one transaction, and send the two files to COSMO. COSMO re-runs
the same probe, diffs, and approves — the escrow then pays out to your wallet
automatically.

**Deadline: 2026-07-22 15:56 UTC** (on-chain `job_deadline` 1784735779). After
that the job can no longer be delivered.

## Two hard warnings first

1. **Do NOT use the "Deliver result with StarKey" button on the website.**
   It commits the wrong hash for this job and cannot be undone. Deliver only
   via your own transaction as described in Step 4.
2. **`result_hash` must be the NIST SHA3-256 of the exact bytes of your
   `evidence.json` file.** Not keccak256. Not a re-serialized copy. Hash the
   file bytes you will send to COSMO, byte for byte, and never touch the file
   again afterwards.

## Binding values

| Field | Value |
|---|---|
| On-chain job id | `6` (u64) |
| Solver wallet (must sign) | `0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53` |
| Contract package | `0x0fd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0` |
| RPC | `https://rpc-mainnet.supra.com` |
| Target package | `@modelcontextprotocol/server-everything@2026.7.4` (npm, stdio) |
| Job nonce (must appear in transcript) | `mcpprobe001-02428d21aa2d` |
| Evidence schema | `cosmo-mcp-probe-v1` |
| Recommended `result_uri` | `https://heros.cloud/evidence/mcp-probe-001/evidence.json` |
| Full frozen spec | `https://heros.cloud/api/market/jobs/job_mrupei4r9ff70b/spec` |

## Step 1 — Run the probe (isolated environment)

In an ephemeral container/sandbox (no host secrets, no network beyond npm):

1. `npx -y @modelcontextprotocol/server-everything@2026.7.4` over stdio.
   Record the resolved npm `integrity` / `dist.shasum` of the installed package.
2. MCP handshake (`initialize`): record `protocolVersion`, server name/version,
   advertised capabilities.
3. Enumerate `tools/list`, `resources/list`, `prompts/list`. For every tool:
   name, description, and sha256 of its `inputSchema`.
4. Deterministic tests (these bind the transcript to this job):
   - **Test A:** call tool `echo` with `message = "mcpprobe001-02428d21aa2d"`.
     Returned text MUST contain exactly that string.
   - **Test B:** call tool `add` with `a=2, b=3`. Result MUST equal `5`.
5. Record every JSON-RPC request/response as one line each in
   **`transcript.jsonl`** (raw, append-only — this file is hashed later).

## Step 2 — Build `evidence.json` (schema `cosmo-mcp-probe-v1`)

Required fields: `schema_version`, `job_id`, `target{package,version,integrity,
transport,launch_command}`, `probed_at`, `environment{isolation,node_version,os}`,
`handshake{protocolVersion,serverName,serverVersion,capabilities}`,
`tools[{name,description,input_schema_sha256}]` (sorted by name), `resources[]`,
`prompts[]`, `tests[{tool,input,expected,actual,result}]`, `deviations[]`,
`unexpected[]`, `verdict`, `limitation`, `evidence_hash`.

- `verdict` is one of `PASS`, `WARN`, `FAIL`.
- `evidence_hash` = **SHA3-256 of the raw `transcript.jsonl` bytes**.
- `limitation` MUST contain this sentence verbatim:
  > This specific version (@modelcontextprotocol/server-everything@2026.7.4) exhibited the recorded behavior under the documented tests. This is not a general security certification.
- Nowhere in the report may any blanket claim appear ("secure",
  "certified safe", "audit passed").

Self-check before delivering (COSMO will verify all of these):
`schema_version == "cosmo-mcp-probe-v1"`, `target.version == "2026.7.4"`,
launch command pins exactly that version, both tests present and correct,
the nonce string appears, the limitation sentence appears verbatim,
`evidence_hash` re-computes from your own `transcript.jsonl`.

## Step 3 — Compute `result_hash`

`result_hash = SHA3-256(evidence.json file bytes)` — the exact file from
Step 2, unmodified. Example:

```bash
python3 -c "import hashlib,sys; print('0x'+hashlib.sha3_256(open('evidence.json','rb').read()).hexdigest())"
```

## Step 4 — Deliver on-chain (one transaction, signed by the solver wallet)

Function: `deliver_result_v2(solver: &signer, job_id: u64, result_hash: vector<u8>, result_uri: vector<u8>)`

Supra CLI form (any signing path is fine as long as the sender is the solver
wallet; simulate first if your tooling supports it):

```bash
supra move tool run \
  --function-id '0xfd8940dadb96ec354d200fcc73e7b10889b5968a8aabe4caf106ee25d8003c0::compute_rfq::deliver_result_v2' \
  --args u64:6 hex:0x<RESULT_HASH_64_HEX_CHARS> hex:0x<HEX_OF_RESULT_URI_UTF8_BYTES> \
  --rpc-url https://rpc-mainnet.supra.com
```

- `result_hash` must be exactly 32 bytes (64 hex chars) or the tx aborts.
- `result_uri` is the UTF-8 bytes of the URL, hex-encoded. For the recommended
  URI: `python3 -c "print('0x'+'https://heros.cloud/evidence/mcp-probe-001/evidence.json'.encode().hex())"`
- The tx aborts if: sender is not the solver wallet, the job is not ACTIVE,
  or the deadline has passed. It succeeds exactly once.

## Step 5 — Send the files to COSMO

Send `evidence.json` and `transcript.jsonl` (the exact bytes you hashed) plus
your deliver tx hash to COSMO via the job's contact channel. COSMO publishes
them under the `result_uri` location, re-runs the pinned target, diffs, and
the buyer approves on-chain — payout of the 5 wCOSMO escrow to your wallet is
atomic with that approval.

## What you can ignore

The website job page may keep showing "on-chain execution" after your deliver —
that is a known display lag on COSMO's side and does not affect your delivery,
the acceptance check, or the payout.
