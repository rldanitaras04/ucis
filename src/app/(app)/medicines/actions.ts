'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchMedicines(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from('medicines').select('*').order('name', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createMedicine(data: {
  name: string;
  generic_name?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  stock_quantity?: number;
  unit_price?: number;
  expiry_date?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: medicine, error } = await supabase
      .from('medicines')
      .insert({
        name: data.name,
        generic_name: data.generic_name || null,
        category: data.category || null,
        dosage_form: data.dosage_form || null,
        strength: data.strength || null,
        stock_quantity: data.stock_quantity || 0,
        unit_price: data.unit_price || null,
        expiry_date: data.expiry_date || null,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'medicines.create',
      p_resource_type: 'medicines',
      p_resource_id: medicine.id,
      p_outcome: 'success'
    });

    revalidatePath('/medicines');
    return { success: true, id: medicine.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deleteMedicine(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'medicines.delete',
      p_resource_type: 'medicines',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/medicines');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateMedicine(
  id: string,
  data: {
    name: string;
    generic_name?: string;
    category?: string;
    dosage_form?: string;
    strength?: string;
    stock_quantity?: number;
    unit_price?: number;
    expiry_date?: string;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('medicines')
      .update({
        name: data.name,
        generic_name: data.generic_name || null,
        category: data.category || null,
        dosage_form: data.dosage_form || null,
        strength: data.strength || null,
        stock_quantity: data.stock_quantity || 0,
        unit_price: data.unit_price || null,
        expiry_date: data.expiry_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'medicines.update',
      p_resource_type: 'medicines',
      p_resource_id: id,
      p_outcome: 'success'
    });

    revalidatePath('/medicines');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
