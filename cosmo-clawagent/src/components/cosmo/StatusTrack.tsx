import { Check, CircleSlash, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Where a job stands, readable at a glance: five stages, one of them current,
// one line underneath saying whose turn it is.
//
// The five stages are the happy path only. A job that left the path (not
// approved, expired, not delivered, disputed, refunded) is shown as an END
// STATE next to the track, never squeezed into one of the five. State is
// always carried by icon + text, never by colour alone.

export const JOB_STAGES = [
  { id: 'waiting', label: 'Waiting' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'running', label: 'Running' },
  { id: 'checking', label: 'Checking' },
  { id: 'paid', label: 'Paid' },
] as const;

export type JobStageId = (typeof JOB_STAGES)[number]['id'];

export type TrackStage = { id: string; label: string };

export type TrackEnd = {
  label: string;
  // `bad`: someone lost something (penalty, rejection). `neutral`: it simply ended.
  tone: 'bad' | 'neutral';
};

export default function StatusTrack({
  stages = JOB_STAGES,
  current,
  note,
  yourTurn = false,
  end,
  label = 'Job status',
  className,
}: {
  stages?: readonly TrackStage[];
  // id of the stage the job is in; with `end` set, the last stage it reached
  current: string;
  // one sentence: what is happening and who acts next
  note?: React.ReactNode;
  // the reader is the one who has to act now
  yourTurn?: boolean;
  end?: TrackEnd;
  label?: string;
  className?: string;
}) {
  const at = stages.findIndex((s) => s.id === current);
  const last = stages.length - 1;
  // The final stage is an outcome, not something in progress.
  const finished = !end && at === last;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ol
        aria-label={label}
        className="grid"
        style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}
      >
        {stages.map((stage, i) => {
          const done = i < at || (finished && i === at);
          const active = i === at && !finished && !end;
          const stopped = i === at && !!end;
          return (
            <li
              key={stage.id}
              aria-current={active ? 'step' : undefined}
              className="relative flex flex-col items-center gap-1.5 px-0.5 text-center"
            >
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-1/2 top-3 h-px w-full -translate-y-1/2',
                    i <= at ? 'bg-phase-settled/50' : 'bg-line-base',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full border bg-surface-0',
                  done && 'border-phase-settled/60 text-phase-settled',
                  active && 'border-phase-active text-phase-active ring-2 ring-phase-active/25',
                  stopped && 'border-line-strong text-ink-1',
                  !done && !active && !stopped && 'border-line-base text-ink-2',
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-1.5 w-1.5 rounded-full bg-current',
                      active && 'animate-pulse motion-reduce:animate-none',
                    )}
                  />
                )}
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] uppercase leading-tight tracking-wide sm:text-[11px] sm:tracking-wider',
                  active ? 'font-bold text-ink-0' : done ? 'text-ink-1' : 'text-ink-2',
                )}
              >
                {stage.label}
                <span className="sr-only">
                  {done ? ' (done)' : active ? ' (now)' : stopped ? ' (stopped here)' : ' (not reached)'}
                </span>
              </span>
              {active && yourTurn && (
                <span className="rounded-full bg-phase-active/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-phase-active">
                  your turn
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {end && (
        <p
          className={cn(
            'inline-flex items-center gap-2 self-start rounded-lg border px-3 py-1.5 text-sm font-medium',
            end.tone === 'bad'
              ? 'border-phase-fault/40 bg-phase-fault/10 text-phase-fault'
              : 'border-line-strong bg-white/[0.03] text-ink-0',
          )}
        >
          {end.tone === 'bad' ? (
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleSlash className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            <span className="sr-only">Ended: </span>
            {end.label}
          </span>
        </p>
      )}

      {note && <p className="text-pretty text-sm leading-relaxed text-ink-1">{note}</p>}
    </div>
  );
}
