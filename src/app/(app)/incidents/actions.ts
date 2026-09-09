'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function createIncident(data: {
  incident_type: string;
  severity: string;
  description: string;
  patient_id?: string;
  status?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: incident, error } = await supabase
      .from('incidents')
      .insert({
        incident_type: data.incident_type,
        severity: data.severity,
        description: data.description,
        patient_id: data.patient_id || null,
        status: data.status || 'open',
        reported_by: user.profile?.id || user.id,
        incident_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'incidents.create',
      p_resource_type: 'incidents',
      p_resource_id: incident.id,
      p_outcome: 'success'
    });

    return { success: true, id: incident.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateIncidentStatus(
  id: string,
  status: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('incidents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'incidents.update_status',
      p_resource_type: 'incidents',
      p_resource_id: id,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
