'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function generateControlNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `UCIS-CLR-${year}${month}-${random}`;
}

export async function issueClearance(data: {
  patient_id: string;
  encounter_id?: string;
  clearance_type: string;
  expiry_date?: string;
}): Promise<{ success: true; id: string; controlNumber: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: clearance, error } = await supabase
      .from('clearances')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        issued_by: user.profile?.id || user.id,
        clearance_type: data.clearance_type,
        control_number: generateControlNumber(),
        issue_date: new Date().toISOString(),
        expiry_date: data.expiry_date || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clearance.issue',
      p_resource_type: 'clearances',
      p_resource_id: clearance.id,
      p_outcome: 'success'
    });

    return { success: true, id: clearance.id, controlNumber: clearance.control_number };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function revokeClearance(clearanceId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('clearances')
      .update({ status: 'revoked' })
      .eq('id', clearanceId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'clearance.revoke',
      p_resource_type: 'clearances',
      p_resource_id: clearanceId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
