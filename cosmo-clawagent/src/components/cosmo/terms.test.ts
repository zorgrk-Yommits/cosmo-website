import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { NOT_ENFORCED, TERMS } from './terms';

// The plain-language check is a guard, so it gets held by tests of its own:
// each case states what it must catch and what it must let through.

type Finding = { line: number; term: string; text: string };
const require = createRequire(import.meta.url);
const { scanSource, activePatterns } = require('../../../scripts/check-plain-language.cjs') as {
  scanSource: (source: string, fileName?: string) => Finding[];
  activePatterns: () => [string, RegExp][];
};

const terms = (src: string) => scanSource(src).map((f) => f.term);

describe('plain-language check', () => {
  it('has a pattern for every enforced term in the table', () => {
    const covered = activePatterns().map(([k]) => k);
    for (const k of Object.keys(TERMS)) {
      if ((NOT_ENFORCED as readonly string[]).includes(k)) continue;
      expect(covered).toContain(k);
    }
  });

  it('catches a technical term in JSX text', () => {
    expect(terms('const A = () => <p>Your escrow is funded.</p>;')).toEqual(['escrow']);
  });

  it('catches inflected forms', () => {
    expect(terms('const A = () => <p>The job settled after the provider was slashed.</p>;')).toEqual([
      'settlement',
      'slash',
    ]);
  });

  it('catches strings inside JSX expressions and reader-facing attributes', () => {
    expect(terms("const A = () => <p>{ok ? 'Quote accepted' : 'No offer'}</p>;")).toEqual(['quote']);
    expect(terms('const A = () => <img alt="Provider bond" />;')).toEqual(['bond']);
  });

  it('catches copy held in data: label / title / note properties', () => {
    expect(terms("const S = [{ id: 'x', label: 'Fund escrow' }];")).toEqual(['escrow']);
  });

  it('lets the term through inside TechDetails, code and pre', () => {
    expect(terms('const A = () => <TechDetails><p>Escrow account 0x1</p></TechDetails>;')).toEqual([]);
    expect(terms('const A = () => <p>Calls <code>settle</code></p>;')).toEqual([]);
  });

  it('lets the term through in content passed via a prop named technical, not via other props', () => {
    expect(terms('const A = () => <Job technical={<p>Escrow tx</p>} />;')).toEqual([]);
    expect(terms('const A = () => <Job summary={<p>Escrow tx</p>} />;')).toEqual(['escrow']);
  });

  it('lets the single bracketed pointer through, and nothing wider', () => {
    expect(terms('const A = () => <p>Rules (mandate) set the limits.</p>;')).toEqual([]);
    expect(terms('const A = () => <p>Rules (a signed mandate) set the limits.</p>;')).toEqual(['mandate']);
  });

  it('ignores class names, ids, keys and identifiers', () => {
    expect(terms('const A = () => <p className="escrow-box" id="bond">Locked payment</p>;')).toEqual([]);
    expect(terms("const stage: 'escrow' | 'accept' = 'escrow'; const m = { escrow: 1 };")).toEqual([]);
    expect(terms('const A = () => <p>Calls get_quote_v2 on chain.</p>;')).toEqual([]);
  });

  it('ignores state ids that are only compared against, but not the copy next to them', () => {
    expect(terms("const A = () => <div>{stage === 'escrow' && <p>Lock payment</p>}</div>;")).toEqual([]);
    expect(terms("const A = () => <div>{stage === 'escrow' && <p>Fund the escrow</p>}</div>;")).toEqual(['escrow']);
    expect(terms("const A = () => <p>{busy !== 'settled' ? 'Open' : 'Settled'}</p>;")).toEqual(['settlement']);
  });

  it('lets the product name through, but not the common noun next to it', () => {
    expect(terms('const A = () => <p>The technical name is Verifiable Liquidity Mandates.</p>;')).toEqual([]);
    expect(terms('const A = () => <p>Verifiable Liquidity Mandates: one mandate binds it all.</p>;')).toEqual(['mandate']);
  });

  it('does not flag ordinary words that only contain a term', () => {
    expect(terms('const A = () => <p>A mandatory field. Vagabonds welcome.</p>;')).toEqual([]);
  });
});
