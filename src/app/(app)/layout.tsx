import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveNavigation } from '@/lib/navigation';
import { AuthorizationContext } from '@/lib/navigation/types';
import AppShell from '@/components/layout/AppShell';

const BUCKET_NAME = 'ucis-bucket';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

async function getAvatarSignedUrl(supabase: any, avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null;

  const pathMatch = avatarUrl.match(/avatars\/(.+)/);
  if (!pathMatch) return null;

  const path = `avatars/${pathMatch[1]}`;
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

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

  // Get signed URL for avatar
  const supabase = createServerSupabaseClient();
  const avatarUrl = await getAvatarSignedUrl(supabase, user.profile?.avatar_url || null);

  return (
    <AppShell
      sections={sections}
      userName={userName}
      userRoles={user.roles}
      avatarUrl={avatarUrl}
    >
      {children}
    </AppShell>
  );
}
