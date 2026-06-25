// Spike check: prove the RFQ taker-call argument encoding is correct against
// supra-l1-sdk, offline (no browser, no chain). Mirrors the encoders in
// src/lib/supraTx.ts. The actual in-browser StarKey sign+send is verified
// manually by the founder.
//
// Run: node scripts/spike-supratx-check.cjs

const { BCS, TxnBuilderTypes, HexString } = require("supra-l1-sdk");

let fail = 0;
function ok(cond, msg) {
  console.log((cond ? "PASS" : "FAIL") + " - " + msg);
  if (!cond) fail++;
}
function hex(u8) {
  return Buffer.from(u8).toString("hex");
}

// --- encoders (identical to supraTx.ts) ---
const addrArg = (a) => TxnBuilderTypes.AccountAddress.fromHex(a).address;
const u64Arg = (v) => BCS.bcsSerializeUint64(BigInt(v));

// 1. Full 32-byte address -> 32 bytes, exact
const cosmo = "0x11188bb79cd956ab6b8ddff06d64f479358b59ddbd2058a41b447cdf21c17ab0";
const cosmoBytes = addrArg(cosmo);
ok(cosmoBytes.length === 32, "address arg is 32 bytes (got " + cosmoBytes.length + ")");
ok(hex(cosmoBytes) === cosmo.slice(2), "address arg bytes match input hex");

// 2. Short address 0x1 -> left-padded to 32 bytes (HexString would give 1 byte)
const shortBytes = addrArg("0x1");
ok(shortBytes.length === 32, "short address 0x1 padded to 32 bytes (got " + shortBytes.length + ")");
ok(hex(shortBytes) === "00".repeat(31) + "01", "short address padded with leading zeros");
let hsUnusable = false;
try {
  hsUnusable = new HexString("0x1").toUint8Array().length !== 32;
} catch {
  hsUnusable = true; // this SDK throws on unpadded hex -> HexString unusable for short addrs
}
ok(hsUnusable, "control: HexString('0x1') unusable for addresses (throws or != 32) -> AccountAddress needed");

// 3. u64 -> 8 bytes little-endian, round-trips
const amt = 1000000n;
const amtBytes = u64Arg(amt);
ok(amtBytes.length === 8, "u64 arg is 8 bytes (got " + amtBytes.length + ")");
const back = new BCS.Deserializer(amtBytes).deserializeU64();
ok(BigInt(back) === amt, "u64 round-trips via Deserializer (" + back + ")");
ok(hex(amtBytes) === "40420f0000000000", "u64 1000000 is correct little-endian BCS");

// 4. create_request functionArgs shape: [addr, addr, u64, addr, u64, u64]
const createArgs = [
  addrArg("0x1"),
  addrArg(cosmo),
  u64Arg(1000000),
  addrArg("0x4799c7cc256a0cb38d28847eae42be5caf5f21e5272a4d3eef52965c1d00cff6"),
  u64Arg(996000),
  u64Arg(0),
];
ok(createArgs.length === 6, "create_request has 6 functionArgs");
ok(
  createArgs.map((a) => a.length).join(",") === "32,32,8,32,8,8",
  "create_request arg byte-shape 32,32,8,32,8,8 (got " + createArgs.map((a) => a.length).join(",") + ")",
);

// 5. accept_quote functionArgs: 5x u64
const acceptArgs = [u64Arg(1), u64Arg(0), u64Arg(997000), u64Arg(1750000000), u64Arg(60)];
ok(
  acceptArgs.every((a) => a.length === 8) && acceptArgs.length === 5,
  "accept_quote has 5 u64 args of 8 bytes each",
);

console.log("\n" + (fail === 0 ? "GREEN: encoding spike passed" : "RED: " + fail + " check(s) failed"));
process.exit(fail);
