'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  userId: string;
  roles: string[];
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: string[];
  priority: number;
  group: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', roles: [], priority: 0, group: 'Overview' },
  { label: 'Queue Management', href: '/queue', icon: '📋', roles: ['clinic_staff', 'doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 1, group: 'Clinic Operations' },
  { label: 'Patient Register', href: '/patient/register', icon: '➕', roles: ['clinic_staff', 'admin', 'super_admin'], priority: 3, group: 'Patients' },
  { label: 'Patient Records', href: '/records', icon: '📁', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 2, group: 'Patients' },
  { label: 'Vital Signs', href: '/vitals', icon: '💓', roles: ['nurse', 'doctor', 'admin', 'super_admin'], priority: 4, group: 'Medical' },
  { label: 'FBS Records', href: '/fbs', icon: '🩸', roles: ['nurse', 'doctor', 'admin', 'super_admin'], priority: 5, group: 'Medical' },
  { label: 'Prescriptions', href: '/prescriptions', icon: '💊', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 6, group: 'Medical' },
  { label: 'Dental Records', href: '/dental', icon: '🦷', roles: ['dentist', 'admin', 'super_admin'], priority: 8, group: 'Dental' },
  { label: 'Dispensing', href: '/dispensing', icon: '💊', roles: ['clinic_staff', 'admin', 'super_admin'], priority: 7, group: 'Pharmacy' },
  { label: 'Medicines Inventory', href: '/medicines', icon: '📦', roles: ['admin', 'super_admin'], priority: 12, group: 'Pharmacy' },
  { label: 'Referrals', href: '/referrals', icon: '🔄', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 9, group: 'Documents' },
  { label: 'Follow-ups', href: '/follow-ups', icon: '📅', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 10, group: 'Documents' },
  { label: 'Clearances', href: '/clearances', icon: '✅', roles: ['doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin'], priority: 11, group: 'Documents' },
  { label: 'Incident Reports', href: '/incidents', icon: '⚠️', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 13, group: 'Documents' },
  { label: 'Reports', href: '/reports', icon: '📊', roles: ['admin', 'super_admin'], priority: 15, group: 'Reports' },
  { label: 'Notifications', href: '/notifications', icon: '🔔', roles: [], priority: 14, group: 'Overview' },
  { label: 'User Management', href: '/admin/users', icon: '👥', roles: ['admin', 'super_admin'], priority: 16, group: 'Administration' },
  { label: 'Clinic Management', href: '/admin/clinics', icon: '🏥', roles: ['admin', 'super_admin'], priority: 17, group: 'Administration' },
  { label: 'Carina Assistant', href: '#carina', icon: '🤖', roles: [], priority: 18, group: 'Carina' },
];

export default function Sidebar({ userId, roles }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const isVisible = (item: NavItem) => {
    if (item.roles.length === 0) return true;
    return roles.some(role => item.roles.includes(role));
  };

  const visibleItems = NAV_ITEMS.filter(isVisible).sort((a, b) => a.priority - b.priority);

  const groupedItems = visibleItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleNavClick = (href: string) => {
    if (href === '#carina') {
      window.dispatchEvent(new CustomEvent('carina:toggle'));
      setMobileOpen(false);
      return;
    }
    router.push(href);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-[#0F172A] text-white rounded-lg flex items-center justify-center shadow-lg"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0F172A] text-white flex flex-col transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1E40AF] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">UCIS</h1>
              <p className="text-xs text-[#94A3B8]">Clinic Information System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3 mb-2">
                {group}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  item.href === '#carina' ? (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        pathname === item.href
                          ? 'bg-[#1E40AF] text-white'
                          : 'text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white'
                      }`}
                      aria-current={pathname === item.href ? 'page' : undefined}
                    >
                      <span className="text-lg" aria-hidden="true">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  )
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#1E293B]">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white rounded-lg transition-colors disabled:opacity-50"
            aria-label={loggingOut ? 'Logging out...' : 'Logout'}
          >
            <span className="text-lg" aria-hidden="true">🚪</span>
            <span className="text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
