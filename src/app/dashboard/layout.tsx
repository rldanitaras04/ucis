'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import { getInitials } from '@/lib/utils';
import type { UserRole } from '@/types/database';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Clinics', href: '/admin/clinics', icon: '🏥' },
  { label: 'Queue', href: '/queue', icon: '📋' },
  { label: 'Reports', href: '/reports', icon: '📈' },
];

const doctorNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Queue', href: '/queue', icon: '📋' },
  { label: 'Records', href: '/records', icon: '📁' },
  { label: 'Prescriptions', href: '/prescriptions', icon: '💊' },
];

const nurseNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Queue', href: '/queue', icon: '📋' },
  { label: 'Patients', href: '/patient', icon: '👤' },
];

const clinicStaffNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Queue', href: '/queue', icon: '📋' },
  { label: 'Register', href: '/patient/register', icon: '➕' },
];

const patientNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'My Records', href: '/patient/records', icon: '📁' },
  { label: 'My Prescriptions', href: '/patient/prescriptions', icon: '💊' },
  { label: 'Queue', href: '/queue', icon: '📋' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Get roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const userRoles = rolesData?.map((r: any) => r.roles?.name).filter(Boolean) || [];
      setRoles(userRoles);
      setLoading(false);
    };

    getUser();
  }, []);

  const getNavItems = (): NavItem[] => {
    if (roles.includes('super_admin') || roles.includes('admin')) {
      return adminNav;
    }
    if (roles.includes('doctor')) {
      return doctorNav;
    }
    if (roles.includes('dentist')) {
      return doctorNav; // Same as doctor for now
    }
    if (roles.includes('nurse')) {
      return nurseNav;
    }
    if (roles.includes('clinic_staff')) {
      return clinicStaffNav;
    }
    return patientNav;
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200">
            <span className="text-xl font-bold text-blue-600">UCIS</span>
            <span className="ml-2 text-xs text-gray-500">Dashboard</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {getInitials(user?.user_metadata?.first_name, user?.user_metadata?.last_name)}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {roles[0] || 'User'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-4 w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="ml-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
