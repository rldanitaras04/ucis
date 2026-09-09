import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import { resolveNavigation } from '@/lib/navigation';
import { AuthorizationContext } from '@/lib/navigation/types';
import AppShell from '@/components/layout/AppShell';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const authCtx: AuthorizationContext = {
    userId: user.id,
    roles: user.roles,
    permissions: user.permissions,
    clinicIds: [],
    provider: undefined,
    patient: undefined,
  };

  const sections = resolveNavigation(authCtx);
  const userName = user.profile
    ? `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim()
    : user.email || 'User';

  return (
    <AppShell
      sections={sections}
      userName={userName}
      userRoles={user.roles}
    >
      {children}
    </AppShell>
  );
}
