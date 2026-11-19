// COSMO mandate vault page. Reads the public chain in the browser and runs the same
// verifier core as the command line. No server of ours is asked for any result.
import { verifyVault, LIMIT_KEYS } from './core.mjs';

const SNAP = globalThis.__SNAPSHOT__ || null;
const EXPLORER = 'https://testnet.suprascan.io/tx/';
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const B = (x) => BigInt(x);
const na = (a) => { try { return BigInt(a).toString(16); } catch { return String(a); } };
const short = (h) => { const s = String(h); return s.length > 18 ? s.slice(0, 10) + '…' + s.slice(-6) : s; };
const tx = (h) => `<a class="mono" href="${EXPLORER}${esc(h)}" target="_blank" rel="noopener">${esc(short(h))}</a>`;

function dec(units, decimals, places) {
  const neg = B(units) < 0n, u = neg ? -B(units) : B(units), d = 10n ** B(decimals);
  const whole = (u / d).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (u % d).toString().padStart(decimals, '0').slice(0, places);
  return (neg ? '−' : '') + whole + (places ? '.' + frac : '');
}
const when = (s) => new Date(Number(s) * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
const span = (s) => { s = Math.max(0, Math.round(s)); if (s < 90) return `${s} s`; if (s < 5400) return `${Math.round(s / 60)} min`; if (s < 172800) return `${(s / 3600).toFixed(1)} h`; return `${(s / 86400).toFixed(1)} days`; };

async function loadLive(onProgress) {
  const j = (p) => fetch(p, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); });
  const [mandate, deployment, strategy] = await Promise.all([j('data/mandate.json'), j('data/deployment.json'), j('data/strategy.json')]);
  const drill = await j('data/attack-drill.json').catch(() => null);
  const lossDrill = await j('data/loss-drill.json').catch(() => null);
  const decisions = await j('data/decisions.json').catch(() => ({}));
  const result = await verifyVault({ rpc: deployment.rpc, mandate, deployment, onProgress });
  let quote = null;
  if (result.data.state.has_quote) {
    try {
      const r = await fetch(deployment.rpc + '/rpc/v1/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ function: `${mandate.network.package}::mandate_vault::get_quote`, type_arguments: [], arguments: [mandate.network.vault] }) });
      quote = (await r.json()).result?.[0] ?? null;
    } catch { quote = null; }
  }
  return { mandate, deployment, strategy, drill, lossDrill, decisions, result, quote, live: true };
}

function render(S) {
  const { mandate: M, deployment: D, result: R, quote: Q, drill, lossDrill, decisions } = S;
  const bs = M.assets.base.symbol, qs = M.assets.quote.symbol, bd = M.assets.base.decimals, qd = M.assets.quote.decimals;
  const L = M.limits, F = R.data.figures, st = R.data.state;
  const q$ = (u, p = 2) => `${dec(u, qd, p)} ${qs}`;
  const b$ = (u, p = 0) => `${dec(u, bd, p)} ${bs}`;
  const qfb = (b, p, pd) => (B(b) * B(p) * 10n ** B(qd)) / (10n ** B(bd) * 10n ** B(pd));
  const cs = M.bond.symbol, cd = M.bond.decimals;
  const c$ = (u, p = 2) => `${dec(u, cd, p)} ${cs}`;
  const pc = (bps) => `${(Number(bps) / 100).toFixed(2)}%`;
  const now = Date.now() / 1000;
  const ok = R.verdict === 'ACCEPT';

  // ---- verdict
  $('verdict').className = 'verdict ' + (ok ? 'ok' : 'bad');
  $('verdict').innerHTML = `<div class="v-word">${ok ? 'ACCEPT' : 'REJECT'}</div>
    <div class="v-text">${R.checks.filter((c) => c.ok).length} of ${R.checks.length} checks hold. ${S.live ? 'Computed in your browser just now from' : 'Snapshot computed ' + esc(new Date(R.at).toLocaleString('en-GB')) + ' from'} the public Supra testnet API and the mandate file. ${ok ? 'Every quote and every movement of capital reproduces from chain data and stays inside the mandate.' : 'At least one check failed. See the list below.'}</div>`;

  // ---- state
  const wt = F ? F.weight_bps / 100 : null;
  const halted = st.halted ? '<span class="chip bad">halted</span>' : st.paused ? '<span class="chip warn">paused by owner</span>' : !st.has_mandate ? '<span class="chip warn">mandate revoked</span>' : now >= L.valid_until_s ? '<span class="chip warn">mandate expired</span>' : '<span class="chip ok">mandate active</span>';
  $('state').innerHTML = `
    <div class="tiles">
      <div class="tile"><div class="t-l">Vault value</div><div class="t-v">${F ? q$(F.nav) : 'n/a'}</div><div class="t-s">${F ? `at oracle price ${(Number(F.oracle.price) / 10 ** F.oracle.decimals).toPrecision(5)} ${qs} per ${bs}` : 'oracle not readable'}</div></div>
      <div class="tile"><div class="t-l">Holdings</div><div class="t-v small">${b$(st.base_balance)}<br>${q$(st.quote_balance)}</div></div>
      <div class="tile"><div class="t-l">Mandate</div><div class="t-v small">${halted}</div><div class="t-s">ends in ${span(L.valid_until_s - now)}</div></div>
      <div class="tile"><div class="t-l">Activity</div><div class="t-v small">${R.counts.fills} fills · ${R.counts.quotes} quotes</div><div class="t-s">${R.counts.swaps} venue swaps · ${R.counts.attestations} attested holds</div></div>
    </div>
    ${wt === null ? '' : `<div class="band" role="img" aria-label="${bs} share ${wt.toFixed(1)} percent, allowed ${L.min_base_weight_bps / 100} to ${L.max_base_weight_bps / 100} percent">
      <div class="band-allowed" style="left:${L.min_base_weight_bps / 100}%;width:${(L.max_base_weight_bps - L.min_base_weight_bps) / 100}%"></div>
      <div class="band-mark" style="left:${wt}%"></div>
      <div class="band-labels"><span style="left:${L.min_base_weight_bps / 100}%">${L.min_base_weight_bps / 100}%</span><span style="left:${L.max_base_weight_bps / 100}%">${L.max_base_weight_bps / 100}%</span></div>
    </div><p class="cap">${bs} share of the vault value: <b>${wt.toFixed(1)}%</b>. The shaded range is what the mandate allows. A trade that would leave it is rejected by the contract.</p>`}`;

  // ---- bond and settlement
  const Bd = R.data.bond, St = R.data.settlement;
  const sgn = (u) => (B(u) > 0n ? 'pos' : B(u) < 0n ? 'neg' : '');
  if (!Bd) {
    $('bond').innerHTML = `<p class="cap">No bond is posted. Without one the contract rejects every quote and every swap of the agent.</p>`;
  } else if (St) {
    $('bond').innerHTML = `
      <div class="tiles">
        <div class="tile"><div class="t-l">Result of the mandate</div><div class="t-v ${sgn(St.result)}">${q$(St.result, 4)}</div><div class="t-s">vault value against deposits left untouched, at the price of the settlement</div></div>
        <div class="tile"><div class="t-l">Fee share paid to the backer</div><div class="t-v">${q$(St.fee_value, 4)}</div><div class="t-s">${pc(L.fee_share_bps)} of a gain, paid by the vault</div></div>
        <div class="tile"><div class="t-l">Bond paid to the owner</div><div class="t-v">${c$(St.bond_to_owner)}</div><div class="t-s">of ${c$(Bd.amount)} posted; the rest went back to the backer</div></div>
      </div>
      <p class="cap">Settled ${when(St.time_s)}${St.revoked ? ' after the owner revoked the mandate' : ' after the mandate had run out'}, transaction ${tx(St.tx)}. The check B2 below recomputes every figure of it.</p>`;
  } else {
    $('bond').innerHTML = `
      <div class="tiles">
        <div class="tile"><div class="t-l">Bond posted</div><div class="t-v">${c$(Bd.amount, 0)}</div><div class="t-s">by the backer <span class="mono">${esc(short(Bd.backer))}</span>, ${when(Bd.posted_s)}, ${tx(Bd.tx)}</div></div>
        <div class="tile"><div class="t-l">What it covers</div><div class="t-v">first ${pc(L.cover_bps)} of loss</div><div class="t-s">${Bd.covered ? q$(Bd.covered) + ' at the current price' : ''}</div></div>
        <div class="tile"><div class="t-l">Result so far</div><div class="t-v ${Bd.result ? sgn(Bd.result) : ''}">${Bd.result ? q$(Bd.result, 4) : 'n/a'}</div><div class="t-s">vault value against deposits left untouched</div></div>
        <div class="tile"><div class="t-l">If it were settled now</div><div class="t-v small">${Bd.result ? `${q$(Bd.fee_if_settled_now, 4)} to the backer<br>${c$(Bd.bond_to_owner_if_settled_now)} to the owner` : 'n/a'}</div><div class="t-s">nothing is paid before the settlement</div></div>
      </div>
      <p class="cap">The mandate is settled once, in ${span(L.valid_until_s - now)} or earlier if the owner revokes it. A gain pays ${pc(L.fee_share_bps)} of it from the vault to the backer, in ${qs}. A loss pays the owner from the bond: the whole bond once the loss reaches ${pc(L.cover_bps)} of the untouched value, the matching part below that. The agent key cannot move the bond.</p>`;
  }

  // ---- loss drill
  if (lossDrill && lossDrill.settlement) {
    const s2 = lossDrill.settlement, l2 = lossDrill.limits;
    $('lossdrill').innerHTML = `
      <div class="scroll"><table><thead><tr><th>Step</th><th>On-chain</th><th>Transaction</th></tr></thead><tbody>
      ${lossDrill.steps.map((x) => `<tr><td>${esc(x.step)}</td><td><span class="chip ${x.ok ? 'ok' : 'bad'}">${x.ok ? 'executed' : 'failed'}</span></td><td>${x.tx ? tx(x.tx) : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <table class="num" style="margin-top:14px"><tbody>
        <tr><td>Vault value at the settlement</td><td>${q$(s2.value_now, 4)}</td></tr>
        <tr><td>Deposits left untouched, at the same price</td><td>${q$(s2.value_ref, 4)}</td></tr>
        <tr class="sum"><td>Loss caused by the agent</td><td class="neg">${q$(s2.result, 4)}</td></tr>
        <tr><td>Bond posted, covering the first ${pc(l2.cover_bps)} of loss</td><td>${c$(lossDrill.bond.amount)}</td></tr>
        <tr class="sum"><td>Bond paid to the capital owner</td><td>${c$(lossDrill.bond_received_by_owner)}</td></tr>
        <tr><td>Bond returned to the backer</td><td>${c$(lossDrill.bond_returned_to_backer)}</td></tr>
      </tbody></table>
      <p class="cap">Run on ${esc(new Date(lossDrill.at).toLocaleString('en-GB'))} on a second, small vault <span class="mono">${esc(short(lossDrill.vault))}</span> with the same contract. Its agent swapped back and forth through the venue and paid the venue fee each time. The same verifier checked that vault: ${esc(lossDrill.verifier.verdict)}, ${lossDrill.verifier.checks} checks.</p>`;
  } else $('lossdrill').innerHTML = '<p class="cap">No loss drill result published yet.</p>';

  // ---- standing quote
  const liveQ = Q && Number(Q.expires_s) > now;
  $('quote').innerHTML = liveQ ? `
    <div class="quote">
      <div><div class="t-l">You sell ${bs} to the vault</div><div class="q-v">oracle price − ${(Number(Q.bid_edge_bps) / 100).toFixed(2)}%</div><div class="t-s">up to ${q$(Q.bid_left_quote)} left</div></div>
      <div><div class="t-l">You buy ${bs} from the vault</div><div class="q-v">oracle price + ${(Number(Q.ask_edge_bps) / 100).toFixed(2)}%</div><div class="t-s">up to ${b$(Q.ask_left_base)} left</div></div>
      <div><div class="t-l">Quote #${esc(Q.quote_seq)}</div><div class="q-v">${span(Number(Q.expires_s) - now)} left</div><div class="t-s">decision <span class="mono">${esc(short(Q.decision_hash))}</span></div></div>
    </div>
    <p class="cap">The agent chose these edges and sizes. The mandate forbids any edge below ${(L.min_edge_bps / 100).toFixed(2)}%, so no quote can make the vault trade below the oracle price. The price is fixed by the contract at the moment of each fill.</p>`
    : `<p class="cap">No standing quote right now${S.live ? '' : ' (at snapshot time)'}. The agent posts one when its rules say so; a quote lives at most ${span(L.max_quote_ttl_s)}.</p>`;

  // ---- result
  if (F) {
    const TT = D.test_takers || {};
    const label = (a) => na(a) === na(TT.random ?? '0x1') ? 'Test taker, random' : na(a) === na(TT.follows ?? '0x1') ? 'Test taker, follows price moves' : 'Other accounts';
    const groups = new Map();
    for (const f of R.data.fills) {
      const g = groups.get(label(f.taker)) ?? { n: 0, vol: 0n, kept: 0n, mark: 0n };
      g.n++; g.vol += B(f.notional); g.kept += B(f.kept_quote);
      // price movement after the fill on the amount of base that changed hands
      const baseAmt = f.vault_buys_base ? B(f.amount_in) : -B(f.amount_out);
      const diff = (baseAmt < 0n ? -1n : 1n) * (qfb(baseAmt < 0n ? -baseAmt : baseAmt, F.oracle.price, F.oracle.decimals) - qfb(baseAmt < 0n ? -baseAmt : baseAmt, f.oracle_price, f.oracle_decimals));
      g.mark += diff;
      groups.set(label(f.taker), g);
    }
    const sign = (u) => (B(u) > 0n ? 'pos' : B(u) < 0n ? 'neg' : '');
    $('result').innerHTML = `
      <table class="num"><tbody>
        <tr><td>Edge kept by the vault on ${R.counts.fills} fills</td><td class="${sign(F.edge_income)}">${q$(F.edge_income, 4)}</td></tr>
        <tr><td>Cost of ${R.counts.swaps} venue swaps by the agent</td><td class="${sign(-B(F.swap_cost))}">${q$(-B(F.swap_cost), 4)}</td></tr>
        <tr class="sum"><td>Result of all trades, each valued at the oracle price of its own transaction</td><td class="${sign(F.fair)}">${q$(F.fair, 4)}</td></tr>
        <tr><td>Effect of price changes on what the vault held in the meantime</td><td class="${sign(F.inventory_effect)}">${q$(F.inventory_effect, 4)}</td></tr>
        <tr class="sum"><td>Vault value now compared with the deposit left untouched (${q$(F.hold)})</td><td class="${sign(F.vs_hold)}">${q$(F.vs_hold, 4)}</td></tr>
        <tr><td>Traded volume</td><td>${q$(F.turnover)}</td></tr>
      </tbody></table>
      <div class="scroll"><table><thead><tr><th>Who traded against the vault</th><th class="r">Fills</th><th class="r">Volume</th><th class="r">Edge kept</th><th class="r">Price moved afterwards</th></tr></thead><tbody>
      ${[...groups].map(([k, g]) => `<tr><td>${esc(k)}</td><td class="r">${g.n}</td><td class="r">${q$(g.vol)}</td><td class="r pos">${q$(g.kept, 4)}</td><td class="r ${sign(g.mark)}">${q$(g.mark, 4)}</td></tr>`).join('') || '<tr><td colspan="5">No fills yet.</td></tr>'}
      </tbody></table></div>
      <p class="cap"><b>Read this as a test of the mechanism, not as income.</b> The two test takers are bots run by the vault operator; anyone else can trade too, with free test tokens. The edge is real in the sense that the contract enforced it on every fill. Whether a vault like this earns money depends on real takers, and those exist only on a real market. The last column shows what a taker who trades right after price moves costs the vault.</p>`;
  } else $('result').innerHTML = '<p class="cap">The oracle price could not be read, so no figures are shown.</p>';

  // ---- rules
  const U = (k, v) => k === 'bond_required' ? c$(v, 0) : /notional|turnover|nav_floor/.test(k) ? q$(v) : /bps/.test(k) ? `${(Number(v) / 100).toFixed(2)}%` : /_s$/.test(k) && Number(v) > 1e9 ? esc(new Date(Number(v) * 1000).toLocaleString('en-GB')) : `${v} s`;
  const NAME = { valid_from_s: 'Valid from', valid_until_s: 'Valid until', max_notional_per_action: 'Largest single trade', max_daily_turnover: 'Largest volume in 24 hours', max_slippage_bps: 'Worst price for a venue swap, below oracle', max_oracle_age_s: 'Oldest oracle price accepted', min_base_weight_bps: `Smallest ${bs} share`, max_base_weight_bps: `Largest ${bs} share`, nav_floor: 'Vault value below which anyone can freeze the agent', min_action_interval_s: 'Shortest pause between venue swaps', min_edge_bps: 'Smallest edge of any quote', max_quote_ttl_s: 'Longest lifetime of a quote', bond_required: 'Bond the backer must post', cover_bps: 'Loss depth the bond covers', fee_share_bps: 'Share of a gain that goes to the backer' };
  $('rules').innerHTML = `<div class="scroll"><table><thead><tr><th>Rule in the mandate</th><th class="r">Value</th></tr></thead><tbody>${LIMIT_KEYS.map((k) => `<tr><td>${NAME[k]}</td><td class="r">${U(k, L[k])}</td></tr>`).join('')}</tbody></table></div>
    <p class="cap">These ${LIMIT_KEYS.length} values are stored in the vault contract. The check M5 below compares them with the mandate file. Mandate hash <span class="mono">${esc(short(M.mandate_sha256))}</span>, owner <span class="mono">${esc(short(M.issuer.address))}</span>, agent <span class="mono">${esc(short(M.executor.address))}</span>, backer <span class="mono">${esc(short(M.backer.address))}</span>.</p>`;

  // ---- activity
  const rows = [
    ...R.data.fills.map((f) => ({ t: f.time_s, seq: f.seq, html: `<td>${when(f.time_s)}</td><td>Fill #${f.seq}</td><td>Vault ${f.vault_buys_base ? `bought ${b$(f.amount_in)} for ${q$(f.amount_out)}` : `sold ${b$(f.amount_out)} for ${q$(f.amount_in)}`}</td><td class="r">${(f.edge_bps / 100).toFixed(2)}%</td><td class="r">${(f.weight_after_bps / 100).toFixed(1)}%</td><td>${tx(f.tx)}</td>` })),
    ...R.data.swaps.map((f) => ({ t: f.time_s, seq: f.seq, html: `<td>${when(f.time_s)}</td><td>Venue swap #${f.seq}</td><td>Agent ${f.sell_base ? `sold ${b$(f.amount_in)} for ${q$(f.amount_out)}` : `bought ${b$(f.amount_out)} for ${q$(f.amount_in)}`}</td><td class="r">cost ${q$(f.cost_quote, 4)}</td><td class="r">${(f.weight_after_bps / 100).toFixed(1)}%</td><td>${tx(f.tx)}</td>` })),
    ...R.data.quotes.map((x) => { const d = decisions[x.decision_hash]; return { t: x.posted_s, seq: 0, html: `<td>${when(x.posted_s)}</td><td>Quote #${x.quote_seq}</td><td>Agent set edges ${(x.bid_edge_bps / 100).toFixed(2)}% / ${(x.ask_edge_bps / 100).toFixed(2)}%${d ? `, reason: ${esc(d.reason.replace(/_/g, ' '))}` : ''}</td><td class="r">${x.fills} fills</td><td class="r"></td><td>${tx(x.tx)}</td>` }; }),
  ].sort((a, b) => b.t - a.t || b.seq - a.seq).slice(0, 40);
  $('activity').innerHTML = `<div class="scroll"><table><thead><tr><th>Time</th><th>Event</th><th>What happened</th><th class="r">Edge</th><th class="r">${bs} share after</th><th>Transaction</th></tr></thead><tbody>${rows.map((r) => `<tr>${r.html}</tr>`).join('') || '<tr><td colspan="6">Nothing yet.</td></tr>'}</tbody></table></div><p class="cap">The latest 40 events. Each links to the transaction on the public explorer.</p>`;

  // ---- checks
  $('checks').innerHTML = `<div class="scroll"><table><thead><tr><th></th><th>Check</th><th>Evidence</th></tr></thead><tbody>${R.checks.map((c) => `<tr><td><span class="chip ${c.ok ? 'ok' : 'bad'}">${c.ok ? 'holds' : 'FAILS'}</span></td><td><span class="mono dim">${esc(c.id)}</span> ${esc(c.text)}</td><td class="mono dim wrap">${esc(c.detail.length > 90 ? c.detail.slice(0, 90) + '…' : c.detail)}</td></tr>`).join('')}</tbody></table></div>`;

  // ---- drill
  $('drill').innerHTML = drill ? `<div class="scroll"><table><thead><tr><th>Who</th><th>Tried to</th><th>Contract answered</th><th>Transaction</th></tr></thead><tbody>${drill.results.map((r) => `<tr><td>${esc(r.actor)}</td><td>${esc(r.attempt)}</td><td><span class="chip ${r.pass ? 'ok' : 'bad'}">${esc(r.expected.split(' ')[1])}</span></td><td>${tx(r.tx_hash)}</td></tr>`).join('')}</tbody></table></div><p class="cap">Run on ${esc(new Date(drill.at).toLocaleString('en-GB'))}. Every attempt was really sent and rejected on-chain. Vault holdings before and after: ${drill.balances_unchanged ? 'identical' : 'DIFFERENT'}.</p>` : '<p class="cap">No drill result published yet.</p>';

  // ---- stolen key bound
  const days = Math.ceil((L.valid_until_s - L.valid_from_s) / 86400);
  const perDay = (B(L.max_daily_turnover) * B(L.max_slippage_bps)) / 10000n;
  $('bound').innerHTML = `<p>Someone who steals the agent key cannot withdraw anything and cannot name a recipient. Two things remain possible:</p>
    <ul><li><b>Bad venue swaps.</b> Each one at most ${(L.max_slippage_bps / 100).toFixed(2)}% below the oracle price and at most ${q$(L.max_daily_turnover)} of volume in 24 hours: at most ${q$(perDay)} a day, ${q$(perDay * B(days))} over the whole mandate.</li>
    <li><b>Bad quotes.</b> No quote can have an edge below ${(L.min_edge_bps / 100).toFixed(2)}%, so every fill still pays the vault. What a quote can do is hold the ${bs} share anywhere between ${L.min_base_weight_bps / 100}% and ${L.max_base_weight_bps / 100}% while the price moves.</li></ul>
    <p>If the vault value falls below ${q$(L.nav_floor)}, anyone can freeze the agent. The owner can pause, revoke and withdraw at any time.</p>`;

  $('ids').innerHTML = `Vault <span class="mono">${esc(M.network.vault)}</span><br>Package <span class="mono">${esc(M.network.package)}</span><br>Publish transaction ${tx(D.publish_tx)}`;
  $('updated').textContent = S.live ? `Checked ${new Date().toLocaleTimeString('en-GB')}. Refreshes every minute.` : `Snapshot of ${new Date(R.at).toLocaleString('en-GB')}. The live page reads the chain directly.`;
}

async function cycle() {
  try {
    const S = SNAP ?? await loadLive((step) => { if (!$('verdict').dataset.done) $('verdict').querySelector('.v-text').textContent = `Reading the chain: ${step} …`; });
    render(S);
    $('verdict').dataset.done = '1';
  } catch (e) {
    if (!$('verdict').dataset.done) { $('verdict').className = 'verdict bad'; $('verdict').innerHTML = `<div class="v-word">NO DATA</div><div class="v-text">The chain could not be read: ${esc(e.message)}. Reload to try again.</div>`; }
  }
}
cycle();
if (!SNAP) setInterval(cycle, 60000);
