'use server';

import { requireAnyRole, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function registerPatient(data: {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  sex: string;
  blood_type?: string;
  allergies?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  university_id?: string;
  user_type: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const user = await requireAnyRole('clinic_staff', 'admin', 'super_admin');
    const supabase = createServerSupabaseClient();

    const { data: patient, error } = await supabase
      .from('patient_profiles')
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        sex: data.sex,
        blood_type: data.blood_type || null,
        allergies: data.allergies || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_phone: data.emergency_contact_phone || null,
        university_id: data.university_id || null,
        user_type: data.user_type,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_actor: user.id,
      p_action: 'patient.register',
      p_resource_type: 'patient_profiles',
      p_resource_id: patient.id,
      p_outcome: 'success'
    });

    return { success: true, id: patient.id };
  } catch (error) {
    return handleAuthError(error);
  }
}
