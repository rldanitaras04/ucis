'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isValidUserType } from '@/lib/user-type';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function registerPatient(data: {
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  email?: string;
  contact_number?: string;
  date_of_birth: string;
  gender: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  employee_student_id?: string;
  college?: string;
  course?: string;
  year_level?: string;
  department?: string;
  position?: string;
  user_type: string;
  address?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'nurse', 'doctor', 'dentist');
    const supabase = getAdminClient();

    const { data: patientId, error } = await supabase.rpc('register_patient', {
      p_first_name: data.first_name,
      p_middle_name: data.middle_name || null,
      p_last_name: data.last_name,
      p_suffix: data.suffix || null,
      p_date_of_birth: data.date_of_birth,
      p_gender: data.gender,
      p_user_type: data.user_type,
      p_email: data.email || null,
      p_contact_number: data.contact_number || null,
      p_blood_type: data.blood_type || null,
      p_allergies: data.allergies || null,
      p_emergency_contact_name: data.emergency_contact_name || null,
      p_emergency_contact_phone: data.emergency_contact_phone || null,
      p_employee_student_id: data.employee_student_id || null,
      p_address: data.address || null,
      p_college: data.college || null,
      p_course: data.course || null,
      p_year_level: data.year_level || null,
      p_department: data.department || null,
      p_position: data.position || null,
    });

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'patient.register',
      p_resource_type: 'patient_profiles',
      p_resource_id: patientId,
      p_outcome: 'success'
    });

    revalidatePath('/patient');
    return { success: true, id: patientId };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientsAdmin(search?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'nurse', 'doctor', 'dentist');
    const supabase = getAdminClient();

    let q = supabase
      .from('patient_profiles')
      .select('id, user_profile:user_profiles!user_profile_id(first_name, last_name, email, contact_number, gender, user_type, status, date_of_birth)')
      .order('id', { ascending: true });

    const { data, error } = await q;
    if (error) throw error;

    let results = data || [];

    if (search && search.trim().length > 0) {
      const term = search.trim().toLowerCase();
      results = results.filter((row: any) => {
        const profile = row.user_profile;
        if (!profile) return false;
        return (
          (profile.first_name && profile.first_name.toLowerCase().includes(term)) ||
          (profile.last_name && profile.last_name.toLowerCase().includes(term))
        );
      });
    }

    return { success: true, data: results };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientById(patientId: string): Promise<{ success: true; data: any } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*, user_profile:user_profiles!user_profile_id(*)')
      .eq('id', patientId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updatePatient(patientId: string, data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  contact_number?: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  user_type?: string;
  employee_student_id?: string;
  status?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'nurse', 'doctor', 'dentist');
    const supabase = getAdminClient();

    if (data.user_type && !isValidUserType(data.user_type)) {
      return { success: false, error: 'Invalid user type. Must be student, faculty, or non_teaching_staff.' };
    }

    const demographicFields: Record<string, any> = {};
    const patientFields: Record<string, any> = {};

    const demographicKeys = ['first_name', 'last_name', 'email', 'contact_number', 'date_of_birth', 'gender', 'status', 'employee_student_id'];

    for (const [key, value] of Object.entries(data)) {
      if (key === 'user_type') {
        demographicFields['user_type'] = value;
      } else if (demographicKeys.includes(key)) {
        demographicFields[key] = value;
      } else {
        patientFields[key] = value;
      }
    }

    if (Object.keys(patientFields).length > 0) {
      const { error: patientError } = await supabase
        .from('patient_profiles')
        .update(patientFields)
        .eq('id', patientId);

      if (patientError) throw patientError;
    }

    if (Object.keys(demographicFields).length > 0) {
      const { data: patientRecord, error: lookupError } = await supabase
        .from('patient_profiles')
        .select('user_profile_id')
        .eq('id', patientId)
        .single();

      if (lookupError) throw lookupError;

      const { error: profileError } = await getAdminClient()
        .from('user_profiles')
        .update(demographicFields)
        .eq('id', patientRecord.user_profile_id);

      if (profileError) throw profileError;
    }

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'patient.update',
      p_resource_type: 'patient_profiles',
      p_resource_id: patientId,
      p_outcome: 'success'
    });

    revalidatePath('/admin/patients');
    revalidatePath(`/admin/patients/${patientId}`);
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchActiveClinics(): Promise<{ success: true; data: { id: string; name: string }[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('clinic_staff', 'admin', 'super_admin', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('clinics').select('id, name').eq('is_active', true).order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchClinicServices(clinicId: string): Promise<{ success: true; data: { id: string; name: string }[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('clinic_staff', 'admin', 'super_admin', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('clinic_services').select('id, name').eq('clinic_id', clinicId);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function checkInPatient(data: {
  patient_id: string;
  clinic_id: string;
  service_id: string;
}): Promise<{ success: true; queueNumber: number; entryId: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'nurse', 'doctor', 'dentist');
    const supabase = getAdminClient();

    // Check if patient already has an active queue entry today
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('queue_entries')
      .select('id, queue_number, status')
      .eq('patient_id', data.patient_id)
      .eq('queue_date', today)
      .in('status', ['waiting', 'called', 'in_service'])
      .single();

    if (existing) {
      return { success: false, error: `Patient already in queue (#${existing.queue_number}, status: ${existing.status})` };
    }

    // Use the atomic create_queue_entry RPC which handles:
    // - Atomic queue number generation using queue_counters with upsert
    // - Prevents race conditions with concurrent queue entries
    const { data: queueNumber, error: queueError } = await supabase.rpc('create_queue_entry', {
      p_clinic_id: data.clinic_id,
      p_service_id: data.service_id,
      p_patient_id: data.patient_id,
    });

    if (queueError) throw queueError;

    // Get the created entry for the ID
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('id')
      .eq('patient_id', data.patient_id)
      .eq('clinic_id', data.clinic_id)
      .eq('service_id', data.service_id)
      .eq('queue_date', today)
      .eq('queue_number', queueNumber)
      .single();

    if (fetchError) throw fetchError;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'checkin.add_to_queue',
      p_resource_type: 'queue_entries',
      p_resource_id: entry.id,
      p_outcome: 'success'
    });

    revalidatePath('/patient');
    revalidatePath('/queue');
    return { success: true, queueNumber: queueNumber as number, entryId: entry.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientPortalData(): Promise<{
  success: true;
  data: {
    patient: any;
    encounters: any[];
    prescriptions: any[];
    queueEntry: any;
  };
} | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    // Get user_profile_id first, then patient profile
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const { data: patientData, error: patientError } = userProfile
      ? await getAdminClient()
          .from('patient_profiles')
          .select('*, user_profile:user_profiles!user_profile_id(*)')
          .eq('user_profile_id', userProfile.id)
          .single()
      : { data: null, error: { message: 'No user profile found' } };

    if (patientError || !patientData) {
      return {
        success: true,
        data: {
          patient: null,
          encounters: [],
          prescriptions: [],
          queueEntry: null,
        },
      };
    }

    // Fetch encounters
    const { data: encountersData, error: encountersError } = await supabase
      .from('encounters')
      .select('*')
      .eq('patient_id', patientData.id)
      .order('visit_date', { ascending: false })
      .limit(10);

    if (encountersError) throw encountersError;

    // Fetch prescriptions with items
    const { data: prescriptionsData, error: prescriptionsError } = await supabase
      .from('prescriptions')
      .select('*, items:prescription_items(*)')
      .eq('patient_id', patientData.id)
      .order('prescribed_date', { ascending: false })
      .limit(10);

    if (prescriptionsError) throw prescriptionsError;

    // Fetch current queue entry
    const today = new Date().toISOString().split('T')[0];
    const { data: queueData, error: queueError } = await supabase
      .from('queue_entries')
      .select('*, clinic_services(name)')
      .eq('patient_id', patientData.id)
      .eq('queue_date', today)
      .in('status', ['waiting', 'called', 'in_service'])
      .single();

    // Ignore error if no queue entry found
    const queueEntry = queueError ? null : queueData;

    return {
      success: true,
      data: {
        patient: patientData,
        encounters: encountersData || [],
        prescriptions: prescriptionsData || [],
        queueEntry,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientClearances(): Promise<{
  success: true;
  data: any[];
} | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userProfile) return { success: true, data: [] };

    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_profile_id', userProfile.id)
      .single();

    if (!patientData) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('clearances')
      .select('*')
      .eq('patient_id', patientData.id)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientReferrals(): Promise<{
  success: true;
  data: any[];
} | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userProfile) return { success: true, data: [] };

    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('user_profile_id', userProfile.id)
      .single();

    if (!patientData) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('clinical_referrals')
      .select('*')
      .eq('patient_id', patientData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}
