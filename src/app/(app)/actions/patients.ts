'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createClient } from '@supabase/supabase-js';

export interface PatientSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: string;
  blood_type?: string;
  contact_number?: string;
  email?: string;
  employee_student_id?: string;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function searchPatients(query: string): Promise<{ success: true; data: PatientSearchResult[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const admin = getAdminClient();

    const trimmed = query.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);

    let q = admin
      .from('user_profiles')
      .select('id, first_name, last_name, date_of_birth, gender, contact_number, email, employee_student_id, patient:patient_profiles(id, blood_type)')
      .order('last_name', { ascending: true })
      .limit(20);

    if (isUuid) {
      q = q.or(`id.eq.${trimmed},auth_user_id.eq.${trimmed}`);
    } else {
      q = q.or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%,employee_student_id.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
    }

    const { data, error } = await q;
    if (error) throw error;

    if (!data || data.length === 0) {
      return { success: true, data: [] };
    }

    const results: PatientSearchResult[] = await Promise.all(data.map(async (row: any) => {
      let patientProfileId = row.patient?.id;
      let bloodType = row.patient?.blood_type;

      if (!patientProfileId) {
        const { data: newPatient } = await admin
          .from('patient_profiles')
          .insert({
            user_profile_id: row.id,
            clinic_id: null,
          })
          .select('id')
          .single();

        patientProfileId = newPatient?.id;
      }

      return {
        id: patientProfileId || row.id,
        first_name: row.first_name ?? '',
        last_name: row.last_name ?? '',
        date_of_birth: row.date_of_birth ?? undefined,
        gender: row.gender ?? '',
        blood_type: bloodType ?? undefined,
        contact_number: row.contact_number ?? undefined,
        email: row.email ?? undefined,
        employee_student_id: row.employee_student_id ?? undefined,
      };
    }));

    return { success: true, data: results };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientName(patientProfileId: string): Promise<{ success: true; data: { id: string; first_name: string; last_name: string; employee_student_id?: string } } | { success: false; error: string }> {
  try {
    await requireAuth();
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('patient_profiles')
      .select('id, user_profile:user_profiles!user_profile_id(id, first_name, last_name, employee_student_id)')
      .eq('id', patientProfileId)
      .single();
    if (error) throw error;
    if (!data?.user_profile) return { success: false, error: 'Patient not found' };
    const profile = Array.isArray(data.user_profile) ? data.user_profile[0] : data.user_profile;
    return {
      success: true,
      data: {
        id: data.id,
        first_name: profile.first_name ?? '',
        last_name: profile.last_name ?? '',
        employee_student_id: profile.employee_student_id ?? undefined,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}
