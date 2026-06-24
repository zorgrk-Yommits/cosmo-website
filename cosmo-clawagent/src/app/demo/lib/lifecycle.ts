// RFQ lifecycle model — derived from a static Supra MAINNET round-trip capture.
// PURE data visualisation: no RPC, no wallet, no EVM. The capture is the only source.
//
// Source: d14-s9-roundtrip-2026-06-24.json (run 2026-06-24, chain_id 8 = Supra
// Mainnet, request_id 2, quote_id 1). D-14 Stage B proof: the Maker leg is signed by
// K1 (the bonded Maker-Operator, != founder), pair tINTEST -> wCOSMO. Produced by
// quote-server/src/roundtrip/capture.ts (buildCapture). These tx hashes are
// PERSISTENT Mainnet hashes -> rendered as live SupraScan links.
//
// The capture is "lean" (5 on-chain legs + structured per-leg fields). This module
// adapts it into the established Snapshot/RawStep shape so every consumer
// (RfqReplay, LifecycleRail, DeployDrawer, SettlementStage, DataPanel) is unchanged.

import capture from '@/data/d14-s9-roundtrip-2026-06-24.json';

// ── Enriched capture shapes (source) ─────────────────────────────────────────

interface CaptureToken { address: string; symbol: string; decimals: number; name: string }
interface CaptureFlow { from: string; to: string; amount: string; token: string }
interface CaptureLeg {
  name: string;
  hash: string;
  block: number;
  ts: number; // unix seconds
  from: string | null;
  status: string;
  request_id: string | null;
  quote_id: string | null;
  amount_in: string | null;
  amount_out: string | null;
  min_amount_out: string | null;
  token_in: string | null;
  token_out: string | null;
  flows: CaptureFlow[];
}
interface Capture {
  run_ts: string;
  chain_id: number;
  rpc_url: string;
  explorer_tx_base: string;
  reqId: string;
  quoteId: string;
  maker: string;
  taker: string;
  agent_nft: string;
  quote_pubkey: string;
  quote_pubkey_is_dev: boolean;
  pair: { token_in: CaptureToken; token_out: CaptureToken };
  legs: CaptureLeg[];
  hashes: Record<string, string>;
}

// ── Raw snapshot shapes (target — consumers read these) ──────────────────────

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
  total_charge_gas_units?: number;
  escrow_after_settle?: { token_in: number; token_out: number };
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
  ephemeral?: boolean;
  ephemeral_reason?: string;
  steps: RawStep[];
}

// ── Capture -> Snapshot adapter ──────────────────────────────────────────────

const cap = capture as unknown as Capture;

// Fully-qualified event type so shortEventName() yields the bare domain name.
const evType = (name: string): string => `${cap.maker}::rfq_engine::${name}`;
const isoFromUnix = (sec: number): string => new Date(sec * 1000).toISOString();

// The domain event each leg surfaces, with the amount fields DataPanel annotates.
// Synthesized from the leg's structured fields (the lean capture carries no raw
// events array). Field names match AMOUNT_FIELDS / amountSymbol exactly.
function legEvent(leg: CaptureLeg): RawEvent {
  const d: Record<string, unknown> = { request_id: leg.request_id };
  switch (leg.name) {
    case 'create_request':
      return { type: evType('RequestCreated'), data: {
        ...d, amount_in: leg.amount_in, min_amount_out: leg.min_amount_out,
        token_in: leg.token_in, token_out: leg.token_out } };
    case 'submit_quote':
      return { type: evType('QuoteSubmitted'), data: {
        ...d, promised_amount_out: leg.amount_out } };
    case 'fund_quote':
      return { type: evType('QuoteFunded'), data: {
        ...d, promised_amount_out: leg.amount_out, token_out: leg.token_out,
        escrow: leg.flows[0]?.to ?? null } };
    case 'accept_quote':
      return { type: evType('QuoteAccepted'), data: {
        ...d, quote_id: leg.quote_id, amount_in: leg.amount_in,
        promised_amount_out: leg.amount_out, token_in: leg.token_in, token_out: leg.token_out } };
    case 'execute_settlement':
      return { type: evType('SettlementExecuted'), data: {
        ...d, quote_id: leg.quote_id, amount_in: leg.amount_in, amount_out: leg.amount_out,
        token_in: leg.token_in, token_out: leg.token_out } };
    default:
      return { type: evType('Event'), data: d };
  }
}

function adaptCaptureToSnapshot(c: Capture): Snapshot {
  const settle = c.legs.find((l) => l.name === 'execute_settlement');
  const create = c.legs.find((l) => l.name === 'create_request');

  // One RawStep per on-chain leg, plus a synthesized OFF-CHAIN sign step inserted
  // between create_request and submit_quote (the quote is signed off-chain by design;
  // the capture has no tx for it, but the rail expects the node).
  const steps: RawStep[] = [];
  for (const leg of c.legs) {
    steps.push({
      step: leg.name,
      label: leg.name,
      sender: leg.from ?? '',
      tx_hash: leg.hash,
      status: 'Success',
      vm_status: 'Executed successfully',
      block_height: leg.block,
      timestamp: isoFromUnix(leg.ts),
      events: [legEvent(leg)],
      ...(leg.name === 'execute_settlement'
        // escrow is fully drained to both sides on settle (provable from the
        // settlement flows) -> capture-asserted "empty". gas not captured -> omitted.
        ? { escrow_after_settle: { token_in: 0, token_out: 0 } }
        : {}),
    });
    if (leg.name === 'create_request') {
      steps.push({
        step: 'sign_quote_offchain',
        label: 'sign_quote_offchain',
        sender: c.maker,
        tx_hash: 'off-chain',
        status: 'off-chain',
        vm_status: null,
        block_height: null,
        timestamp: isoFromUnix(leg.ts),
        events: [], // no synthetic event -> StepNode shows the "off-chain by design" fallback
      });
    }
  }

  // Short display ids (1..N) for the rail nodes; `label` stays the logic key
  // (classify/title/isSettlement all key on label, never on step id).
  steps.forEach((s, i) => { s.step = String(i + 1); });

  return {
    run_date: c.run_ts.slice(0, 10),
    chain_id: c.chain_id,
    rpc: c.rpc_url,
    contract_addresses: {
      package: c.maker,
      token_in_fa: c.pair.token_in.address,
      token_out_fa: c.pair.token_out.address,
    },
    amount_in: Number(settle?.amount_in ?? 0),
    amount_out: Number(settle?.amount_out ?? 0),
    request_id: c.reqId,
    quote_id: c.quoteId,
    cap_id: '1', // S8-renewed taker capability used in this round-trip
    tier_values: {},
    ephemeral: false, // persistent Mainnet hashes -> live explorer links
    steps,
  };
}

// ── Classified model ─────────────────────────────────────────────────────────

export type StepKind = 'onchain' | 'offchain' | 'setup';

export interface LifecycleStep {
  id: string;
  label: string;
  title: string;
  kind: StepKind;
  sender: string;
  txHash: string | null;
  vmStatus: string | null;
  blockHeight: number | null;
  timestamp: string | null;
  eventName: string | null;
  events: { name: string; data: Record<string, unknown> }[];
  isSettlement: boolean;
}

const snap: Snapshot = adaptCaptureToSnapshot(cap);

// The five entry labels that make up the live RFQ loop.
const CORE_LABELS = new Set([
  'create_request',
  'submit_quote',
  'fund_quote',
  'accept_quote',
  'execute_settlement',
]);

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

export const ALL_STEPS: LifecycleStep[] = snap.steps.map(toLifecycleStep);
export const CORE_STEPS: LifecycleStep[] = ALL_STEPS.filter((s) => s.kind !== 'setup');
export const SETUP_STEPS: LifecycleStep[] = ALL_STEPS.filter((s) => s.kind === 'setup');

// ── Economics ────────────────────────────────────────────────────────────────

export const QUANT_DECIMALS = 8;

export interface Economics {
  amountIn: number;
  amountOut: number;
  minAmountOut: number;
  spreadBps: number;
  spreadPct: number;
  settlementGas: number | null;
  escrowAfterSettle: { tokenIn: number; tokenOut: number } | null;
  settlementEventName: string;
}

function readMinAmountOut(): number {
  const req = ALL_STEPS.find((s) => s.label === 'create_request');
  const ev = req?.events.find((e) => e.name === 'RequestCreated');
  const raw = ev?.data?.min_amount_out;
  return raw ? Number(raw) : 0;
}

function readSettlementGuarantees(): {
  settlementGas: number | null;
  escrowAfterSettle: { tokenIn: number; tokenOut: number } | null;
  settlementEventName: string;
} {
  const s = snap.steps.find((st) => st.label === 'execute_settlement');
  const settlementGas = typeof s?.total_charge_gas_units === 'number' ? s.total_charge_gas_units : null;
  const escrowAfterSettle = s?.escrow_after_settle
    ? { tokenIn: s.escrow_after_settle.token_in, tokenOut: s.escrow_after_settle.token_out }
    : null;
  const settleEvt = s?.events.find((e) => /::Settlement(Executed|Recorded)$/.test(e.type));
  const settlementEventName = settleEvt ? shortEventName(settleEvt.type) : 'SettlementExecuted';
  return { settlementGas, escrowAfterSettle, settlementEventName };
}

export const ECONOMICS: Economics = (() => {
  const amountIn = snap.amount_in;
  const amountOut = snap.amount_out;
  const minAmountOut = readMinAmountOut();
  const ratio = amountIn > 0 ? (amountIn - amountOut) / amountIn : 0;
  const { settlementGas, escrowAfterSettle, settlementEventName } = readSettlementGuarantees();
  return {
    amountIn,
    amountOut,
    minAmountOut,
    spreadBps: Math.round(ratio * 10000),
    spreadPct: ratio * 100,
    settlementGas,
    escrowAfterSettle,
    settlementEventName,
  };
})();

export function formatQuants(raw: number): string {
  const whole = Math.floor(raw / 10 ** QUANT_DECIMALS);
  const frac = raw % 10 ** QUANT_DECIMALS;
  const fracStr = String(frac).padStart(QUANT_DECIMALS, '0').replace(/0+$/, '');
  const wholeStr = whole.toLocaleString('en-US');
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

export function groupQuants(raw: number): string {
  return raw.toLocaleString('en-US');
}

// ── Human-readable token amounts ─────────────────────────────────────────────
// Decimals + symbols come straight from the capture's on-chain token metadata
// (pair.token_in/out), so a future capture with different assets renders correctly
// with no code change. tINTEST and wCOSMO are both 6-decimal here.
export const TOKEN_DECIMALS = cap.pair.token_out.decimals;
const TOKEN_DIVISOR = 10 ** TOKEN_DECIMALS;

// The settled pair is token_in -> token_out: two DISTINCT fungible assets
// (rfq_engine enforces token_in != token_out). Symbols are the capture's on-chain
// metadata. BOND_SYMBOL is retained for the data-panel annotation API; this capture
// carries no bond event, so it is unused here.
export const TOKEN_IN_SYMBOL = cap.pair.token_in.symbol; // taker spends
export const TOKEN_OUT_SYMBOL = cap.pair.token_out.symbol; // taker receives
export const BOND_SYMBOL = '$COSMO';

export const TOKEN_IN_ADDR = snap.contract_addresses.token_in_fa ?? '';
export const TOKEN_OUT_ADDR = snap.contract_addresses.token_out_fa ?? '';

export function formatToken(raw: number): string {
  const frac = raw % TOKEN_DIVISOR;
  const whole = (raw - frac) / TOKEN_DIVISOR;
  const fracStr = String(frac).padStart(TOKEN_DECIMALS, '0').replace(/0+$/, '');
  const wholeStr = whole.toLocaleString('en-US');
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

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

const TOKEN_IN_AMOUNT_FIELDS = new Set<string>([
  'amount_in',
  'max_amount_per_day',
  'daily_cap',
  'daily_used_after',
]);
const TOKEN_OUT_AMOUNT_FIELDS = new Set<string>([
  'amount_out',
  'promised_amount_out',
  'min_amount_out',
]);

export function amountSymbol(eventName: string, field: string): string | null {
  if (field === 'request_fee_quants') return null; // SUPRA quants, not a swap leg
  if (field === 'amount') return eventName === 'BondDeposited' ? BOND_SYMBOL : TOKEN_IN_SYMBOL;
  if (TOKEN_OUT_AMOUNT_FIELDS.has(field)) return TOKEN_OUT_SYMBOL;
  if (TOKEN_IN_AMOUNT_FIELDS.has(field)) return TOKEN_IN_SYMBOL;
  return null;
}

// ── Capture metadata + SupraScan ─────────────────────────────────────────────

function formatRunDate(iso: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, m, d] = iso.split('-');
  const mon = months[Number(m) - 1] ?? m;
  return `${d} ${mon} ${y}`;
}

export const META = {
  runDate: snap.run_date,
  chainId: snap.chain_id, // 8 = Supra Mainnet
  rpc: snap.rpc,
  network: 'Supra Mainnet',
  packageAddr: snap.contract_addresses.package,
  requestId: snap.request_id,
  quoteId: snap.quote_id,
  capId: snap.cap_id,
  // Persistent Mainnet hashes -> live explorer links (not an ephemeral testnet run).
  ephemeral: snap.ephemeral ?? false,
  ephemeralReason: snap.ephemeral_reason ?? null,
  capturedLabel: `captured ${formatRunDate(snap.run_date)}`,
  livenessLabel: (snap.ephemeral ?? false)
    ? 'captured snapshot — not a live deployment'
    : 'Live on Supra Mainnet',
};

// SupraScan link — base + path confirmed in the Phase-D re-audit (/tx/<hash>, the
// Tx Details route). Only meaningful for steps that carry a real tx_hash.
const EXPLORER_TX_BASE = cap.explorer_tx_base; // https://suprascan.io/tx/
export function supraScanTxUrl(txHash: string): string {
  return `${EXPLORER_TX_BASE}${txHash}?network=mainnet`;
}

export function truncateHex(hex: string, head = 6, tail = 4): string {
  if (!hex.startsWith('0x') || hex.length <= head + tail + 2) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}
