import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export interface AuthUser {
  id: string;
  email?: string;
  profile: any;
  roles: string[];
  permissions: string[];
}

/**
 * Get the current authenticated user with profile and roles.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  // Get user roles
  const { data: rolesData } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const roles = rolesData?.map((r: any) => r.roles?.name).filter(Boolean) || [];

  // Get user permissions
  const { data: permsData } = await supabase
    .from('user_roles')
    .select('roles(role_permissions(permissions(name)))')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const permissions = new Set<string>();
  permsData?.forEach((r: any) => {
    r.roles?.role_permissions?.forEach((rp: any) => {
      if (rp.permissions?.name) permissions.add(rp.permissions.name);
    });
  });

  return {
    id: user.id,
    email: user.email,
    profile,
    roles,
    permissions: Array.from(permissions),
  };
}

/**
 * Require authentication. Throws if not authenticated.
 * Use in server actions and server components.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Require a specific role. Throws if user doesn't have the role.
 * super_admin automatically passes all role checks.
 */
export async function requireRole(role: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!user.roles.includes('super_admin') && !user.roles.includes(role)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Require a specific permission. Throws if user doesn't have the permission.
 * super_admin automatically passes all permission checks.
 */
export async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (user.roles.includes('super_admin')) {
    return user;
  }

  if (!user.permissions.includes(permission)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Require one of the specified roles. Throws if user has none of them.
 */
export async function requireAnyRole(...roles: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (user.roles.includes('super_admin')) {
    return user;
  }

  const hasRole = roles.some(r => user.roles.includes(r));
  if (!hasRole) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Check if user has a specific role (without throwing).
 */
export function hasRole(user: AuthUser, role: string): boolean {
  if (user.roles.includes('super_admin')) return true;
  return user.roles.includes(role);
}

/**
 * Check if user has a specific permission (without throwing).
 */
export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.roles.includes('super_admin')) return true;
  return user.permissions.includes(permission);
}

/**
 * Check if user is a clinical provider (doctor, dentist, nurse).
 */
export function isClinicalProvider(user: AuthUser): boolean {
  return hasAnyRole(user, 'doctor', 'dentist', 'nurse');
}

/**
 * Check if user has any of the specified roles.
 */
export function hasAnyRole(user: AuthUser, ...roles: string[]): boolean {
  if (user.roles.includes('super_admin')) return true;
  return roles.some(r => user.roles.includes(r));
}

/**
 * Handle authorization errors in server actions.
 * Returns a consistent error response.
 */
export function handleAuthError(error: any): { success: false; error: string } {
  if (error.message === 'UNAUTHORIZED') {
    return { success: false, error: 'Not authenticated' };
  }
  if (error.message === 'FORBIDDEN') {
    return { success: false, error: 'Insufficient permissions' };
  }
  return { success: false, error: error.message || 'An error occurred' };
}
