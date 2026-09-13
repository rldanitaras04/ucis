'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchPatients(searchQuery?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();

    let query = supabase
      .from('user_profiles')
      .select('id, first_name, middle_name, last_name, suffix, date_of_birth, gender, employee_student_id, contact_number, email, address, user_type, status, college, course, year_level, department, position, patient:patient_profiles!user_profile_id(id, blood_type, allergies, emergency_contact_name, emergency_contact_phone, clinic_id)')
      .order('last_name', { ascending: true });

    if (searchQuery) {
      query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,employee_student_id.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientProfile(userProfileId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAuth();
    const admin = getAdminClient();

    const [profileResult, patientResult] = await Promise.all([
      admin.from('user_profiles').select('*').eq('id', userProfileId).single(),
      admin.from('patient_profiles').select('*').eq('user_profile_id', userProfileId).maybeSingle(),
    ]);

    if (profileResult.error) throw profileResult.error;

    const profile = profileResult.data;
    const patientProfile = patientResult.data;
    const patientProfileId = patientProfile?.id;

    const [medicalResult, vitalsResult, fbsResult, dentalResult] = patientProfileId
      ? await Promise.all([
          admin.from('medical_records').select('*').eq('patient_id', patientProfileId).order('created_at', { ascending: false }),
          admin.from('vital_signs').select('*').eq('patient_id', patientProfileId).order('recorded_at', { ascending: false }),
          admin.from('fbs_records').select('*').eq('patient_id', patientProfileId).order('created_at', { ascending: false }),
          admin.from('dental_records').select('*').eq('patient_id', patientProfileId).order('created_at', { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

    return {
      success: true,
      data: {
        profile,
        patientProfile,
        medicalRecords: medicalResult.data || [],
        vitalSigns: vitalsResult.data || [],
        fbsRecords: fbsResult.data || [],
        dentalRecords: dentalResult.data || [],
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}
