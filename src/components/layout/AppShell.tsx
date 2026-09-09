'use client';

import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { NavigationSection } from '@/lib/navigation/types';

interface AppShellProps {
  sections: NavigationSection[];
  userName?: string;
  userRoles?: string[];
  children: React.ReactNode;
}

export default function AppShell({
  sections,
  userName,
  userRoles,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen bg-[#F4F6FA]">
      <AppSidebar
        sections={sections}
        userName={userName}
        userRoles={userRoles}
      />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px] transition-all duration-200">
        <AppHeader userName={userName} userRoles={userRoles} />
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
