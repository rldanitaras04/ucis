'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchAdminUsers(): Promise<{ success: true; data: { users: any[]; userRoles: any[]; roles: any[] } } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const [usersResult, userRolesResult, rolesResult] = await Promise.all([
      supabase.from('user_profiles').select('*').order('last_name', { ascending: true }),
      supabase.from('user_roles').select('*, roles(name)').eq('is_active', true),
      supabase.from('roles').select('id, name').order('name'),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (userRolesResult.error) throw userRolesResult.error;

    return {
      success: true,
      data: {
        users: usersResult.data || [],
        userRoles: userRolesResult.data || [],
        roles: rolesResult.data || [],
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function checkAdminAccess(): Promise<{ success: true; isAdmin: boolean } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data: roles } = await supabase
      .from('user_roles')
      .select('roles(name)')
      .eq('user_id', user.id)
      .eq('is_active', true);
    const roleNames = (roles as unknown as { roles: Record<string, unknown> }[])?.map(r => r.roles?.name as string) || [];
    const isAdmin = roleNames.includes('admin') || roleNames.includes('super_admin');
    return { success: true, isAdmin };
  } catch (error) {
    return handleAuthError(error);
  }
}

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

    revalidatePath('/admin/users');
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
