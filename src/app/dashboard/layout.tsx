import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import Sidebar from './sidebar';

export const metadata = {
  title: 'Dashboard',
  description: 'University Medical and Dental Clinic Information System',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar userId={user.id} roles={user.roles} />
      <main className="flex-1 overflow-auto" role="main" aria-label="Dashboard content">
        {children}
      </main>
    </div>
  );
}
