// Row 1 of /portfolio: what is in the wallet itself. Each number is a mainnet
// read taken at the block named underneath; a balance that could not be read is
// shown as "unavailable", never as 0.

import { fmtAmt, fmtSupraAmt } from '@/lib/mainnetOnchain';
import { fmtUtc } from '../lib/positions';
import type { ChainTime, WalletSnapshot } from '../lib/portfolioData';
import { KV, Row } from './parts';

export default function Balances({ wallet, chain }: { wallet: WalletSnapshot; chain: ChainTime }) {
  const missing = (name: string) => wallet.errors.includes(`${name} balance unavailable`);
  return (
    <Row n="1" title="In your wallet" tone="active">
      <KV k="SUPRA" v={wallet.supra === null ? 'unavailable' : `${fmtSupraAmt(wallet.supra)} SUPRA`} />
      <KV k="COSMO" v={missing('COSMO') ? 'unavailable' : `${fmtAmt(wallet.cosmo)} COSMO`} />
      <KV k="wCOSMO" v={missing('wCOSMO') ? 'unavailable' : `${fmtAmt(wallet.wcosmo)} wCOSMO`} />
      <p className="mt-2 font-mono text-[11px] text-ink-2">
        as of block {chain.height.toLocaleString('en-US')} · chain time {fmtUtc(chain.secs)}
      </p>
      <p className="mt-1 font-sans text-xs text-ink-2">
        Free to use. Everything below is also yours, but not in the wallet. SUPRA also pays the network fee of every transaction.
      </p>
    </Row>
  );
}
