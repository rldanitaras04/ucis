'use server';

import { requireAuth, handleAuthError } from '@/lib/supabase/auth-guard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { isValidUserType } from '@/lib/user-type';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BUCKET_NAME = 'ucis-bucket';
const SIGNED_URL_EXPIRY = 3600;

export interface UserProfileData {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  contact_number: string | null;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  avatar_url: string | null;
  avatar_signed_url?: string | null;
  employee_student_id: string | null;
  user_type: string;
  college: string | null;
  course: string | null;
  year_level: string | null;
  department: string | null;
  position: string | null;
  status: string;
  blood_type: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

async function getAvatarSignedUrl(supabase: any, avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null;

  let path: string;
  if (avatarUrl.startsWith('avatars/')) {
    path = avatarUrl;
  } else {
    const pathMatch = avatarUrl.match(/avatars\/(.+)/);
    if (!pathMatch) return null;
    path = `avatars/${pathMatch[1]}`;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error) {
    console.error('Signed URL error:', error.message);
    return null;
  }

  return data?.signedUrl || null;
}

export async function fetchProfile(): Promise<{ success: true; data: UserProfileData } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        id, first_name, middle_name, last_name, suffix, contact_number, email,
        date_of_birth, gender, address, avatar_url, employee_student_id,
        user_type, college, course, year_level, department, position, status,
        patient:patient_profiles!user_profile_id(blood_type, allergies, emergency_contact_name, emergency_contact_phone)
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (error) throw error;

    const avatarSignedUrl = await getAvatarSignedUrl(supabase, data.avatar_url);

    const patient = data.patient as any;

    return {
      success: true,
      data: {
        id: data.id,
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        suffix: data.suffix,
        contact_number: data.contact_number,
        email: data.email,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        address: data.address,
        avatar_url: data.avatar_url,
        avatar_signed_url: avatarSignedUrl,
        employee_student_id: data.employee_student_id,
        user_type: data.user_type,
        college: data.college,
        course: data.course,
        year_level: data.year_level,
        department: data.department,
        position: data.position,
        status: data.status,
        blood_type: patient?.blood_type || null,
        allergies: patient?.allergies || null,
        emergency_contact_name: patient?.emergency_contact_name || null,
        emergency_contact_phone: patient?.emergency_contact_phone || null,
      },
    };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function updateProfile(updates: Partial<UserProfileData>): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = getAdminClient();

    if (updates.user_type && !isValidUserType(updates.user_type)) {
      return { success: false, error: 'Invalid user type. Must be student, faculty, or non_teaching_staff.' };
    }

    // Update user_profiles fields
    const profileFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const profileKeys = [
      'first_name', 'middle_name', 'last_name', 'suffix', 'contact_number',
      'email', 'date_of_birth', 'gender', 'address', 'avatar_url',
      'college', 'course', 'year_level', 'department', 'position',
      'employee_student_id', 'user_type',
    ];
    for (const key of profileKeys) {
      if (key in updates) {
        profileFields[key] = updates[key as keyof typeof updates] || null;
      }
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(profileFields)
      .eq('auth_user_id', user.id);

    if (profileError) throw profileError;

    // Update patient_profiles fields
    const patientFields: Record<string, any> = {};
    const patientKeys = ['blood_type', 'allergies', 'emergency_contact_name', 'emergency_contact_phone'];
    for (const key of patientKeys) {
      if (key in updates) {
        patientFields[key] = updates[key as keyof typeof updates] || null;
      }
    }

    if (Object.keys(patientFields).length > 0) {
      // Get patient_profiles id
      const { data: patientRow } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (patientRow) {
        const { data: patientProfile } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('user_profile_id', patientRow.id)
          .maybeSingle();

        if (patientProfile) {
          const { error: patientError } = await supabase
            .from('patient_profiles')
            .update(patientFields)
            .eq('id', patientProfile.id);

          if (patientError) throw patientError;
        }
      }
    }

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.update',
      p_resource_type: 'user_profiles',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function uploadAvatar(formData: FormData): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = getAdminClient();

    const file = formData.get('avatar') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File too large. Maximum size is 5MB.' };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.avatar_url) {
      const pathMatch = profile.avatar_url.match(/avatars\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(BUCKET_NAME).remove([`avatars/${pathMatch[1]}`]);
      }
    }

    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/avatar.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);

    if (signedUrlError) throw signedUrlError;
    if (!signedUrlData?.signedUrl) {
      return { success: false, error: 'Failed to generate avatar URL' };
    }

    const avatarUrl = signedUrlData.signedUrl;

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
      .eq('auth_user_id', user.id);

    if (updateError) {
      console.error('Profile update error:', updateError.message);
      throw updateError;
    }

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.upload_avatar',
      p_resource_type: 'user_profiles',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, url: avatarUrl };
  } catch (error) {
    return handleAuthError(error);
  }
}

export async function removeAvatar(): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await requireAuth();
    const supabase = getAdminClient();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.avatar_url) {
      const pathMatch = profile.avatar_url.match(/avatars\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from(BUCKET_NAME).remove([`avatars/${pathMatch[1]}`]);
      }
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('auth_user_id', user.id);

    if (error) throw error;

    await supabase.rpc('write_audit_log', {
      p_action: 'profile.remove_avatar',
      p_resource_type: 'user_profiles',
      p_resource_id: user.id,
      p_outcome: 'success'
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return handleAuthError(error);
  }
}
