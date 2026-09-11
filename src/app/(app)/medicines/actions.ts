'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function fetchMedicines(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('medicines')
      .select(`
        *,
        batches:medicine_batches(id, batch_number, quantity, unit_price, expiry_date, is_active)
      `)
      .order('name', { ascending: true });
    if (error) throw error;

    const medicines = (data || []).map((med: any) => {
      const activeBatches = (med.batches || []).filter((b: any) => b.is_active);
      const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
      const nearestExpiry = activeBatches
        .filter((b: any) => b.expiry_date)
        .sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0]?.expiry_date || null;
      const lowestPrice = activeBatches
        .filter((b: any) => b.unit_price != null)
        .sort((a: any, b: any) => a.unit_price - b.unit_price)[0]?.unit_price || null;

      return {
        ...med,
        total_stock: totalStock,
        nearest_expiry: nearestExpiry,
        unit_price: lowestPrice,
        batch_count: activeBatches.length,
      };
    });

    return { success: true, data: medicines };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function addBatch(data: {
  medicine_id: string;
  batch_number: string;
  quantity: number;
  unit_price?: number;
  expiry_date: string;
  manufactured_date?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: batch, error } = await supabase
      .from('medicine_batches')
      .insert({
        medicine_id: data.medicine_id,
        batch_number: data.batch_number,
        quantity: data.quantity,
        unit_price: data.unit_price || null,
        expiry_date: data.expiry_date,
        manufactured_date: data.manufactured_date || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'medicine_batch.create',
      p_resource_type: 'medicine_batches',
      p_resource_id: batch.id,
      p_outcome: 'success'
    });

    revalidatePath('/medicines');
    return { success: true, id: batch.id };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateBatch(
  batchId: string,
  data: {
    quantity?: number;
    unit_price?: number;
    expiry_date?: string;
    is_active?: boolean;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('medicine_batches')
      .update(data)
      .eq('id', batchId);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'medicine_batch.update',
      p_resource_type: 'medicine_batches',
      p_resource_id: batchId,
      p_outcome: 'success'
    });

    revalidatePath('/medicines');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function createMedicine(data: {
  name: string;
  generic_name?: string;
  category?: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
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
        form: data.form || null,
        strength: data.strength || null,
        manufacturer: data.manufacturer || null,
        is_active: true,
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

export async function updateMedicine(
  id: string,
  data: {
    name: string;
    generic_name?: string;
    category?: string;
    form?: string;
    strength?: string;
    manufacturer?: string;
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
        form: data.form || null,
        strength: data.strength || null,
        manufacturer: data.manufacturer || null,
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
