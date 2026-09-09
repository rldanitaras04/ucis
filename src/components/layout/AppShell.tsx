'use client';

import AppSidebar from './AppSidebar';
import { NavigationSection } from '@/lib/navigation/types';

interface AppShellProps {
  sections: NavigationSection[];
  userName?: string;
  userRoles?: string[];
  collapsed?: boolean;
  children: React.ReactNode;
}

export default function AppShell({
  sections,
  userName,
  userRoles,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <AppSidebar
        sections={sections}
        userName={userName}
        userRoles={userRoles}
      />
      <main
        className="flex-1 overflow-auto pt-16 lg:pt-0 lg:ml-64 transition-all duration-200"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>
    </div>
  );
}
