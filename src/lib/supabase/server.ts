import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Server component, can't set cookies
          }
        },
      },
    }
  );
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getUser() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  const admin = getAdminClient();

  const [
    { data: profile },
    { data: roles },
  ] = await Promise.all([
    admin
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single(),
    admin
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  const userRoles = roles?.map((r: any) => r.roles?.name).filter(Boolean) || [];

  return {
    ...user,
    profile,
    roles: userRoles,
  };
}

export async function requireAuth() {
  const user = await getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireRole(role: string) {
  const user = await requireAuth();
  
  if (!user.roles.includes(role) && !user.roles.includes('super_admin')) {
    throw new Error('Forbidden');
  }

  return user;
}
