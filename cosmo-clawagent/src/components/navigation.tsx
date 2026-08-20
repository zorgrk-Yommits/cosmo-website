'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ctaClasses } from '@/components/cosmo/Cta';

// 4-area nav. Retired tracks (/rfq, /community-rfq, /maker-capital, /access,
// /demo) stay reachable via the archive hub at /protocol and direct URLs.
//
// Redesign 2026-07-27: `/` is the landing again, so the Market tab points at
// /market/ and the wordmark carries the home state.
const navLinks: {
  href: string;
  label: string;
  // Extra path prefixes that also highlight this tab (href itself always matches).
  match?: string[];
}[] = [
  { href: '/market/', label: 'Market' },
  { href: '/assurance/', label: 'Trust' },
  { href: '/compute/', label: 'Network', match: ['/vault', '/maker-onboarding'] },
  { href: '/cosmo/', label: '$COSMO', match: ['/wcosmo'] },
  // 2026-08-20: the treasury sale was live on mainnet but reachable only by
  // typing the URL. It gets a real top-level entry — /buy is a product, not a
  // hidden path. It stays a plain nav link, not a second primary CTA: the
  // headline action on this site is still the market, not the token.
  { href: '/buy/', label: 'Buy wCOSMO' },
];

const SALE_HREF = '/buy/';

// The mobile sheet opens under a 64px header on short phones, so the last
// entry can sit below the fold. The sale link is hoisted to the top there —
// on desktop it keeps its natural place at the end of the row.
const mobileLinks = [
  ...navLinks.filter((l) => l.href === SALE_HREF),
  ...navLinks.filter((l) => l.href !== SALE_HREF),
];

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

function isActive(pathname: string, link: (typeof navLinks)[number]): boolean {
  const path = norm(pathname);
  return [link.href, ...(link.match ?? [])].map(norm).some((t) => path === t || path.startsWith(t + '/'));
}

// The wordmark glyph is the settlement rail in miniature: three nodes on a
// line, the last one settled.
function RailMark({ home }: { home: boolean }) {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true" className="shrink-0">
      <line
        x1="3"
        y1="6"
        x2="23"
        y2="6"
        stroke="currentColor"
        strokeOpacity={home ? 0.5 : 0.3}
        strokeWidth="1"
      />
      <circle cx="3" cy="6" r="2" fill="currentColor" fillOpacity={home ? 0.55 : 0.35} />
      <circle cx="13" cy="6" r="2" fill="currentColor" fillOpacity={home ? 0.75 : 0.5} />
      <circle cx="23" cy="6" r="2.6" className="fill-phase-settled" />
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const home = norm(pathname) === '/';

  // The sheet is closed from the link handlers below, not from a route
  // effect — one less cascading render on every navigation.

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        scrolled || menuOpen
          ? 'border-line-base bg-surface-0/85 backdrop-blur-xl'
          : 'border-transparent bg-surface-0/40 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-6">
        <Link
          href="/"
          aria-current={home ? 'page' : undefined}
          className={cn(
            'group flex items-center gap-2.5 rounded-md transition-colors',
            home ? 'text-ink-0' : 'text-ink-1 hover:text-ink-0',
          )}
        >
          <RailMark home={home} />
          <span className="font-mono text-sm font-bold tracking-[0.16em]">COSMO</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3.5 py-2 font-mono text-[13px] transition-colors',
                  active
                    ? 'bg-white/[0.06] text-ink-0'
                    : 'text-ink-2 hover:bg-white/[0.03] hover:text-ink-0',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/market/post/" className={cn(ctaClasses('primary', 'sm'), 'ml-3')}>
            Post a job
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-md p-1.5 text-ink-1 transition-colors hover:text-ink-0 md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="flex flex-col gap-1 border-t border-line-base bg-surface-0/95 px-5 py-4 md:hidden"
        >
          {mobileLinks.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-3 font-mono text-sm transition-colors',
                  active ? 'bg-white/[0.06] text-ink-0' : 'text-ink-2 hover:text-ink-0',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/market/post/"
            onClick={() => setMenuOpen(false)}
            className={cn(ctaClasses('primary', 'md', true), 'mt-2')}
          >
            Post a job
          </Link>
        </div>
      )}
    </nav>
  );
}
