'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ctaClasses } from '@/components/cosmo/Cta';

// Navigation by what a visitor wants to do (site-clarity plan, positioning
// v6.1), not by product name: get work done, earn, liquidity, my tokens,
// proof. Retired tracks stay reachable via the archive hub at /protocol.
type NavLink = {
  href: string;
  label: string;
  // Extra path prefixes that also highlight this tab (href itself always matches).
  match?: string[];
};

const navLinks: NavLink[] = [
  { href: '/market/', label: 'Get work done' },
  { href: '/compute/', label: 'Earn', match: ['/maker-onboarding'] },
  { href: '/mandates/', label: 'Liquidity' },
  { href: '/portfolio/', label: 'My tokens', match: ['/vault', '/wcosmo'] },
  { href: '/assurance/', label: 'Proof', match: ['/institutional'] },
];

// The token is a product with a real page, but not the headline action: it
// sits after the five tasks, visually quieter. /cosmo is linked from the
// mobile sheet and the footer.
const SALE: NavLink = { href: '/buy/', label: 'Buy wCOSMO' };
const TOKEN: NavLink = { href: '/cosmo/', label: '$COSMO' };

const norm = (p: string) => p.replace(/\/+$/, '') || '/';

function isActive(pathname: string, link: NavLink): boolean {
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
  const navRef = useRef<HTMLElement>(null);
  const home = norm(pathname) === '/';

  // The sheet is closed from the link handlers below, not from a route
  // effect — one less cascading render on every navigation.

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While the sheet is open: Escape closes it, Tab stays inside the nav (the
  // sheet plus its toggle), and the page behind does not scroll.
  useEffect(() => {
    if (!menuOpen) return;
    const nav = navRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !nav) return;
      const items = Array.from(nav.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className={cn(
        'fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300',
        scrolled || menuOpen
          ? 'border-line-base bg-surface-0/85 backdrop-blur-xl'
          : 'border-transparent bg-surface-0/40 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
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

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/[0.06] text-ink-0'
                    : 'text-ink-1 hover:bg-white/[0.03] hover:text-ink-0',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="mx-2 h-5 w-px bg-line-base" aria-hidden="true" />
          <Link
            href={SALE.href}
            aria-current={isActive(pathname, SALE) ? 'page' : undefined}
            className={cn(
              'rounded-lg px-2.5 py-2 font-mono text-[12px] transition-colors',
              isActive(pathname, SALE) ? 'text-ink-0' : 'text-ink-2 hover:text-ink-0',
            )}
          >
            {SALE.label}
          </Link>
          <Link href="/market/post/" className={cn(ctaClasses('primary', 'sm'), 'ml-2')}>
            Post a job
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="rounded-md p-2.5 text-ink-1 transition-colors hover:text-ink-0 lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="flex max-h-[calc(100svh-4rem)] flex-col gap-1 overflow-y-auto border-t border-line-base bg-surface-0/95 px-4 py-4 lg:hidden"
        >
          {navLinks.map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-3 text-base font-medium transition-colors',
                  active ? 'bg-white/[0.06] text-ink-0' : 'text-ink-1 hover:text-ink-0',
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="my-1 h-px bg-line-subtle" aria-hidden="true" />
          {[SALE, TOKEN].map((link) => {
            const active = isActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2.5 font-mono text-sm transition-colors',
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
