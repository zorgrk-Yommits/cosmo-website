'use client';

// Per-operator tile: bond figures as labeled values, lock state, eligibility
// lamp. Rendered only after the client fetch resolves (no hydration concern
// for the Date-based lock line).

import { shortAddr, fmtAmt } from '@/lib/mainnetOnchain';
import type { OperatorState } from '../lib/vaultData';
import StatusLamp from './StatusLamp';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[11px] text-slate-500">{label}</span>
      <span className="font-mono text-xs text-slate-100">{value}</span>
    </div>
  );
}

export default function OperatorCard({ op, color }: { op: OperatorState; color: string }) {
  const lockedUntilMs = op.bond ? Number(op.bond.lockedUntilSecs) * 1000 : 0;
  const locked = lockedUntilMs > Date.now();

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: color }}
          />
          <div>
            <div className="font-mono text-sm font-bold text-slate-100">{op.label}</div>
            <div className="font-mono text-[11px] text-slate-500">{op.role}</div>
          </div>
        </div>
        <span className="font-mono text-[11px] text-slate-500">{shortAddr(op.addr)}</span>
      </div>

      {op.bond === null ? (
        <div className="space-y-3">
          <p className="font-mono text-xs text-slate-500">No bond entry on-chain.</p>
          <StatusLamp state="unknown" label="No vault entry" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Row label="Bond" value={`${fmtAmt(op.bond.amount)} wCOSMO`} />
            <Row label="Available" value={`${fmtAmt(op.available)} wCOSMO`} />
            <Row label="Slash basis" value={`${fmtAmt(op.slashBasis)} wCOSMO`} />
            <Row label="Slash count" value={String(op.bond.slashCount)} />
            <Row
              label="Lock"
              value={
                locked ? `Locked until ${new Date(lockedUntilMs).toLocaleDateString('en-US')}` : 'Unlocked'
              }
            />
          </div>
          <div className="mt-4">
            <StatusLamp
              state={op.eligible ? 'good' : 'warning'}
              label={op.eligible ? 'Quote eligible' : 'Not eligible'}
            />
          </div>
        </>
      )}
    </div>
  );
}
