import { describe, it, expect } from 'vitest';
import { parseCoinBalance } from './portfolioData';

describe('parseCoinBalance (SUPRA)', () => {
  it('reads the base-unit string the view call returns', () => {
    expect(parseCoinBalance('775575289155')).toBe(BigInt('775575289155'));
    expect(parseCoinBalance('0')).toBe(BigInt(0));
  });

  it('keeps amounts above the safe number range exact', () => {
    expect(parseCoinBalance('9007199254740993123')).toBe(BigInt('9007199254740993123'));
  });

  it('reports an empty or malformed answer as not readable, never as 0', () => {
    for (const v of [undefined, null, '', '12.5', '-1', '0x10', 'abc', {}, [], 1.5, -1, Number.MAX_SAFE_INTEGER + 2]) {
      expect(parseCoinBalance(v)).toBeNull();
    }
  });
});
