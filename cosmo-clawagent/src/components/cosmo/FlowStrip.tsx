import { Fragment } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// A process as a picture: icon + one or two words per step, arrows between.
// This is the "show before explaining" element that opens a page.
//
// Two layouts:
//  - `row`   stays one line of small steps at every width and wraps instead
//            of scrolling. For first screens, where height is scarce.
//  - `stack` is a column of full-width steps with notes on small screens and
//            a row from `md` up. For the section that explains each step.
//
// Never scrolls sideways: a flow the reader has to drag is a flow they do not
// see.

export type FlowStep = {
  id: string;
  icon: LucideIcon;
  label: string;
  // one short line under the label; shown in `stack`, and from `md` in `row`
  note?: string;
};

export default function FlowStrip({
  steps,
  label,
  layout = 'row',
  // id of the step to emphasise, e.g. the one that is the reader's own action
  highlight,
  className,
}: {
  steps: FlowStep[];
  // what the picture shows, for screen readers
  label: string;
  layout?: 'row' | 'stack';
  highlight?: string;
  className?: string;
}) {
  const stack = layout === 'stack';
  return (
    <ol
      aria-label={label}
      className={cn(
        'flex',
        stack
          ? 'flex-col items-stretch gap-1 md:flex-row md:items-stretch md:gap-0'
          : 'flex-wrap items-start justify-center gap-y-3',
        className,
      )}
    >
      {steps.map((step, i) => {
        const Icon = step.icon;
        const on = step.id === highlight;
        return (
          <Fragment key={step.id}>
            <li
              className={cn(
                stack
                  ? 'flex flex-1 items-center gap-3 rounded-xl border bg-surface-1 px-3 py-3 md:flex-col md:gap-2 md:text-center'
                  : 'flex min-w-[3rem] max-w-[7rem] flex-1 flex-col items-center gap-1.5 text-center',
                stack && (on ? 'border-phase-active/50' : 'border-line-base'),
              )}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-lg border',
                  stack ? 'h-9 w-9' : 'h-9 w-9 sm:h-11 sm:w-11',
                  on
                    ? 'border-phase-active/50 bg-phase-active/15 text-phase-active'
                    : 'border-line-base bg-surface-2 text-ink-0',
                )}
              >
                <Icon className={stack ? 'h-4 w-4' : 'h-4 w-4 sm:h-5 sm:w-5'} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    'text-balance font-medium leading-tight text-ink-0',
                    stack ? 'text-sm' : 'text-[11px] sm:text-sm',
                  )}
                >
                  {step.label}
                </span>
                {step.note && (
                  <span
                    className={cn(
                      'text-pretty leading-snug text-ink-2',
                      stack ? 'text-xs' : 'hidden text-xs md:block',
                    )}
                  >
                    {step.note}
                  </span>
                )}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li
                aria-hidden="true"
                className={cn(
                  'shrink-0 font-mono text-ink-2',
                  stack
                    ? 'self-center py-0.5 text-sm md:px-1.5 md:py-0'
                    : 'flex h-9 items-center text-xs sm:h-11 sm:px-1.5 sm:text-sm',
                )}
              >
                {stack ? (
                  <>
                    <span className="md:hidden">↓</span>
                    <span className="hidden md:inline">→</span>
                  </>
                ) : (
                  '→'
                )}
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
