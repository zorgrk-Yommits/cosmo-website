// Shared button classes for the marketplace flow. One big, unmissable CTA
// per state is the core of the buyer UX — every action button in the flow
// uses CTA_BIG (or CTA_DANGER for recovery actions) so "what do I do next"
// is never a hunt.

export const CTA_BIG =
  'inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-purple-400/60 ' +
  'bg-purple-500/20 px-6 py-4 font-mono text-base font-bold tracking-wide text-purple-100 ' +
  'shadow-[0_0_24px_rgba(168,85,247,0.18)] transition-all hover:border-purple-300 ' +
  'hover:bg-purple-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export const CTA_DANGER =
  'inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-400/60 ' +
  'bg-rose-500/20 px-6 py-4 font-mono text-base font-bold tracking-wide text-rose-100 ' +
  'shadow-[0_0_24px_rgba(244,63,94,0.18)] transition-all hover:border-rose-300 ' +
  'hover:bg-rose-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';

export const BTN_GHOST =
  'inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 font-mono ' +
  'text-[11px] text-slate-400 transition-all hover:border-white/30 hover:text-white ' +
  'disabled:cursor-not-allowed disabled:opacity-50';
