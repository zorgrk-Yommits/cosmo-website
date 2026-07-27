import { Link2, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PhaseTone } from '@/design/tokens';

// One chip for every small piece of state on the site: job status, the
// off-chain/on-chain boundary, roles. Tones are the process-state tokens —
// a chip can never invent a colour that means nothing.

export type ChipTone = PhaseTone | 'neutral';

const TONE: Record<ChipTone, string> = {
  neutral: 'border-line-base bg-white/[0.03] text-ink-1',
  idle: 'border-line-base bg-white/[0.02] text-ink-2',
  active: 'border-phase-active/35 bg-phase-active/10 text-phase-active',
  proof: 'border-phase-proof/35 bg-phase-proof/10 text-phase-proof',
  settled: 'border-phase-settled/35 bg-phase-settled/10 text-phase-settled',
  fault: 'border-phase-fault/35 bg-phase-fault/10 text-phase-fault',
};

export default function Chip({
  tone = 'neutral',
  size = 'md',
  className,
  children,
}: {
  tone?: ChipTone;
  size?: 'sm' | 'md';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider',
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// The trust boundary is rendered, never implied — this is the single place
// that decides what "on-chain" looks like.
export function ChainChip({ onchain, size = 'sm' }: { onchain: boolean; size?: 'sm' | 'md' }) {
  const Icon = onchain ? Link2 : Server;
  return (
    <Chip tone={onchain ? 'settled' : 'idle'} size={size}>
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden="true" />
      {onchain ? 'on-chain' : 'off-chain'}
    </Chip>
  );
}
