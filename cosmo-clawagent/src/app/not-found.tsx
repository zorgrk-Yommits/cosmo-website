import type { Metadata } from 'next';
import { CtaLink } from '@/components/cosmo/Cta';

export const metadata: Metadata = {
  title: 'Page not found — COSMO',
  robots: { index: false },
};

// A dead end should still say where the three real paths are.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-2xl flex-col justify-center px-4 py-20 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-2">Error 404</p>
      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink-0 md:text-5xl">
        This page does not exist.
      </h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-ink-1">
        The link may be old or mistyped. These are the places most people are looking for:
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <CtaLink href="/market/" variant="primary" size="md">
          Get work done
        </CtaLink>
        <CtaLink href="/compute/" variant="secondary" size="md">
          Earn as a provider
        </CtaLink>
        <CtaLink href="/portfolio/" variant="secondary" size="md">
          My tokens
        </CtaLink>
        <CtaLink href="/" variant="ghost" size="md">
          Start page
        </CtaLink>
      </div>
    </div>
  );
}
