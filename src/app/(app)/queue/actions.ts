'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchQueue(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('queue_entries')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id), clinic:clinics!clinic_id(name), service:clinic_services!service_id(name)')
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

    return { success: true, queueNumber: next.queue_number };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function startQueueService(entryId: string): Promise<{ success: true; encounterId?: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    // Get the queue entry details
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*, patient:patient_profiles!patient_id(id), clinic:clinics!clinic_id(id), service:clinic_services!service_id(id)')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) throw new Error('Queue entry not found');

    // Create encounter linked to this queue entry
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
      .select()
      .single();

    if (encError) throw encError;

    // Update queue entry status and link encounter
    const { error } = await supabase
      .from('queue_entries')
      .update({
        status: 'in_service',
        started_at: new Date().toISOString(),
        encounter_id: encounter.id,
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

    return { success: true, encounterId: encounter.id };
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
}): Promise<{ success: true; queueNumber: number; entryId: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];

    // Atomic queue number generation using queue_counters with FOR UPDATE
    const { data: counter, error: counterError } = await supabase
      .rpc('get_next_queue_number', {
        p_clinic_id: data.clinic_id,
        p_service_id: data.service_id,
        p_queue_date: today,
      });

    let nextNumber: number;
    if (counterError || !counter) {
      // Fallback: manual counter with row-level lock simulation
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
        priority: data.priority || 1,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'queue.add_patient',
      p_resource_type: 'queue_entries',
      p_resource_id: entry.id,
      p_outcome: 'success'
    });

    return { success: true, queueNumber: nextNumber, entryId: entry.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
