'use client';

// Maker vitals — everything shown here is an on-chain fact (views), never
// daemon telemetry. StatusLamp/StatTile are imported from the vault page:
// deliberate shortcut until a third consumer justifies a shared components dir.

import { EXPLORER_ADDR, fmtAmt, shortAddr } from '@/lib/mainnetOnchain';
import StatusLamp, { type LampState } from '@/app/vault/components/StatusLamp';
import StatTile from '@/app/vault/components/StatTile';
import { K1_ADDR, type MakerVitals as Vitals } from '../lib/rfqActivity';

function lampOf(v: boolean | null, goodLabel: string, badLabel: string): { state: LampState; label: string } {
  if (v === null) return { state: 'unknown', label: 'Checking…' };
  return v ? { state: 'good', label: goodLabel } : { state: 'critical', label: badLabel };
}

export default function MakerVitals({
  vitals,
  openFunded,
}: {
  vitals: Vitals | null;
  openFunded: number | null; // derived from the live feed (status FUNDED, not expired)
}) {
  const agent = lampOf(vitals?.agentActive ?? null, 'Agent license active', 'Agent license inactive');
  const eligible = lampOf(vitals?.eligible ?? null, 'Eligible to quote', 'Not eligible to quote');

  let deposit: { state: LampState; label: string; detail?: string } = {
    state: 'unknown',
    label: 'Checking…',
  };
  if (vitals) {
    if (vitals.bond === null) {
      deposit = { state: 'critical', label: 'No security deposit found' };
    } else if (vitals.bond.amount === BigInt(0)) {
      deposit = { state: 'critical', label: 'Security deposit empty' };
    } else if (vitals.bond.slashCount > BigInt(0)) {
      deposit = {
        state: 'warning',
        label: 'Penalty deduction recorded',
        detail: `${vitals.bond.slashCount} deduction(s)`,
      };
    } else {
      deposit = {
        state: 'good',
        label: 'Security deposit intact',
        detail: `${fmtAmt(vitals.bond.amount)} wCOSMO`,
      };
    }
  }

  let inventory: { state: LampState; label: string; detail?: string } = {
    state: 'unknown',
    label: 'Checking…',
  };
  if (vitals && vitals.freeInventory !== null) {
    inventory =
      vitals.freeInventory > BigInt(0)
        ? { state: 'good', label: 'Quoting inventory funded', detail: `${fmtAmt(vitals.freeInventory)} wCOSMO` }
        : { state: 'warning', label: 'Quoting inventory drained' };
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        <StatusLamp state={agent.state} label={agent.label} />
        <StatusLamp state={eligible.state} label={eligible.label} />
        <StatusLamp state={deposit.state} label={deposit.label} detail={deposit.detail} />
        <StatusLamp state={inventory.state} label={inventory.label} detail={inventory.detail} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Security deposit"
          value={vitals?.bond ? `${fmtAmt(vitals.bond.amount)} wCOSMO` : '—'}
          sub={vitals?.bond ? `penalty deductions: ${vitals.bond.slashCount}` : undefined}
        />
        <StatTile
          label="Free quoting inventory"
          value={vitals?.freeInventory !== null && vitals?.freeInventory !== undefined ? `${fmtAmt(vitals.freeInventory)} wCOSMO` : '—'}
          sub={`operator wallet ${shortAddr(K1_ADDR)}`}
        />
        <StatTile
          label="Open funded quotes"
          value={openFunded === null ? '—' : String(openFunded)}
          sub="derived from live requests"
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-600">
        Operator wallet on the explorer:{' '}
        <a
          href={`${EXPLORER_ADDR}${K1_ADDR}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 underline hover:text-slate-300"
        >
          {shortAddr(K1_ADDR)}
        </a>
      </p>
    </div>
  );
}
