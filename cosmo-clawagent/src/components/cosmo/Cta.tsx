import Link from 'next/link';
import { cn } from '@/lib/utils';

// Buttons. The marketplace rule stands: one big, unmissable action per state
// — so `primary` is loud on purpose and everything else stays quiet.

export type CtaVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type CtaSize = 'lg' | 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-mono tracking-wide ' +
  'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40';

const VARIANT: Record<CtaVariant, string> = {
  primary:
    'border border-phase-active/50 bg-phase-active/15 text-phase-active ' +
    'hover:border-phase-active hover:bg-phase-active/25 hover:text-ink-0',
  secondary:
    'border border-line-base bg-transparent text-ink-1 ' +
    'hover:border-line-strong hover:bg-white/[0.03] hover:text-ink-0',
  ghost: 'border border-transparent text-ink-2 hover:text-ink-0',
  danger:
    'border border-phase-fault/50 bg-phase-fault/15 text-phase-fault ' +
    'hover:border-phase-fault hover:bg-phase-fault/25 hover:text-ink-0',
};

const SIZE: Record<CtaSize, string> = {
  lg: 'px-6 py-4 text-base font-bold rounded-xl',
  md: 'px-4 py-2.5 text-sm',
  sm: 'px-3 py-1.5 text-[11px]',
};

export function ctaClasses(
  variant: CtaVariant = 'primary',
  size: CtaSize = 'md',
  full = false,
): string {
  return cn(BASE, VARIANT[variant], SIZE[size], full && 'w-full');
}

type CommonProps = {
  variant?: CtaVariant;
  size?: CtaSize;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function CtaLink({
  href,
  external = false,
  variant,
  size,
  full,
  className,
  children,
}: CommonProps & { href: string; external?: boolean }) {
  const cls = cn(ctaClasses(variant, size, full), className);
  // Static export + trailingSlash: cross-route #hash targets must be plain
  // anchors, next/link swallows the fragment on first navigation.
  if (external || href.startsWith('#') || href.startsWith('http')) {
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function CtaButton({
  variant,
  size,
  full,
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(ctaClasses(variant, size, full), className)} {...rest}>
      {children}
    </button>
  );
}
