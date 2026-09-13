'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchIncidents(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('incidents')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name)), reporter:user_profiles!reported_by(first_name, last_name)')
      .order('incident_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createIncident(data: {
  title: string;
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
        title: data.title,
        incident_type: data.incident_type,
        severity: data.severity,
        description: data.description,
        patient_id: data.patient_id || null,
        status: data.status || 'open',
        reported_by: user.id,
        incident_date: new Date().toISOString(),
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

    revalidatePath('/incidents');
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

    revalidatePath('/incidents');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
