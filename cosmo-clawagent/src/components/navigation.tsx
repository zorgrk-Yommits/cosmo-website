'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/strategies', label: 'Strategies' },
  { href: '/tokenomics', label: 'Tokenomics' },
  { href: '/whitepaper', label: 'Whitepaper' },
];

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
            COSMO<span className="text-purple-400">CLAW</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-4 py-2 rounded-lg font-mono text-sm transition-all duration-200',
                pathname === link.href
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/launch"
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-sm font-semibold transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            Launch App →
          </Link>
        </div>

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
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'px-4 py-3 rounded-lg font-mono text-sm transition-all',
                pathname === link.href
                  ? 'bg-purple-500/15 text-purple-300'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/launch"
            onClick={() => setMenuOpen(false)}
            className="mt-2 px-4 py-3 rounded-lg bg-purple-600 text-white font-mono text-sm text-center font-semibold"
          >
            Launch App →
          </Link>
        </div>
      )}
    </nav>
  );
}
