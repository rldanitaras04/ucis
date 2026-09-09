'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { NavigationSection } from '@/lib/navigation/types';
import { NAV_ICON_MAP } from './NavIcons';
import {
  List,
  X,
  SignOut,
  CaretDown,
  CaretRight,
  Sparkle,
} from '@phosphor-icons/react';

interface AppSidebarProps {
  sections: NavigationSection[];
  userName?: string;
  userRoles?: string[];
}

export default function AppSidebar({
  sections,
  userName,
  userRoles,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    window.addEventListener('sidebar:toggle', handleToggle);
    return () => window.removeEventListener('sidebar:toggle', handleToggle);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
  }, [supabase, router]);

  const handleNavClick = useCallback(
    (href: string) => {
      if (href === '#carina') {
        window.dispatchEvent(new CustomEvent('carina:toggle'));
        setMobileOpen(false);
        return;
      }
      setMobileOpen(false);
    },
    []
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === '#carina') return false;
      return pathname === href || pathname.startsWith(href + '/');
    },
    [pathname]
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#E5E7EB]">
        <div className="w-8 h-8 bg-[#1E40AF] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">U</span>
        </div>
        <span className="text-lg font-semibold text-[#111827]">UCIS</span>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-6"
        aria-label="Main navigation"
      >
        {sections.map(section => (
          <div key={section.id}>
            {/* Section header */}
            <button
              onClick={() => toggleGroup(section.id)}
              className="w-full flex items-center justify-between px-3 mb-2 group"
              aria-expanded={expandedGroups[section.id] !== false}
            >
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                {section.label}
              </span>
              <span className="text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors">
                {expandedGroups[section.id] === false ? (
                  <CaretRight size={12} weight="bold" />
                ) : (
                  <CaretDown size={12} weight="bold" />
                )}
              </span>
            </button>

            {/* Section items */}
            {expandedGroups[section.id] !== false && (
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = NAV_ICON_MAP[item.id];
                  const active = isActive(item.href);
                  const isCarina = item.href === '#carina';
                  const isAISection = section.id === 'AI';

                  if (isCarina) {
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.href)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[40px] ${
                          active
                            ? 'bg-[#EEF2FF] text-[#1E40AF]'
                            : 'text-[#374151] hover:bg-[#F9FAFB]'
                        }`}
                        aria-label={item.label}
                      >
                        {Icon ? (
                          <Icon size={20} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
                        ) : (
                          <Sparkle size={20} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[40px] ${
                        active
                          ? 'bg-[#EEF2FF] text-[#1E40AF]'
                          : 'text-[#374151] hover:bg-[#F9FAFB]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {Icon && (
                        <Icon
                          size={20}
                          weight={active ? 'fill' : 'regular'}
                          className="flex-shrink-0"
                        />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[#E5E7EB] p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-[#1E40AF] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#111827] truncate">{userName || 'User'}</p>
            {userRoles && userRoles.length > 0 && (
              <p className="text-xs text-[#9CA3AF] truncate">
                {userRoles.slice(0, 2).join(' \u00B7 ')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827] rounded-lg transition-colors disabled:opacity-50 min-h-[40px] mt-1"
          aria-label={loggingOut ? 'Logging out...' : 'Logout'}
        >
          <SignOut size={18} weight="regular" />
          <span className="text-sm font-medium">{loggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-10 h-10 bg-white border border-[#E5E7EB] text-[#6B7280] rounded-lg flex items-center justify-center shadow-sm min-h-[44px] min-w-[44px]"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
      >
        {mobileOpen ? (
          <X size={20} weight="bold" />
        ) : (
          <List size={20} weight="bold" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-[54]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        id="app-sidebar"
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-[55] w-[260px] bg-white border-r border-[#E5E7EB] transition-all duration-200 ease-in-out"
        role="navigation"
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        id="app-sidebar-mobile"
        className={`lg:hidden fixed inset-y-0 left-0 z-[55] w-[260px] bg-white border-r border-[#E5E7EB] flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
