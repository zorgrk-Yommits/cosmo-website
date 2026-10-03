#!/usr/bin/env node
// Plain-language check (plans/site-clarity-plan.md).
//
// Fails when a technical term from src/components/cosmo/terms.ts shows up in
// copy a visitor reads. The term is fine:
//   - inside <TechDetails>, <code> or <pre>   (that is where it belongs)
//   - alone in brackets: "Rules (mandate)"     (the one pointer for experts)
//   - in files under EXEMPT                    (archive / operator pages)
//
// Files that are not rewritten yet are listed in plain-language-pending.json.
// The list only shrinks: a pending file with no finding left must be removed
// from it, so a page cannot silently fall back once it has been cleaned.
//
// What counts as visible copy: JSX text, strings inside JSX expressions,
// reader-facing JSX attributes (title, aria-label, ...) and object properties
// with a copy-like name (label, title, note, ...). Strings built elsewhere
// (e.g. a sentence returned from a helper function) are NOT seen. This check
// is a floor, not a proof.
//
//   node scripts/check-plain-language.cjs                  check
//   node scripts/check-plain-language.cjs --update-pending rewrite the pending list

const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TERMS_FILE = path.join(SRC, 'components/cosmo/terms.ts');
const PENDING_FILE = path.join(__dirname, 'plain-language-pending.json');

// One pattern per technical term in terms.ts. A term without a pattern fails
// the run, so the table and this check cannot drift apart.
const PATTERNS = {
  quote: /\bquot(?:e|es|ed|ing)\b/gi,
  settlement: /\bsettl(?:e|es|ed|ing|ement|ements)\b/gi,
  escrow: /\bescrow\w*/gi,
  bond: /\bbond(?:s|ed|ing)?\b/gi,
  'security deposit': /\bsecurity deposits?\b/gi,
  slash: /\bslash(?:es|ed|ing)?\b/gi,
  'penalty deduction': /\bpenalty deductions?\b/gi,
  mandate: /\bmandate[sd]?\b/gi,
  artifact: /\bartifacts?\b/gi,
  'acceptance criteria': /\bacceptance criteri(?:a|on)\b/gi,
  solver: /\bsolvers?\b/gi,
  'frozen specification': /\bfrozen spec(?:ification)?s?\b/gi,
  'review window': /\breview windows?\b/gi,
};

// Jargon that has no single replacement word but still needs blockchain
// knowledge: say what it is for instead, or move it into TechDetails.
const EXTRA = {
  RFQ: /\bRFQs?\b/g,
  hash: /\bhash(?:es|ed)?\b/gi,
};

// Not part of the refactor (plan: "Kernseiten voll, Archiv nur Rahmen").
const EXEMPT = [
  'src/app/rfq/',
  'src/app/demo/',
  'src/app/community-rfq/',
  'src/app/maker-capital/',
  'src/app/access/',
  'src/app/protocol/',
  'src/app/institutional/',
  'src/app/founder/',
  'src/app/maker-onboarding/',
  'src/app/market/admin/',
  // paid research product with its own vocabulary; outside the plan's page list
  'src/app/intelligence/',
  'src/components/ProtocolNotice.tsx',
  // the vocabulary table itself
  'src/components/cosmo/terms.ts',
];

const VISIBLE_ATTRS = new Set([
  'title', 'aria-label', 'alt', 'placeholder', 'label', 'lead', 'kicker', 'note', 'hint',
  'detail', 'message', 'flowLabel', 'maturityDetail', 'role',
]);
const VISIBLE_PROPS = new Set([
  'label', 'title', 'note', 'lead', 'kicker', 'text', 'headline', 'sub', 'body', 'hint', 'cta',
  'description', 'next', 'outcome', 'cause', 'remedy', 'meaning', 'detail', 'message', 'action',
  'proof', 'summary', 'status', 'argLabel',
]);
const TECH_TAGS = new Set(['TechDetails', 'code', 'pre']);

function loadTerms() {
  const text = fs.readFileSync(TERMS_FILE, 'utf8');
  const obj = /export const TERMS = \{([\s\S]*?)\} as const;/.exec(text);
  if (!obj) throw new Error('terms.ts: TERMS table not found');
  const keys = [...obj[1].matchAll(/^\s*(?:'([^']+)'|([A-Za-z_]\w*))\s*:/gm)].map((m) => m[1] || m[2]);
  const skip = /export const NOT_ENFORCED[^=]*=\s*\[([^\]]*)\]/.exec(text);
  const notEnforced = skip ? [...skip[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  return { keys, notEnforced };
}

function activePatterns() {
  const { keys, notEnforced } = loadTerms();
  const out = [];
  for (const k of keys) {
    if (notEnforced.includes(k)) continue;
    if (!PATTERNS[k]) throw new Error(`check-plain-language: no pattern for term "${k}" from terms.ts`);
    out.push([k, PATTERNS[k]]);
  }
  for (const [k, re] of Object.entries(EXTRA)) out.push([k, re]);
  return out;
}

// "Rules (mandate)": the term is the whole content of a pair of brackets.
function inBrackets(text, start, end) {
  return /\(\s*$/.test(text.slice(0, start)) && /^\s*\)/.test(text.slice(end));
}

function tagName(node) {
  const el = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
  return el ? el.tagName.getText() : null;
}

// Is this string something a visitor reads?
function isVisible(node) {
  if (ts.isJsxText(node)) return true;
  let viaProp = false;
  for (let p = node.parent, child = node; p; child = p, p = p.parent) {
    if (ts.isJsxAttribute(p)) return VISIBLE_ATTRS.has(p.name.getText());
    if (ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) return true;
    if (ts.isPropertyAssignment(p) && p.initializer === child) {
      const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : '';
      if (VISIBLE_PROPS.has(name)) viaProp = true;
    }
    // a string used as a key, an import path or a type is never copy
    if (ts.isImportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isElementAccessExpression(p)) return false;
  }
  return viaProp;
}

function inTechContainer(node) {
  for (let p = node.parent; p; p = p.parent) {
    const t = tagName(p);
    if (t && TECH_TAGS.has(t)) return true;
  }
  return false;
}

// Returns [{ line, term, text }] for one source file.
function scanSource(source, fileName = 'file.tsx', patterns = activePatterns()) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];
  const check = (node, text) => {
    if (!text || !isVisible(node) || inTechContainer(node)) return;
    for (const [term, re] of patterns) {
      re.lastIndex = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        if (inBrackets(text, m.index, m.index + m[0].length)) continue;
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        findings.push({ line: line + 1, term, text: m[0] });
      }
    }
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) check(node, node.text);
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text);
    else if (ts.isTemplateExpression(node)) {
      check(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' § '));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(full, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}

function main() {
  const update = process.argv.includes('--update-pending');
  const patterns = activePatterns();
  const pending = new Set(fs.existsSync(PENDING_FILE) ? JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')).files : []);

  const byFile = new Map();
  for (const full of listFiles(SRC)) {
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (EXEMPT.some((e) => rel === e || rel.startsWith(e))) continue;
    const f = scanSource(fs.readFileSync(full, 'utf8'), rel, patterns);
    if (f.length) byFile.set(rel, f);
  }

  if (update) {
    const files = [...byFile.keys()].sort();
    fs.writeFileSync(PENDING_FILE, `${JSON.stringify({ files }, null, 2)}\n`);
    console.log(`plain-language: pending list written (${files.length} files)`);
    return;
  }

  let failed = false;
  for (const [rel, f] of byFile) {
    if (pending.has(rel)) continue;
    failed = true;
    for (const x of f) console.error(`${rel}:${x.line}  "${x.text}"  (term: ${x.term})`);
  }
  for (const rel of pending) {
    if (!byFile.has(rel)) {
      failed = true;
      console.error(`${rel}: clean now. Remove it from scripts/plain-language-pending.json.`);
    }
  }
  if (failed) {
    console.error('\nplain-language: FAILED. Use the word from src/components/cosmo/terms.ts, or move the technical term into <TechDetails>.');
    process.exit(1);
  }
  console.log(`plain-language: ok (${pending.size} files still pending rewrite)`);
}

module.exports = { scanSource, activePatterns };

if (require.main === module) main();
