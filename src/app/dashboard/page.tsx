import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import DashboardContent from './dashboard-content';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <DashboardContent
      userId={user.id}
      roles={user.roles}
      profile={user.profile}
    />
  );
}
