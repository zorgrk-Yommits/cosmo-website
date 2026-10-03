import { cn } from '@/lib/utils';

// The one collapsible for everything an expert wants and a first-time reader
// does not: function names, hashes, raw payloads, explorer links. Native
// <details>, so it works without JavaScript and stays findable with in-page
// search once opened.
//
// Copy inside this element is exempt from the plain-language check
// (scripts/check-plain-language.cjs): technical terms belong here.

export default function TechDetails({
  title = 'Technical details',
  defaultOpen = false,
  className,
  children,
}: {
  title?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cn('group rounded-xl border border-line-base bg-surface-1 p-4', className)}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-1 outline-none focus-visible:ring-2 focus-visible:ring-phase-active/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090B] [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="text-phase-active/70 transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          ›
        </span>
        {title}
      </summary>
      <div className="mt-4 min-w-0 break-words text-sm leading-relaxed text-ink-1">{children}</div>
    </details>
  );
}
