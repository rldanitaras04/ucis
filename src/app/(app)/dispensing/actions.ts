'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchActivePrescriptions(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .eq('status', 'active')
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function dispenseMedication(data: {
  prescription_id: string;
  quantity_dispensed: number;
  batch_number?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Get prescription details
    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', data.prescription_id)
      .eq('status', 'active')
      .single();

    if (rxError || !prescription) {
      return { success: false, error: 'Prescription not found or not active' };
    }

    // Create dispensing record
    const { data: dispensing, error: dispError } = await supabase
      .from('dispensing')
      .insert({
        prescription_id: data.prescription_id,
        patient_id: prescription.patient_id,
        dispensed_by: user.profile?.id || user.id,
        quantity_dispensed: data.quantity_dispensed,
        batch_number: data.batch_number || null,
        dispensed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dispError) throw dispError;

    // Update prescription status
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({ status: 'dispensed' })
      .eq('id', data.prescription_id);

    if (updateError) throw updateError;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'dispensing.dispense',
      p_resource_type: 'dispensing',
      p_resource_id: dispensing.id,
      p_outcome: 'success'
    });

    return { success: true, id: dispensing.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
