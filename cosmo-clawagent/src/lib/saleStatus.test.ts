import { describe, expect, it } from 'vitest';
import { deriveSaleAvailability, type SaleStatusLike } from './saleStatus';

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
