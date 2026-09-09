'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function createClinic(data: {
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  operating_hours?: string;
  is_active: boolean;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: clinic, error } = await supabase
      .from('clinics')
      .insert({
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        capacity: data.capacity || null,
        operating_hours: data.operating_hours || null,
        is_active: data.is_active,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic.create',
      p_resource_type: 'clinics',
      p_resource_id: clinic.id,
      p_outcome: 'success'
    });

    return { success: true, id: clinic.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateClinic(clinicId: string, data: {
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  operating_hours?: string;
  is_active: boolean;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('clinics')
      .update({
        name: data.name,
        description: data.description || null,
        location: data.location || null,
        capacity: data.capacity || null,
        operating_hours: data.operating_hours || null,
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clinicId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic.update',
      p_resource_type: 'clinics',
      p_resource_id: clinicId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deleteClinic(clinicId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('clinics')
      .delete()
      .eq('id', clinicId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clinic.delete',
      p_resource_type: 'clinics',
      p_resource_id: clinicId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
