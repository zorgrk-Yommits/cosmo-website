// Command-line verifier. Reads the mandate file, the deployment facts and the public chain.
// Needs no key and imports no agent code; the checks are in verify/core.mjs, the same file the web page runs.
// Usage: node verify/verify.mjs --mandate mandates/mandate-003.json --deployment mandates/deployment-003.json [--ledger file] [--rpc url] [--out file] [--quiet]
import fs from 'node:fs';
import { verifyVault } from './core.mjs';

const opt = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const mandate = JSON.parse(fs.readFileSync(opt('--mandate'), 'utf8'));
const deployment = JSON.parse(fs.readFileSync(opt('--deployment'), 'utf8'));
const ledgerText = opt('--ledger') ? fs.readFileSync(opt('--ledger'), 'utf8') : null;
const r = await verifyVault({ rpc: opt('--rpc') || deployment.rpc, mandate, deployment, ledgerText });
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(r, null, 2) + '\n');
if (!process.argv.includes('--quiet')) for (const c of r.checks) console.log(c.ok ? 'ok  ' : 'FAIL', c.id.padEnd(16), c.text, c.detail ? `[${c.detail.slice(0, 120)}]` : '');
console.log(`\n${r.verdict}  quotes ${r.counts.quotes}, fills ${r.counts.fills}, swaps ${r.counts.swaps}, attestations ${r.counts.attestations}, failed agent txs ${r.counts.agent_failed_txs}`);
process.exit(r.verdict === 'ACCEPT' ? 0 : 1);
