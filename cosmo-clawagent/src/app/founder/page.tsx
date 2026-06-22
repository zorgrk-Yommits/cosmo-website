"use client";

// Founder-only RFQ cockpit entry. Gates on: StarKey present -> connected ->
// COSMO NFT holder (founder). All actions inside are wallet-signed; no deployer
// key is ever present.

import { useWallet } from "@context/WalletContext";
import { RFQ_TARGET, RFQ_CHAIN_ID, RFQ_MODULE_ADDR } from "@/lib/rfqConfig";
import FounderCockpit from "./components/FounderCockpit";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-100">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">COSMO RFQ — Founder Cockpit</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Wallet-signed taker actions against the live RFQ engine. Target:{" "}
          <span className="font-mono text-zinc-300">
            {RFQ_TARGET} (chain {RFQ_CHAIN_ID})
          </span>
        </p>
      </header>
      {children}
    </main>
  );
}

export default function FounderPage() {
  const { connected, address, connect, notFound, isNFTHolder, nftCheckLoading, nftCheckFailed } =
    useWallet();

  if (notFound) {
    return (
      <Shell>
        <p className="text-sm text-amber-400">
          StarKey wallet not detected. Install the StarKey extension and reload.
        </p>
      </Shell>
    );
  }

  if (!connected) {
    return (
      <Shell>
        <button
          onClick={connect}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
        >
          Connect StarKey
        </button>
      </Shell>
    );
  }

  if (nftCheckLoading) {
    return (
      <Shell>
        <p className="text-sm text-zinc-400">Checking founder eligibility…</p>
      </Shell>
    );
  }

  // Founder gate: require a COSMO NFT. If the indexer check failed (not a
  // negative result), let the founder through with a warning rather than lock out.
  if (!isNFTHolder && !nftCheckFailed) {
    return (
      <Shell>
        <p className="text-sm text-rose-400">
          This wallet holds no COSMO operator NFT. Founder cockpit is gated to holders.
        </p>
        <p className="mt-2 font-mono text-xs text-zinc-500">{address}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      {nftCheckFailed && (
        <p className="mb-4 rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          NFT eligibility check failed (indexer unreachable) — proceeding on connected wallet.
        </p>
      )}
      {!RFQ_MODULE_ADDR && (
        <p className="mb-4 rounded border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          No rfq_engine module address configured for target “{RFQ_TARGET}”. Set
          NEXT_PUBLIC_RFQ_MODULE_ADDR (testnet has no default deploy yet).
        </p>
      )}
      <FounderCockpit walletAddress={address ?? ""} />
    </Shell>
  );
}
