'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchPrescriptions(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patient_profiles!patient_id(first_name, last_name, university_id),
        items:prescription_items(*, medicine:medicines(id, name, generic_name, form, strength))
      `)
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchAvailableMedicines(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('medicines')
      .select('id, name, generic_name, form, strength, category')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createPrescription(data: {
  patient_id: string;
  encounter_id?: string;
  medicine_id?: string;
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

    if (!['doctor', 'dentist', 'nurse'].some(r => user.roles.includes(r)) && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        created_by: user.id,
        notes: data.instructions || null,
        status: 'active',
        prescribed_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (rxError) throw rxError;

    const { error: itemError } = await supabase
      .from('prescription_items')
      .insert({
        prescription_id: prescription.id,
        medicine_id: data.medicine_id || null,
        medication_name: data.medication_name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration || null,
        quantity: data.quantity || 1,
        refills_allowed: data.refills || 0,
        notes: data.instructions || null,
      });

    if (itemError) throw itemError;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'prescription.create',
      p_resource_type: 'prescriptions',
      p_resource_id: prescription.id,
      p_outcome: 'success'
    });

    revalidatePath('/prescriptions');
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

    revalidatePath('/prescriptions');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
