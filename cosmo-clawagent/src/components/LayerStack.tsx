// Where COSMO sits in the Supra stack, as a picture.
//
// This replaces three separate "complementary, not a competitor" sentences. Showing the
// layers makes the point the sentences were pleading for: a reader who sees the bands
// does not ask the competitor question. The upper two bands are deliberately muted --
// they are context, and that restraint IS the argument. Only the COSMO band carries
// full colour, glow and a capability line.

const LAYERS = [
  { name: 'SupraOS', role: 'coordinates agents' },
  { name: 'SupraFX', role: 'market & liquidity rails' },
] as const;

export default function LayerStack() {
  return (
    <div
      role="img"
      aria-label="The Supra stack in three layers: SupraOS coordinates agents, SupraFX provides market and liquidity rails, and COSMO sits underneath both as the execution and accountability layer, with no trusted operator in the settlement path."
      className="flex flex-col gap-2"
    >
      {LAYERS.map((layer) => (
        <div
          key={layer.name}
          className="flex flex-col gap-0.5 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
        >
          <span className="font-mono text-sm font-bold text-slate-300 sm:w-28 sm:shrink-0">
            {layer.name}
          </span>
          <span className="font-mono text-xs text-slate-400">{layer.role}</span>
        </div>
      ))}

      {/* COSMO — the layer this page is about. Same grammar as the featured node in
          IntelligenceLoop: #7B2FBE border + purple glow. */}
      <div
        className="flex flex-col gap-0.5 rounded-lg bg-purple-500/[0.06] px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
        style={{
          borderStyle: 'solid',
          borderWidth: '1.5px',
          borderColor: '#7B2FBE',
          boxShadow: '0 0 12px rgba(123,47,190,0.4)',
        }}
      >
        <span className="font-mono text-sm font-bold text-white sm:w-28 sm:shrink-0">COSMO</span>
        <span className="font-mono text-xs text-purple-200">
          execution &amp; accountability
          <span className="text-purple-300/60">
            {' '}
            — no trusted operator in the settlement path
          </span>
        </span>
      </div>
    </div>
  );
}
