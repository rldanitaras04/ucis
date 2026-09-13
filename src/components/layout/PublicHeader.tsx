'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { List, X } from '@phosphor-icons/react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
];

export default function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/clinic_logo.png"
              alt="UCIS Logo"
              width={40}
              height={40}
              className="rounded-lg"
              priority
            />
            <span className="text-xl font-bold text-[#0F172A]">UCIS</span>
            <span className="hidden md:block text-body text-[#64748B] ml-2">
              University Clinic Information System
            </span>
          </Link>

          {/* Desktop */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Public navigation">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="text-sm font-medium text-[#334155] hover:text-[#1E40AF] transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login" className="btn-ghost text-[#334155]">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary">
              Register
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white">
          <nav className="px-4 py-3 space-y-1" aria-label="Mobile public navigation">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-[#334155] hover:bg-[#F1F5F9] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-[#E2E8F0] my-2" />
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#334155] hover:bg-[#F1F5F9] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#1E40AF] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
            >
              Register
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
