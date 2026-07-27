// Honest status box for the demo. The proof is CONTROLLED, not permissionless.
// Keep this copy conservative: no "production-ready", "live market", "autonomous
// agent" or "permissionless" claims.
export default function CaveatBox() {
  return (
    <aside className="mt-8 rounded-xl border border-phase-warn/30 bg-phase-warn/[0.06] p-5">
      <h2 className="font-mono text-sm font-semibold text-phase-warn">
        Controlled Mainnet proof — not permissionless yet
      </h2>
      <p className="mt-2 max-w-3xl font-sans text-sm leading-relaxed text-ink-1">
        This demo uses a test pair and controlled amounts on Supra Mainnet. It proves role separation
        and atomic RFQ settlement. The requesting agent stands in for a future SupraOS demand surface —
        there is no live SupraOS integration in this proof. Permissionless operation remains gated behind
        server-key rotation, hardened quote infrastructure and Stage-2 safety work.
      </p>
    </aside>
  );
}
