'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function checkSuperadminExists(): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'super_admin')
    .single();

  if (!role) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('id')
    .eq('role_id', role.id)
    .eq('is_active', true)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
