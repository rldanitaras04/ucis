'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function updateUserRole(userId: string, roleId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('user_roles')
      .update({ role_id: roleId, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'user.update_role',
      p_resource_type: 'user_roles',
      p_resource_id: userId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: status === 'suspended' ? 'user.suspend' : 'user.activate',
      p_resource_type: 'user_profiles',
      p_resource_id: userId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
