import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import Sidebar from './sidebar';

export const metadata = {
  title: 'UCIS Dashboard',
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
    <div className="flex h-screen bg-gray-100">
      <Sidebar userId={user.id} roles={user.roles} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
