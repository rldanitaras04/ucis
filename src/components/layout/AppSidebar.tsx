'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { NavigationSection } from '@/lib/navigation/types';
import { NAV_ICON_MAP } from './NavIcons';
import {
  List,
  X,
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sidebar:collapsed', { detail: { collapsed } }));
  }, [collapsed]);

  useEffect(() => {
    const handleToggle = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed(prev => !prev);
      } else {
        setMobileOpen(prev => !prev);
      }
    };
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
        <div className={`flex items-center h-16 border-b border-[#E5E7EB] ${collapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
          <div className="w-8 h-8 flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src="/clinic_logo.png"
              alt="UCIS Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          {!collapsed && <span className="text-lg font-semibold text-[#111827]">UCIS</span>}
        </div>

      {/* Navigation */}
      <nav
        className={`flex-1 py-4 space-y-6 ${collapsed ? 'px-2 overflow-y-auto' : 'px-3 overflow-y-auto'}`}
        aria-label="Main navigation"
      >
        {sections.map(section => (
          <div key={section.id}>
            {/* Section header - hidden when collapsed */}
            {!collapsed && (
              <button
                onClick={() => toggleGroup(section.id)}
                className="w-full flex items-center justify-between px-3 mb-2 group"
                aria-expanded={expandedGroups[section.id] !== false}
              >
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
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
            )}

            {/* Section items */}
            {(collapsed || expandedGroups[section.id] !== false) && (
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = NAV_ICON_MAP[item.id];
                  const active = isActive(item.href);
                  const isCarina = item.href === '#carina';

                  const linkContent = (
                    <>
                      {Icon ? (
                        <Icon size={20} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
                      ) : (
                        <Sparkle size={20} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />
                      )}
                      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </>
                  );

                  const activeClass = active
                    ? 'bg-[#EEF2FF] text-[#1E40AF]'
                    : 'text-[#374151] hover:bg-[#F9FAFB]';

                  if (isCarina) {
                    return (
                      <div key={item.id} className="relative group">
                        <button
                          onClick={() => handleNavClick(item.href)}
                          className={`w-full flex items-center gap-3 rounded-lg transition-colors min-h-[40px] ${collapsed ? 'justify-center px-2' : 'px-3 py-2.5'} ${activeClass}`}
                          aria-label={item.label}
                          title={collapsed ? item.label : undefined}
                        >
                          {linkContent}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className="relative group">
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg transition-colors min-h-[40px] ${collapsed ? 'justify-center px-2' : 'px-3 py-2.5'} ${activeClass}`}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {linkContent}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
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
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-[55] bg-white border-r border-[#E5E7EB] transition-all duration-200 ease-in-out overflow-hidden ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
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
