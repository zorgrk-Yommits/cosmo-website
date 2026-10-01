import { describe, expect, it } from 'vitest';
import {
  deriveSaleAvailability,
  formatUnitsFloor,
  soldSharePct,
  type SaleStatusLike,
} from './saleStatus';

// The landing page may only claim the treasury sale is live when the chain
// actually is selling. Every test below is a case where saying "live" would
// be a false statement about real money, so the expected answer is always
// selling:false. The one positive case pins that we still say yes when we may.

const selling: SaleStatusLike = {
  chain: {
    available: true,
    status: {
      configured: true,
      paused: false,
      closed: false,
      inventoryRaw: '23782602601',
    },
  },
  probe: { ok: true, tiles: { effectiveAsk: '0.195076' } },
};

describe('deriveSaleAvailability', () => {
  it('claims live only for a configured, unpaused, funded sale', () => {
    const a = deriveSaleAvailability(selling, true);
    expect(a.selling).toBe(true);
    expect(a.reason).toBe('ok');
    expect(a.effectiveAsk).toBe('0.195076');
    // 6 decimals: raw 23782602601 -> 23782.602601 wCOSMO
    expect(a.inventoryWcosmo).toBeCloseTo(23782.602601, 6);
  });

  it('never claims live when the build has the buy path disabled', () => {
    const a = deriveSaleAvailability(selling, false);
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('build-disabled');
  });

  it('does not claim live before data arrives', () => {
    expect(deriveSaleAvailability(null, true).selling).toBe(false);
    expect(deriveSaleAvailability(null, true).reason).toBe('loading');
    expect(deriveSaleAvailability(undefined, true).selling).toBe(false);
  });

  it('does not claim live when the chain is unreachable', () => {
    const a = deriveSaleAvailability({ chain: { available: false, reason: 'boom' } }, true);
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('unreachable');
  });

  it('does not claim live when the sale is paused', () => {
    const a = deriveSaleAvailability(
      { chain: { available: true, status: { ...selling.chain!.status!, paused: true } } },
      true,
    );
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('paused');
  });

  it('does not claim live when the sale is closed', () => {
    const a = deriveSaleAvailability(
      { chain: { available: true, status: { ...selling.chain!.status!, closed: true } } },
      true,
    );
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('closed');
  });

  it('closed dominates paused, mirroring the on-chain assert order', () => {
    const a = deriveSaleAvailability(
      {
        chain: {
          available: true,
          status: { ...selling.chain!.status!, paused: true, closed: true },
        },
      },
      true,
    );
    expect(a.reason).toBe('closed');
  });

  it('does not claim live when inventory is exhausted', () => {
    const a = deriveSaleAvailability(
      { chain: { available: true, status: { ...selling.chain!.status!, inventoryRaw: '0' } } },
      true,
    );
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('empty');
  });

  it('does not claim live when the module is not configured', () => {
    const a = deriveSaleAvailability(
      { chain: { available: true, status: { ...selling.chain!.status!, configured: false } } },
      true,
    );
    expect(a.selling).toBe(false);
  });

  it('survives a malformed inventory value without claiming live', () => {
    const a = deriveSaleAvailability(
      { chain: { available: true, status: { ...selling.chain!.status!, inventoryRaw: 'NaN' } } },
      true,
    );
    expect(a.selling).toBe(false);
    expect(a.reason).toBe('unreachable');
  });

  it('still sells when the quoter refuses, but reports no ask', () => {
    // A refused probe is a pricing outage, not a closed sale — the contract
    // is still selling and the CTA must stay reachable. We just cannot quote.
    const a = deriveSaleAvailability(
      { ...selling, probe: { ok: false } },
      true,
    );
    expect(a.selling).toBe(true);
    expect(a.effectiveAsk).toBeNull();
  });
});

// Live figures as read on 2026-10-01 (after the +100k topup).
const withFigures: SaleStatusLike = {
  chain: {
    available: true,
    status: {
      configured: true,
      paused: false,
      closed: false,
      inventoryRaw: '119453975947',
      soldLifetime: '15546024053',
      treasuryRaw: '294800000000',
    },
  },
  probe: { ok: true, tiles: { effectiveAsk: '0.239844182631' } },
};

describe('secondary sale figures', () => {
  it('reads sold (6 dec) and treasury (8 dec) from the chain status', () => {
    const a = deriveSaleAvailability(withFigures, true);
    expect(a.selling).toBe(true);
    expect(a.inventoryWcosmo).toBeCloseTo(119453.975947, 6);
    expect(a.soldWcosmo).toBeCloseTo(15546.024053, 6);
    expect(a.treasurySupra).toBeCloseTo(2948, 8);
  });

  it('a malformed secondary field is null and does not touch the live verdict', () => {
    const st = withFigures.chain!.status!;
    const a = deriveSaleAvailability(
      { ...withFigures, chain: { available: true, status: { ...st, soldLifetime: 'abc', treasuryRaw: '-5' } } },
      true,
    );
    expect(a.selling).toBe(true);
    expect(a.soldWcosmo).toBeNull();
    expect(a.treasurySupra).toBeNull();
    expect(a.inventoryWcosmo).toBeCloseTo(119453.975947, 6);
  });

  it('a missing secondary field is null (older quoter payload)', () => {
    const a = deriveSaleAvailability(selling, true);
    expect(a.selling).toBe(true);
    expect(a.soldWcosmo).toBeNull();
    expect(a.treasurySupra).toBeNull();
  });

  it('neutral states carry no figures', () => {
    const st = withFigures.chain!.status!;
    const a = deriveSaleAvailability(
      { ...withFigures, chain: { available: true, status: { ...st, paused: true } } },
      true,
    );
    expect(a.selling).toBe(false);
    expect(a.soldWcosmo).toBeNull();
    expect(a.treasurySupra).toBeNull();
  });
});

describe('display helpers', () => {
  it('floors, never rounds up', () => {
    expect(formatUnitsFloor(119453.975947)).toBe('119,453');
    expect(formatUnitsFloor(23782.602601)).toBe('23,782');
    expect(formatUnitsFloor(2948)).toBe('2,948');
  });

  it('sold share = sold / (sold + available), floored', () => {
    // 15546.02 / 135000.00 = 11.515 % -> 11
    expect(soldSharePct(15546.024053, 119453.975947)).toBe(11);
    // 2/3 = 66.67 % -> 66, not 67
    expect(soldSharePct(2, 1)).toBe(66);
  });

  it('sold share is null when a side is unknown or the total is zero', () => {
    expect(soldSharePct(null, 100)).toBeNull();
    expect(soldSharePct(100, null)).toBeNull();
    expect(soldSharePct(0, 0)).toBeNull();
  });
});
