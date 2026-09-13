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

export async function fetchMedicalRecords(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('encounters')
      .select(`
        id, visit_date, chief_complaint, status, created_at,
        patient:patient_profiles!patient_id(id, blood_type, allergies, user_profile:user_profiles!user_profile_id(first_name, last_name, employee_student_id, user_type, course, year_level, department, position)),
        clinic:clinics!clinic_id(id, name),
        service:clinic_services!service_id(id, name),
        medical_record:medical_records!encounter_id(
          id, chief_complaint, diagnosis, treatment_plan, status, finalized_at
        )
      `)
      .order('visit_date', { ascending: false });

    if (error) throw error;
    const flattened = (data || []).map((row: any) => {
      const p = row.patient as any;
      const profile = p?.user_profile ? (Array.isArray(p.user_profile) ? p.user_profile[0] : p.user_profile) : null;
      return {
        ...row,
        patient: p ? {
          id: p.id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          employee_student_id: profile?.employee_student_id || null,
          user_type: profile?.user_type || null,
          course: profile?.course || null,
          year_level: profile?.year_level || null,
          department: profile?.department || null,
          position: profile?.position || null,
          blood_type: p.blood_type,
          allergies: p.allergies,
        } : null,
      };
    });
    return { success: true, data: flattened };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchMedicalRecordDetail(encounterId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('encounters')
      .select(`
        id, visit_date, chief_complaint, status, created_at,
        patient:patient_profiles!patient_id(id, blood_type, allergies, emergency_contact_name, emergency_contact_phone, user_profile:user_profiles!user_profile_id(first_name, last_name, employee_student_id, user_type, course, year_level, department, position, date_of_birth, gender)),
        clinic:clinics!clinic_id(id, name),
        service:clinic_services!service_id(id, name),
        medical_record:medical_records!encounter_id(
          id, chief_complaint, history_of_present_illness, physical_examination,
          diagnosis, treatment_plan, notes, status, finalized_at, amended_at, created_at, updated_at
        )
      `)
      .eq('id', encounterId)
      .single();

    if (error) throw error;
    const p = data?.patient as any;
    const profile = p?.user_profile ? (Array.isArray(p.user_profile) ? p.user_profile[0] : p.user_profile) : null;
    const flattened = data ? {
      ...data,
      patient: p ? {
        id: p.id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        employee_student_id: profile?.employee_student_id || null,
        user_type: profile?.user_type || null,
        course: profile?.course || null,
        year_level: profile?.year_level || null,
        department: profile?.department || null,
        position: profile?.position || null,
        date_of_birth: profile?.date_of_birth || null,
        gender: profile?.gender || null,
        blood_type: p.blood_type,
        allergies: p.allergies,
        emergency_contact_name: p.emergency_contact_name,
        emergency_contact_phone: p.emergency_contact_phone,
      } : null,
    } : data;
    return { success: true, data: flattened };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchClinicsAndPatients(): Promise<{ success: true; data: { clinics: any[]; patients: any[]; services: any[] } } | { success: false; error: string }> {
  try {
    await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = getAdminClient();

    const [clinicsResult, patientsResult, servicesResult] = await Promise.all([
      supabase.from('clinics').select('id, name').eq('is_active', true).order('name'),
      supabase.from('patient_profiles').select('id, user_profile:user_profiles!user_profile_id(first_name, last_name)').order('id'),
      supabase.from('clinic_services').select('id, name, clinic_id'),
    ]);

    return {
      success: true,
      data: {
        clinics: clinicsResult.data || [],
        patients: patientsResult.data || [],
        services: servicesResult.data || [],
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createEncounter(data: {
  patient_id: string;
  clinic_id: string;
  service_id: string;
  chief_complaint?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: encounter, error } = await supabase
      .from('encounters')
      .insert({
        patient_id: data.patient_id,
        clinic_id: data.clinic_id,
        service_id: data.service_id,
        chief_complaint: data.chief_complaint || null,
        status: 'open',
        visit_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'encounter.create',
      p_resource_type: 'encounters',
      p_resource_id: encounter.id,
      p_outcome: 'success',
    });

    revalidatePath('/medical-records');
    return { success: true, id: encounter.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateEncounterStatus(
  encounterId: string,
  status: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('encounters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', encounterId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'encounter.update_status',
      p_resource_type: 'encounters',
      p_resource_id: encounterId,
      p_outcome: 'success',
    });

    revalidatePath('/medical-records');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function upsertMedicalRecord(data: {
  encounter_id: string;
  patient_id: string;
  chief_complaint?: string;
  history_of_present_illness?: string;
  physical_examination?: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  status?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: existing } = await supabase
      .from('medical_records')
      .select('id, status')
      .eq('encounter_id', data.encounter_id)
      .single();

    if (existing) {
      // Check if record is finalized - cannot update finalized records
      if (existing.status === 'finalized') {
        return { success: false, error: 'Cannot modify a finalized record. Use amendment process instead.' };
      }

      const updateData: Record<string, unknown> = {
        chief_complaint: data.chief_complaint || null,
        history_of_present_illness: data.history_of_present_illness || null,
        physical_examination: data.physical_examination || null,
        diagnosis: data.diagnosis || null,
        treatment_plan: data.treatment_plan || null,
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (data.status === 'finalized') {
        updateData.status = 'finalized';
        updateData.finalized_at = new Date().toISOString();
      } else if (data.status === 'amended') {
        updateData.status = 'amended';
        updateData.amended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', existing.id);

      if (error) throw error;

      await supabase.rpc('write_audit_log', {
        p_actor: user.id,
        p_action: 'medical_record.update',
        p_resource_type: 'medical_records',
        p_resource_id: existing.id,
        p_outcome: 'success',
      });

      revalidatePath('/medical-records');
      return { success: true, id: existing.id };
    } else {
      const { data: record, error } = await supabase
        .from('medical_records')
        .insert({
          encounter_id: data.encounter_id,
          patient_id: data.patient_id,
          created_by: user.id,
          chief_complaint: data.chief_complaint || null,
          history_of_present_illness: data.history_of_present_illness || null,
          physical_examination: data.physical_examination || null,
          diagnosis: data.diagnosis || null,
          treatment_plan: data.treatment_plan || null,
          notes: data.notes || null,
          status: data.status || 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.rpc('write_audit_log', {
        p_actor: user.id,
        p_action: 'medical_record.create',
        p_resource_type: 'medical_records',
        p_resource_id: record.id,
        p_outcome: 'success',
      });

      revalidatePath('/medical-records');
      return { success: true, id: record.id };
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
