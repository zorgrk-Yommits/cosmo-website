// Single source of truth for the COSMO design system. CSS consumes these via
// the custom properties in globals.css; TypeScript consumers (the WebGL core,
// the SVG rail) import from here so a colour never exists twice.
//
// The palette is deliberately narrow: graphite surfaces, off-white ink, and
// FOUR accents that are bound to process state — never to decoration. If a
// colour appears on the page, it means something is happening.

export const SURFACE = {
  base: '#08090B', // page ground
  panel: '#0D0F13', // resting panel
  raised: '#14171D', // elevated panel / hover
  inset: '#050608', // wells, code, hash blocks
} as const;

export const INK = {
  primary: '#F2F4F7', // headlines, values          ~17:1 on base
  secondary: '#A7B0BC', // body copy                  ~9.1:1 on base
  muted: '#757E8C', // labels, meta                 ~4.8:1 on base
} as const;

export const LINE = {
  subtle: 'rgba(255,255,255,0.06)',
  base: 'rgba(255,255,255,0.10)',
  strong: 'rgba(255,255,255,0.18)',
} as const;

// Process state. `idle` = not reached yet, `active` = in flight, `proof` =
// a hash / signature / attestation exists, `settled` = value has moved,
// `warn` = something needs a human before it can continue, `fault` = dispute,
// slash or a hard failure. Nothing else earns colour.
//
// `warn` and `fault` are deliberately distinct: a deadline running short or a
// blocker the buyer can clear is not the same event as a slashed deposit, and
// collapsing them would make the louder colour meaningless.
export const PHASE = {
  idle: '#4A5260',
  active: '#6E8BFF',
  proof: '#4FD3D9',
  settled: '#46D6A0',
  warn: '#E0A458',
  fault: '#FF6B7E',
} as const;

export type PhaseTone = keyof typeof PHASE;

// three.js wants numbers, not strings.
export const hexToInt = (hex: string): number => parseInt(hex.slice(1), 16);

export const PHASE_INT: Record<PhaseTone, number> = {
  idle: hexToInt(PHASE.idle),
  active: hexToInt(PHASE.active),
  proof: hexToInt(PHASE.proof),
  settled: hexToInt(PHASE.settled),
  warn: hexToInt(PHASE.warn),
  fault: hexToInt(PHASE.fault),
};

// Motion. One easing curve for entrances, one for state changes — a house
// style is more convincing than variety.
export const MOTION = {
  enter: 'power2.out',
  state: 'power1.inOut',
  fast: 0.28,
  base: 0.55,
  slow: 0.9,
} as const;
