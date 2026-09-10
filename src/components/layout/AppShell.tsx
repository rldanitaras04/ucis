'use client';

import { useState, useEffect } from 'react';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { NavigationSection } from '@/lib/navigation/types';

interface AppShellProps {
  sections: NavigationSection[];
  userName?: string;
  userRoles?: string[];
  avatarUrl?: string | null;
  children: React.ReactNode;
}

export default function AppShell({
  sections,
  userName,
  userRoles,
  avatarUrl,
  children,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  useEffect(() => {
    const handleCollapsed = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener('sidebar:collapsed', handleCollapsed as EventListener);
    return () => window.removeEventListener('sidebar:collapsed', handleCollapsed as EventListener);
  }, []);

  const sidebarWidth = isDesktop ? (sidebarCollapsed ? 72 : 260) : 0;

  return (
    <div className="flex h-screen bg-[#F4F6FA]">
      <AppSidebar
        sections={sections}
        userName={userName}
        userRoles={userRoles}
      />
      <div
        className="flex-1 flex flex-col min-w-0 transition-all duration-200"
        style={{ marginLeft: sidebarWidth }}
      >
        <AppHeader userName={userName} userRoles={userRoles} avatarUrl={avatarUrl} />
        <main
          className="flex-1 overflow-auto"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
