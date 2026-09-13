'use server';

import { createClient } from '@supabase/supabase-js';
import { handleAuthError } from '@/lib/supabase/auth-guard';
import { isValidUserType } from '@/lib/user-type';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: string;
  employeeStudentId?: string;
  college?: string;
  course?: string;
  yearLevel?: string;
  department?: string;
  position?: string;
}): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const admin = getAdminClient();

    if (!isValidUserType(data.userType)) {
      return { success: false, error: 'Invalid user type. Must be student, faculty, or non_teaching_staff.' };
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        user_type: data.userType,
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // Check if user_profiles already exists (e.g. walk-in registered by clinic staff)
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (existingProfile) {
      // Link existing profile to this auth account
      const { error: linkError } = await admin
        .from('user_profiles')
        .update({ auth_user_id: authData.user.id, updated_at: new Date().toISOString() })
        .eq('id', existingProfile.id);
      if (linkError) throw linkError;

      // Ensure patient_profiles exists for this user
      const { data: existingPatient } = await admin
        .from('patient_profiles')
        .select('id')
        .eq('user_profile_id', existingProfile.id)
        .maybeSingle();

      if (!existingPatient) {
        const { error: patientError } = await admin
          .from('patient_profiles')
          .insert({ user_profile_id: existingProfile.id });
        if (patientError) throw patientError;
      }
    } else {
      // Create new user_profiles
      const { error: profileError } = await admin
        .from('user_profiles')
        .insert({
          auth_user_id: authData.user.id,
          user_type: data.userType,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          employee_student_id: data.employeeStudentId || null,
          college: data.college || null,
          course: data.course || null,
          year_level: data.yearLevel || null,
          department: data.department || null,
          position: data.position || null,
          status: 'active',
        });
      if (profileError) throw profileError;

      // Create patient_profiles for every user
      const { data: userProfile } = await admin
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userProfile) {
        const { error: patientError } = await admin
          .from('patient_profiles')
          .insert({ user_profile_id: userProfile.id });
        if (patientError) throw patientError;
      }
    }

    let roleName = data.userType;

    const { data: role } = await admin
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (role) {
      const { error: roleError } = await admin.from('user_roles').insert({
        user_id: authData.user.id,
        role_id: role.id,
        is_active: true,
      });
      if (roleError) throw roleError;
    }

    return { success: true, message: 'Account created successfully' };
  } catch (error: any) {
    return handleAuthError(error);
  }
}
