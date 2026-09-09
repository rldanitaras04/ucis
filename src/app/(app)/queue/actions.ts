'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

export async function startQueueService(entryId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'in_service',
        started_at: new Date().toISOString()
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

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function completeQueueService(entryId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('queue_entries')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', entryId);

    if (error) throw error;

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
}): Promise<{ success: true; queueNumber: number } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('admin', 'super_admin', 'clinic_staff', 'doctor', 'dentist', 'nurse');
    const supabase = createServerSupabaseClient();

    const today = new Date().toISOString().split('T')[0];

    // Get next queue number atomically
    const { data: lastEntry } = await supabase
      .from('queue_entries')
      .select('queue_number')
      .eq('clinic_id', data.clinic_id)
      .eq('service_id', data.service_id)
      .eq('queue_date', today)
      .order('queue_number', { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (lastEntry?.queue_number || 0) + 1;

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

    return { success: true, queueNumber: nextNumber };
  } catch (error) {
    return handleAuthError(error);
  }
}
