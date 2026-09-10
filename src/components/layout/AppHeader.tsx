'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  List,
  MagnifyingGlass,
  Bell,
  GridFour,
  GearSix,
  SignOut,
  CaretDown,
} from '@phosphor-icons/react';
import { NAVIGATION_REGISTRY } from '@/lib/navigation/registry';
import { UserRole } from '@/lib/navigation/types';

interface AppHeaderProps {
  userName?: string;
  userRoles?: string[];
}

const HEADER_ITEM_IDS = ['dashboard', 'queue', 'patient-records', 'reports'];

export default function AppHeader({ userName, userRoles }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && userMenuOpen) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [userMenuOpen]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
  }, [supabase, router]);

  const headerLinks = useMemo(() => {
    if (!userRoles) return HEADER_ITEM_IDS
      .map(id => NAVIGATION_REGISTRY.find(item => item.id === id))
      .filter(Boolean)
      .map(item => ({ label: item!.label, href: item!.href }));

    return HEADER_ITEM_IDS
      .map(id => NAVIGATION_REGISTRY.find(item => item.id === id))
      .filter(Boolean)
      .filter(item => {
        if (!item!.requiredRoles) return true;
        return (userRoles as UserRole[]).some(role =>
          item!.requiredRoles!.includes(role) || role === 'super_admin'
        );
      })
      .map(item => ({ label: item!.label, href: item!.href }));
  }, [userRoles]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] h-16 flex items-center px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
        className="lg:hidden mr-3 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
        aria-label="Toggle sidebar"
      >
        <List size={20} className="text-[#6B7280]" weight="regular" />
      </button>

      {/* Desktop collapse toggle */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('sidebar:toggle'))}
        className="hidden lg:flex mr-4 w-10 h-10 items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#6B7280]">
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Navigation links */}
      <nav className="hidden md:flex items-center gap-1" aria-label="Header navigation">
        {headerLinks.map(link => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'text-[#111827] bg-[#F3F4F6]'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
          aria-label="Search"
        >
          <MagnifyingGlass size={20} className="text-[#6B7280]" weight="regular" />
        </button>

        {/* Notifications */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={20} className="text-[#6B7280]" weight="regular" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full" />
        </button>

        {/* Quick actions */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
          aria-label="Quick actions"
        >
          <GridFour size={20} className="text-[#6B7280]" weight="regular" />
        </button>

        {/* Settings */}
        <button
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors"
          aria-label="Settings"
        >
          <GearSix size={20} className="text-[#6B7280]" weight="regular" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-[#E5E7EB] mx-2" />

        {/* User avatar with dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-[#374151] max-w-[100px] truncate">
              {userName || 'User'}
            </span>
            <CaretDown size={14} className={`text-[#6B7280] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} weight="bold" />
          </button>

          {/* Dropdown menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-2 z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E40AF] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827] truncate">{userName || 'User'}</p>
                    {userRoles && userRoles.length > 0 && (
                      <p className="text-xs text-[#9CA3AF] truncate">
                        {userRoles.slice(0, 2).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors disabled:opacity-50"
              >
                <SignOut size={18} weight="regular" />
                <span className="text-sm font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
