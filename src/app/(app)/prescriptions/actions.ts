'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchPrescriptions(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, patient:patient_profiles!patient_id(first_name, last_name, patient_id)')
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createPrescription(data: {
  patient_id: string;
  encounter_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  quantity?: number;
  refills?: number;
  instructions?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    // Only clinical roles should create prescriptions
    if (!['doctor', 'dentist', 'nurse'].some(r => user.roles.includes(r)) && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        prescribed_by: user.profile?.id || user.id,
        medication_name: data.medication_name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration || null,
        quantity: data.quantity || null,
        refills: data.refills || 0,
        instructions: data.instructions || null,
        status: 'active',
        prescribed_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'prescription.create',
      p_resource_type: 'prescriptions',
      p_resource_id: prescription.id,
      p_outcome: 'success'
    });

    return { success: true, id: prescription.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function cancelPrescription(prescriptionId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('prescriptions')
      .update({ status: 'cancelled' })
      .eq('id', prescriptionId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'prescription.cancel',
      p_resource_type: 'prescriptions',
      p_resource_id: prescriptionId,
      p_outcome: 'success'
    });

    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
