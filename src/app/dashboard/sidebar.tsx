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
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', roles: [], priority: 0 },
  { label: 'Queue Management', href: '/queue', icon: '📋', roles: ['clinic_staff', 'doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 1 },
  { label: 'Patient Records', href: '/records', icon: '📁', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 2 },
  { label: 'Patient Register', href: '/patient/register', icon: '➕', roles: ['clinic_staff', 'admin', 'super_admin'], priority: 3 },
  { label: 'Vital Signs', href: '/vitals', icon: '💓', roles: ['nurse', 'doctor', 'admin', 'super_admin'], priority: 4 },
  { label: 'FBS Records', href: '/fbs', icon: '🩸', roles: ['nurse', 'doctor', 'admin', 'super_admin'], priority: 5 },
  { label: 'Prescriptions', href: '/prescriptions', icon: '💊', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 6 },
  { label: 'Dispensing', href: '/dispensing', icon: '💊', roles: ['clinic_staff', 'admin', 'super_admin'], priority: 7 },
  { label: 'Dental Records', href: '/dental', icon: '🦷', roles: ['dentist', 'admin', 'super_admin'], priority: 8 },
  { label: 'Referrals', href: '/referrals', icon: '🔄', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 9 },
  { label: 'Follow-ups', href: '/follow-ups', icon: '📅', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 10 },
  { label: 'Clearances', href: '/clearances', icon: '✅', roles: ['doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin'], priority: 11 },
  { label: 'Medicines Inventory', href: '/medicines', icon: '📦', roles: ['admin', 'super_admin'], priority: 12 },
  { label: 'Incident Reports', href: '/incidents', icon: '⚠️', roles: ['doctor', 'dentist', 'nurse', 'admin', 'super_admin'], priority: 13 },
  { label: 'Notifications', href: '/notifications', icon: '🔔', roles: [], priority: 14 },
  { label: 'Reports', href: '/reports', icon: '📊', roles: ['admin', 'super_admin'], priority: 15 },
  { label: 'User Management', href: '/admin/users', icon: '👥', roles: ['admin', 'super_admin'], priority: 16 },
  { label: 'Clinic Management', href: '/admin/clinics', icon: '🏥', roles: ['admin', 'super_admin'], priority: 17 },
];

export default function Sidebar({ userId, roles }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createClient();

  const isVisible = (item: NavItem) => {
    if (item.roles.length === 0) return true;
    return roles.some(role => item.roles.includes(role));
  };

  const visibleItems = NAV_ITEMS.filter(isVisible).sort((a, b) => a.priority - b.priority);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">UCIS</h1>
        <p className="text-xs text-gray-400">Clinic Information System</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-4 py-3 rounded-lg mb-1 transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span className="mr-3">🚪</span>
          <span className="text-sm">{loggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );
}
