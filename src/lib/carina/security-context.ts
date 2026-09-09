import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth-guard';
import { CarinaSecurityContext } from './types';

export async function buildCarinaSecurityContext(): Promise<CarinaSecurityContext> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authenticated: false,
      userId: null,
      roles: [],
      permissions: [],
      clinicIds: [],
      campusIds: [],
      providerProfileId: null,
      providerType: null,
      patientProfileId: null,
      profile: null,
    };
  }

  const supabase = createServerSupabaseClient();

  let providerProfileId: string | null = null;
  let providerType: 'doctor' | 'dentist' | null = null;
  let clinicIds: string[] = [];
  let campusIds: string[] = [];
  let patientProfileId: string | null = null;

  const { data: providerProfile } = await supabase
    .from('provider_profiles')
    .select('id, provider_type')
    .eq('user_profile_id', user.profile?.id)
    .eq('is_active', true)
    .single();

  if (providerProfile) {
    providerProfileId = providerProfile.id;
    providerType = providerProfile.provider_type as 'doctor' | 'dentist';

    const { data: assignments } = await supabase
      .from('provider_assignments')
      .select('clinic_id')
      .eq('provider_profile_id', providerProfileId)
      .eq('is_active', true);

    if (assignments) {
      clinicIds = Array.from(new Set(assignments.map((a: { clinic_id: string }) => a.clinic_id)));
    }
  }

  if (clinicIds.length > 0) {
    const { data: clinics } = await supabase
      .from('clinics')
      .select('campus_id')
      .in('id', clinicIds);

    if (clinics) {
      campusIds = Array.from(new Set(clinics.map((c: { campus_id: string }) => c.campus_id)));
    }
  }

  const { data: patientProfile } = await supabase
    .from('patient_profiles')
    .select('id')
    .eq('user_profile_id', user.profile?.id)
    .single();

  if (patientProfile) {
    patientProfileId = patientProfile.id;
  }

  return {
    authenticated: true,
    userId: user.id,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    clinicIds,
    campusIds,
    providerProfileId,
    providerType,
    patientProfileId,
    profile: user.profile ? {
      id: user.profile.id,
      first_name: user.profile.first_name,
      last_name: user.profile.last_name,
    } : null,
  };
}
