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

export async function fetchOdontograms(patientId?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    let query = supabase
      .from('odontogram_records')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name)), encounter:encounters!encounter_id(id, visit_date, status)')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchOdontogram(recordId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAnyRole('dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('odontogram_records')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name, date_of_birth, gender)), encounter:encounters!encounter_id(id, visit_date, status, clinic:clinics!clinic_id(name), service:clinic_services!service_id(name))')
      .eq('id', recordId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createOdontogram(data: {
  patient_id: string;
  encounter_id: string;
  tooth_data: any;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Only dentists can create odontograms (except super_admin)
    if (!user.roles.includes('dentist') && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    const providerProfileId = user.profile?.id;

    const { data: record, error } = await supabase
      .from('odontogram_records')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id,
        created_by: providerProfileId || user.id,
        tooth_data: data.tooth_data,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'odontogram.create',
      p_resource_type: 'odontogram_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/odontogram');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientOdontogramHistory(patientId: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('odontogram_records')
      .select('id, created_at, notes, encounter:encounters!encounter_id(id, visit_date)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
