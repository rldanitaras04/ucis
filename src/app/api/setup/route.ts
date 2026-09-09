import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@ucis.local',
      password: 'SuperAdmin123!',
      email_confirm: true,
    });

    if (authError) throw authError;

    // 2. Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        auth_user_id: authData.user.id,
        user_type: 'admin',
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@ucis.local',
        status: 'active',
      });

    if (profileError) throw profileError;

    // 3. Assign super_admin role
    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', 'super_admin')
      .single();

    if (role) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: role.id,
          is_active: true,
        });

      if (roleError) throw roleError;
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      email: 'admin@ucis.local',
      password: 'SuperAdmin123!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
