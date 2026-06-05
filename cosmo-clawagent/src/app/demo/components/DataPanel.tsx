'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Radio, PenLine, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  META,
  supraScanTxUrl,
  truncateHex,
  AMOUNT_FIELDS,
  formatToken,
  TOKEN_SYMBOL,
  type LifecycleStep,
} from '../lib/lifecycle';

interface DataPanelProps {
  step: LifecycleStep;
}

// UNTEN — the raw truth for the selected step. Only real snapshot fields:
// tx_hash, block_height, timestamp, vm_status, sender, events[].data.
// SupraScan link appears ONLY for steps with a tx_hash. No fake liveness.
export default function DataPanel({ step }: DataPanelProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(15,15,35,0.7)] p-5 backdrop-blur">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {/* header row */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <KindBadge step={step} />
            <span className="font-mono text-sm text-slate-200">
              <span className="text-slate-500">{step.id}</span> {step.title}
            </span>
            <span className="ml-auto font-mono text-[11px] text-slate-500">
              sender: <span className="text-slate-300">{step.sender}</span>
            </span>
          </div>

          {/* on-chain: full transaction facts */}
          {step.kind === 'onchain' && step.txHash && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="tx_hash" mono value={truncateHex(step.txHash, 10, 8)} full={step.txHash} />
                <Field label="block_height" mono value={step.blockHeight?.toLocaleString('en-US') ?? '—'} />
                <Field label="timestamp" mono value={step.timestamp ?? '—'} />
                <Field label="vm_status" mono value={step.vmStatus ?? '—'} accent="emerald" />
              </div>

              {/* events */}
              {step.events.map((ev, i) => (
                <div key={i} className="rounded-lg border border-purple-500/20 bg-purple-500/[0.04] p-3">
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-purple-300/80">
                    event · {ev.name}
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {Object.entries(ev.data).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1">
                        <dt className="font-mono text-[11px] text-slate-500">{k}</dt>
                        <dd className="font-mono text-[11px] tabular-nums text-slate-300 text-right break-all">
                          {formatValue(v)}
                          {AMOUNT_FIELDS.has(k) && /^\d+$/.test(String(v)) && (
                            <span className="ml-1 text-slate-500">
                              ({formatToken(Number(v))} {TOKEN_SYMBOL})
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}

              {/* SupraScan — honest snapshot label, no live claim */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={supraScanTxUrl(step.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 px-3 py-2 font-mono text-xs text-purple-200 transition-colors hover:border-purple-400 hover:text-purple-100"
                >
                  View on SupraScan
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="font-mono text-[10px] leading-tight text-slate-500">
                  {META.livenessLabel} — {META.capturedLabel}
                </span>
              </div>
            </div>
          )}

          {/* off-chain by design */}
          {step.kind === 'offchain' && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.05] p-4">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-cyan-300/80">
                off-chain by design — quote-server signature
              </div>
              <p className="font-mono text-[12px] leading-relaxed text-slate-300">
                The maker signs the quote off-chain and hands the signature to the taker. This step
                has no transaction on purpose — the signature is verified on-chain when the quote is
                submitted (see <span className="text-cyan-200">QuoteSubmitted · signature_blob</span>).
                Keeping the signing off-chain is the design, not a gap.
              </p>
            </div>
          )}

          {/* setup / deploy */}
          {step.kind === 'setup' && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-slate-400">
                deploy phase · one-time
              </div>
              <p className="font-mono text-[12px] leading-relaxed text-slate-400">
                A one-time setup action (<span className="text-slate-200">{step.label}</span>). In this
                snapshot the contracts were already live, so this step is marked{' '}
                <span className="text-slate-300">skipped</span> — no transaction was re-issued. It is
                shown for completeness, outside the core RFQ loop.
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KindBadge({ step }: { step: LifecycleStep }) {
  const map = {
    onchain: { icon: Radio, cls: 'border-purple-500/40 text-purple-200', text: 'on-chain' },
    offchain: { icon: PenLine, cls: 'border-cyan-500/40 text-cyan-200', text: 'off-chain' },
    setup: { icon: Layers, cls: 'border-white/15 text-slate-400', text: 'setup' },
  } as const;
  const m = map[step.kind];
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider', m.cls)}>
      <Icon className="h-3 w-3" />
      {m.text}
    </span>
  );
}

function Field({
  label,
  value,
  full,
  mono,
  accent,
}: {
  label: string;
  value: string;
  full?: string;
  mono?: boolean;
  accent?: 'emerald';
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3" title={full}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={cn(
          'mt-1 break-all text-sm',
          mono && 'font-mono',
          accent === 'emerald' ? 'text-emerald-200' : 'text-slate-200',
        )}
      >
        {value}
      </div>
    </div>
  );
}

// Render snapshot values: objects (e.g. option vec) compactly, everything else as text.
function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('vec' in obj && Array.isArray(obj.vec)) {
      return obj.vec.length === 0 ? 'none' : JSON.stringify(obj.vec);
    }
    return JSON.stringify(v);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}
