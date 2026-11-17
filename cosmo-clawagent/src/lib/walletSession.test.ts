import { describe, it, expect } from 'vitest';
import { createWalletSession } from './walletSession';
import type { SupraProvider } from './mainnetOnchain';

const A = '0x0a0571a915579baecd79a26d04ade62a5b35114bd1dad6db31798ea70504e1bb';
const B = '0x11c1c2660dc3e764c6b5b12f084cbbb11028b74686aea7a762e09b2ca651da53';

// A stand-in for window.starkey.supra with call counters. It has no signing
// function that does anything: the session must never need one.
function fakeWallet(opts: { account?: string; chain?: string; seen?: boolean } = {}) {
  const calls = { connect: 0, account: 0, changeNetwork: 0, on: [] as string[], seen: 0 };
  const handlers: Record<string, (() => void)[]> = {};
  const w = { account: opts.account ?? A, chain: opts.chain ?? '8', seen: opts.seen ?? false };
  let release: (() => void) | null = null;
  let holdConnect = false;
  let connectError: unknown = null;
  const provider: SupraProvider = {
    connect: async () => {
      calls.connect++;
      if (holdConnect) await new Promise<void>((ok) => (release = ok));
      if (connectError) throw connectError;
      return [w.account];
    },
    account: async () => {
      calls.account++;
      return [w.account];
    },
    getChainId: async () => ({ chainId: w.chain }),
    changeNetwork: async ({ chainId }) => {
      calls.changeNetwork++;
      w.chain = chainId;
    },
    createRawTransactionData: async () => {
      throw new Error('the session must not build transactions');
    },
    sendTransaction: async () => {
      throw new Error('the session must not sign');
    },
    on: (event, cb) => {
      calls.on.push(event);
      (handlers[event] ||= []).push(cb);
    },
  };
  const session = createWalletSession({
    getProvider: () => provider,
    getAccountSilent: async () => (w.seen ? w.account : null),
    markWalletSeen: () => {
      calls.seen++;
      w.seen = true;
    },
  });
  return {
    session,
    calls,
    w,
    fire: (event: string) => (handlers[event] ?? []).forEach((cb) => cb()),
    hold: () => (holdConnect = true),
    release: () => release?.(),
    failConnect: (e: unknown) => (connectError = e),
  };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('walletSession', () => {
  it('two quick connect clicks open one wallet dialog and share one result', async () => {
    const f = fakeWallet();
    f.hold();
    const p1 = f.session.connect();
    const p2 = f.session.connect();
    expect(p2).toBe(p1);
    expect(f.session.getState().connecting).toBe(true);
    await settle();
    f.release();
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(f.calls.connect).toBe(1);
    expect(s1).toBe(s2);
    expect(s1.status).toBe('connected');
    expect(s1.address).toBe(A);
    expect(s1.connecting).toBe(false);
    expect(f.calls.seen).toBe(1);
  });

  it('a later connect after the first one finished asks the wallet again', async () => {
    const f = fakeWallet();
    await f.session.connect();
    await f.session.connect();
    expect(f.calls.connect).toBe(2);
  });

  it('init registers each wallet listener exactly once, however often it runs', async () => {
    const f = fakeWallet();
    f.session.init();
    f.session.init();
    f.session.init();
    await settle();
    expect(f.calls.on.sort()).toEqual(['accountChanged', 'networkChanged']);
  });

  it('a first-time visitor is not connected and the wallet is never asked', async () => {
    const f = fakeWallet({ seen: false });
    f.session.init();
    await settle();
    expect(f.session.getState().status).toBe('disconnected');
    expect(f.calls.connect).toBe(0);
    expect(f.calls.account).toBe(0);
  });

  it('a browser that connected on the market pages is connected here without a dialog', async () => {
    const f = fakeWallet({ seen: true });
    f.session.init();
    await settle();
    const s = f.session.getState();
    expect(s.status).toBe('connected');
    expect(s.address).toBe(A);
    expect(s.onMainnet).toBe(true);
    expect(f.calls.connect).toBe(0);
  });

  it('loading the page never switches the network; only a connect click does', async () => {
    const f = fakeWallet({ seen: true, chain: '6' });
    f.session.init();
    await settle();
    expect(f.calls.changeNetwork).toBe(0);
    expect(f.session.getState().onMainnet).toBe(false);
    expect(f.session.getState().chainId).toBe('6');
    await f.session.connect();
    expect(f.calls.changeNetwork).toBe(1);
    expect(f.session.getState().onMainnet).toBe(true);
  });

  it('an account change clears the old address at once, then reads the new one', async () => {
    const f = fakeWallet();
    f.session.init();
    await f.session.connect();
    expect(f.session.getState().address).toBe(A);
    f.w.account = B;
    f.fire('accountChanged');
    expect(f.session.getState().address).toBeNull();
    expect(f.session.getState().status).toBe('disconnected');
    await settle();
    expect(f.session.getState().address).toBe(B);
    expect(f.calls.connect).toBe(1);
  });

  it('a network change away from mainnet is seen without a click', async () => {
    const f = fakeWallet();
    f.session.init();
    await f.session.connect();
    f.w.chain = '6';
    f.fire('networkChanged');
    await settle();
    const s = f.session.getState();
    expect(s.status).toBe('connected');
    expect(s.onMainnet).toBe(false);
    expect(f.calls.changeNetwork).toBe(0);
  });

  it('declining in the wallet leaves no error and the next click works', async () => {
    const f = fakeWallet();
    f.failConnect({ code: 4001 });
    const s = await f.session.connect();
    expect(s.status).toBe('disconnected');
    expect(s.error).toBeNull();
    expect(s.connecting).toBe(false);
    f.failConnect(null);
    expect((await f.session.connect()).status).toBe('connected');
  });

  it('without the wallet extension the state says so', async () => {
    const session = createWalletSession({
      getProvider: () => null,
      getAccountSilent: async () => null,
      markWalletSeen: () => {},
    });
    session.init();
    await settle();
    expect(session.getState().status).toBe('no-wallet');
    expect((await session.connect()).status).toBe('no-wallet');
  });
});
