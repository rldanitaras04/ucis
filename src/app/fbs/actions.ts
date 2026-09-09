'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function recordFBS(data: {
  patient_id: string;
  encounter_id?: string;
  fbs_value: number;
  fasting_hours?: number;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('nurse', 'doctor', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    if (!['nurse', 'doctor'].some(r => user.roles.includes(r)) && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    // Auto-classify status
    let status = 'normal';
    if (data.fbs_value >= 126) status = 'high';
    else if (data.fbs_value >= 100) status = 'pre_diabetic';

    const { data: record, error } = await supabase
      .from('fbs_records')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        recorded_by: user.profile?.id || user.id,
        fbs_value: data.fbs_value,
        fasting_hours: data.fasting_hours || null,
        notes: data.notes || null,
        status,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'fbs.record',
      p_resource_type: 'fbs_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
