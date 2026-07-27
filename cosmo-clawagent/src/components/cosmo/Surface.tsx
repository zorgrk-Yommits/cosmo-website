import { cn } from '@/lib/utils';

// The panel primitive. Before this existed, `rounded-xl border-white/10
// bg-white/[0.02]` was copy-pasted across ~30 files and drifted. One tone
// scale, one radius, one hairline.

export type SurfaceTone = 'base' | 'raised' | 'inset' | 'quiet';

const TONE: Record<SurfaceTone, string> = {
  // resting panel on the page ground
  base: 'bg-surface-1 border-line-base',
  // a panel that sits on top of another panel
  raised: 'bg-surface-2 border-line-base',
  // wells: hashes, code, transaction records
  inset: 'bg-surface-inset border-line-subtle',
  // barely there — grouping without weight
  quiet: 'bg-white/[0.02] border-line-subtle',
};

export default function Surface({
  tone = 'base',
  interactive = false,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceTone;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border',
        TONE[tone],
        interactive &&
          'transition-colors duration-200 hover:border-line-strong hover:bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
