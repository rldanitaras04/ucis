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
  CaretLeft,
  CaretRight,
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
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div
        className={`flex items-center gap-3 px-4 py-4 border-b border-[#1E293B] ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        <div className="w-10 h-10 bg-[#1E40AF] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">U</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">UCIS</h1>
            <p className="text-xs text-[#94A3B8] truncate">
              Clinic Information System
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto p-3 space-y-4"
        aria-label="Main navigation"
      >
        {sections.map(section => (
          <div key={section.id}>
            {!collapsed && (
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3 mb-2">
                {section.label}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map(item => {
                const Icon = NAV_ICON_MAP[item.id];
                const active = isActive(item.href);
                const isCarina = item.href === '#carina';

                const linkClasses = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-[#1E40AF] text-white'
                    : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                }`;

                const iconElement = Icon ? (
                  <Icon
                    size={20}
                    weight={active ? 'fill' : 'regular'}
                    aria-hidden="true"
                  />
                ) : null;

                if (isCarina) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.href)}
                      className={linkClasses}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                    >
                      {iconElement}
                      {!collapsed && (
                        <span className="text-sm truncate">{item.label}</span>
                      )}
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={linkClasses}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    {iconElement}
                    {!collapsed && (
                      <span className="text-sm truncate">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[#1E293B] p-3 space-y-2">
        {!collapsed && userName && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            {userRoles && userRoles.length > 0 && (
              <p className="text-xs text-[#94A3B8] truncate">
                {userRoles.slice(0, 3).join(' \u00B7 ')}
              </p>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white rounded-lg transition-colors disabled:opacity-50 min-h-[44px] ${
            collapsed ? 'justify-center' : ''
          }`}
          aria-label={loggingOut ? 'Logging out...' : 'Logout'}
        >
          <SignOut size={20} weight="regular" aria-hidden="true" />
          {!collapsed && (
            <span className="text-sm">
              {loggingOut ? 'Logging out...' : 'Logout'}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-12 h-12 bg-[#0F172A] text-white rounded-lg flex items-center justify-center shadow-lg min-h-[44px] min-w-[44px]"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
      >
        {mobileOpen ? (
          <X size={24} weight="bold" />
        ) : (
          <List size={24} weight="bold" />
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-[54]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        id="app-sidebar"
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-[55] bg-[#0F172A] text-white transition-all duration-200 ease-in-out ${
          collapsed ? 'w-[68px]' : 'w-64'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-[#1E293B] border border-[#334155] rounded-full items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#334155] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <CaretRight size={12} weight="bold" />
          ) : (
            <CaretLeft size={12} weight="bold" />
          )}
        </button>
      </aside>

      {/* Mobile sidebar */}
      <aside
        id="app-sidebar-mobile"
        className={`lg:hidden fixed inset-y-0 left-0 z-[55] w-64 bg-[#0F172A] text-white flex flex-col transform transition-transform duration-200 ease-in-out ${
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
