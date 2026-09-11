'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchActivePrescriptions(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
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
      .eq('status', 'active')
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchMedicineBatches(medicineId?: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('medicine_batches')
      .select('id, batch_number, quantity, unit_price, expiry_date, medicine_id, medicine:medicines!medicine_id(id, name, generic_name, form, strength)')
      .gt('quantity', 0)
      .eq('is_active', true)
      .order('expiry_date', { ascending: true });

    if (medicineId) {
      query = query.eq('medicine_id', medicineId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function dispenseMedication(data: {
  prescription_item_id: string;
  medicine_batch_id: string;
  quantity: number;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: dispensingId, error } = await supabase.rpc('dispense_prescription', {
      p_prescription_item_id: data.prescription_item_id,
      p_medicine_batch_id: data.medicine_batch_id,
      p_quantity: data.quantity,
      p_dispensed_by: user.id,
    });

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'dispensing.dispense',
      p_resource_type: 'dispensing',
      p_resource_id: dispensingId,
      p_outcome: 'success'
    });

    revalidatePath('/dispensing');
    return { success: true, id: dispensingId };
  } catch (error) {
    return handleAuthError(error);
  }
}
