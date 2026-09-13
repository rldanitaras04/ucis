'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchPrescriptions(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name, employee_student_id)),
        encounter:encounters!encounter_id(id, visit_date, chief_complaint, service:clinic_services!service_id(name)),
        items:prescription_items(*, medicine:medicines(id, name, generic_name, form, strength))
      `)
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    const flattened = (data || []).map((rx: any) => {
      const p = rx.patient as any;
      const profile = p?.user_profile ? (Array.isArray(p.user_profile) ? p.user_profile[0] : p.user_profile) : null;
      const enc = rx.encounter ? (Array.isArray(rx.encounter) ? rx.encounter[0] : rx.encounter) : null;
      const svc = enc?.service ? (Array.isArray(enc.service) ? enc.service[0] : enc.service) : null;
      return {
        ...rx,
        patient: p ? {
          id: p.id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          employee_student_id: profile?.employee_student_id || null,
        } : null,
        encounter: enc ? {
          id: enc.id,
          visit_date: enc.visit_date,
          chief_complaint: enc.chief_complaint,
          service_name: svc?.name || null,
        } : null,
      };
    });
    return { success: true, data: flattened };
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
  unit?: string;
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
        unit: data.unit || 'piece(s)',
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

export async function fetchPatientPrescriptions(patientId: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('prescriptions')
      .select('*, items:prescription_items(*, medicine:medicines(id, name, generic_name, form, strength))')
      .eq('patient_id', patientId)
      .order('prescribed_date', { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updatePrescriptionItem(itemId: string, data: {
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'nurse', 'admin', 'super_admin');
    const admin = getAdminClient();
    const { error } = await admin
      .from('prescription_items')
      .update(data)
      .eq('id', itemId);
    if (error) throw error;
    revalidatePath('/prescriptions');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function deletePrescription(prescriptionId: string): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('doctor', 'dentist', 'admin', 'super_admin');
    const admin = getAdminClient();

    await admin.from('prescription_items').delete().eq('prescription_id', prescriptionId);

    const { error } = await admin
      .from('prescriptions')
      .delete()
      .eq('id', prescriptionId);
    if (error) throw error;

    await admin.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'prescription.delete',
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
