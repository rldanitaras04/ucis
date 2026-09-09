'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Get next queue number atomically
    const { data: counter, error: counterError } = await supabase
      .rpc('get_next_queue_number', {
        p_clinic_id: data.clinic_id,
        p_service_id: data.service_id,
        p_queue_date: today,
      });

    let nextNumber: number;
    if (counterError || !counter) {
      const { data: lastEntry } = await supabase
        .from('queue_entries')
        .select('queue_number')
        .eq('clinic_id', data.clinic_id)
        .eq('service_id', data.service_id)
        .eq('queue_date', today)
        .order('queue_number', { ascending: false })
        .limit(1)
        .single();
      nextNumber = (lastEntry?.queue_number || 0) + 1;
    } else {
      nextNumber = counter as number;
    }

    const { data: entry, error } = await supabase
      .from('queue_entries')
      .insert({
        patient_id: data.patient_id,
        clinic_id: data.clinic_id,
        service_id: data.service_id,
        queue_date: today,
        queue_number: nextNumber,
        status: 'waiting',
        priority: 1,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'checkin.add_to_queue',
      p_resource_type: 'queue_entries',
      p_resource_id: entry.id,
      p_outcome: 'success'
    });

    return { success: true, queueNumber: nextNumber, entryId: entry.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
