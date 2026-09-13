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

export async function fetchQueue(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = getAdminClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('queue_entries')
      .select(`*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(id, first_name, last_name, user_type, employee_student_id, college, course, year_level, department, position)), service:clinic_services!service_id(name), encounter:encounters!encounter_id(chief_complaint)`)
      .eq('queue_date', today)
      .order('queue_number', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchClinicsList(): Promise<{ success: true; data: { id: string; name: string }[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('clinics').select('id, name').eq('is_active', true).order('name');
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchServices(clinicId: string): Promise<{ success: true; data: { id: string; name: string; clinic_id: string }[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('clinic_services').select('id, name, clinic_id').eq('clinic_id', clinicId);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function callNextPatient(clinicId?: string): Promise<{ success: true; queueNumber: number } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_date', today)
      .eq('status', 'waiting')
      .order('queue_number', { ascending: true })
      .limit(1);

    if (clinicId) {
      query = query.eq('clinic_id', clinicId);
    }

    const { data: entries, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    if (!entries || entries.length === 0) {
      return { success: false, error: 'No patients waiting' };
    }

    const next = entries[0];
    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'called',
        called_at: new Date().toISOString()
      })
      .eq('id', next.id);

    if (error) throw error;

    // Audit log
    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.call_next',
      p_resource_type: 'queue_entries',
      p_resource_id: next.id,
      p_outcome: 'success'
    });

    revalidatePath('/queue');
    return { success: true, queueNumber: next.queue_number };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function startQueueService(entryId: string): Promise<{ success: true; encounterId?: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = getAdminClient();

    // Get the queue entry details
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name)), clinic:clinics!clinic_id(id), service:clinic_services!service_id(id)')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) throw new Error('Queue entry not found');

    let encounterId = entry.encounter_id;

    // If no encounter exists yet (added to queue without chief complaint), create one
    if (!encounterId) {
      const { data: encounter, error: encError } = await supabase
        .from('encounters')
        .insert({
          patient_id: entry.patient_id,
          queue_entry_id: entryId,
          clinic_id: entry.clinic_id,
          service_id: entry.service_id,
          status: 'in_progress',
          visit_date: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (encError) throw encError;
      encounterId = encounter.id;
    } else {
      // Update existing encounter status to in_progress
      await supabase
        .from('encounters')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', encounterId);
    }

    // Update queue entry status
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'in_service',
        started_at: new Date().toISOString(),
      })
      .eq('id', entryId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.start_service',
      p_resource_type: 'queue_entries',
      p_resource_id: entryId,
      p_outcome: 'success'
    });

    revalidatePath('/queue');
    return { success: true, encounterId };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function completeQueueService(entryId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    // Get the queue entry to find linked encounter
    const { data: entry } = await supabase
      .from('queue_entries')
      .select('encounter_id')
      .eq('id', entryId)
      .single();

    // Complete the queue entry
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', entryId);

    if (error) throw error;

    // Also complete the linked encounter if it exists
    if (entry?.encounter_id) {
      await supabase
        .from('encounters')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', entry.encounter_id);
    }

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.complete_service',
      p_resource_type: 'queue_entries',
      p_resource_id: entryId,
      p_outcome: 'success'
    });

    revalidatePath('/queue');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function cancelQueueEntry(entryId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('queue_entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.cancel',
      p_resource_type: 'queue_entries',
      p_resource_id: entryId,
      p_outcome: 'success'
    });

    revalidatePath('/queue');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function addToQueue(data: {
  patient_id: string;
  clinic_id: string;
  service_id: string;
  priority?: number;
  chief_complaint?: string;
}): Promise<{ success: true; queueNumber: number; entryId: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = getAdminClient();

    const { data: queueNumber, error: queueError } = await supabase.rpc('create_queue_entry', {
      p_clinic_id: data.clinic_id,
      p_service_id: data.service_id,
      p_patient_id: data.patient_id,
    });

    if (queueError) throw queueError;

    const today = new Date().toISOString().split('T')[0];
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

    let encounterId = null;
    if (data.chief_complaint) {
      const { data: encounter, error: encError } = await supabase
        .from('encounters')
        .insert({
          patient_id: data.patient_id,
          clinic_id: data.clinic_id,
          service_id: data.service_id,
          chief_complaint: data.chief_complaint,
          visit_date: today,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (!encError && encounter) {
        encounterId = encounter.id;
        await supabase
          .from('queue_entries')
          .update({ encounter_id: encounterId })
          .eq('id', entry.id);
      }
    }

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.add_patient',
      p_resource_type: 'queue_entries',
      p_resource_id: entry.id,
      p_outcome: 'success'
    });

    revalidatePath('/queue');
    return { success: true, queueNumber: queueNumber as number, entryId: entry.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
