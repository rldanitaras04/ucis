'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { DEFAULT_CLINIC_ID } from '@/lib/config';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchSystemConfig(configKey: string): Promise<{ success: true; data: { id: string; config_value: string; label: string; sort_order: number; is_active: boolean }[] } | { success: false; error: string }> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('id, config_value, label, sort_order, is_active')
      .eq('config_key', configKey)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchAllSystemConfigs(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .order('config_key', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createSystemConfig(data: {
  config_key: string;
  config_value: string;
  label: string;
  sort_order?: number;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { data: record, error } = await supabase
      .from('system_config')
      .insert({
        config_key: data.config_key,
        config_value: data.config_value,
        label: data.label,
        sort_order: data.sort_order ?? 0,
      })
      .select('id')
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'system_config.create',
      p_resource_type: 'system_config',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateSystemConfig(
  id: string,
  data: { label?: string; sort_order?: number; is_active?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('system_config')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'system_config.update',
      p_resource_type: 'system_config',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deleteSystemConfig(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('system_config')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'system_config.delete',
      p_resource_type: 'system_config',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

// ============================================================
// CLINIC SERVICES
// ============================================================

export async function fetchClinicServices(): Promise<{ success: true; data: { id: string; name: string; category: string; description: string | null; is_active: boolean }[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('clinic_services')
      .select('id, name, category, description, is_active')
      .eq('clinic_id', DEFAULT_CLINIC_ID)
      .order('name', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createClinicService(data: {
  name: string;
  category: string;
  description?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { data: record, error } = await supabase
      .from('clinic_services')
      .insert({
        clinic_id: DEFAULT_CLINIC_ID,
        name: data.name,
        category: data.category,
        description: data.description || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic_service.create',
      p_resource_type: 'clinic_services',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateClinicService(
  id: string,
  data: { name?: string; category?: string; description?: string; is_active?: boolean }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('clinic_services')
      .update(data)
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic_service.update',
      p_resource_type: 'clinic_services',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deleteClinicService(id: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('clinic_services')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic_service.delete',
      p_resource_type: 'clinic_services',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/admin/library');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
