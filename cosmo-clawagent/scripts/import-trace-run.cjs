#!/usr/bin/env node
// Import ONE finished TRACE run as a static page (plans/cosmo-wallet-v01-plan.md, D).
//
//   node scripts/import-trace-run.cjs <run directory>
//
// Copies only index.html of the run (it is self-contained and makes no network
// requests) to public/trace/<run>/index.html and records the run in
// public/trace/index.json, which the wallet page reads to offer
// "Open trace of this address". trace.json, the raw reads and SHA256SUMS stay
// where they are: the evidence package is not published by this script.
//
// Only wallet traces are indexed. Importing the same run again replaces its entry.
// NOTE: everything under public/ is part of the next site build. Whether trace
// pages go public is a separate decision; this script only prepares the files.

const fs = require('node:fs');
const path = require('node:path');

const RUN_RE = /^run-\d{8}T\d{6}Z$/;
const ADDR_RE = /^0x[0-9a-fA-F]{1,64}$/;

function importRun(runDir, publicDir) {
  const run = path.basename(path.resolve(runDir));
  if (!RUN_RE.test(run)) throw new Error(`not a run directory name: ${run}`);
  const tracePath = path.join(runDir, 'trace.json');
  const pagePath = path.join(runDir, 'index.html');
  if (!fs.existsSync(tracePath) || !fs.existsSync(pagePath)) throw new Error(`${run}: trace.json or index.html missing`);
  const t = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
  const inp = t.inputs || {};
  if (inp.kind !== 'wallet') throw new Error(`${run}: only wallet traces are indexed (this one is "${inp.kind}")`);
  if (typeof inp.input !== 'string' || !ADDR_RE.test(inp.input)) throw new Error(`${run}: input is not an address`);
  if (inp.chain !== 'supra' && inp.chain !== 'eth') throw new Error(`${run}: unknown chain "${inp.chain}"`);
  if (typeof t.generated_at !== 'string' || Number.isNaN(Date.parse(t.generated_at))) throw new Error(`${run}: generated_at missing`);

  const page = fs.readFileSync(pagePath, 'utf8');
  // The page must stay self-contained: no script, style, image or frame from elsewhere.
  if (/<(script|link|img|iframe)\b[^>]*\b(src|href)\s*=\s*["']?(https?:)?\/\//i.test(page)) {
    throw new Error(`${run}: index.html loads something from the network; not imported`);
  }

  const dest = path.join(publicDir, 'trace', run);
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest, 'index.html'), page);

  const indexPath = path.join(publicDir, 'trace', 'index.json');
  const prev = fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : [];
  const entry = { address: inp.input.toLowerCase(), chain: inp.chain, run, generated_at: t.generated_at, hops: Number(inp.hops) };
  const next = [...(Array.isArray(prev) ? prev : []).filter((e) => e && e.run !== run), entry].sort((a, b) =>
    a.run < b.run ? 1 : a.run > b.run ? -1 : 0,
  );
  fs.writeFileSync(`${indexPath}.tmp`, `${JSON.stringify(next, null, 2)}\n`);
  fs.renameSync(`${indexPath}.tmp`, indexPath);
  return { entry, bytes: Buffer.byteLength(page), dest };
}

module.exports = { importRun };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: node scripts/import-trace-run.cjs <run directory>');
    process.exit(2);
  }
  try {
    const r = importRun(dir, path.resolve(__dirname, '..', 'public'));
    console.log(`imported ${r.entry.run}: ${r.entry.chain} ${r.entry.address}, ${r.entry.hops} hop(s), ${r.bytes} bytes -> ${path.relative(process.cwd(), r.dest)}/index.html`);
  } catch (e) {
    console.error(`import-trace-run: ${e.message}`);
    process.exit(1);
  }
}
