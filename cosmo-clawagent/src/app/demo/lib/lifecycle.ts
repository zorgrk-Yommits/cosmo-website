// RFQ lifecycle model — derived from a static Supra-native testnet snapshot.
// PURE data visualisation: no RPC, no wallet, no EVM. The snapshot is the only source.
//
// Source: step-9-events-2026-06-02.json (run 2026-06-02, chain_id 6 = Supra native).
// We do NOT use the 06-01 run (its amount_out is 0 — economically meaningless OUT-side).

import snapshot from '@/data/step-9-events-2026-06-02.json';

// ── Raw snapshot shapes ──────────────────────────────────────────────────────

export interface RawEvent {
  type: string;
  data: Record<string, unknown>;
}

export interface RawStep {
  step: string;
  label: string;
  sender: string;
  tx_hash: string;
  status: string; // "Success" | "skipped" | "off-chain"
  vm_status: string | null;
  block_height: number | null;
  timestamp: string | null; // ISO 8601
  events: RawEvent[];
}

export interface Snapshot {
  run_date: string;
  chain_id: number;
  rpc: string;
  contract_addresses: Record<string, string>;
  amount_in: number;
  amount_out: number;
  request_id: string;
  quote_id: string;
  cap_id: string;
  tier_values: Record<string, unknown>;
  steps: RawStep[];
}

// ── Classified model ─────────────────────────────────────────────────────────

// Three visually distinct kinds, exactly as the snapshot encodes them:
//   on-chain         -> status Success + real tx_hash (the core RFQ loop)
//   off-chain        -> status "off-chain" (the quote-server signature, by design)
//   setup            -> status "skipped" (one-time deploy/mint/init, already live)
export type StepKind = 'onchain' | 'offchain' | 'setup';

export interface LifecycleStep {
  id: string; // the snapshot "step" field, e.g. "12a"
  label: string; // raw move entry label, e.g. "execute_settlement"
  title: string; // human title for the UI
  kind: StepKind;
  sender: string;
  txHash: string | null; // only present for on-chain steps
  vmStatus: string | null;
  blockHeight: number | null;
  timestamp: string | null;
  // Primary event name surfaced on the rail node (CapabilityCreated, ...).
  eventName: string | null;
  events: { name: string; data: Record<string, unknown> }[];
  // The settlement step is the visual climax of the replay.
  isSettlement: boolean;
}

const snap = snapshot as unknown as Snapshot;

// The five entry labels that make up the live RFQ loop. Classification keys
// on the move entry label, NOT on status: a fresh-deploy snapshot runs the
// one-time setup txs with status "Success" too, so status cannot distinguish
// setup from core. Strings are byte-exact from the snapshot "label" fields.
const CORE_LABELS = new Set([
  'create_request',
  'submit_quote',
  'fund_quote',
  'accept_quote',
  'execute_settlement',
]);

// Human-readable titles per move entry label.
const TITLES: Record<string, string> = {
  publish: 'Publish package',
  init_collection: 'Init NFT collection',
  init_guardians: 'Init guardians',
  mint_agent: 'Mint agent NFT',
  set_server_quote_pubkey: 'Set quote-server pubkey',
  init_mock_fa: 'Init test assets',
  set_cosmo_metadata: 'Set $COSMO metadata',
  mint_to_maker: 'Fund maker',
  deposit_operator_bond: 'Deposit operator bond',
  create_capability: 'Create capability',
  create_request: 'Create request',
  sign_quote_offchain: 'Sign quote (off-chain)',
  submit_quote: 'Submit quote',
  fund_quote: 'Fund quote',
  accept_quote: 'Accept quote',
  execute_settlement: 'Execute settlement',
};

function classify(s: RawStep): StepKind {
  if (s.status === 'off-chain') return 'offchain';
  if (CORE_LABELS.has(s.label)) return 'onchain';
  return 'setup';
}

// Short event name from a fully-qualified move type:
// "0x..::rfq_engine::SettlementRecorded" -> "SettlementRecorded"
function shortEventName(type: string): string {
  const parts = type.split('::');
  return parts[parts.length - 1] || type;
}

function toLifecycleStep(s: RawStep): LifecycleStep {
  const events = s.events.map((e) => ({ name: shortEventName(e.type), data: e.data }));
  return {
    id: s.step,
    label: s.label,
    title: TITLES[s.label] ?? s.label,
    kind: classify(s),
    sender: s.sender,
    txHash: s.tx_hash.startsWith('0x') ? s.tx_hash : null,
    vmStatus: s.vm_status,
    blockHeight: s.block_height,
    timestamp: s.timestamp,
    eventName: events.length > 0 ? events[0].name : null,
    events,
    isSettlement: s.label === 'execute_settlement',
  };
}

// Steps already arrive in lifecycle order via the "step" field ("1".."12b").
// We preserve that order verbatim — no client-side reordering needed.
export const ALL_STEPS: LifecycleStep[] = snap.steps.map(toLifecycleStep);

// The default view: everything that is NOT one-time setup, i.e. the core RFQ loop
// (capability -> request -> off-chain sign -> quote -> accept -> settle).
export const CORE_STEPS: LifecycleStep[] = ALL_STEPS.filter((s) => s.kind !== 'setup');

// The collapsed one-time deploy phase, hidden by default.
export const SETUP_STEPS: LifecycleStep[] = ALL_STEPS.filter((s) => s.kind === 'setup');

// ── Economics (Supra native quants — 8 decimals) ────────────────────────────

export const QUANT_DECIMALS = 8;

export interface Economics {
  amountIn: number; // raw quants
  amountOut: number; // raw quants
  minAmountOut: number; // raw quants, the request floor
  spreadBps: number; // basis points, computed client-side
  spreadPct: number; // percent, computed client-side
}

function readMinAmountOut(): number {
  const req = ALL_STEPS.find((s) => s.label === 'create_request');
  const ev = req?.events.find((e) => e.name === 'RequestCreated');
  const raw = ev?.data?.min_amount_out;
  return raw ? Number(raw) : 0;
}

// 30 bps is NOT a stored field — it is derived: (in - out) / in.
// (500_000_000 - 498_500_000) / 500_000_000 = 0.003 = 0.30% = 30 bps.
export const ECONOMICS: Economics = (() => {
  const amountIn = snap.amount_in;
  const amountOut = snap.amount_out;
  const minAmountOut = readMinAmountOut();
  const ratio = amountIn > 0 ? (amountIn - amountOut) / amountIn : 0;
  return {
    amountIn,
    amountOut,
    minAmountOut,
    spreadBps: Math.round(ratio * 10000),
    spreadPct: ratio * 100,
  };
})();

// Format raw quants into a human token amount (8 decimals), trimming trailing zeros.
export function formatQuants(raw: number): string {
  const whole = Math.floor(raw / 10 ** QUANT_DECIMALS);
  const frac = raw % 10 ** QUANT_DECIMALS;
  const fracStr = String(frac).padStart(QUANT_DECIMALS, '0').replace(/0+$/, '');
  const wholeStr = whole.toLocaleString('en-US');
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

// Grouped-digit raw quant string, e.g. 500_000_000 -> "500,000,000".
export function groupQuants(raw: number): string {
  return raw.toLocaleString('en-US');
}

// ── Human-readable token amounts ($COSMO, 6 decimals) ───────────────────────
// The display token is $COSMO with 6 decimals: a raw amount is divided by 10^6.
export const TOKEN_DECIMALS = 6;
const TOKEN_DIVISOR = 1_000_000; // 10^6
export const TOKEN_SYMBOL = '$COSMO';

// Exact raw -> token string. NO float division of the whole value (that yields
// "498.4999..."): split into integer/remainder, pad+trim the fractional part.
// Self-check (must hold exactly):
//   formatToken(500_000_000) === "500"
//   formatToken(498_500_000) === "498.5"
//   formatToken(496_000_000) === "496"
export function formatToken(raw: number): string {
  const frac = raw % TOKEN_DIVISOR; // integer remainder, exact for safe integers
  const whole = (raw - frac) / TOKEN_DIVISOR; // integer quotient, no float floor
  const fracStr = String(frac).padStart(TOKEN_DECIMALS, '0').replace(/0+$/, '');
  const wholeStr = whole.toLocaleString('en-US');
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

// Token amount with the $COSMO symbol, e.g. "498.5 $COSMO".
export function formatTokenWithSymbol(raw: number): string {
  return `${formatToken(raw)} ${TOKEN_SYMBOL}`;
}

// Event-data keys that carry a raw token amount (-> eligible for token annotation
// in the data panel). Deliberately excludes timestamps, ids, counts, addresses.
export const AMOUNT_FIELDS = new Set<string>([
  'amount_in',
  'amount_out',
  'promised_amount_out',
  'min_amount_out',
  'amount',
  'max_amount_per_day',
  'daily_cap',
  'daily_used_after',
  'request_fee_quants',
]);

// ── Snapshot metadata + SupraScan ───────────────────────────────────────────

export const META = {
  runDate: snap.run_date,
  chainId: snap.chain_id, // 6 = Supra native (NOT the EVM chain)
  rpc: snap.rpc,
  network: 'Supra Testnet',
  packageAddr: snap.contract_addresses.package,
  requestId: snap.request_id,
  quoteId: snap.quote_id,
  capId: snap.cap_id,
  // Honest liveness window: the snapshot was captured 02 Jun 2026 and the testnet
  // state remains queryable for ~12 days. We never claim live data.
  capturedLabel: 'snapshot captured 02 Jun 2026',
  livenessLabel: 'Live on Supra Testnet until ~14 Jun 2026',
};

// SupraScan link — ONLY meaningful for steps that carry a real tx_hash.
export function supraScanTxUrl(txHash: string): string {
  return `https://suprascan.io/tx/${txHash}?network=testnet`;
}

// Truncate a 0x hash/address for compact display: 0x1234…cdef
export function truncateHex(hex: string, head = 6, tail = 4): string {
  if (!hex.startsWith('0x') || hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}
