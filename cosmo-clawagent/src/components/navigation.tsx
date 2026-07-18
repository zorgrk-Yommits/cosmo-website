'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// 4-area nav (Etappe 1 of the site restructure). Retired tracks (/rfq,
// /community-rfq, /maker-capital, /access, /demo) stay reachable via the
// archive hub at /protocol and direct URLs — they just left the nav.
const navLinks: {
  href: string;
  label: string;
  // Extra path prefixes that also highlight this tab (href itself always matches).
  match?: string[];
}[] = [
  { href: '/', label: 'Market', match: ['/market'] },
  { href: '/assurance', label: 'Trust' },
  { href: '/compute', label: 'Network', match: ['/vault', '/maker-onboarding'] },
  // Etappe 2: `/` is the Market (render-alias of /market); the former landing
  // lives at /cosmo. /wcosmo is the token deep-dive.
  { href: '/cosmo', label: '$COSMO', match: ['/wcosmo'] },
];

function isActive(pathname: string, link: (typeof navLinks)[number]): boolean {
  // trailingSlash export: usePathname can report '/market/' — normalize.
  const path = pathname.replace(/\/+$/, '') || '/';
  return [link.href, ...(link.match ?? [])].some((t) =>
    t === '/' ? path === '/' : path === t || path.startsWith(t + '/')
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-purple-500/20 bg-[#030712]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center group-hover:border-purple-400 transition-colors">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-mono font-bold text-white tracking-wide">
            <span className="text-purple-400">COSMO</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const className = cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200',
              isActive(pathname, link)
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            );
            return (
              <Link key={link.href} href={link.href} className={className}>
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA removed for demo-only build (/launch not part of first release). */}

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-purple-500/20 bg-[#030712]/95 px-6 py-4 flex flex-col gap-2">
          {navLinks.map((link) => {
            const className = cn(
              'px-4 py-3 rounded-lg font-mono text-sm transition-all',
              isActive(pathname, link)
                ? 'bg-purple-500/15 text-purple-300'
                : 'text-slate-400 hover:text-white'
            );
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={className}
              >
                {link.label}
              </Link>
            );
          })}
          {/* Launch App CTA removed for demo-only build (/launch not in first release). */}
        </div>
      )}
    </nav>
  );
}
