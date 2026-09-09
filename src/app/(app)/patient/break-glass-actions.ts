'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requestBreakGlassAccess(data: {
  patient_id: string;
  reason: string;
  data_scope?: string;
}): Promise<{ success: true; id?: string; message?: string } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = createServerSupabaseClient();

    // Check if user already has active access
    const { data: existingAccess } = await supabase
      .from('patient_access_log')
      .select('id')
      .eq('patient_id', data.patient_id)
      .eq('accessor_id', user.id)
      .is('revoked_at', null)
      .limit(1);

    if (existingAccess && existingAccess.length > 0) {
      return { success: true, message: 'Access already granted' };
    }

    // Get clinic_id from current queue entry or active session
    const { data: activeEntry } = await supabase
      .from('queue_entries')
      .select('clinic_id')
      .eq('patient_id', data.patient_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Create break-glass access
    const { data: access, error } = await supabase
      .from('patient_access_log')
      .insert({
        patient_id: data.patient_id,
        accessor_id: user.id,
        clinic_id: activeEntry?.clinic_id || null,
        justification: data.reason,
        data_scope: data.data_scope || 'full',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log with extended context
    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'break_glass.request',
      p_resource_type: 'patient_access_log',
      p_resource_id: access.id,
      p_outcome: 'success',
      p_context: JSON.stringify({
        patient_id: data.patient_id,
        reason: data.reason,
        data_scope: data.data_scope,
      })
    });

    return { success: true, id: access.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
