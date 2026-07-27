import { cn } from '@/lib/utils';

// Every section on the site opens the same way: a mono kicker that names the
// layer, a sans headline, an optional lead. Consistent vertical rhythm is
// most of what makes a page feel designed rather than assembled.

export default function SectionHeader({
  kicker,
  title,
  lead,
  align = 'left',
  className,
  id,
}: {
  kicker?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  id?: string;
}) {
  return (
    <header
      className={cn('flex flex-col gap-4', align === 'center' && 'items-center text-center', className)}
    >
      {kicker && (
        <span className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-2">
          <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
          {kicker}
        </span>
      )}
      <h2
        id={id}
        className="max-w-3xl text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-ink-0 md:text-[2.6rem]"
      >
        {title}
      </h2>
      {lead && (
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-ink-1 md:text-lg">
          {lead}
        </p>
      )}
    </header>
  );
}
