// Verifier core for a COSMO mandate vault (v0.3: with bond and settlement). One file, no imports, no key.
// It runs unchanged in Node and in a browser. Inputs: the mandate file, the
// deployment facts (publish transaction, module hashes), the public chain.
// Optional: the agent ledger. It imports no agent code.
//
//   const r = await verifyVault({ rpc, mandate, deployment, ledgerText })
//   r.verdict = 'ACCEPT' | 'REJECT', r.checks = [{ id, text, ok, detail }], r.data = replayed facts

const canonical = (v) => (v === null || typeof v !== 'object') ? JSON.stringify(v)
  : Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']'
    : '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
const without = (o, f) => { const c = { ...o }; delete c[f]; return c; };
const hexToBytes = (h) => { const s = h.replace(/^0x/, ''); const a = new Uint8Array(s.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; };
async function sha256hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const d = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const na = (a) => { try { return BigInt(a).toString(16); } catch { return String(a); } }; // address without 0x and leading zeros
const h0 = (h) => String(h).replace(/^0x/, '');
const B = (x) => BigInt(x);
const DAY = 86400n;

export const LIMIT_KEYS = ['valid_from_s', 'valid_until_s', 'max_notional_per_action', 'max_daily_turnover', 'max_slippage_bps', 'max_oracle_age_s', 'min_base_weight_bps', 'max_base_weight_bps', 'nav_floor', 'min_action_interval_s', 'min_edge_bps', 'max_quote_ttl_s', 'bond_required', 'cover_bps', 'fee_share_bps'];
const AGENT_FNS = ['agent_post_quote', 'agent_cancel_quote', 'agent_swap', 'agent_attest', 'trip_halt'];
const EVENT_KINDS = ['VaultCreated', 'Deposited', 'Withdrawn', 'MandateSet', 'MandateRevoked', 'PausedSet', 'HaltSet', 'QuotePosted', 'QuoteCancelled', 'FillExecuted', 'ActionExecuted', 'DecisionAttested', 'BondPosted', 'Settled'];

export async function verifyVault({ rpc, mandate, deployment, ledgerText = null, fetchImpl = globalThis.fetch.bind(globalThis), onProgress = () => {} }) {
  const checks = [];
  const check = (id, text, ok, detail = '') => { checks.push({ id, text, ok: !!ok, detail: String(detail) }); };
  const get = async (p) => { const r = await fetchImpl(rpc + p); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r; };
  const view = async (fn, args) => {
    const r = await fetchImpl(rpc + '/rpc/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: fn, type_arguments: [], arguments: args }) });
    const j = await r.json();
    if (!r.ok || j.result === undefined) throw new Error(`view ${fn}: ${JSON.stringify(j).slice(0, 200)}`);
    return j.result;
  };

  const PKG = mandate.network.package;
  const VAULT = mandate.network.vault;
  const L = mandate.limits;
  const BD = B(mandate.assets.base.decimals), QD = B(mandate.assets.quote.decimals);
  const quoteForBase = (b, p, pd) => (B(b) * B(p) * 10n ** QD) / (10n ** BD * 10n ** B(pd));
  const baseForQuote = (q, p, pd) => (B(q) * 10n ** BD * 10n ** B(pd)) / (B(p) * 10n ** QD);
  const weight = (b, q, p, pd) => { const bv = quoteForBase(b, p, pd); const nav = bv + B(q); return { nav, w: nav === 0n ? 0n : (bv * 10000n) / nav }; };
  const dist = (w, lo, hi) => (w < lo ? lo - w : w > hi ? w - hi : 0n);
  const T = (name) => `${PKG}::mandate_vault::${name}`;

  async function allTxs(addr) {
    const seen = new Map();
    let start = null;
    for (let page = 0; page < 2000; page++) {
      const j = await (await get(`/rpc/v1/accounts/${addr}/transactions?count=100${start !== null ? `&start=${start}` : ''}`)).json();
      const rec = j.record || [];
      let fresh = 0;
      for (const t of rec) if (!seen.has(t.hash)) { seen.set(t.hash, t); fresh++; }
      if (rec.length < 100 || fresh === 0) break;
      start = Math.min(...rec.map((t) => t.header.sequence_number));
    }
    return [...seen.values()].sort((a, b) => a.header.sequence_number - b.header.sequence_number);
  }
  async function eventsOf(kind) {
    const out = [];
    let cursor = null;
    for (let page = 0; page < 2000; page++) {
      const r = await get(`/rpc/v3/events/${T(kind)}${cursor ? `?start=${cursor}` : ''}`);
      const rows = (await r.json()).data ?? [];
      for (const e of rows) if (na(e.event.data.vault) === na(VAULT)) out.push({ kind, data: e.event.data, tx: e.transaction_hash, height: Number(e.block_height) });
      const next = r.headers.get('x-supra-cursor');
      if (!rows.length || !next || next === cursor) break;
      cursor = next;
    }
    return out;
  }

  // ---- C: code identity. The chain API serves no bytecode, so the code is taken from the
  // publish transaction itself, and the package registry must show no later upgrade.
  onProgress('code');
  if (deployment?.publish_tx) {
    const t = await (await get(`/rpc/v1/transactions/${deployment.publish_tx}`)).json();
    const pm = t.payload?.Move ?? {};
    check('C0', 'publish transaction succeeded, was sent by the package address and is a package publish', t.status === 'Success' && na(t.header.sender.Move) === na(PKG) && pm.function === '0x1::code::publish_package_txn', deployment.publish_tx);
    const onchain = new Set();
    for (const h of pm.arguments?.[1] ?? []) onchain.add(await sha256hex(hexToBytes(h)));
    for (const [name, hash] of Object.entries(deployment.module_sha256 ?? {})) check(`C.${name}`, `published bytecode of ${name} equals the build of the published source`, onchain.has(hash), hash.slice(0, 16));
    const expected = new Set(Object.values(deployment.module_sha256 ?? {}));
    check('C8', 'the published modules and the listed modules are the same set, one hash each', expected.size === Object.keys(deployment.module_sha256 ?? {}).length && expected.size === onchain.size && [...onchain].every((h) => expected.has(h)), `${onchain.size} on-chain, ${expected.size} listed`);
    const reg = await (await get(`/rpc/v1/accounts/${PKG}/resources/0x1::code::PackageRegistry`)).text();
    const ups = [...reg.matchAll(/"upgrade_number":\s*"?(\d+)/g)].map((m) => m[1]);
    check('C9', 'package was never upgraded after that publish', ups.length === 1 && ups[0] === '0', `upgrade_number ${ups.join(',')}`);
  } else check('C0', 'deployment facts (publish transaction, module hashes) were supplied', false, 'missing');

  // ---- M: mandate file and on-chain mandate
  check('M1', 'mandate file hash is self-consistent', (await sha256hex(canonical(without(mandate, 'mandate_sha256')))) === mandate.mandate_sha256, mandate.mandate_sha256);

  onProgress('transactions');
  const [ownerTxs, agentTxs, backerTxs] = await Promise.all([allTxs(mandate.issuer.address), allTxs(mandate.executor.address), allTxs(mandate.backer.address)]);
  const senderOf = new Map();
  for (const t of ownerTxs) senderOf.set(t.hash, 'owner');
  for (const t of agentTxs) senderOf.set(t.hash, 'agent');
  for (const t of backerTxs) senderOf.set(t.hash, 'backer');

  onProgress('events');
  const timeline = (await Promise.all(EVENT_KINDS.map(eventsOf))).flat();
  const rank = { VaultCreated: 0, MandateSet: 1, Deposited: 1, Withdrawn: 1, MandateRevoked: 1, PausedSet: 1, HaltSet: 1, BondPosted: 1, Settled: 4, QuotePosted: 2, QuoteCancelled: 2, DecisionAttested: 2, ActionExecuted: 3, FillExecuted: 3 };
  timeline.sort((a, b) => a.height - b.height || rank[a.kind] - rank[b.kind] || Number(B(a.data.action_seq ?? a.data.quote?.quote_seq ?? a.data.quote_seq ?? 0) - B(b.data.action_seq ?? b.data.quote?.quote_seq ?? b.data.quote_seq ?? 0)));

  const sets = timeline.filter((e) => e.kind === 'MandateSet');
  const cm = sets.length ? sets[sets.length - 1].data.mandate : null;
  check('M2', 'exactly one mandate was set on-chain, by the capital owner', sets.length === 1 && senderOf.get(sets[0].tx) === 'owner', sets.length ? sets[sets.length - 1].tx : 'none');
  if (cm) {
    check('M3', 'on-chain mandate hash equals the mandate file hash', h0(cm.mandate_hash) === mandate.mandate_sha256, cm.mandate_hash);
    check('M4', 'on-chain agent equals the executor in the file', na(cm.agent) === na(mandate.executor.address), cm.agent);
    const diff = LIMIT_KEYS.filter((k) => String(cm[k]) !== String(L[k]));
    check('M5', `all ${LIMIT_KEYS.length} on-chain limits equal the limits in the file`, diff.length === 0, diff.length ? 'differs: ' + diff.join(',') : LIMIT_KEYS.length + ' fields equal');
  }

  // ---- replay of every quote and every capital movement
  onProgress('replay');
  let bal = { base: 0n, quote: 0n };
  let win = { start: 0n, used: 0n };
  let prevSwap = null;
  let seqExpected = 1n, quoteSeqExpected = 1n;
  let live = null; // replayed standing quote
  let prevLive = null; // the quote that was replaced, kept for fills of the same block
  const quotes = new Map();
  const badQ = [], badF = [], badA = [], badO = [], badB = [], badS = [];
  let bond = null, settled = null, revoked = false; // v0.3: the bond behind the agent and the one settlement
  const fills = [], swaps = [], flows = [];
  const minEdge = B(L.min_edge_bps);
  let edgeIncome = 0n, swapCost = 0n, turnover = 0n;
  const band = (wb, wa) => { const db = dist(wb, B(L.min_base_weight_bps), B(L.max_base_weight_bps)), da = dist(wa, B(L.min_base_weight_bps), B(L.max_base_weight_bps)); return da === 0n || da < db; };

  for (const e of timeline) {
    const d = e.data;
    if (e.kind === 'Deposited' || e.kind === 'Withdrawn') {
      const amt = B(d.amount), dep = e.kind === 'Deposited';
      const nb = { base: bal.base + (d.is_base ? (dep ? amt : -amt) : 0n), quote: bal.quote + (!d.is_base ? (dep ? amt : -amt) : 0n) };
      if (nb.base !== B(d.base_after) || nb.quote !== B(d.quote_after)) badO.push(`${e.kind} ${e.tx.slice(0, 12)}: balances do not continue`);
      if (senderOf.get(e.tx) !== 'owner') badO.push(`${e.kind} ${e.tx.slice(0, 12)}: not sent by the capital owner`);
      bal = nb;
      if (bond && !settled) { if (dep) { if (d.is_base) bond.inB += amt; else bond.inQ += amt; } else if (d.is_base) bond.outB += amt; else bond.outQ += amt; }
      flows.push({ kind: e.kind, is_base: d.is_base, amount: d.amount, tx: e.tx, height: e.height });
      continue;
    }
    if (e.kind === 'BondPosted') {
      const b = d.bond, f = (why) => badB.push(`bond: ${why}`);
      if (bond) f('a second bond was posted');
      if (senderOf.get(e.tx) !== 'backer' || na(b.backer) !== na(mandate.backer.address)) f('not posted by the backer named in the mandate file');
      if (h0(d.mandate_hash) !== mandate.mandate_sha256) f('posted for another mandate hash');
      if (B(b.amount) !== B(L.bond_required)) f('amount differs from the bond the mandate requires');
      if (B(b.ref_base_in) !== bal.base || B(b.ref_quote_in) !== bal.quote || B(b.ref_base_out) !== 0n || B(b.ref_quote_out) !== 0n) f('reference amounts are not the vault balances at that moment');
      if (quotes.size || fills.length || swaps.length) f('the agent acted before the bond was posted');
      bond = { backer: b.backer, amount: B(b.amount), inB: bal.base, inQ: bal.quote, outB: 0n, outQ: 0n, posted_s: Number(b.posted_s), tx: e.tx };
      continue;
    }
    if (e.kind === 'Settled') {
      const f = (why) => badS.push(`settlement: ${why}`);
      const p = B(d.oracle_price), pd = d.oracle_decimals;
      if (!bond || settled) { f(settled ? 'a second settlement' : 'no bond was posted'); continue; }
      const vNow = quoteForBase(bal.base + bond.outB, p, pd) + bal.quote + bond.outQ;
      const vRef = quoteForBase(bond.inB, p, pd) + bond.inQ;
      const fee = vNow > vRef ? ((vNow - vRef) * B(L.fee_share_bps)) / 10000n : 0n;
      const feeQ = fee > bal.quote ? bal.quote : fee;
      const fb = baseForQuote(fee - feeQ, p, pd), feeB = fb > bal.base ? bal.base : fb;
      let toOwner = 0n;
      if (vNow < vRef) { const loss = vRef - vNow, covered = (vRef * B(L.cover_bps)) / 10000n; toOwner = loss >= covered ? bond.amount : (bond.amount * loss) / covered; }
      if (h0(d.mandate_hash) !== mandate.mandate_sha256) f('wrong mandate hash');
      if (B(d.base_balance) !== bal.base || B(d.quote_balance) !== bal.quote) f('balances do not continue from the previous event');
      if (B(d.ref_base_in) !== bond.inB || B(d.ref_quote_in) !== bond.inQ || B(d.ref_base_out) !== bond.outB || B(d.ref_quote_out) !== bond.outQ) f('reference amounts are not the balances at the bond plus the owner flows since');
      if (B(d.value_now) !== vNow || B(d.value_ref) !== vRef) f('result not reproducible from balances, owner flows and the oracle price in the event');
      if (String(d.cover_bps) !== String(L.cover_bps) || String(d.fee_share_bps) !== String(L.fee_share_bps)) f('terms differ from the mandate');
      if (B(d.fee_quote) !== feeQ || B(d.fee_base) !== feeB) f('fee share is not the mandate share of the gain');
      if (B(d.bond_amount) !== bond.amount || B(d.bond_to_owner) !== toOwner || B(d.bond_to_backer) !== bond.amount - toOwner) f('bond split is not loss over covered depth');
      if (na(d.owner) !== na(mandate.issuer.address) || na(d.backer) !== na(bond.backer)) f('payments went to someone other than the capital owner and the backer');
      if (d.revoked ? !revoked : B(d.time_s) < B(L.valid_until_s)) f('settled before the mandate had run out or been revoked');
      if (B(d.time_s) * 1000n - B(d.oracle_ts_ms) > B(L.max_oracle_age_s) * 1000n) f('oracle price too old');
      bal = { base: bal.base - feeB, quote: bal.quote - feeQ };
      settled = { time_s: Number(d.time_s), revoked: !!d.revoked, oracle_price: d.oracle_price, oracle_decimals: pd, value_now: vNow.toString(), value_ref: vRef.toString(), result: (vNow - vRef).toString(), fee_quote: feeQ.toString(), fee_base: feeB.toString(), fee_value: (feeQ + quoteForBase(feeB, p, pd)).toString(), bond_to_owner: toOwner.toString(), bond_to_backer: (bond.amount - toOwner).toString(), tx: e.tx };
      live = null;
      continue;
    }
    if (e.kind === 'MandateRevoked') revoked = true;
    if (e.kind === 'MandateSet' || e.kind === 'MandateRevoked') { live = null; if (e.kind === 'MandateSet') { win = { start: 0n, used: 0n }; prevSwap = null; } continue; }
    if (e.kind === 'QuotePosted') {
      const q = d.quote, s = q.quote_seq;
      const f = (why) => badQ.push(`quote #${s}: ${why}`);
      if (B(s) !== quoteSeqExpected) f(`sequence gap, expected ${quoteSeqExpected}`);
      quoteSeqExpected = B(s) + 1n;
      if (senderOf.get(e.tx) !== 'agent') f('not sent by the mandate agent');
      if (!bond || settled) f('posted while no bond stood behind the agent');
      if (h0(d.mandate_hash) !== mandate.mandate_sha256) f('wrong mandate hash');
      if (B(q.bid_edge_bps) < minEdge || B(q.ask_edge_bps) < minEdge) f('edge below the mandate minimum');
      const ttl = B(q.expires_s) - B(q.posted_s);
      if (ttl <= 0n || ttl > B(L.max_quote_ttl_s)) f('lifetime outside the mandate');
      if (B(q.posted_s) < B(L.valid_from_s) || B(q.posted_s) >= B(L.valid_until_s)) f('posted outside the validity window');
      prevLive = live ? { ...live, replacedAt: e.height } : null;
      live = { seq: B(s), bidEdge: B(q.bid_edge_bps), askEdge: B(q.ask_edge_bps), bidLeft: B(q.bid_left_quote), askLeft: B(q.ask_left_base), posted: B(q.posted_s), expires: B(q.expires_s), hash: h0(q.decision_hash), tx: e.tx, fills: 0 };
      quotes.set(String(s), { ...q, tx: e.tx, height: e.height, fills: 0 });
      continue;
    }
    if (e.kind === 'QuoteCancelled') { if (senderOf.get(e.tx) !== 'agent') badQ.push(`cancel of quote #${d.quote_seq}: not sent by the mandate agent`); live = null; continue; }
    if (e.kind !== 'ActionExecuted' && e.kind !== 'FillExecuted') continue;

    const s = d.action_seq, isFill = e.kind === 'FillExecuted';
    const f = (why) => (isFill ? badF : badA).push(`#${s}: ${why}`);
    const p = B(d.oracle_price), pd = d.oracle_decimals, t = B(d.time_s);
    if (B(s) !== seqExpected) f(`sequence gap, expected ${seqExpected}`);
    seqExpected = B(s) + 1n;
    if (!bond || settled) f('capital moved while no bond stood behind the agent');
    if (h0(d.mandate_hash) !== mandate.mandate_sha256) f('wrong mandate hash');
    if (B(d.base_before) !== bal.base || B(d.quote_before) !== bal.quote) f('balances before do not continue from the previous event');
    const ain = B(d.amount_in), aout = B(d.amount_out);
    let fair, n2;
    if (isFill) { n2 = d.vault_buys_base ? quoteForBase(ain, p, pd) : ain; fair = d.vault_buys_base ? n2 : baseForQuote(ain, p, pd); }
    else { n2 = d.sell_base ? quoteForBase(ain, p, pd) : ain; fair = d.sell_base ? n2 : baseForQuote(ain, p, pd); }
    if (n2 !== B(d.notional) || fair !== B(d.fair_out)) f('notional or fair value not reproducible from the oracle price in the event');
    if (n2 > B(L.max_notional_per_action)) f('per-action cap exceeded');
    // capital conservation: what came in and what went out are the only changes
    const ba = isFill ? (d.vault_buys_base ? bal.base + ain : bal.base - aout) : (d.sell_base ? bal.base - ain : bal.base + aout);
    const qa = isFill ? (d.vault_buys_base ? bal.quote - aout : bal.quote + ain) : (d.sell_base ? bal.quote + aout : bal.quote - ain);
    if (ba !== B(d.base_after) || qa !== B(d.quote_after)) f('balances after do not equal before plus the trade: capital went elsewhere');
    const wb = weight(bal.base, bal.quote, p, pd), wa = weight(ba, qa, p, pd);
    if (wb.w !== B(d.weight_before_bps) || wa.w !== B(d.weight_after_bps) || wb.nav !== B(d.nav_before) || wa.nav !== B(d.nav_after)) f('weights or vault value not reproducible');
    if (!band(wb.w, wa.w)) f('weight band rule broken');
    if (wb.nav < B(L.nav_floor)) f('acted below the value floor');
    if (t < B(L.valid_from_s) || t >= B(L.valid_until_s)) f('outside the validity window');
    if (t * 1000n - B(d.oracle_ts_ms) > B(L.max_oracle_age_s) * 1000n) f('oracle price too old');
    if (t >= win.start + DAY) win = { start: t, used: 0n };
    win.used += n2;
    if (win.used > B(L.max_daily_turnover)) f('daily turnover cap exceeded');
    if (win.used !== B(d.window_turnover)) f('window turnover not reproducible');
    turnover += n2;

    if (isFill) {
      const edge = B(d.edge_bps);
      // a fill and a new quote can land in the same block; the event list does not order them
      let lq = live;
      if ((!lq || lq.seq !== B(d.quote_seq)) && prevLive && prevLive.seq === B(d.quote_seq) && prevLive.replacedAt === e.height) lq = prevLive;
      if (!lq || lq.seq !== B(d.quote_seq)) f(`fill names quote #${d.quote_seq}, which was not the standing quote at that time`);
      else {
        if (edge !== (d.vault_buys_base ? lq.bidEdge : lq.askEdge)) f('edge differs from the standing quote');
        if (h0(d.decision_hash) !== lq.hash) f('decision hash differs from the standing quote');
        if (t >= lq.expires || t < lq.posted) f('filled outside the lifetime of the quote');
        if (d.vault_buys_base) { lq.bidLeft -= aout; } else { lq.askLeft -= aout; }
        if (lq.bidLeft < 0n || lq.askLeft < 0n) f('fill larger than the quote size');
        if (lq.bidLeft !== B(d.bid_left_quote) || lq.askLeft !== B(d.ask_left_base)) f('remaining quote size not reproducible');
        quotes.get(String(d.quote_seq)).fills++;
      }
      if (edge < minEdge) f('edge below the mandate minimum');
      if (aout !== (fair * (10000n - edge)) / 10000n) f('payout is not the oracle-fair amount minus the edge');
      if (aout > fair) f('vault paid more than the oracle-fair amount');
      const kept = d.vault_buys_base ? fair - aout : quoteForBase(fair - aout, p, pd);
      edgeIncome += kept;
      fills.push({ seq: Number(s), time_s: Number(t), taker: d.taker, vault_buys_base: d.vault_buys_base, amount_in: d.amount_in, amount_out: d.amount_out, fair_out: d.fair_out, edge_bps: Number(edge), notional: d.notional, kept_quote: kept.toString(), oracle_price: d.oracle_price, oracle_decimals: pd, quote_seq: Number(d.quote_seq), decision_hash: h0(d.decision_hash), weight_after_bps: Number(d.weight_after_bps), nav_after: d.nav_after, tx: e.tx, height: e.height });
    } else {
      if (senderOf.get(e.tx) !== 'agent') f('not sent by the mandate agent');
      if (aout < (fair * B(10000 - Number(L.max_slippage_bps))) / 10000n) f('fill below the price bound');
      if (prevSwap !== null && t < prevSwap + B(L.min_action_interval_s)) f('cooldown broken');
      prevSwap = t;
      const cost = d.sell_base ? fair - aout : quoteForBase(fair - aout, p, pd);
      swapCost += cost;
      swaps.push({ seq: Number(s), time_s: Number(t), sell_base: d.sell_base, amount_in: d.amount_in, amount_out: d.amount_out, fair_out: d.fair_out, notional: d.notional, cost_quote: cost.toString(), oracle_price: d.oracle_price, oracle_decimals: pd, decision_hash: h0(d.decision_hash), weight_after_bps: Number(d.weight_after_bps), nav_after: d.nav_after, tx: e.tx, height: e.height });
    }
    bal = { base: ba, quote: qa };
  }
  const nQuotes = quotes.size, nMoves = fills.length + swaps.length;
  check('O1', 'every deposit and withdrawal was sent by the capital owner and the balances continue', badO.length === 0, badO.length ? badO.join('; ') : `${flows.length} movements`);
  check('Q1', `all ${nQuotes} quotes were posted by the agent, inside the mandate (minimum edge, lifetime, validity)`, badQ.length === 0, badQ.length ? badQ.slice(0, 5).join('; ') : `sequence 1..${nQuotes}`);
  check('F1', `all ${fills.length} fills reproduce from their own events: standing quote, price = oracle minus edge, every mandate limit, capital conserved`, badF.length === 0, badF.length ? badF.slice(0, 5).join('; ') : `${fills.length} fills`);
  check('A1', `all ${swaps.length} venue swaps of the agent reproduce from their own events and respect every mandate limit`, badA.length === 0, badA.length ? badA.slice(0, 5).join('; ') : `${swaps.length} swaps`);
  check('B1', 'the bond was posted by the backer named in the mandate file, in full, for this mandate, before the agent first acted', badB.length === 0 && !!bond, badB.length ? badB.join('; ') : bond ? `${bond.amount} units, ${bond.tx}` : 'no bond posted');
  check('B2', 'the settlement reproduces from the events: result against deposits untouched, fee share to the backer, bond split by loss over covered depth', badS.length === 0, badS.length ? badS.join('; ') : settled ? `result ${settled.result}, fee ${settled.fee_value}, bond to owner ${settled.bond_to_owner}` : `not settled yet; the mandate runs until ${new Date(Number(L.valid_until_s) * 1000).toISOString()}`);
  check('F2', 'no fill paid a taker more than the oracle-fair amount', fills.every((x) => B(x.amount_out) <= B(x.fair_out)), `edge kept by the vault: ${edgeIncome} quote units`);

  // ---- K: what the agent key did at all
  // The mandate covers the agent key from the moment it was set. Older transactions of the key
  // are counted and shown, not judged: before the mandate the key had no rights on this vault.
  const usOf = (t) => Number(t.block_header?.timestamp?.microseconds_since_unix_epoch ?? 0);
  const setTx = sets.length ? [...ownerTxs].find((t) => t.hash === sets[sets.length - 1].tx) : null;
  const since = setTx ? usOf(setTx) : 0;
  const agentSince = agentTxs.filter((t) => usOf(t) >= since);
  const agentBefore = agentTxs.length - agentSince.length;
  const agentOk = agentSince.filter((t) => t.status === 'Success');
  const fnOf = (t) => t.payload?.Move?.function ?? '';
  const allowed = new Set(AGENT_FNS.map(T));
  const foreign = agentOk.filter((t) => !allowed.has(fnOf(t)));
  check('K1', 'since the mandate was set, every successful transaction of the agent key is a quote, a swap, an attestation or a halt of this package', foreign.length === 0, foreign.length ? foreign.slice(0, 5).map(fnOf).join(',') : `${agentOk.length} successful transactions since the mandate was set; ${agentBefore} older transactions of the key are outside this mandate`);
  const agentFailed = agentSince.filter((t) => t.status !== 'Success');
  const moved = agentFailed.filter((t) => (t.output?.Move?.events ?? []).some((ev) => ev.type.startsWith(PKG)));
  check('K2', 'no failed agent transaction left any vault event behind', moved.length === 0, `${agentFailed.length} failed agent transactions, all without effect`);
  const wd = timeline.filter((e) => e.kind === 'Withdrawn');
  check('K3', 'every withdrawal was sent by the capital owner', wd.every((e) => senderOf.get(e.tx) === 'owner'), `${wd.length} withdrawals`);

  // ---- S: chain state now equals the replay
  const st = (await view(T('get_state'), [VAULT]))[0];
  check('S1', 'vault balances on-chain now equal the balances replayed from the events', B(st.base_balance) === bal.base && B(st.quote_balance) === bal.quote && B(st.action_seq) === B(nMoves) && B(st.quote_seq) === B(nQuotes) && st.has_bond === (!!bond && !settled), `base ${st.base_balance} quote ${st.quote_balance} actions ${st.action_seq} quotes ${st.quote_seq} bond ${st.has_bond}`);

  // ---- D: decisions (optional ledger)
  const attests = timeline.filter((e) => e.kind === 'DecisionAttested');
  let ledgerEntries = null;
  if (ledgerText) {
    const lines = ledgerText.trim().split('\n').map((l) => JSON.parse(l));
    ledgerEntries = lines.length;
    let prev = '0'.repeat(64), chainOk = true;
    for (const e of lines) { if (e.prev_hash !== prev || (await sha256hex(canonical(without(e, 'hash')))) !== e.hash) { chainOk = false; break; } prev = e.hash; }
    check('D1', 'agent ledger hash chain is intact', chainOk, `${lines.length} entries`);
    const byHash = new Map(lines.filter((e) => e.type === 'decision').map((e) => [e.hash, e]));
    const miss = [];
    for (const [s, q] of quotes) {
      const dec = byHash.get(h0(q.decision_hash)), a = dec?.decision?.action;
      if (!a || a.type !== 'post_quote' || String(a.bid_edge_bps) !== String(q.bid_edge_bps) || String(a.ask_edge_bps) !== String(q.ask_edge_bps) || String(a.bid_size_quote) !== String(q.bid_left_quote) || String(a.ask_size_base) !== String(q.ask_left_base) || dec.observation.time_s > Number(q.posted_s) + 5) miss.push(`quote #${s}`);
    }
    for (const a of swaps) {
      const x = byHash.get(a.decision_hash)?.decision?.action;
      if (!x || x.type !== 'swap' || x.amount_in !== a.amount_in || x.sell_base !== a.sell_base || B(a.amount_out) < B(x.min_out)) miss.push(`swap #${a.seq}`);
    }
    check('D2', 'every quote and every swap on-chain carries the hash of a ledger decision made before it, with the same parameters', miss.length === 0, miss.length ? miss.slice(0, 6).join(', ') : `${nQuotes} quotes, ${swaps.length} swaps bound; every fill carries the hash of its quote`);
    const am = attests.filter((a) => !byHash.has(h0(a.data.decision_hash)));
    check('D3', 'every on-chain attestation carries the hash of a ledger decision', am.length === 0, `${attests.length} attestations`);
  }

  // ---- result figures (replayed, not taken from any report)
  onProgress('figures');
  let px = null;
  try { const [price, decimals, ts] = await view(`${deployment.oracle}::supra_oracle_storage::get_price`, [mandate.price_source.pair_index]); px = { price: String(price), decimals: Number(decimals), ts_ms: Number(ts) }; } catch { px = null; }
  let figures = null;
  if (px) {
    let depB = 0n, depQ = 0n;
    for (const f of flows) { const a = B(f.amount) * (f.kind === 'Deposited' ? 1n : -1n); if (f.is_base) depB += a; else depQ += a; }
    const nav = bal.quote + quoteForBase(bal.base, px.price, px.decimals) + (settled ? B(settled.fee_value) : 0n); // a paid fee share is shown on its own line, not as a loss
    const hold = depQ + quoteForBase(depB, px.price, px.decimals);
    const w = weight(bal.base, bal.quote, px.price, px.decimals).w;
    figures = { oracle: px, nav: nav.toString(), hold: hold.toString(), vs_hold: (nav - hold).toString(), edge_income: edgeIncome.toString(), swap_cost: swapCost.toString(), fair: (edgeIncome - swapCost).toString(), inventory_effect: (nav - hold - (edgeIncome - swapCost)).toString(), fee_paid: settled ? settled.fee_value : '0', turnover: turnover.toString(), weight_bps: Number(w), deposited_base: depB.toString(), deposited_quote: depQ.toString() };
  }

  // ---- bond: where the result stands now (computed, nothing is paid before the settlement)
  let bondOut = null;
  if (bond) {
    bondOut = { backer: bond.backer, amount: bond.amount.toString(), posted_s: bond.posted_s, tx: bond.tx, ref_base_in: bond.inB.toString(), ref_quote_in: bond.inQ.toString(), ref_base_out: bond.outB.toString(), ref_quote_out: bond.outQ.toString(), settled: !!settled };
    if (!settled && px) {
      const vNow = quoteForBase(bal.base + bond.outB, px.price, px.decimals) + bal.quote + bond.outQ;
      const vRef = quoteForBase(bond.inB, px.price, px.decimals) + bond.inQ;
      const covered = (vRef * B(L.cover_bps)) / 10000n;
      const toOwner = vNow >= vRef ? 0n : (vRef - vNow >= covered ? bond.amount : (bond.amount * (vRef - vNow)) / covered);
      Object.assign(bondOut, { value_now: vNow.toString(), value_ref: vRef.toString(), result: (vNow - vRef).toString(), covered: covered.toString(), fee_if_settled_now: (vNow > vRef ? ((vNow - vRef) * B(L.fee_share_bps)) / 10000n : 0n).toString(), bond_to_owner_if_settled_now: toOwner.toString() });
    }
  }

  const verdict = checks.every((c) => c.ok) ? 'ACCEPT' : 'REJECT';
  return {
    schema: 'cosmo.vault.verify.v3', verdict, at: new Date().toISOString(), rpc, vault: VAULT, package: PKG, mandate_sha256: mandate.mandate_sha256,
    counts: { quotes: nQuotes, fills: fills.length, swaps: swaps.length, attestations: attests.length, agent_txs: agentSince.length, agent_txs_before_mandate: agentBefore, agent_failed_txs: agentFailed.length, owner_txs: ownerTxs.length, ledger_entries: ledgerEntries },
    checks,
    data: { state: st, bond: bondOut, settlement: settled, balances: { base: bal.base.toString(), quote: bal.quote.toString() }, figures, fills, swaps, flows, quotes: [...quotes.values()].map((q) => ({ quote_seq: Number(q.quote_seq), bid_edge_bps: Number(q.bid_edge_bps), ask_edge_bps: Number(q.ask_edge_bps), bid_size_quote: q.bid_left_quote, ask_size_base: q.ask_left_base, posted_s: Number(q.posted_s), expires_s: Number(q.expires_s), decision_hash: h0(q.decision_hash), fills: q.fills, tx: q.tx })), halts: timeline.filter((e) => e.kind === 'HaltSet' || e.kind === 'PausedSet' || e.kind === 'MandateRevoked').map((e) => ({ kind: e.kind, data: e.data, tx: e.tx })), failed_agent_txs: agentFailed.map((t) => ({ hash: t.hash, fn: fnOf(t).split('::').pop(), vm_status: t.output?.Move?.vm_status ?? t.status })) },
  };
}
