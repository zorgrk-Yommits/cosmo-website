import { Bot, Check, FileCheck2, Wallet } from 'lucide-react';

// Liquidity under rules, as one picture: the funds stay in the owner's wallet,
// a set of rules sits between the owner and the agent, the agent can act only
// through those rules, and every action ends in a record.
//
// The rules shown are the real ones of the test run VLM-001 (source:
// public/mandates/vlm-001/index.html, "What the mandate allowed"), so the
// picture is an example of something that happened, not an illustration of
// something that might.

const RULES = [
  { k: 'How much', v: 'EUR 40 in total, EUR 20 per side' },
  { k: 'Which actions', v: 'open once · collect fees once at most · close once · reset approvals' },
  { k: 'Until when', v: '5 Sep 2026' },
  { k: 'Who owns the position', v: 'the owner of the funds, never the agent' },
];

function Node({ icon: Icon, title, note }: { icon: typeof Wallet; title: string; note: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line-base bg-surface-2 px-4 py-3 md:flex-col md:items-center md:px-3 md:py-4 md:text-center">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line-base bg-surface-1 text-ink-0">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-ink-0">{title}</span>
        <span className="text-xs leading-snug text-ink-2">{note}</span>
      </span>
    </div>
  );
}

const Arrow = () => (
  <span aria-hidden="true" className="self-center font-mono text-sm text-ink-2">
    <span className="md:hidden">↓</span>
    <span className="hidden md:inline">→</span>
  </span>
);

export default function RulesDiagram() {
  return (
    <div
      role="group"
      aria-label="Liquidity under rules: the owner's wallet, then the rules the owner set, then the agent acting only inside those rules, then a record of every action."
      className="rounded-xl border border-line-base bg-surface-1 p-4 md:p-6"
    >
      <div className="grid gap-2 md:grid-cols-[1fr_auto_1.6fr_auto_1fr_auto_1fr] md:items-stretch md:gap-3">
        <Node icon={Wallet} title="Your wallet" note="where the funds come from and go back to" />
        <Arrow />
        <div className="rounded-xl border border-phase-active/50 bg-phase-active/[0.06] p-4">
          <p className="text-sm font-semibold text-ink-0">The rules you set</p>
          <dl className="mt-3 space-y-2.5">
            {RULES.map((r) => (
              <div key={r.k} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-phase-settled" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-ink-2">{r.k}</dt>
                  <dd className="text-sm leading-snug text-ink-0">{r.v}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <Arrow />
        <Node icon={Bot} title="Agent acts" note="only inside the rules; anything else is refused" />
        <Arrow />
        <Node icon={FileCheck2} title="Proof" note="a record of every action, open to checking" />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-2">
        The rules shown are the real ones from the test run VLM-001 on Ethereum mainnet.
      </p>
    </div>
  );
}
