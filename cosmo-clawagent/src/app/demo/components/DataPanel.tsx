'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, Radio, PenLine, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  META,
  supraScanTxUrl,
  truncateHex,
  AMOUNT_FIELDS,
  amountSymbol,
  formatToken,
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
    <div className="rounded-2xl border border-line-base bg-[rgba(15,15,35,0.7)] p-5 backdrop-blur">
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
            <span className="font-mono text-sm text-ink-0">
              <span className="text-ink-2">{step.id}</span> {step.title}
            </span>
            <span className="ml-auto font-mono text-[11px] text-ink-2">
              sender: <span className="text-ink-1">{step.sender}</span>
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
                <div key={i} className="rounded-lg border border-phase-active/20 bg-phase-active/[0.04] p-3">
                  <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-phase-active/80">
                    event · {ev.name}
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    {Object.entries(ev.data).map(([k, v]) => (
                      <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line-subtle py-1">
                        <dt className="font-mono text-[11px] text-ink-2">{k}</dt>
                        <dd className="font-mono text-[11px] tabular-nums text-ink-1 text-right break-all">
                          {formatValue(v)}
                          {AMOUNT_FIELDS.has(k) &&
                            /^\d+$/.test(String(v)) &&
                            amountSymbol(ev.name, k) && (
                              <span className="ml-1 text-ink-2">
                                ({formatToken(Number(v))} {amountSymbol(ev.name, k)})
                              </span>
                            )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}

              {/* SupraScan link for persistent (non-ephemeral) captures — the Mainnet
                  round-trip hashes are live. Ephemeral hashes would render as plain text. */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {META.ephemeral ? (
                  <span
                    title={META.ephemeralReason ?? undefined}
                    className="inline-flex items-center gap-2 rounded-lg border border-line-base px-3 py-2 font-mono text-xs text-ink-1"
                  >
                    {truncateHex(step.txHash, 10, 8)}
                    <span className="text-ink-2">· ephemeral — not a live link</span>
                  </span>
                ) : (
                  <a
                    href={supraScanTxUrl(step.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-phase-active/40 px-3 py-2 font-mono text-xs text-phase-active transition-colors hover:border-phase-active hover:text-phase-active"
                  >
                    View on SupraScan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <span className="font-mono text-[10px] leading-tight text-ink-2">
                  {META.livenessLabel} — {META.capturedLabel}
                </span>
              </div>
            </div>
          )}

          {/* off-chain by design */}
          {step.kind === 'offchain' && (
            <div className="rounded-lg border border-phase-proof/30 bg-phase-proof/[0.05] p-4">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-phase-proof/80">
                off-chain by design — quote-server signature
              </div>
              <p className="font-mono text-[12px] leading-relaxed text-ink-1">
                The maker signs the quote off-chain and hands the signature to the taker. This step
                has no transaction on purpose — the signature is verified on-chain when the quote is
                submitted (see <span className="text-phase-proof">QuoteSubmitted · signature_blob</span>).
                Keeping the signing off-chain is the design, not a gap.
              </p>
            </div>
          )}

          {/* setup / deploy */}
          {step.kind === 'setup' && (
            <div className="rounded-lg border border-line-base bg-surface-1 p-4">
              <div className="mb-1 font-mono text-xs uppercase tracking-wider text-ink-1">
                deploy phase · one-time
              </div>
              <p className="font-mono text-[12px] leading-relaxed text-ink-1">
                A one-time setup action (<span className="text-ink-0">{step.label}</span>). In this
                snapshot the contracts were already live, so this step is marked{' '}
                <span className="text-ink-1">skipped</span> — no transaction was re-issued. It is
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
    onchain: { icon: Radio, cls: 'border-phase-active/40 text-phase-active', text: 'on-chain' },
    offchain: { icon: PenLine, cls: 'border-phase-proof/40 text-phase-proof', text: 'off-chain' },
    setup: { icon: Layers, cls: 'border-line-base text-ink-1', text: 'setup' },
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
    <div className="rounded-lg border border-line-base bg-surface-1 p-3" title={full}>
      <div className="font-mono text-[10px] uppercase tracking-wider text-ink-2">{label}</div>
      <div
        className={cn(
          'mt-1 break-all text-sm',
          mono && 'font-mono',
          accent === 'emerald' ? 'text-phase-settled' : 'text-ink-0',
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
