import { cn } from '@/lib/utils';
import FlowStrip, { type FlowStep } from './FlowStrip';
import MaturityBadge, { type Maturity } from './MaturityBadge';

// The top of every page, in the order a first-time reader needs it:
//   how real is this -> what is this (one sentence) -> the picture -> what do I do next.
// Everything that needs a second sentence belongs below the intro.

export default function PageIntro({
  maturity,
  maturityDetail,
  title,
  lead,
  flow,
  flowLabel,
  flowHighlight,
  children,
  className,
}: {
  maturity?: Maturity;
  maturityDetail?: string;
  title: React.ReactNode;
  // one plain sentence: what this page is and why you would use it
  lead: React.ReactNode;
  flow?: FlowStep[];
  // required with `flow`: what the picture shows, for screen readers
  flowLabel?: string;
  flowHighlight?: string;
  // the next action: one primary button, at most one secondary
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-5', className)}>
      {maturity && (
        <div>
          <MaturityBadge level={maturity} detail={maturityDetail} />
        </div>
      )}
      <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-ink-0 md:text-5xl">
        {title}
      </h1>
      <p className="max-w-2xl text-pretty text-base leading-relaxed text-ink-1 md:text-lg">{lead}</p>
      {flow && (
        <FlowStrip
          steps={flow}
          label={flowLabel ?? 'How it works'}
          highlight={flowHighlight}
          className="max-w-3xl justify-start py-1"
        />
      )}
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
