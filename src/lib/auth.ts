import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/database';

const supabase = createClient();

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, metadata?: Record<string, unknown>) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (error) return null;
  return data;
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) return [];
  return data?.map((r: any) => r.roles?.name).filter(Boolean) || [];
}

export async function hasRole(role: UserRole): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { required_role: role });
  if (error) return false;
  return data || false;
}

export async function hasPermission(permission: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_permission', { required_permission: permission });
  if (error) return false;
  return data || false;
}
