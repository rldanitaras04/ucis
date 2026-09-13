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

export async function fetchFBSRecords(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('fbs_records')
      .select('id, patient_id, recorded_at, fbs_value, fasting_hours, notes, patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name, employee_student_id))')
      .order('recorded_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function recordFBS(data: {
  patient_id: string;
  encounter_id?: string;
  fbs_value: number;
  fasting_hours?: number;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('nurse', 'clinic_staff', 'doctor', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();
    const admin = getAdminClient();

    if (!['nurse', 'clinic_staff', 'doctor'].some(r => user.roles.includes(r)) && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    // Auto-classify status
    const { data: record, error } = await admin
      .from('fbs_records')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        recorded_by: user.id,
        created_by: user.id,
        fbs_value: data.fbs_value,
        fasting_hours: data.fasting_hours || null,
        notes: data.notes || null,
        status: 'draft',
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await admin.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'fbs.record',
      p_resource_type: 'fbs_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/fbs');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
