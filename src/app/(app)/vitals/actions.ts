'use server';

import { requireAuth, requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function fetchVitalSigns(): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('vital_signs')
      .select('id, patient_id, recorded_at, blood_pressure_systolic, blood_pressure_diastolic, pulse_rate, respiratory_rate, temperature, oxygen_saturation, height, weight, bmi, notes, patient:patient_profiles!patient_id(id, user_profile:user_profiles!user_profile_id(first_name, last_name, employee_student_id))')
      .order('recorded_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function fetchPatientVitals(patientId: string): Promise<{ success: true; data: any[] } | { success: false; error: string }> {
  try {
    await requireAuth();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('vital_signs')
      .select('id, patient_id, recorded_at, blood_pressure_systolic, blood_pressure_diastolic, pulse_rate, respiratory_rate, temperature, oxygen_saturation, height, weight, bmi, notes')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function recordVitalSigns(data: {
  patient_id: string;
  encounter_id?: string;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  height?: number;
  weight?: number;
  notes?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('nurse', 'clinic_staff', 'doctor', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();
    const admin = getAdminClient();

    // Only clinical roles should record vitals
    if (!['nurse', 'clinic_staff', 'doctor'].some(r => user.roles.includes(r)) && !user.roles.includes('super_admin')) {
      throw new Error('FORBIDDEN');
    }

    // Calculate BMI
    let bmi = null;
    if (data.height && data.weight) {
      const heightM = data.height / 100;
      bmi = Math.round((data.weight / (heightM * heightM)) * 10) / 10;
    }

    const { data: vital, error } = await admin
      .from('vital_signs')
      .insert({
        patient_id: data.patient_id,
        encounter_id: data.encounter_id || null,
        recorded_by: user.id,
        blood_pressure_systolic: data.blood_pressure_systolic || null,
        blood_pressure_diastolic: data.blood_pressure_diastolic || null,
        pulse_rate: data.pulse_rate || null,
        respiratory_rate: data.respiratory_rate || null,
        temperature: data.temperature || null,
        oxygen_saturation: data.oxygen_saturation || null,
        height: data.height || null,
        weight: data.weight || null,
        bmi,
        notes: data.notes || null,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await admin.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'vitals.record',
      p_resource_type: 'vital_signs',
      p_resource_id: vital.id,
      p_outcome: 'success'
    });

    revalidatePath('/vitals');
    return { success: true, id: vital.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
