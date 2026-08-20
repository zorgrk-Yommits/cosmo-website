// Post-build guard: the built /buy page must not contradict the chain.
//
// WHY THIS EXISTS (incident 2026-08-20)
// NEXT_PUBLIC_SALE_LIVE=1 was set inline on the 2026-07-19 build command and
// never persisted. Two real mainnet buys ran through that build, one of them
// external. The next unrelated rebuild (2026-07-27 token mapping, again
// 2026-08-16 manifesto v5) dropped the flag and silently disabled the buy
// path, while cosmo_sale stayed published, funded and unpaused and the quote
// server kept signing on request. For roughly a month the public page said
// "Not live" about a live sale. Nobody noticed, because nothing checked.
//
// Rule enforced here: if the CHAIN is selling, the BUILD must be able to buy.
//
// Wired as `postbuild` in package.json, so `npm run build` runs it every time.
// Standalone: npm run check:sale-live
// Exit 0 = consistent, exit 1 = contradiction (fail closed).
//
// LIMIT -- READ THIS BEFORE TRUSTING IT: in this repo `npm run build` writes
// straight into the live-served out/. By the time postbuild runs, a bad
// artifact is ALREADY public. This guard turns a silent month-long outage
// into a loud immediate signal; it does not prevent the window. Real
// prevention means building to a staging dir and promoting only on green.
//
// It also fails closed when the RPC is unreachable, so an offline build
// reports failure even though the artifact may be fine. That is deliberate:
// an unverifiable claim about a live sale is not a pass. Inspect, then use
// `npm run check:sale-live` to re-verify once connectivity is back.
//
// Read-only: one view call, one file read. Never writes, never broadcasts.

const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const RPC = "https://rpc-mainnet.supra.com";
const SALE_ADDR =
  "0xf2785bf6510d738d2f58c48ee62f00ec56462a5bf0de4ccfdebd11cd2b1264e1";
const BUILT_PAGE = join(__dirname, "..", "out", "buy", "index.html");

// The exact string the disabled-build banner renders. If the banner copy in
// BuySaleHelper.tsx changes, change it here too -- a guard that silently stops
// matching is worse than no guard.
const DISABLED_MARKER = "Buy path disabled in this build";
// Legacy wording, kept so an old artifact is still recognised as disabled.
const LEGACY_MARKER = "Not live.";

async function saleStatus() {
  const res = await fetch(`${RPC}/rpc/v1/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: `${SALE_ADDR}::cosmo_sale::sale_status`,
      type_arguments: [],
      arguments: [],
    }),
  });
  if (!res.ok) throw new Error(`view HTTP ${res.status}`);
  const body = await res.json();
  const r = body.result;
  if (!Array.isArray(r) || r.length < 12) {
    throw new Error(`unexpected view shape: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return {
    configured: r[0] === true,
    paused: r[1] === true,
    closed: r[2] === true,
    inventoryRaw: BigInt(r[10]),
  };
}

(async () => {
  if (!existsSync(BUILT_PAGE)) {
    console.error(`FAIL - built page missing: ${BUILT_PAGE}`);
    process.exit(1);
  }
  const html = readFileSync(BUILT_PAGE, "utf-8");
  const buildDisabled =
    html.includes(DISABLED_MARKER) || html.includes(LEGACY_MARKER);

  let chain;
  try {
    chain = await saleStatus();
  } catch (e) {
    // Fail closed: an unverifiable chain state is not a pass.
    console.error(`FAIL - cannot read sale_status: ${e.message}`);
    process.exit(1);
  }

  const chainSelling =
    chain.configured && !chain.paused && !chain.closed && chain.inventoryRaw > 0n;

  console.log(
    `chain : configured=${chain.configured} paused=${chain.paused} ` +
      `closed=${chain.closed} inventory=${chain.inventoryRaw}`,
  );
  console.log(`build : buyPathDisabled=${buildDisabled}`);

  if (chainSelling && buildDisabled) {
    console.error(
      "FAIL - the chain is selling but this build disables the buy path.\n" +
        "       This is the 2026-08-20 regression. Set NEXT_PUBLIC_SALE_LIVE=1\n" +
        "       in .env.local and rebuild, or pause the sale on-chain first\n" +
        "       (cosmo_sale::set_paused) so page and chain agree.",
    );
    process.exit(1);
  }

  if (!chainSelling && !buildDisabled) {
    console.error(
      "FAIL - this build offers a buy path but the chain is not selling.\n" +
        "       A page must never invite a trade the contract will reject.",
    );
    process.exit(1);
  }

  console.log("PASS - built /buy page and chain state agree.");
})();
