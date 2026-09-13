'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function fetchDispensingHistory(filters?: {
  start_date?: string;
  end_date?: string;
  search?: string;
}): Promise<{ success: true; data: any[]; summary: { totalDispensed: number; uniquePatients: number; uniqueMedicines: number } } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from('dispensing_records')
      .select(`
        id,
        quantity_dispensed,
        dispensed_at,
        dispensed_by,
        prescription_item:prescription_items(
          id,
          medication_name,
          dosage,
          frequency,
          prescription:prescriptions(
            id,
            patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name))
          )
        ),
        batch:medicine_batches(
          id,
          batch_number,
          medicine:medicines!medicine_id(id, name, generic_name, form, strength)
        )
      `)
      .order('dispensed_at', { ascending: false });

    if (filters?.start_date) {
      query = query.gte('dispensed_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('dispensed_at', filters.end_date + 'T23:59:59');
    }

    const { data, error } = await query;
    if (error) throw error;

    const records = data || [];
    const uniquePatients = new Set(
      records.map((r: any) => r.prescription_item?.prescription?.patient?.id).filter(Boolean)
    ).size;
    const uniqueMedicines = new Set(
      records.map((r: any) => r.batch?.medicine?.id).filter(Boolean)
    ).size;

    return {
      success: true,
      data: records,
      summary: {
        totalDispensed: records.reduce((sum: number, r: any) => sum + (r.quantity_dispensed || 0), 0),
        uniquePatients,
        uniqueMedicines,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchInventoryReport(): Promise<{
  success: true;
  data: {
    medicines: any[];
    totalMedicines: number;
    lowStockCount: number;
    nearExpiryCount: number;
    expiredCount: number;
    totalStockValue: number;
  };
} | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = createServerSupabaseClient();

    const { data: medicines, error } = await supabase
      .from('medicines')
      .select(`
        id,
        name,
        generic_name,
        category,
        form,
        strength,
        manufacturer,
        is_active,
        batches:medicine_batches(id, batch_number, quantity, unit_price, expiry_date, is_active)
      `)
      .order('name', { ascending: true });

    if (error) throw error;

    let totalStockValue = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    let expiredCount = 0;

    const enrichedMedicines = (medicines || []).map((med: any) => {
      const activeBatches = (med.batches || []).filter((b: any) => b.is_active);
      const totalStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
      const stockValue = activeBatches.reduce((sum: number, b: any) => sum + ((b.quantity || 0) * (b.unit_price || 0)), 0);
      totalStockValue += stockValue;

      const now = new Date();
      const nearExpiryBatches = activeBatches.filter((b: any) => {
        if (!b.expiry_date) return false;
        const daysUntil = Math.ceil((new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 30 && daysUntil >= 0;
      });
      const expiredBatches = activeBatches.filter((b: any) => {
        if (!b.expiry_date) return false;
        return new Date(b.expiry_date) < now;
      });

      if (totalStock <= 10) lowStockCount++;
      nearExpiryCount += nearExpiryBatches.length;
      expiredCount += expiredBatches.length;

      return {
        ...med,
        total_stock: totalStock,
        stock_value: stockValue,
        batch_count: activeBatches.length,
        near_expiry_batches: nearExpiryBatches.length,
        expired_batches: expiredBatches.length,
      };
    });

    return {
      success: true,
      data: {
        medicines: enrichedMedicines,
        totalMedicines: enrichedMedicines.length,
        lowStockCount,
        nearExpiryCount,
        expiredCount,
        totalStockValue,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}
