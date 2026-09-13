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

export async function fetchDentalRecords(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('dental_records')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name)), encounter:encounters!encounter_id(id, visit_date, status)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchDentalRecord(recordId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAnyRole('dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('dental_records')
      .select('*, patient:patient_profiles!patient_id(id, blood_type, user_profile:user_profiles!user_profile_id(first_name, last_name, date_of_birth, gender)), encounter:encounters!encounter_id(id, visit_date, status, clinic:clinics!clinic_id(name), service:clinic_services!service_id(name))')
      .eq('id', recordId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createDentalRecord(data: {
  patient_id: string;
  encounter_id: string;
  clinic_id?: string;
  chief_complaint?: string;
  oral_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    if (!user.roles.includes('dentist') && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    const providerProfileId = user.profile?.id;

    const { data: record, error } = await supabase
      .from('dental_records')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id,
        created_by: providerProfileId || user.id,
        chief_complaint: data.chief_complaint || null,
        oral_examination: data.oral_examination || null,
        diagnosis: data.diagnosis || null,
        treatment_plan: data.treatment_plan || null,
        notes: data.notes || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'dental_records.create',
      p_resource_type: 'dental_records',
      p_resource_id: record.id,
      p_outcome: 'success'
    });

    revalidatePath('/dental');
    return { success: true, id: record.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateDentalRecord(recordId: string, data: {
  chief_complaint?: string;
  oral_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Check if record is finalized - cannot update finalized records
    const { data: record } = await supabase
      .from('dental_records')
      .select('status')
      .eq('id', recordId)
      .single();

    if (record?.status === 'finalized') {
      return { success: false, error: 'Cannot modify a finalized record. Use amendment process instead.' };
    }

    const { error } = await supabase
      .from('dental_records')
      .update({
        chief_complaint: data.chief_complaint,
        oral_examination: data.oral_examination,
        diagnosis: data.diagnosis,
        treatment_plan: data.treatment_plan,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'dental_records.update',
      p_resource_type: 'dental_records',
      p_resource_id: recordId,
      p_outcome: 'success'
    });

    revalidatePath('/dental');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function finalizeDentalRecord(recordId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('dental_records')
      .update({
        status: 'finalized',
        finalized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)
      .eq('status', 'draft');

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'dental_records.finalize',
      p_resource_type: 'dental_records',
      p_resource_id: recordId,
      p_outcome: 'success'
    });

    revalidatePath('/dental');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
