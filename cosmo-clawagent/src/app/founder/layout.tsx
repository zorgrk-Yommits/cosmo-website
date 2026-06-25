// Founder-only RFQ cockpit. WalletProvider is scoped HERE (not in the root
// layout) so the StarKey wallet + NFT-gate code only loads on /founder, keeping
// it out of the public marketing/demo bundles.
//
// Note: the NFT gate (lib/nftGate.ts) reads NEXT_PUBLIC_TRADEPORT_* keys, which
// land in this client chunk. Acceptable for a founder-only tool; a later
// hardening step can move the holder check behind a server route.

import { WalletProvider } from "@context/WalletContext";

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
