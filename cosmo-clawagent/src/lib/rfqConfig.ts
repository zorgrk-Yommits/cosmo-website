// Founder-only RFQ dApp -- chain/target configuration.
//
// Stufe 1 builds + verifies against TESTNET (chain 6) first; the Mainnet flip
// (chain 8) happens only after a green end-to-end loop on chain 6.
//
// The rfq_engine module address is env-driven. Mainnet is live at the founder
// address; testnet needs its own deploy (open follow-up) -- set the env there.

export type RfqTarget = "testnet" | "mainnet";

export const RFQ_TARGET: RfqTarget =
  (process.env.NEXT_PUBLIC_RFQ_TARGET as RfqTarget) ?? "testnet";

const RPC: Record<RfqTarget, string> = {
  testnet: "https://rpc-testnet.supra.com",
  mainnet: "https://rpc-mainnet.supra.com",
};

const CHAIN_ID: Record<RfqTarget, number> = {
  testnet: 6,
  mainnet: 8,
};

// Mainnet rfq_engine is live at the founder/deployer address (D-13/K1 redeploy
// 2026-06-22). Testnet has no canonical deploy yet -> must be set via env.
const MODULE_ADDR_DEFAULT: Record<RfqTarget, string | null> = {
  testnet: null,
  mainnet: "0xf2785bf6510d738d2f58c48ee62f00ec56462a5bf0de4ccfdebd11cd2b1264e1",
};

export const RPC_URL = RPC[RFQ_TARGET];
export const RFQ_CHAIN_ID = CHAIN_ID[RFQ_TARGET];

// Canonical 0x-prefixed module address (for views / display).
export const RFQ_MODULE_ADDR: string =
  process.env.NEXT_PUBLIC_RFQ_MODULE_ADDR ?? MODULE_ADDR_DEFAULT[RFQ_TARGET] ?? "";

export const RFQ_MODULE_NAME = "rfq_engine";

// StarKey's createRawTransactionData wants the module address as a 64-char hex
// string WITHOUT the 0x prefix (see Supra dApp-with-StarKey docs).
export function moduleAddrNo0x(addr: string = RFQ_MODULE_ADDR): string {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function assertConfigured(): void {
  if (!RFQ_MODULE_ADDR) {
    throw new Error(
      `RFQ module address not set for target "${RFQ_TARGET}". ` +
        `Set NEXT_PUBLIC_RFQ_MODULE_ADDR (testnet has no default deploy yet).`,
    );
  }
}
