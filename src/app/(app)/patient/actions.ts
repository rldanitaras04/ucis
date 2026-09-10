'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function registerPatient(data: {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  sex: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  university_id?: string;
  user_type: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: patient, error } = await supabase
      .from('patient_profiles')
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        sex: data.sex,
        blood_type: data.blood_type || null,
        allergies: data.allergies || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        university_id: data.university_id || null,
        user_type: data.user_type,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'patient.register',
      p_resource_type: 'patient_profiles',
      p_resource_id: patient.id,
      p_outcome: 'success'
    });

    revalidatePath('/patient');
    return { success: true, id: patient.id };
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
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

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

    // Get patient profile
    const { data: patientData, error: patientError } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

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

    // Get patient profile
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
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

    // Get patient profile
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
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
