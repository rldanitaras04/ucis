'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchFollowUps(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('follow_ups')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .order('scheduled_date', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createFollowUp(data: {
  patient_id: string;
  scheduled_date: string;
  reason: string;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: followUp, error } = await supabase
      .from('follow_ups')
      .insert({
        patient_id: data.patient_id,
        scheduled_date: data.scheduled_date,
        reason: data.reason,
        notes: data.notes || null,
        scheduled_by: user.profile?.id || user.id,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'follow_up.create',
      p_resource_type: 'follow_ups',
      p_resource_id: followUp.id,
      p_outcome: 'success'
    });

    return { success: true, id: followUp.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function completeFollowUp(followUpId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'completed' })
      .eq('id', followUpId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'follow_up.complete',
      p_resource_type: 'follow_ups',
      p_resource_id: followUpId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function cancelFollowUp(followUpId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('follow_ups')
      .update({ status: 'cancelled' })
      .eq('id', followUpId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'follow_up.cancel',
      p_resource_type: 'follow_ups',
      p_resource_id: followUpId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
